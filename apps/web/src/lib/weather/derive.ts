import type {
  WeatherHighlight,
  WeatherMetric,
  WeatherObservation,
  WeatherSeries,
  WeatherSnapshotItem,
  WeatherTimeRange,
} from "@/lib/weather/types";
import {
  formatWeatherClock,
  formatWeatherLong,
  toWeatherTimestamp,
} from "@/lib/weather/time";

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
  { id: "solar", label: "Solar", keys: ["solarradiation"], unit: "W/m2", decimals: 0 },
  { id: "rain", label: "Daily Rain", keys: ["dailyrainin"], unit: "in", decimals: 2 },
] as const;

export function normalizeWeatherObservations(observations: WeatherObservation[]) {
  return [...observations]
    .map((observation) => ({
      ...observation,
      timestamp: toWeatherTimestamp(observation.dateutc),
    }))
    .filter((observation) => (observation.timestamp ?? 0) > 0)
    .sort((left, right) => (left.timestamp ?? 0) - (right.timestamp ?? 0));
}

export function buildWeatherTimeRange(observations: WeatherObservation[]): WeatherTimeRange {
  if (!observations.length) {
    return {
      startAt: null,
      endAt: null,
      spanMs: 0,
    };
  }

  const startAt = observations[0].timestamp ?? 0;
  const endAt = observations.at(-1)?.timestamp ?? 0;

  return {
    startAt: startAt > 0 ? new Date(startAt).toISOString() : null,
    endAt: endAt > 0 ? new Date(endAt).toISOString() : null,
    spanMs: Math.max(endAt - startAt, 0),
  };
}

export function buildWeatherMetrics(latest: WeatherObservation | null): WeatherMetric[] {
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

export function buildWeatherHighlights(observations: WeatherObservation[]): WeatherHighlight[] {
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

export function buildWeatherSeries(observations: WeatherObservation[]): WeatherSeries[] {
  const series: WeatherSeries[] = [];

  for (const definition of seriesDefinitions) {
    const points = observations
      .map((observation) => {
        const value = pickNumber(observation, definition.keys);
        const timestamp = toWeatherTimestamp(observation.timestamp);

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

export function flattenWeatherSnapshot(latest: WeatherObservation): WeatherSnapshotItem[] {
  return Object.entries(latest)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => ({
      key,
      value: key === "timestamp" ? formatTimestamp(value) : String(value),
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function formatTimestamp(value: unknown) {
  const timestamp = toWeatherTimestamp(value);

  if (timestamp === 0) {
    return "";
  }

  return formatWeatherLong(timestamp);
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
