import { describeDevice } from "./ambient.mjs";
import { formatTimestamp, toTimestamp } from "./time.mjs";

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

export function buildOverviewPayload(device, observations, config = {}) {
  const chronological = [...observations]
    .map((observation) => normalizeObservation(observation))
    .filter((observation) => observation.timestamp)
    .sort((left, right) => left.timestamp - right.timestamp);

  const latest = chronological.at(-1) ?? null;
  return {
    fetchedAt: new Date().toISOString(),
    station: describeDevice(device),
    observationCount: chronological.length,
    observations: chronological,
    timeRange: buildTimeRange(chronological),
    current: latest,
    metrics: buildMetrics(latest),
    alerts: buildAlerts(chronological, latest, config?.alerts),
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

function buildTimeRange(observations) {
  if (!observations.length) {
    return {
      startAt: null,
      endAt: null,
      spanMs: 0,
    };
  }

  const startAt = observations[0].timestamp;
  const endAt = observations.at(-1).timestamp;

  return {
    startAt: new Date(startAt).toISOString(),
    endAt: new Date(endAt).toISOString(),
    spanMs: Math.max(endAt - startAt, 0),
  };
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

function buildAlerts(observations, latest, alertConfig = {}) {
  if (!observations.length || !latest) {
    return [];
  }

  const alerts = [];
  const freezeThreshold = normalizeThreshold(alertConfig.freezeTempF);
  const heatThreshold = normalizeThreshold(alertConfig.heatTempF);
  const windThreshold = normalizeThreshold(alertConfig.windMph);
  const gustThreshold = normalizeThreshold(alertConfig.gustMph);
  const hourlyRainThreshold = normalizeThreshold(alertConfig.hourlyRainIn);
  const uvThreshold = normalizeThreshold(alertConfig.uvIndex);
  const currentTemp = pickNumber(latest, ["tempf"]);
  const peakTemp = pickExtremeObservation(observations, ["tempf"], "max");
  const peakWind = pickExtremeObservation(observations, ["windspeedmph"], "max");
  const peakGust = pickExtremeObservation(observations, ["windgustmph"], "max");
  const peakHourlyRain = pickExtremeObservation(observations, ["hourlyrainin"], "max");
  const peakUv = pickExtremeObservation(observations, ["uv"], "max");

  if (freezeThreshold !== null && currentTemp !== null && currentTemp <= freezeThreshold) {
    alerts.push(
      createAlert({
        id: "freeze-risk",
        severity: currentTemp <= freezeThreshold - 4 ? "danger" : "warning",
        title: "Freeze risk",
        value: formatValue(currentTemp, 1, "F"),
        summary: `Outdoor temperature is at or below the ${formatNumber(freezeThreshold, 1)} F freeze threshold.`,
        detail: `Observed ${formatTimestamp(latest.timestamp)}`,
      }),
    );
  }

  if (heatThreshold !== null && peakTemp && peakTemp.value >= heatThreshold) {
    alerts.push(
      createAlert({
        id: "heat-spike",
        severity: peakTemp.value >= heatThreshold + 5 ? "danger" : "warning",
        title: "Heat spike",
        value: formatValue(peakTemp.value, 1, "F"),
        summary: `Peak temperature in the loaded history reached or exceeded the ${formatNumber(heatThreshold, 1)} F alert level.`,
        detail: `Peak observed ${formatTimestamp(peakTemp.timestamp)}`,
      }),
    );
  }

  const windAlert = buildWindAlert({
    peakWind,
    windThreshold,
    peakGust,
    gustThreshold,
  });

  if (windAlert) {
    alerts.push(windAlert);
  }

  if (hourlyRainThreshold !== null && peakHourlyRain && peakHourlyRain.value >= hourlyRainThreshold) {
    alerts.push(
      createAlert({
        id: "heavy-rain",
        severity: peakHourlyRain.value >= hourlyRainThreshold * 2 ? "danger" : "warning",
        title: "Heavy rain",
        value: formatValue(peakHourlyRain.value, 2, "in"),
        summary: `Hourly rainfall met or exceeded the ${formatNumber(hourlyRainThreshold, 2)} in alert threshold.`,
        detail: `Peak observed ${formatTimestamp(peakHourlyRain.timestamp)}`,
      }),
    );
  }

  if (uvThreshold !== null && peakUv && peakUv.value >= uvThreshold) {
    alerts.push(
      createAlert({
        id: "high-uv",
        severity: peakUv.value >= uvThreshold + 2 ? "danger" : "warning",
        title: "High UV",
        value: formatValue(peakUv.value, 1, ""),
        summary: `UV exposure reached or exceeded the index ${formatNumber(uvThreshold, 1)} alert threshold.`,
        detail: `Peak observed ${formatTimestamp(peakUv.timestamp)}`,
      }),
    );
  }

  return alerts.sort(compareAlerts);
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
  ].filter(Boolean);
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
      value: key === "timestamp" ? formatTimestamp(value) : String(value),
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function buildWindAlert({ peakWind, windThreshold, peakGust, gustThreshold }) {
  const gustExceeded =
    gustThreshold !== null &&
    peakGust &&
    peakGust.value >= gustThreshold;
  const windExceeded =
    windThreshold !== null &&
    peakWind &&
    peakWind.value >= windThreshold;

  if (!gustExceeded && !windExceeded) {
    return null;
  }

  if (gustExceeded && (!windExceeded || peakGust.value / gustThreshold >= peakWind.value / windThreshold)) {
    return createAlert({
      id: "strong-wind",
      severity: peakGust.value >= gustThreshold + 10 ? "danger" : "warning",
      title: "Strong wind",
      value: formatValue(peakGust.value, 1, "mph"),
      summary: `Peak gust met or exceeded the ${formatNumber(gustThreshold, 1)} mph gust threshold.`,
      detail: `Peak observed ${formatTimestamp(peakGust.timestamp)}`,
    });
  }

  return createAlert({
    id: "strong-wind",
    severity: peakWind.value >= windThreshold + 5 ? "danger" : "warning",
    title: "Strong wind",
    value: formatValue(peakWind.value, 1, "mph"),
    summary: `Sustained wind met or exceeded the ${formatNumber(windThreshold, 1)} mph wind threshold.`,
    detail: `Peak observed ${formatTimestamp(peakWind.timestamp)}`,
  });
}

function createHighlight(label, value) {
  return value ? { label, value } : null;
}

function createAlert(alert) {
  return alert;
}

function compareAlerts(left, right) {
  const severityOrder = {
    danger: 0,
    warning: 1,
    notice: 2,
  };

  const leftRank = severityOrder[left?.severity] ?? Number.MAX_SAFE_INTEGER;
  const rightRank = severityOrder[right?.severity] ?? Number.MAX_SAFE_INTEGER;

  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  return String(left?.title ?? "").localeCompare(String(right?.title ?? ""));
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

function pickExtremeObservation(observations, keys, mode) {
  let match = null;

  for (const observation of observations) {
    const value = pickNumber(observation, keys);

    if (value === null || !observation.timestamp) {
      continue;
    }

    if (!match) {
      match = { value, timestamp: observation.timestamp };
      continue;
    }

    if (mode === "min" ? value < match.value : value > match.value) {
      match = { value, timestamp: observation.timestamp };
    }
  }

  return match;
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

function normalizeThreshold(value) {
  return Number.isFinite(value) ? value : null;
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
