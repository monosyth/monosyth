const metricGrid = document.querySelector("#metric-grid");
const highlightGrid = document.querySelector("#highlight-grid");
const chartGrid = document.querySelector("#chart-grid");
const snapshotGrid = document.querySelector("#snapshot-grid");
const stationName = document.querySelector("#station-name");
const stationSummary = document.querySelector("#station-summary");
const lastUpdated = document.querySelector("#last-updated");
const refreshButton = document.querySelector("#refresh-button");
const rangeButtonGroup = document.querySelector("#range-button-group");
const rangeSummary = document.querySelector("#range-summary");

const metricTemplate = document.querySelector("#metric-card-template");
const highlightTemplate = document.querySelector("#highlight-card-template");
const snapshotTemplate = document.querySelector("#snapshot-item-template");
const rangeButtonTemplate = document.querySelector("#range-button-template");

let refreshTimer = null;
let currentRequestId = 0;
let currentController = null;
let latestPayload = null;
let activeRangeId = "6h";
let hasInitializedRange = false;

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

const rangeOptions = [
  { id: "1h", label: "1H", durationMs: 60 * 60 * 1000 },
  { id: "6h", label: "6H", durationMs: 6 * 60 * 60 * 1000 },
  { id: "24h", label: "24H", durationMs: 24 * 60 * 60 * 1000 },
  { id: "all", label: "All", durationMs: null },
];

refreshButton.addEventListener("click", () => {
  loadDashboard();
});

renderRangeButtons();
loadDashboard();
refreshTimer = window.setInterval(loadDashboard, 60_000);
window.addEventListener("beforeunload", stopDashboardPolling);

async function loadDashboard() {
  const requestId = currentRequestId + 1;
  currentRequestId = requestId;
  currentController?.abort();
  const controller = new AbortController();
  currentController = controller;
  refreshButton.disabled = true;

  try {
    const response = await fetch("/api/overview", {
      cache: "no-store",
      signal: controller.signal,
    });
    const payload = await response.json();

    if (requestId !== currentRequestId) {
      return;
    }

    if (!response.ok) {
      throw new Error(payload.error || "Failed to load the weather dashboard.");
    }

    latestPayload = payload;
    syncActiveRange(payload);
    renderDashboard(payload);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return;
    }

    if (requestId !== currentRequestId) {
      return;
    }

    renderError(error instanceof Error ? error.message : String(error));
  } finally {
    if (requestId === currentRequestId) {
      refreshButton.disabled = false;
    }

    if (currentController === controller) {
      currentController = null;
    }
  }
}

function stopDashboardPolling() {
  if (refreshTimer !== null) {
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  }

  currentController?.abort();
  currentController = null;
}

function renderDashboard(payload) {
  const derived = buildDerivedView(payload, activeRangeId);
  const station = payload.station || {};
  const location = station.location ? `${station.location}. ` : "";
  const selectedRange = getRangeOption(activeRangeId);
  const selectedLabel = selectedRange ? selectedRange.label : "All";
  const totalCount = Array.isArray(payload.observations) ? payload.observations.length : payload.observationCount || 0;

  stationName.textContent = station.name || "Your Weather Station";
  stationSummary.textContent = `${location}${derived.observationCount} observations in the ${selectedLabel.toLowerCase()} view, out of ${totalCount} loaded locally.`;
  lastUpdated.textContent = `Updated ${formatDate(payload.fetchedAt)}`;
  rangeSummary.textContent = describeRangeSummary(payload, derived);
  updateRangeButtons();

  renderMetricGrid(derived.metrics);
  renderHighlightGrid(derived.highlights);
  renderChartGrid(derived.series);
  renderSnapshotGrid(derived.snapshot);
}

function renderMetricGrid(metrics) {
  metricGrid.replaceChildren();

  if (!metrics.length) {
    metricGrid.appendChild(createState("No metric cards yet. Add keys and station data to populate this panel."));
    return;
  }

  for (const metric of metrics) {
    const node = metricTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".metric-label").textContent = metric.label;
    node.querySelector(".metric-value").textContent = metric.displayValue;
    metricGrid.appendChild(node);
  }
}

function renderHighlightGrid(highlights) {
  highlightGrid.replaceChildren();

  if (!highlights.length) {
    highlightGrid.appendChild(createState("Highlights will appear once enough recent observations are available."));
    return;
  }

  for (const highlight of highlights) {
    const node = highlightTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".highlight-label").textContent = highlight.label;
    node.querySelector(".highlight-value").textContent = highlight.value;
    highlightGrid.appendChild(node);
  }
}

function renderChartGrid(seriesList) {
  chartGrid.replaceChildren();

  if (!seriesList.length) {
    chartGrid.appendChild(createState("Trend charts need at least two observations with matching fields."));
    return;
  }

  for (const series of seriesList) {
    chartGrid.appendChild(createChartCard(series));
  }
}

function renderSnapshotGrid(snapshot) {
  snapshotGrid.replaceChildren();

  if (!snapshot.length) {
    snapshotGrid.appendChild(createState("The latest raw payload will show up here."));
    return;
  }

  for (const entry of snapshot) {
    const node = snapshotTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".snapshot-key").textContent = entry.key;
    node.querySelector(".snapshot-value").textContent = entry.value;
    snapshotGrid.appendChild(node);
  }
}

function renderError(message) {
  latestPayload = null;
  stationName.textContent = "Dashboard waiting on station data";
  stationSummary.textContent = "The local UI is up, but the server could not load Ambient Weather data yet.";
  lastUpdated.textContent = "Needs attention";
  rangeSummary.textContent = "Waiting on the first successful data load.";
  updateRangeButtons();

  const errorState = createState(message, true);

  metricGrid.replaceChildren(errorState.cloneNode(true));
  highlightGrid.replaceChildren(createState("Once the API call succeeds, rollup stats will appear here.", true));
  chartGrid.replaceChildren(createState("Trend charts will load automatically after the first successful fetch.", true));
  snapshotGrid.replaceChildren(createState("The raw station payload will appear here after a successful fetch.", true));
}

function createState(message, isError = false) {
  const node = document.createElement("div");
  node.className = isError ? "error-state" : "empty-state";
  node.textContent = message;
  return node;
}

function createChartCard(series) {
  const card = document.createElement("article");
  card.className = "chart-card";

  const rangeText = `${formatNumber(series.min, series.decimals)} to ${formatNumber(series.max, series.decimals)} ${series.unit}`.trim();

  card.innerHTML = `
    <div class="chart-header">
      <p class="chart-title">${series.label}</p>
      <p class="chart-range">${rangeText}</p>
    </div>
    ${createChartSvg(series)}
    <div class="chart-footer">
      <span>${series.points[0].label}</span>
      <span>${series.points.at(-1).label}</span>
    </div>
  `;

  return card;
}

function createChartSvg(series) {
  const width = 320;
  const height = 116;
  const min = series.min;
  const max = series.max;
  const span = max - min || 1;

  const points = series.points.map((point, index) => {
    const x = (index / Math.max(series.points.length - 1, 1)) * width;
    const y = height - ((point.value - min) / span) * (height - 10) - 5;
    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  const fillPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return `
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${series.label} trend">
      <line class="chart-axis" x1="0" y1="${height}" x2="${width}" y2="${height}"></line>
      <path class="chart-fill" d="${fillPath}"></path>
      <path class="chart-path" d="${linePath}"></path>
    </svg>
  `;
}

function renderRangeButtons() {
  rangeButtonGroup.replaceChildren();

  for (const option of rangeOptions) {
    const node = rangeButtonTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.range = option.id;
    node.textContent = option.label;
    node.addEventListener("click", () => {
      activeRangeId = option.id;
      hasInitializedRange = true;
      updateRangeButtons();

      if (latestPayload) {
        renderDashboard(latestPayload);
      }
    });
    rangeButtonGroup.appendChild(node);
  }

  updateRangeButtons();
}

function updateRangeButtons() {
  for (const button of rangeButtonGroup.querySelectorAll(".range-button")) {
    const isActive = button.dataset.range === activeRangeId;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
    button.disabled = !latestPayload;
  }
}

function syncActiveRange(payload) {
  if (hasInitializedRange) {
    return;
  }

  if (!Array.isArray(payload.observations) || !payload.observations.length) {
    activeRangeId = "all";
    hasInitializedRange = true;
    return;
  }

  const spanMs = payload.timeRange?.spanMs ?? 0;

  if (spanMs >= 24 * 60 * 60 * 1000) {
    activeRangeId = "24h";
  } else if (spanMs >= 6 * 60 * 60 * 1000) {
    activeRangeId = "6h";
  } else if (spanMs >= 60 * 60 * 1000) {
    activeRangeId = "1h";
  } else {
    activeRangeId = "all";
  }

  hasInitializedRange = true;
}

function buildDerivedView(payload, rangeId) {
  const observations = Array.isArray(payload.observations) ? payload.observations : [];
  const filteredObservations = filterObservationsByRange(observations, rangeId);
  const latest = filteredObservations.at(-1) || null;

  return {
    observationCount: filteredObservations.length,
    metrics: buildMetrics(latest),
    highlights: buildHighlights(filteredObservations),
    series: buildSeries(filteredObservations),
    snapshot: latest ? flattenSnapshot(latest) : [],
  };
}

function filterObservationsByRange(observations, rangeId) {
  if (!observations.length) {
    return [];
  }

  const option = getRangeOption(rangeId);

  if (!option || option.durationMs === null) {
    return observations;
  }

  const endTimestamp = observations.at(-1)?.timestamp ?? 0;
  const cutoff = endTimestamp - option.durationMs;
  const filtered = observations.filter((observation) => (observation.timestamp ?? 0) >= cutoff);

  return filtered.length ? filtered : observations.slice(-1);
}

function getRangeOption(rangeId) {
  return rangeOptions.find((option) => option.id === rangeId) ?? null;
}

function describeRangeSummary(payload, derived) {
  const option = getRangeOption(activeRangeId);
  const timeRange = payload.timeRange || {};
  const startAt = timeRange.startAt ? formatDate(timeRange.startAt) : "unknown";
  const endAt = timeRange.endAt ? formatDate(timeRange.endAt) : "unknown";
  const loadedSpan = formatSpan(timeRange.spanMs ?? 0);

  if (!derived.observationCount) {
    return "No observations are loaded yet.";
  }

  if (!option || option.durationMs === null) {
    return `Showing the full loaded span from ${startAt} to ${endAt} across ${loadedSpan}.`;
  }

  return `Showing the last ${option.label.toLowerCase()} ending at ${endAt}. Loaded history spans ${loadedSpan} starting ${startAt}.`;
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
    createHighlight("Temperature Range", describeNumberRange(tempValues, 1, "F")),
    createHighlight("Humidity Range", describeNumberRange(humidityValues, 0, "%")),
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
      value: key === "timestamp" ? new Date(value).toLocaleString() : String(value),
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function createHighlight(label, value) {
  return value ? { label, value } : null;
}

function describeNumberRange(values, decimals, unit) {
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

function formatValue(value, decimals, unit) {
  const suffix = unit ? ` ${unit}` : "";
  return `${formatNumber(value, decimals)}${suffix}`;
}

function formatDate(value) {
  if (!value) {
    return "just now";
  }

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatNumber(value, decimals) {
  return Number(value).toLocaleString([], {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

function formatSpan(spanMs) {
  if (!spanMs) {
    return "less than an hour";
  }

  const totalHours = spanMs / (60 * 60 * 1000);

  if (totalHours < 1) {
    return `${Math.max(Math.round(spanMs / 60000), 1)} minutes`;
  }

  if (totalHours < 24) {
    return `${Number(totalHours.toFixed(1))} hours`;
  }

  return `${Number((totalHours / 24).toFixed(1))} days`;
}
