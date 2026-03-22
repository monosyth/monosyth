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

function buildStationId(macAddress?: string) {
  const base = (macAddress ?? "default-station").trim().toLowerCase();
  return base.replace(/[^a-z0-9_-]/g, "_");
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
