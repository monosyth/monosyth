import { describeDevice } from "./ambient.mjs";

const metricDefinitions = [
  { id: "temperature", label: "Outdoor Temp", keys: ["tempf"], unit: "F", decimals: 1 },
  { id: "humidity", label: "Humidity", keys: ["humidity"], unit: "%", decimals: 0 },
  { id: "wind", label: "Wind Speed", keys: ["windspeedmph"], unit: "mph", decimals: 1 },
  { id: "gust", label: "Wind Gust", keys: ["windgustmph"], unit: "mph", decimals: 1 },
  { id: "pressure", label: "Pressure", keys: ["baromrelin", "baromabsin"], unit: "inHg", decimals: 2 },
  { id: "rainToday", label: "Rain Today", keys: ["dailyrainin"], unit: "in", decimals: 2 },
  { id: "uv", label: "UV Index", keys: ["uv"], unit: "", decimals: 1 },
  { id: "solar", label: "Solar", keys: ["solarradiation"], unit: "W/m2", decimals: 0 },
];

const seriesDefinitions = [
  { id: "temperature", label: "Temperature", keys: ["tempf"], unit: "F", decimals: 1 },
  { id: "humidity", label: "Humidity", keys: ["humidity"], unit: "%", decimals: 0 },
  { id: "wind", label: "Wind Speed", keys: ["windspeedmph"], unit: "mph", decimals: 1 },
  { id: "rain", label: "Daily Rain", keys: ["dailyrainin"], unit: "in", decimals: 2 },
];

export function buildOverviewPayload(device, observations) {
  const chronological = [...observations]
    .map((observation) => normalizeObservation(observation))
    .filter((observation) => observation.timestamp)
    .sort((left, right) => left.timestamp - right.timestamp);

  const latest = chronological.at(-1) ?? null;

  return {
    fetchedAt: new Date().toISOString(),
    station: describeDevice(device),
    observationCount: chronological.length,
    current: latest,
    metrics: buildMetrics(latest),
    highlights: buildHighlights(chronological),
    series: buildSeries(chronological),
    snapshot: latest ? flattenSnapshot(latest) : [],
  };
}

function normalizeObservation(observation) {
  const normalized = { ...observation };
  normalized.timestamp = toTimestamp(observation?.dateutc);
  return normalized;
}

function buildMetrics(latest) {
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
        value,
        unit: definition.unit,
        displayValue: formatValue(value, definition.decimals, definition.unit),
      };
    })
    .filter(Boolean);
}

function buildHighlights(observations) {
  if (!observations.length) {
    return [];
  }

  const tempValues = collectNumbers(observations, ["tempf"]);
  const humidityValues = collectNumbers(observations, ["humidity"]);
  const gustValues = collectNumbers(observations, ["windgustmph"]);
  const windValues = collectNumbers(observations, ["windspeedmph"]);
  const rainValues = collectNumbers(observations, ["dailyrainin"]);

  return [
    createHighlight("Temperature Range", describeRange(tempValues, 1, "F")),
    createHighlight("Humidity Range", describeRange(humidityValues, 0, "%")),
    createHighlight("Peak Gust", describeMax(gustValues, 1, "mph")),
    createHighlight("Average Wind", describeAverage(windValues, 1, "mph")),
    createHighlight("Rain So Far", describeMax(rainValues, 2, "in")),
  ].filter((item) => item.value);
}

function buildSeries(observations) {
  return seriesDefinitions
    .map((definition) => {
      const points = observations
        .map((observation) => {
          const value = pickNumber(observation, definition.keys);

          if (value === null || !observation.timestamp) {
            return null;
          }

          return {
            timestamp: observation.timestamp,
            value,
            label: new Date(observation.timestamp).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            }),
          };
        })
        .filter(Boolean);

      if (points.length < 2) {
        return null;
      }

      return {
        id: definition.id,
        label: definition.label,
        unit: definition.unit,
        decimals: definition.decimals,
        min: Math.min(...points.map((point) => point.value)),
        max: Math.max(...points.map((point) => point.value)),
        points,
      };
    })
    .filter(Boolean);
}

function flattenSnapshot(latest) {
  return Object.entries(latest)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => ({
      key,
      value: key === "timestamp" ? new Date(value).toLocaleString() : String(value),
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function createHighlight(label, value) {
  return value ? { label, value } : null;
}

function describeRange(values, decimals, unit) {
  if (values.length < 2) {
    return "";
  }

  return `${formatNumber(Math.min(...values), decimals)}${unit} to ${formatNumber(Math.max(...values), decimals)}${unit}`;
}

function describeMax(values, decimals, unit) {
  if (!values.length) {
    return "";
  }

  return `${formatNumber(Math.max(...values), decimals)}${unit}`;
}

function describeAverage(values, decimals, unit) {
  if (!values.length) {
    return "";
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return `${formatNumber(average, decimals)}${unit}`;
}

function collectNumbers(observations, keys) {
  return observations
    .map((observation) => pickNumber(observation, keys))
    .filter((value) => value !== null);
}

function pickNumber(source, keys) {
  for (const key of keys) {
    const value = toFiniteNumber(source?.[key]);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function toFiniteNumber(value) {
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

function toTimestamp(value) {
  if (!value) {
    return 0;
  }

  if (typeof value === "number") {
    return value > 1e12 ? value : value * 1000;
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    return parsed > 1e12 ? parsed : parsed * 1000;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatValue(value, decimals, unit) {
  const suffix = unit ? ` ${unit}` : "";
  return `${formatNumber(value, decimals)}${suffix}`;
}

function formatNumber(value, decimals) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}
