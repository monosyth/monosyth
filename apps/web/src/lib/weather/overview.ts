import type {
  WeatherForecastPeriod,
  WeatherObservation,
  WeatherOverview,
  WeatherStationSummary,
} from "@/lib/weather/types";
import { formatWeatherLong } from "@/lib/weather/time";
import {
  buildWeatherHighlights,
  buildWeatherMetrics,
  buildWeatherSeries,
  buildWeatherTimeRange,
  flattenWeatherSnapshot,
  normalizeWeatherObservations,
} from "@/lib/weather/derive";

type WeatherDevice = {
  macAddress?: string;
  info?: {
    name?: string;
    location?: string;
  };
  lastData?: {
    dateutc?: string | number;
  };
};

const DEFAULT_STATION_LOCATION = "Shoreline, WA";

export function buildWeatherOverview(
  device: WeatherDevice,
  observations: WeatherObservation[],
  forecast: WeatherForecastPeriod[] = [],
): WeatherOverview {
  const chronological = normalizeWeatherObservations(observations);
  const latest = chronological.at(-1) ?? null;

  return {
    fetchedAt: new Date().toISOString(),
    observationCount: chronological.length,
    station: describeDevice(device, latest),
    observations: chronological,
    timeRange: buildWeatherTimeRange(chronological),
    metrics: buildWeatherMetrics(latest),
    highlights: buildWeatherHighlights(chronological),
    series: buildWeatherSeries(chronological),
    snapshot: latest ? flattenWeatherSnapshot(latest) : [],
    forecast,
  };
}

function describeDevice(
  device: WeatherDevice,
  latest: WeatherObservation | null,
): WeatherStationSummary {
  const latitude = pickNumber(latest ?? {}, ["lat", "latitude"]);
  const longitude = pickNumber(latest ?? {}, ["lon", "long", "longitude"]);

  return {
    name: device.info?.name ?? "Ambient Station",
    location: device.info?.location?.trim() || DEFAULT_STATION_LOCATION,
    macAddress: device.macAddress ?? "",
    lastObservationAt: formatTimestamp(device.lastData?.dateutc),
    latitude,
    longitude,
  };
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

function formatTimestamp(value: unknown) {
  if (typeof value === "number") {
    return formatWeatherLong(value > 1e12 ? value : value * 1000);
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    return formatWeatherLong(parsed > 1e12 ? parsed : parsed * 1000);
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? formatWeatherLong(parsed) : "";
  }

  return "";
}
