import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { toWeatherTimestamp } from "@/lib/weather/time";
import type { WeatherObservation } from "@/lib/weather/types";

type WeatherHistoryDevice = {
  macAddress?: string;
  info?: {
    name?: string;
    location?: string;
  };
};

type PersistWeatherHistoryInput = {
  device: WeatherHistoryDevice;
  observations: WeatherObservation[];
  source: "page" | "scheduler";
};

export type PersistWeatherHistoryResult = {
  stationId: string;
  writtenCount: number;
  latestObservationAt: string | null;
};

export type WeatherHistoryRange = "week" | "month" | "year";

export type StoredWeatherStationMeta = {
  name: string;
  location: string;
  lastObservationAt: string | null;
};

export async function persistWeatherHistory(
  input: PersistWeatherHistoryInput,
): Promise<PersistWeatherHistoryResult> {
  const stationId = buildStationId(input.device.macAddress);
  const db = getFirebaseAdminDb();
  const stationRef = db.collection("weatherStations").doc(stationId);
  const latestTimestamp = Math.max(
    ...input.observations.map((observation) => toWeatherTimestamp(observation.dateutc)),
    0,
  );

  const batch = db.batch();
  let writtenCount = 0;

  batch.set(
    stationRef,
    {
      macAddress: input.device.macAddress ?? "",
      name: input.device.info?.name ?? "Ambient Station",
      location: input.device.info?.location ?? "",
      lastObservationAt:
        latestTimestamp > 0 ? Timestamp.fromMillis(latestTimestamp) : null,
      lastIngestedAt: FieldValue.serverTimestamp(),
      source: input.source,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  for (const observation of input.observations) {
    const timestamp = toWeatherTimestamp(observation.dateutc);

    if (timestamp === 0) {
      continue;
    }

    const readingRef = stationRef.collection("observations").doc(String(timestamp));

    batch.set(
      readingRef,
      {
        stationId,
        macAddress: input.device.macAddress ?? "",
        stationName: input.device.info?.name ?? "Ambient Station",
        stationLocation: input.device.info?.location ?? "",
        observedAt: Timestamp.fromMillis(timestamp),
        recordedFrom: input.source,
        ingestedAt: FieldValue.serverTimestamp(),
        temperatureF: pickNumber(observation, ["tempf"]),
        humidity: pickNumber(observation, ["humidity"]),
        windSpeedMph: pickNumber(observation, ["windspeedmph"]),
        windGustMph: pickNumber(observation, ["windgustmph"]),
        pressureInHg: pickNumber(observation, ["baromrelin", "baromabsin"]),
        rainTodayIn: pickNumber(observation, ["dailyrainin"]),
        uv: pickNumber(observation, ["uv"]),
        solarRadiation: pickNumber(observation, ["solarradiation"]),
        observation,
      },
      { merge: true },
    );

    writtenCount += 1;
  }

  await batch.commit();

  return {
    stationId,
    writtenCount,
    latestObservationAt:
      latestTimestamp > 0 ? new Date(latestTimestamp).toISOString() : null,
  };
}

export async function readStoredWeatherObservations(input: {
  macAddress?: string;
  range: WeatherHistoryRange;
}): Promise<WeatherObservation[]> {
  const stationId = buildStationId(input.macAddress);
  const db = getFirebaseAdminDb();
  const sinceMs = Date.now() - pickRangeDurationMs(input.range);
  const snapshot = await db
    .collection("weatherStations")
    .doc(stationId)
    .collection("observations")
    .where("observedAt", ">=", Timestamp.fromMillis(sinceMs))
    .orderBy("observedAt", "asc")
    .limit(4000)
    .get();

  return mapStoredObservations(snapshot.docs.map((doc) => doc.data()));
}

export async function readStoredWeatherObservationsForDay(input: {
  macAddress?: string;
  year: number;
  month: number;
  day: number;
}): Promise<WeatherObservation[]> {
  const stationId = buildStationId(input.macAddress);
  const db = getFirebaseAdminDb();
  const start = new Date(Date.UTC(input.year, input.month - 1, input.day, 0, 0, 0, 0));
  const end = new Date(Date.UTC(input.year, input.month - 1, input.day + 1, 0, 0, 0, 0));
  const snapshot = await db
    .collection("weatherStations")
    .doc(stationId)
    .collection("observations")
    .where("observedAt", ">=", Timestamp.fromMillis(start.getTime()))
    .where("observedAt", "<", Timestamp.fromMillis(end.getTime()))
    .orderBy("observedAt", "asc")
    .limit(4000)
    .get();

  return mapStoredObservations(snapshot.docs.map((doc) => doc.data()));
}

export async function readStoredWeatherObservationsBetween(input: {
  macAddress?: string;
  startMs: number;
  endMs: number;
  limit?: number;
}): Promise<WeatherObservation[]> {
  const stationId = buildStationId(input.macAddress);
  const db = getFirebaseAdminDb();
  const snapshot = await db
    .collection("weatherStations")
    .doc(stationId)
    .collection("observations")
    .where("observedAt", ">=", Timestamp.fromMillis(input.startMs))
    .where("observedAt", "<", Timestamp.fromMillis(input.endMs))
    .orderBy("observedAt", "asc")
    .limit(input.limit ?? 4000)
    .get();

  return mapStoredObservations(snapshot.docs.map((doc) => doc.data()));
}

export async function readStoredWeatherStationMeta(input: {
  macAddress?: string;
}): Promise<StoredWeatherStationMeta | null> {
  const stationId = buildStationId(input.macAddress);
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection("weatherStations").doc(stationId).get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data();

  if (!data) {
    return null;
  }

  return {
    name: typeof data.name === "string" ? data.name : "Ambient Station",
    location: typeof data.location === "string" ? data.location : "",
    lastObservationAt:
      data.lastObservationAt instanceof Timestamp
        ? data.lastObservationAt.toDate().toISOString()
        : null,
  };
}

export function buildStationId(macAddress?: string) {
  const base = (macAddress ?? "default-station").trim().toLowerCase();
  return base.replace(/[^a-z0-9_-]/g, "_");
}

function pickRangeDurationMs(range: WeatherHistoryRange) {
  if (range === "year") {
    return 365 * 24 * 60 * 60 * 1000;
  }

  if (range === "month") {
    return 31 * 24 * 60 * 60 * 1000;
  }

  return 7 * 24 * 60 * 60 * 1000;
}

function mapStoredObservations(
  rows: Array<Record<string, unknown>>,
): WeatherObservation[] {
  return rows
    .map((data) => {
      const observedAt = data.observedAt instanceof Timestamp ? data.observedAt.toMillis() : 0;
      const observation =
        data.observation && typeof data.observation === "object"
          ? (data.observation as WeatherObservation)
          : null;

      if (!observation || observedAt === 0) {
        return null;
      }

      return {
        ...observation,
        dateutc: observation.dateutc ?? observedAt,
        timestamp: observedAt,
      } as WeatherObservation;
    })
    .filter((observation): observation is NonNullable<typeof observation> => observation !== null);
}

function pickNumber(
  source: WeatherObservation,
  keys: readonly string[],
) {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}
