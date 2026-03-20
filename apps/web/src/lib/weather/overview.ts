import type {
  WeatherForecastPeriod,
  WeatherHighlight,
  WeatherOverview,
  WeatherSeries,
  WeatherSnapshotItem,
  WeatherStationSummary,
} from "@/lib/weather/types";
import {
  formatWeatherClock,
  formatWeatherLong,
} from "@/lib/weather/time";

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

type WeatherObservation = Record<string, string | number | null | undefined>;

const metricDefinitions = [
  { id: "temperature", label: "Outdoor Temp", keys: ["tempf"], unit: "F", decimals: 1 },
  { id: "humidity", label: "Humidity", keys: ["humidity"], unit: "%", decimals: 0 },
  { id: "wind", label: "Wind Speed", keys: ["windspeedmph"], unit: "mph", decimals: 1 },
  { id: "gust", label: "Wind Gust", keys: ["windgustmph"], unit: "mph", decimals: 1 },
  { id: "pressure", label: "Pressure", keys: ["baromrelin", "baromabsin"], unit: "inHg", decimals: 2 },
  { id: "rainToday", label: "Rain Today", keys: ["dailyrainin"], unit: "in", decimals: 2 },
  { id: "uv", label: "UV Index", keys: ["uv"], unit: "", decimals: 1 },
  { id: "solar", label: "Solar", keys: ["solarradiation"], unit: "W/m2", decimals: 0 },
] as const;

const seriesDefinitions = [
  { id: "temperature", label: "Temperature", keys: ["tempf"], unit: "F", decimals: 1 },
  { id: "humidity", label: "Humidity", keys: ["humidity"], unit: "%", decimals: 0 },
  { id: "wind", label: "Wind Speed", keys: ["windspeedmph"], unit: "mph", decimals: 1 },
  { id: "pressure", label: "Pressure", keys: ["baromrelin", "baromabsin"], unit: "inHg", decimals: 2 },
  { id: "rain", label: "Daily Rain", keys: ["dailyrainin"], unit: "in", decimals: 2 },
] as const;

export function buildWeatherOverview(
  device: WeatherDevice,
  observations: WeatherObservation[],
  forecast: WeatherForecastPeriod[] = [],
): WeatherOverview {
  const chronological = [...observations]
    .map((observation) => normalizeObservation(observation))
    .filter((observation) => observation.timestamp > 0)
    .sort((left, right) => left.timestamp - right.timestamp);

  const latest = chronological.at(-1) ?? null;

  return {
    fetchedAt: new Date().toISOString(),
    observationCount: chronological.length,
    station: describeDevice(device, latest),
    metrics: buildMetrics(latest),
    highlights: buildHighlights(chronological),
    series: buildSeries(chronological),
    snapshot: latest ? flattenSnapshot(latest) : [],
    forecast,
  };
}

function normalizeObservation(observation: WeatherObservation) {
  return {
    ...observation,
    timestamp: toTimestamp(observation.dateutc),
  };
}

function describeDevice(
  device: WeatherDevice,
  latest: WeatherObservation | null,
): WeatherStationSummary {
  return {
    name: device.info?.name ?? "Ambient Station",
    location: device.info?.location ?? "",
    macAddress: device.macAddress ?? "",
    lastObservationAt: formatTimestamp(device.lastData?.dateutc),
    latitude: pickNumber(latest ?? {}, ["lat", "latitude"]),
    longitude: pickNumber(latest ?? {}, ["lon", "long", "longitude"]),
  };
}

function buildMetrics(latest: WeatherObservation | null) {
  if (!latest) {
    return [];
  }

  return metricDefinitions
    .map((definition) => {
      const value = pickNumber(latest, definition.keys);

      if (value === null) {
        return null;
      }

      return {
        id: definition.id,
        label: definition.label,
        displayValue: formatValue(value, definition.decimals, definition.unit),
        value,
        unit: definition.unit,
      };
    })
    .filter((value): value is NonNullable<typeof value> => value !== null);
}

function buildHighlights(observations: WeatherObservation[]): WeatherHighlight[] {
  if (!observations.length) {
    return [];
  }

  const temperatureValues = collectNumbers(observations, ["tempf"]);
  const humidityValues = collectNumbers(observations, ["humidity"]);
  const gustValues = collectNumbers(observations, ["windgustmph"]);
  const windValues = collectNumbers(observations, ["windspeedmph"]);
  const rainValues = collectNumbers(observations, ["dailyrainin"]);

  return [
    createHighlight("Temperature Range", describeRange(temperatureValues, 1, "F")),
    createHighlight("Humidity Range", describeRange(humidityValues, 0, "%")),
    createHighlight("Peak Gust", describeMax(gustValues, 1, "mph")),
    createHighlight("Average Wind", describeAverage(windValues, 1, "mph")),
    createHighlight("Rain So Far", describeMax(rainValues, 2, "in")),
  ].filter((value): value is WeatherHighlight => value !== null);
}

function buildSeries(observations: WeatherObservation[]): WeatherSeries[] {
  const series: WeatherSeries[] = [];

  for (const definition of seriesDefinitions) {
    const points = observations
      .map((observation) => {
        const value = pickNumber(observation, definition.keys);
        const timestamp = toTimestamp(observation.timestamp);

        if (value === null || timestamp === 0) {
          return null;
        }

        return {
          timestamp,
          value,
          label: formatWeatherClock(timestamp),
        };
      })
      .filter((value): value is NonNullable<typeof value> => value !== null);

    if (points.length < 2) {
      continue;
    }

    series.push({
      id: definition.id,
      label: definition.label,
      unit: definition.unit,
      decimals: definition.decimals,
      min: Math.min(...points.map((point) => point.value)),
      max: Math.max(...points.map((point) => point.value)),
      points,
    });
  }

  return series;
}

function flattenSnapshot(latest: WeatherObservation): WeatherSnapshotItem[] {
  return Object.entries(latest)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => ({
      key,
      value: key === "timestamp" ? formatTimestamp(value) : String(value),
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function createHighlight(label: string, value: string) {
  return value ? { label, value } : null;
}

function collectNumbers(observations: WeatherObservation[], keys: readonly string[]) {
  return observations
    .map((observation) => pickNumber(observation, keys))
    .filter((value): value is number => value !== null);
}

function pickNumber(source: WeatherObservation, keys: readonly string[]) {
  for (const key of keys) {
    const value = toFiniteNumber(source[key]);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function toFiniteNumber(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function toTimestamp(value: unknown) {
  if (typeof value === "number") {
    return value > 1e12 ? value : value * 1000;
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    return parsed > 1e12 ? parsed : parsed * 1000;
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatTimestamp(value: unknown) {
  const timestamp = toTimestamp(value);

  if (timestamp === 0) {
    return "";
  }

  return formatWeatherLong(timestamp);
}

function describeRange(values: number[], decimals: number, unit: string) {
  if (values.length < 2) {
    return "";
  }

  return `${formatNumber(Math.min(...values), decimals)}${unit} to ${formatNumber(Math.max(...values), decimals)}${unit}`;
}

function describeMax(values: number[], decimals: number, unit: string) {
  if (!values.length) {
    return "";
  }

  return `${formatNumber(Math.max(...values), decimals)}${unit}`;
}

function describeAverage(values: number[], decimals: number, unit: string) {
  if (!values.length) {
    return "";
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return `${formatNumber(average, decimals)}${unit}`;
}

function formatValue(value: number, decimals: number, unit: string) {
  const suffix = unit ? ` ${unit}` : "";
  return `${formatNumber(value, decimals)}${suffix}`;
}

function formatNumber(value: number, decimals: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}
