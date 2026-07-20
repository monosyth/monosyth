import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { unstable_cache } from "next/cache";

import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { buildStationId } from "@/lib/weather/history";
import type { WeatherObservation } from "@/lib/weather/types";

// Each day's worth of observations gets reduced to one Firestore doc with
// the values the summaries actually display. Reading a year of daily rollups
// is 365 doc reads — three orders of magnitude less than paging through raw
// minute-resolution observations. Raw docs are still kept; they're only
// touched when you click into a single day.
const WEATHER_TIME_ZONE = "America/Los_Angeles";
const calendarPartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: WEATHER_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

export type WeatherDailyRollup = {
  dayKey: string;
  year: number;
  month: number;
  day: number;
  observationCount: number;
  tempMax: TimestampedMetric | null;
  tempMin: TimestampedMetric | null;
  tempSum: number;
  tempCount: number;
  dewpointMax: TimestampedMetric | null;
  dewpointMin: TimestampedMetric | null;
  rainTotal: number;
  rainRateMax: TimestampedMetric | null;
  windMax: TimestampedMetric | null;
  gustMax: TimestampedMetric | null;
  pressureMax: TimestampedMetric | null;
  pressureMin: TimestampedMetric | null;
  heatIndexMax: TimestampedMetric | null;
  windChillMin: TimestampedMetric | null;
  solarMax: TimestampedMetric | null;
  brightnessMax: TimestampedMetric | null;
  lightningMax: TimestampedMetric | null;
  humidityMax: TimestampedMetric | null;
  humidityMin: TimestampedMetric | null;
  // Last raw dailyrainin reading we saw, used to translate the running
  // "rain since midnight" counter into per-observation deltas across the
  // boundary between snapshot batches.
  lastDailyRainReading: number | null;
  latestObservationAt: number;
  updatedAt: number;
};

export type TimestampedMetric = {
  value: number;
  timestamp: number;
};

type RollupDeltaInput = {
  macAddress: string;
  observations: WeatherObservation[];
};

// Persists deltas into the daily rollup docs for the station. Each call is
// idempotent for observations that have already been folded in: we use the
// observation timestamp as the dedupe boundary so re-running with overlap
// won't double-count rainfall.
export async function applyDailyRollupsForObservations(
  input: RollupDeltaInput,
): Promise<{ daysUpdated: number }> {
  if (!input.macAddress || !input.observations.length) {
    return { daysUpdated: 0 };
  }

  const stationId = buildStationId(input.macAddress);
  const db = getFirebaseAdminDb();
  const dailyCollection = db
    .collection("weatherStations")
    .doc(stationId)
    .collection("daily");

  // Sort and bucket observations by local day so we can write each day in
  // one transaction.
  const sorted = [...input.observations].sort(
    (left, right) => (left.timestamp ?? 0) - (right.timestamp ?? 0),
  );
  const buckets = new Map<string, WeatherObservation[]>();

  for (const observation of sorted) {
    const timestamp = observation.timestamp ?? 0;
    if (!timestamp) {
      continue;
    }
    const parts = getCalendarParts(timestamp);
    const dayKey = buildDayKey(parts.year, parts.month, parts.day);
    let bucket = buckets.get(dayKey);
    if (!bucket) {
      bucket = [];
      buckets.set(dayKey, bucket);
    }
    bucket.push(observation);
  }

  let daysUpdated = 0;

  for (const [dayKey, dayObservations] of buckets) {
    const docRef = dailyCollection.doc(dayKey);
    await db.runTransaction(async (txn) => {
      const snapshot = await txn.get(docRef);
      const existing = snapshot.exists ? deserializeRollup(snapshot.data()) : null;
      const merged = mergeObservationsIntoRollup(existing, dayKey, dayObservations);

      if (!merged) {
        return;
      }

      txn.set(
        docRef,
        {
          ...serializeRollup(merged),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: false },
      );
    });
    daysUpdated += 1;
  }

  return { daysUpdated };
}

export async function readDailyRollupsBetween(input: {
  macAddress: string;
  startDayKey: string;
  endDayKey: string;
}): Promise<WeatherDailyRollup[]> {
  if (!input.macAddress) {
    return [];
  }

  const stationId = buildStationId(input.macAddress);
  return readDailyRollupsBetweenCached(
    stationId,
    input.startDayKey,
    input.endDayKey,
  );
}

const readDailyRollupsBetweenCached = unstable_cache(
  async (stationId: string, startDayKey: string, endDayKey: string) => {
    const db = getFirebaseAdminDb();
    const snapshot = await db
      .collection("weatherStations")
      .doc(stationId)
      .collection("daily")
      .where("dayKey", ">=", startDayKey)
      .where("dayKey", "<=", endDayKey)
      .orderBy("dayKey", "asc")
      .get();

    return snapshot.docs
      .map((doc) => deserializeRollup(doc.data()))
      .filter((rollup): rollup is WeatherDailyRollup => rollup !== null);
  },
  ["weather-daily-rollups-between-v1"],
  { revalidate: 300 },
);

export async function readAllDailyRollups(input: {
  macAddress: string;
}): Promise<WeatherDailyRollup[]> {
  if (!input.macAddress) {
    return [];
  }

  const stationId = buildStationId(input.macAddress);
  return readAllDailyRollupsCached(stationId);
}

const readAllDailyRollupsCached = unstable_cache(
  async (stationId: string) => {
    const db = getFirebaseAdminDb();
    const snapshot = await db
      .collection("weatherStations")
      .doc(stationId)
      .collection("daily")
      .orderBy("dayKey", "asc")
      .get();

    return snapshot.docs
      .map((doc) => deserializeRollup(doc.data()))
      .filter((rollup): rollup is WeatherDailyRollup => rollup !== null);
  },
  ["weather-all-daily-rollups-v1"],
  { revalidate: 300 },
);

function mergeObservationsIntoRollup(
  existing: WeatherDailyRollup | null,
  dayKey: string,
  observations: WeatherObservation[],
): WeatherDailyRollup | null {
  const [yearStr, monthStr, dayStr] = dayKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const rollup: WeatherDailyRollup =
    existing ??
    ({
      dayKey,
      year,
      month,
      day,
      observationCount: 0,
      tempMax: null,
      tempMin: null,
      tempSum: 0,
      tempCount: 0,
      dewpointMax: null,
      dewpointMin: null,
      rainTotal: 0,
      rainRateMax: null,
      windMax: null,
      gustMax: null,
      pressureMax: null,
      pressureMin: null,
      heatIndexMax: null,
      windChillMin: null,
      solarMax: null,
      brightnessMax: null,
      lightningMax: null,
      humidityMax: null,
      humidityMin: null,
      lastDailyRainReading: null,
      latestObservationAt: 0,
      updatedAt: 0,
    } satisfies WeatherDailyRollup);

  let touched = false;

  for (const observation of observations) {
    const timestamp = observation.timestamp ?? 0;
    if (!timestamp || timestamp <= rollup.latestObservationAt) {
      // Skip observations we've already folded in. This is what makes the
      // call idempotent across overlapping logger batches.
      continue;
    }

    const tempRecord = pickRecord(observation, ["tempf"], timestamp);
    if (tempRecord) {
      rollup.tempMax = pickHigh(rollup.tempMax, tempRecord);
      rollup.tempMin = pickLow(rollup.tempMin, tempRecord);
      rollup.tempSum += tempRecord.value;
      rollup.tempCount += 1;
    }

    const dewpoint = pickRecord(observation, ["dewPoint", "dewpointf"], timestamp);
    if (dewpoint) {
      rollup.dewpointMax = pickHigh(rollup.dewpointMax, dewpoint);
      rollup.dewpointMin = pickLow(rollup.dewpointMin, dewpoint);
    }

    const rainRate = pickRecord(observation, ["hourlyrainin"], timestamp);
    if (rainRate) {
      rollup.rainRateMax = pickHigh(rollup.rainRateMax, rainRate);
    }

    const wind = pickRecord(observation, ["windspeedmph"], timestamp);
    if (wind) {
      rollup.windMax = pickHigh(rollup.windMax, wind);
    }

    const gust = pickRecord(observation, ["windgustmph"], timestamp);
    if (gust) {
      rollup.gustMax = pickHigh(rollup.gustMax, gust);
    }

    const pressure = pickRecord(observation, ["baromrelin", "baromabsin"], timestamp);
    if (pressure) {
      rollup.pressureMax = pickHigh(rollup.pressureMax, pressure);
      rollup.pressureMin = pickLow(rollup.pressureMin, pressure);
    }

    const heatIndex = pickRecord(observation, ["heatindexf"], timestamp);
    if (heatIndex) {
      rollup.heatIndexMax = pickHigh(rollup.heatIndexMax, heatIndex);
    }

    const windChill = pickRecord(observation, ["windchillf"], timestamp);
    if (windChill) {
      rollup.windChillMin = pickLow(rollup.windChillMin, windChill);
    }

    const solar = pickRecord(observation, ["solarradiation"], timestamp);
    if (solar) {
      rollup.solarMax = pickHigh(rollup.solarMax, solar);
    }

    const brightness = pickRecord(observation, ["brightness", "lux"], timestamp);
    if (brightness) {
      rollup.brightnessMax = pickHigh(rollup.brightnessMax, brightness);
    }

    const lightning = pickRecord(observation, ["lightning_day", "lightning"], timestamp);
    if (lightning) {
      rollup.lightningMax = pickHigh(rollup.lightningMax, lightning);
    }

    const humidity = pickRecord(observation, ["humidity"], timestamp);
    if (humidity) {
      rollup.humidityMax = pickHigh(rollup.humidityMax, humidity);
      rollup.humidityMin = pickLow(rollup.humidityMin, humidity);
    }

    const dailyRainCounter = pickNumber(observation, ["dailyrainin"]);
    if (dailyRainCounter !== null) {
      const previous = rollup.lastDailyRainReading;
      const increment =
        previous === null
          ? dailyRainCounter
          : dailyRainCounter + 1e-6 >= previous
            ? Math.max(dailyRainCounter - previous, 0)
            : dailyRainCounter;

      rollup.rainTotal = roundTo(rollup.rainTotal + increment, 4);
      rollup.lastDailyRainReading = dailyRainCounter;
    }

    rollup.observationCount += 1;
    rollup.latestObservationAt = timestamp;
    touched = true;
  }

  return touched || existing ? rollup : null;
}

function pickRecord(
  observation: WeatherObservation,
  keys: string[],
  timestamp: number,
): TimestampedMetric | null {
  const value = pickNumber(observation, keys);
  if (value === null || !timestamp) {
    return null;
  }
  return { value, timestamp };
}

function pickHigh(
  current: TimestampedMetric | null,
  candidate: TimestampedMetric | null,
) {
  if (!candidate) {
    return current;
  }
  if (!current || candidate.value > current.value) {
    return candidate;
  }
  return current;
}

function pickLow(
  current: TimestampedMetric | null,
  candidate: TimestampedMetric | null,
) {
  if (!candidate) {
    return current;
  }
  if (!current || candidate.value < current.value) {
    return candidate;
  }
  return current;
}

function pickNumber(source: WeatherObservation, keys: string[]) {
  for (const key of keys) {
    const raw = source[key];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw;
    }
    if (typeof raw === "string" && raw.trim() !== "") {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function roundTo(value: number, decimals: number) {
  const precision = 10 ** decimals;
  return Math.round(value * precision) / precision;
}

function getCalendarParts(timestamp: number) {
  const parts = calendarPartsFormatter.formatToParts(new Date(timestamp));
  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? "0"),
    month: Number(parts.find((part) => part.type === "month")?.value ?? "0"),
    day: Number(parts.find((part) => part.type === "day")?.value ?? "0"),
  };
}

function buildDayKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function serializeRollup(rollup: WeatherDailyRollup) {
  return {
    ...rollup,
    tempMax: serializeMetric(rollup.tempMax),
    tempMin: serializeMetric(rollup.tempMin),
    dewpointMax: serializeMetric(rollup.dewpointMax),
    dewpointMin: serializeMetric(rollup.dewpointMin),
    rainRateMax: serializeMetric(rollup.rainRateMax),
    windMax: serializeMetric(rollup.windMax),
    gustMax: serializeMetric(rollup.gustMax),
    pressureMax: serializeMetric(rollup.pressureMax),
    pressureMin: serializeMetric(rollup.pressureMin),
    heatIndexMax: serializeMetric(rollup.heatIndexMax),
    windChillMin: serializeMetric(rollup.windChillMin),
    solarMax: serializeMetric(rollup.solarMax),
    brightnessMax: serializeMetric(rollup.brightnessMax),
    lightningMax: serializeMetric(rollup.lightningMax),
    humidityMax: serializeMetric(rollup.humidityMax),
    humidityMin: serializeMetric(rollup.humidityMin),
    latestObservationAt:
      rollup.latestObservationAt > 0
        ? Timestamp.fromMillis(rollup.latestObservationAt)
        : null,
  };
}

function serializeMetric(metric: TimestampedMetric | null) {
  if (!metric) {
    return null;
  }
  return {
    value: metric.value,
    timestamp: Timestamp.fromMillis(metric.timestamp),
  };
}

function deserializeRollup(data: unknown): WeatherDailyRollup | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const raw = data as Record<string, unknown>;
  const dayKey = typeof raw.dayKey === "string" ? raw.dayKey : null;
  if (!dayKey) {
    return null;
  }
  const [yearStr, monthStr, dayStr] = dayKey.split("-");

  return {
    dayKey,
    year: typeof raw.year === "number" ? raw.year : Number(yearStr),
    month: typeof raw.month === "number" ? raw.month : Number(monthStr),
    day: typeof raw.day === "number" ? raw.day : Number(dayStr),
    observationCount: numberOr(raw.observationCount, 0),
    tempMax: deserializeMetric(raw.tempMax),
    tempMin: deserializeMetric(raw.tempMin),
    tempSum: numberOr(raw.tempSum, 0),
    tempCount: numberOr(raw.tempCount, 0),
    dewpointMax: deserializeMetric(raw.dewpointMax),
    dewpointMin: deserializeMetric(raw.dewpointMin),
    rainTotal: numberOr(raw.rainTotal, 0),
    rainRateMax: deserializeMetric(raw.rainRateMax),
    windMax: deserializeMetric(raw.windMax),
    gustMax: deserializeMetric(raw.gustMax),
    pressureMax: deserializeMetric(raw.pressureMax),
    pressureMin: deserializeMetric(raw.pressureMin),
    heatIndexMax: deserializeMetric(raw.heatIndexMax),
    windChillMin: deserializeMetric(raw.windChillMin),
    solarMax: deserializeMetric(raw.solarMax),
    brightnessMax: deserializeMetric(raw.brightnessMax),
    lightningMax: deserializeMetric(raw.lightningMax),
    humidityMax: deserializeMetric(raw.humidityMax),
    humidityMin: deserializeMetric(raw.humidityMin),
    lastDailyRainReading:
      typeof raw.lastDailyRainReading === "number" ? raw.lastDailyRainReading : null,
    latestObservationAt:
      raw.latestObservationAt instanceof Timestamp
        ? raw.latestObservationAt.toMillis()
        : typeof raw.latestObservationAt === "number"
          ? raw.latestObservationAt
          : 0,
    updatedAt:
      raw.updatedAt instanceof Timestamp
        ? raw.updatedAt.toMillis()
        : typeof raw.updatedAt === "number"
          ? raw.updatedAt
          : 0,
  };
}

function deserializeMetric(value: unknown): TimestampedMetric | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Record<string, unknown>;
  const numericValue = typeof raw.value === "number" ? raw.value : null;
  const timestamp =
    raw.timestamp instanceof Timestamp
      ? raw.timestamp.toMillis()
      : typeof raw.timestamp === "number"
        ? raw.timestamp
        : 0;

  if (numericValue === null || !timestamp) {
    return null;
  }

  return { value: numericValue, timestamp };
}

function numberOr(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
