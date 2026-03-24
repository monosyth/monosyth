const currentConditionsBody = document.querySelector("#current-conditions-body");
const daySummaryBody = document.querySelector("#day-summary-body");
const recentSummaryBody = document.querySelector("#recent-summary-body");
const stationDetailsBody = document.querySelector("#station-details-body");
const rawSnapshotBody = document.querySelector("#raw-snapshot-body");
const mastheadDetailsBody = document.querySelector("#masthead-details-body");
const chartGrid = document.querySelector("#chart-grid");
const alertsGrid = document.querySelector("#alerts-grid");
const stationName = document.querySelector("#station-name");
const stationMeta = document.querySelector("#station-meta");
const stationSummary = document.querySelector("#station-summary");
const lastUpdated = document.querySelector("#last-updated");
const refreshButton = document.querySelector("#refresh-button");
const loadingStatus = document.querySelector("#loading-status");
const loadingStatusLabel = document.querySelector("#loading-status-label");
const rangeButtonGroup = document.querySelector("#range-button-group");
const rangeSummary = document.querySelector("#range-summary");
const rangeButtonTemplate = document.querySelector("#range-button-template");
const navToggle = document.querySelector("#nav-toggle");
const navMenu = document.querySelector("#nav-menu");
const sectionNav = document.querySelector(".section-nav");
const sectionLinks = Array.from(navMenu?.querySelectorAll(".section-nav__link") ?? []);

let refreshTimer = null;
let currentRequestId = 0;
let currentController = null;
let latestPayload = null;
let activeRangeId = "6h";
let activeSectionId = "";
let hasInitializedRange = false;
let loadingTitleTimer = null;
let loadingTitleFrameIndex = 0;
let resolvedDocumentTitle = document.title || "Monosyth Weather";
let pendingRangeRenderId = 0;
let sectionScrollFrame = 0;
let derivedViewCacheKey = "";
const derivedViewCache = new Map();
const defaultRefreshIntervalMs = 60_000;
const rateLimitRefreshIntervalMs = 15 * 60_000;
const loadingTitleFrames = ["WX Scan |", "WX Scan /", "WX Scan -", "WX Scan \\"];

const currentConditionDefinitions = [
  { label: "Outside Temperature", keys: ["tempf"], decimals: 1, unit: "F" },
  { label: "Feels Like", keys: ["feelsLike"], decimals: 1, unit: "F" },
  { label: "Dewpoint", keys: ["dewPoint", "dewpoint"], decimals: 1, unit: "F" },
  { label: "Humidity", keys: ["humidity"], decimals: 0, unit: "%" },
  { label: "Barometer", keys: ["baromrelin", "baromabsin"], decimals: 3, unit: "inHg" },
  { label: "Wind", render: (observation) => formatWind(observation, "windspeedmph", "winddir") },
  { label: "Wind Gust", render: (observation) => formatWind(observation, "windgustmph", "winddir") },
  { label: "Hourly Rain", keys: ["hourlyrainin"], decimals: 2, unit: "in" },
  { label: "Daily Rain", keys: ["dailyrainin"], decimals: 2, unit: "in" },
  { label: "UV Index", keys: ["uv"], decimals: 1, unit: "" },
  { label: "Solar Radiation", keys: ["solarradiation"], decimals: 0, unit: "W/m2" },
  { label: "Brightness", keys: ["brightness", "lux"], decimals: 0, unit: "lx" },
  { label: "Lightning Strikes", keys: ["lightning_day", "lightning"], decimals: 0, unit: "" },
];

const seriesDefinitions = [
  { id: "temperature", label: "Temperature", keys: ["tempf"], unit: "F", decimals: 1 },
  { id: "dewpoint", label: "Dewpoint", keys: ["dewPoint", "dewpoint"], unit: "F", decimals: 1 },
  { id: "humidity", label: "Humidity", keys: ["humidity"], unit: "%", decimals: 0 },
  { id: "pressure", label: "Barometer", keys: ["baromrelin", "baromabsin"], unit: "inHg", decimals: 3 },
  { id: "wind", label: "Wind Speed", keys: ["windspeedmph"], unit: "mph", decimals: 1 },
  { id: "gust", label: "Wind Gust", keys: ["windgustmph"], unit: "mph", decimals: 1 },
  { id: "solar", label: "Solar Radiation", keys: ["solarradiation"], unit: "W/m2", decimals: 0 },
  { id: "uv", label: "UV Index", keys: ["uv"], unit: "", decimals: 1 },
  { id: "rain", label: "Daily Rain", keys: ["dailyrainin"], unit: "in", decimals: 2 },
];

const rangeOptions = [
  { id: "1h", label: "1H", durationMs: 60 * 60 * 1000 },
  { id: "6h", label: "6H", durationMs: 6 * 60 * 60 * 1000 },
  { id: "24h", label: "24H", durationMs: 24 * 60 * 60 * 1000 },
  { id: "all", label: "All", durationMs: null },
];

const sectionTargets = sectionLinks
  .map((link) => {
    const href = link.getAttribute("href");

    if (!href?.startsWith("#")) {
      return null;
    }

    const id = href.slice(1);
    const element = document.getElementById(id);
    return element ? { id, element } : null;
  })
  .filter(Boolean);

refreshButton.addEventListener("click", () => {
  scheduleNextRefresh(0);
  loadDashboard();
});

navToggle?.addEventListener("click", () => {
  const isOpen = navMenu.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

for (const link of sectionLinks) {
  link.addEventListener("click", handleSectionLinkClick);
}

renderRangeButtons();
updateActiveSectionFromScroll();
loadDashboard();
window.addEventListener("beforeunload", stopDashboardPolling);
window.addEventListener("scroll", handleWindowScroll, { passive: true });

async function loadDashboard() {
  const requestId = currentRequestId + 1;
  currentRequestId = requestId;
  currentController?.abort();
  const controller = new AbortController();
  currentController = controller;
  refreshButton.disabled = true;
  setLoadingState(true, latestPayload ? "Refreshing station feed" : "Booting live weather link");
  let nextRefreshMs = defaultRefreshIntervalMs;

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
      const error = new Error(payload.error || "Failed to load the weather dashboard.");
      error.retryAfterSec = payload.retryAfterSec ?? null;
      throw error;
    }

    latestPayload = payload;
    syncActiveRange(payload);
    renderDashboard(payload);
    nextRefreshMs = getRecommendedRefreshMs(payload.responseMeta);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return;
    }

    if (requestId !== currentRequestId) {
      return;
    }

    renderError(error);
    nextRefreshMs = getRetryDelayMs(error);
  } finally {
    if (requestId === currentRequestId) {
      refreshButton.disabled = false;
      setLoadingState(false);
      scheduleNextRefresh(nextRefreshMs);
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
  setLoadingState(false);
}

function renderDashboard(payload) {
  const observations = Array.isArray(payload.observations) ? payload.observations : [];
  const derived = getDerivedView(payload, activeRangeId);
  const station = payload.station || {};
  const responseMeta = payload.responseMeta || {};
  setResolvedDocumentTitle(station.name ? `${station.name} | Monosyth Weather` : "Monosyth Weather");

  stationName.textContent = station.name || station.location || "Your Weather Station";
  lastUpdated.textContent = formatHeaderTimestamp(payload.fetchedAt);

  renderAlerts(payload.alerts || []);
  renderTwoColumnTable(
    currentConditionsBody,
    buildCurrentConditionRows(payload.current),
    "Current conditions will appear after the next successful station fetch.",
  );
  renderThreeColumnTable(
    daySummaryBody,
    buildDaySummaryRows(observations),
    "Today’s highs and lows will populate once observations are available for the current day.",
  );
  renderRangeDependentSections(payload, derived, responseMeta);
  updateActiveSectionFromScroll();
}

function renderError(error) {
  const message = error instanceof Error ? error.message : String(error);
  latestPayload = null;
  setResolvedDocumentTitle("Weather Feed Error | Monosyth Weather");
  stationName.textContent = "Weather dashboard waiting on station data";
  stationMeta.textContent = "The local page is available, but the server could not reach your Ambient Weather feed.";
  stationSummary.textContent = describeErrorSummary(error);
  lastUpdated.textContent = "Needs attention";
  rangeSummary.textContent = describeErrorRangeSummary(error);

  renderAlerts([], "Threshold alerts will appear after the first successful station fetch.");
  renderTwoColumnTable(currentConditionsBody, [], message);
  renderThreeColumnTable(
    daySummaryBody,
    [],
    "Once the API call succeeds, the daily summary table will appear here.",
  );
  renderThreeColumnTable(
    recentSummaryBody,
    [],
    "Range-based summary rows will appear here after a successful fetch.",
  );
  renderTwoColumnTable(
    stationDetailsBody,
    [],
    "Station metadata will appear here after the first successful load.",
  );
  renderTwoColumnTable(
    rawSnapshotBody,
    [],
    "The raw station payload will appear here after a successful fetch.",
  );
  renderChartGrid([]);
  setRangeRenderPending(false);
  updateRangeButtons();
}

function renderRangeDependentSections(payload, derived, responseMeta = {}) {
  const observations = Array.isArray(payload.observations) ? payload.observations : [];
  const station = payload.station || {};
  const totalCount = observations.length || payload.observationCount || 0;
  const activeRange = getRangeOption(activeRangeId);
  const activeRangeLabel = activeRange ? activeRange.label : "All";

  stationMeta.textContent = buildHeaderMeta(station, totalCount, activeRangeLabel);
  stationSummary.textContent = buildHeaderSummary(payload, derived, responseMeta);
  rangeSummary.textContent = describeRangeSummary(payload, derived, responseMeta);

  renderTwoColumnTable(
    mastheadDetailsBody,
    buildMastheadRows(payload, derived, responseMeta),
    "Station facts will appear after the first successful station fetch.",
  );
  renderThreeColumnTable(
    recentSummaryBody,
    buildRecentSummaryRows(payload, derived),
    "Recent view details will appear once the selected range includes enough observations.",
  );
  renderTwoColumnTable(
    stationDetailsBody,
    buildStationDetailRows(payload, derived),
    "Station details will appear after the first successful load.",
  );
  renderTwoColumnTable(
    rawSnapshotBody,
    derived.snapshot,
    "The latest raw payload will show up here after a successful fetch.",
  );
  renderChartGrid(derived.series);
  setRangeRenderPending(false);
  updateRangeButtons();
}

function buildHeaderMeta(station, totalCount, activeRangeLabel) {
  const parts = [];

  if (station.location) {
    parts.push(station.location);
  }

  if (station.name) {
    parts.push(station.name);
  }

  parts.push(`${totalCount} readings loaded`);
  parts.push(`${activeRangeLabel} view`);

  return parts.join(" | ");
}

function buildHeaderSummary(payload, derived, responseMeta = {}) {
  const totalCount = Array.isArray(payload.observations) ? payload.observations.length : 0;
  const loadedSpan = formatSpan(payload.timeRange?.spanMs ?? 0);
  const alertCount = Array.isArray(payload.alerts) ? payload.alerts.length : 0;
  let summary = `${derived.observationCount} observations are active in the current window out of ${totalCount} loaded locally across ${loadedSpan}.`;

  if (responseMeta.warning) {
    summary = `${summary} ${responseMeta.warning}`;
  } else if (responseMeta.servedFromCache) {
    summary = `${summary} Served from the local cache to reduce Ambient API traffic.`;
  }

  if (alertCount) {
    summary = `${summary} ${alertCount} threshold alert${alertCount === 1 ? "" : "s"} active in the loaded history.`;
  }

  return summary;
}

function buildCurrentConditionRows(latest) {
  if (!latest) {
    return [];
  }

  return currentConditionDefinitions
    .map((definition) => {
      const value = definition.render
        ? definition.render(latest)
        : formatDefinitionValue(latest, definition.keys, definition.decimals, definition.unit);

      if (!value) {
        return null;
      }

      return {
        label: definition.label,
        value,
      };
    })
    .filter(Boolean);
}

function buildMastheadRows(payload, derived, responseMeta = {}) {
  const station = payload.station || {};
  const activeRange = getRangeOption(activeRangeId);

  return [
    { label: "Station", value: station.name || "Unknown station" },
    { label: "Observed", value: formatHeaderTimestamp(payload.timeRange?.endAt || payload.fetchedAt) },
    { label: "Window", value: activeRange ? activeRange.label : "All" },
    { label: "History", value: formatSpan(payload.timeRange?.spanMs ?? 0) },
    { label: "Cached", value: responseMeta.servedFromCache ? "Yes" : "No" },
    { label: "Visible", value: String(derived.observationCount) },
  ];
}

function buildDaySummaryRows(observations) {
  const todayObservations = filterObservationsForCurrentDay(observations);

  if (!todayObservations.length) {
    return [];
  }

  const rows = [
    createExtremeRow(todayObservations, "High Temperature", ["tempf"], "max", 1, "F"),
    createExtremeRow(todayObservations, "Low Temperature", ["tempf"], "min", 1, "F"),
    createExtremeRow(todayObservations, "High Dewpoint", ["dewPoint", "dewpoint"], "max", 1, "F"),
    createExtremeRow(todayObservations, "Low Dewpoint", ["dewPoint", "dewpoint"], "min", 1, "F"),
    createExtremeRow(todayObservations, "High Humidity", ["humidity"], "max", 0, "%"),
    createExtremeRow(todayObservations, "Low Humidity", ["humidity"], "min", 0, "%"),
    createExtremeRow(todayObservations, "High Barometer", ["baromrelin", "baromabsin"], "max", 3, "inHg"),
    createExtremeRow(todayObservations, "Low Barometer", ["baromrelin", "baromabsin"], "min", 3, "inHg"),
    createLatestValueRow(todayObservations, "Today's Rain", ["dailyrainin"], 2, "in"),
    createExtremeRow(todayObservations, "High Wind", ["windspeedmph"], "max", 1, "mph"),
    createAverageRow(todayObservations, "Average Wind", ["windspeedmph"], 1, "mph"),
    createExtremeRow(todayObservations, "Peak Gust", ["windgustmph"], "max", 1, "mph"),
    createExtremeRow(todayObservations, "High UV", ["uv"], "max", 1, ""),
    createExtremeRow(todayObservations, "High Radiation", ["solarradiation"], "max", 0, "W/m2"),
  ];

  return rows.filter(Boolean);
}

function buildRecentSummaryRows(payload, derived) {
  if (!derived.observationCount) {
    return [];
  }

  const filteredObservations = derived.observations || [];
  const activeRange = getRangeOption(activeRangeId);
  const firstTimestamp = filteredObservations[0]?.timestamp ?? null;
  const lastTimestamp = filteredObservations.at(-1)?.timestamp ?? null;
  const rows = [
    {
      label: "View Window",
      value: activeRange ? activeRange.label : "All",
      detail: firstTimestamp && lastTimestamp ? `${formatClock(firstTimestamp)} to ${formatClock(lastTimestamp)}` : "Current range",
    },
    {
      label: "Observations in View",
      value: String(derived.observationCount),
      detail: `${formatSpan(spanBetween(firstTimestamp, lastTimestamp))} loaded`,
    },
    createRangeRow(filteredObservations, "Temperature Range", ["tempf"], 1, "F"),
    createRangeRow(filteredObservations, "Humidity Range", ["humidity"], 0, "%"),
    createRangeRow(filteredObservations, "Pressure Range", ["baromrelin", "baromabsin"], 3, "inHg"),
    createExtremeRow(filteredObservations, "Peak Gust", ["windgustmph"], "max", 1, "mph"),
    createAverageRow(filteredObservations, "Average Wind", ["windspeedmph"], 1, "mph"),
    createLatestValueRow(filteredObservations, "Rain So Far", ["dailyrainin"], 2, "in"),
    createExtremeRow(filteredObservations, "High UV", ["uv"], "max", 1, ""),
    createExtremeRow(filteredObservations, "High Radiation", ["solarradiation"], "max", 0, "W/m2"),
  ];

  return rows.filter(Boolean);
}

function buildStationDetailRows(payload, derived) {
  const station = payload.station || {};
  const activeRange = getRangeOption(activeRangeId);
  const totalCount = Array.isArray(payload.observations) ? payload.observations.length : 0;

  return [
    { label: "Station", value: station.name || "Unknown station" },
    { label: "Location", value: station.location || "Location not provided" },
    { label: "Last Station Report", value: station.lastObservationAt || formatHeaderTimestamp(payload.timeRange?.endAt) },
    { label: "Data Source", value: "Ambient Weather REST" },
    { label: "Loaded Observations", value: String(totalCount) },
    { label: "Loaded History", value: formatSpan(payload.timeRange?.spanMs ?? 0) },
    { label: "Active View", value: activeRange ? activeRange.label : "All" },
    { label: "Visible Observations", value: String(derived.observationCount) },
    { label: "Refresh Cadence", value: "60 seconds" },
  ];
}

function renderAlerts(alerts, emptyMessage = "No active threshold alerts in the loaded history.") {
  alertsGrid.replaceChildren();

  if (!Array.isArray(alerts) || !alerts.length) {
    alertsGrid.appendChild(createState(emptyMessage));
    return;
  }

  for (const alert of alerts) {
    alertsGrid.appendChild(createAlertCard(alert));
  }
}

function createAlertCard(alert) {
  const severity = normalizeAlertSeverity(alert?.severity);
  const card = document.createElement("article");
  card.className = `alert-card alert-card--${severity}`;

  const eyebrow = document.createElement("p");
  eyebrow.className = "alert-card__eyebrow";
  eyebrow.textContent = formatAlertSeverity(severity);

  const titleRow = document.createElement("div");
  titleRow.className = "alert-card__title-row";

  const title = document.createElement("h3");
  title.className = "alert-card__title";
  title.textContent = alert?.title || "Station alert";

  const value = document.createElement("p");
  value.className = "alert-card__value";
  value.textContent = alert?.value || "Active";

  titleRow.append(title, value);

  const summary = document.createElement("p");
  summary.className = "alert-card__summary";
  summary.textContent = alert?.summary || "Threshold criteria were met in the loaded observations.";

  const detail = document.createElement("p");
  detail.className = "alert-card__detail";
  detail.textContent = alert?.detail || "Observed in the current history window.";

  card.append(eyebrow, titleRow, summary, detail);
  return card;
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

function renderTwoColumnTable(tbody, rows, emptyMessage) {
  tbody.replaceChildren();

  if (!rows.length) {
    tbody.appendChild(createTableStateRow(emptyMessage, 2));
    return;
  }

  for (const row of rows) {
    const tableRow = document.createElement("tr");
    tableRow.append(
      createCell(row.label),
      createCell(row.value, "weather-table__value"),
    );
    tbody.appendChild(tableRow);
  }
}

function renderThreeColumnTable(tbody, rows, emptyMessage) {
  tbody.replaceChildren();

  if (!rows.length) {
    tbody.appendChild(createTableStateRow(emptyMessage, 3));
    return;
  }

  for (const row of rows) {
    const tableRow = document.createElement("tr");
    tableRow.append(
      createCell(row.label),
      createCell(row.value, "weather-table__value"),
      createCell(row.detail || "—", "weather-table__detail"),
    );
    tbody.appendChild(tableRow);
  }
}

function createCell(value, className = "") {
  const cell = document.createElement("td");
  cell.textContent = value;

  if (className) {
    cell.className = className;
  }

  return cell;
}

function createTableStateRow(message, colSpan) {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = colSpan;
  cell.textContent = message;
  cell.className = "weather-table__detail";
  row.appendChild(cell);
  return row;
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
  card.style.setProperty("--chart-color", getSeriesColor(series.id));

  const header = document.createElement("div");
  header.className = "chart-header";

  const title = document.createElement("p");
  title.className = "chart-title";
  title.textContent = series.label;

  const range = document.createElement("p");
  range.className = "chart-range";
  range.textContent = `${formatNumber(series.min, series.decimals)} to ${formatNumber(series.max, series.decimals)} ${series.unit}`.trim();

  header.append(title, range);

  const stats = document.createElement("div");
  stats.className = "chart-stats";
  stats.append(
    createChartStat("Low", formatValue(series.min, series.decimals, series.unit)),
    createChartStat("High", formatValue(series.max, series.decimals, series.unit)),
    createChartStat("Now", formatValue(series.points.at(-1)?.value ?? null, series.decimals, series.unit)),
  );

  const chartSvg = document.createElement("div");
  chartSvg.innerHTML = createChartSvg(series);

  const footer = document.createElement("div");
  footer.className = "chart-footer";

  const start = document.createElement("span");
  start.textContent = series.points[0].label;

  const end = document.createElement("span");
  end.textContent = series.points.at(-1).label;

  footer.append(start, end);
  card.append(header, stats, chartSvg.firstElementChild, footer);

  return card;
}

function createChartSvg(series) {
  const width = 320;
  const height = 164;
  const min = series.min;
  const max = series.max;
  const span = max - min || 1;
  const leftPadding = 14;
  const rightPadding = 12;
  const topPadding = 10;
  const bottomPadding = 18;
  const plotWidth = width - leftPadding - rightPadding;
  const plotHeight = height - topPadding - bottomPadding;

  const points = series.points.map((point, index) => {
    const x = leftPadding + (index / Math.max(series.points.length - 1, 1)) * plotWidth;
    const y = topPadding + (1 - (point.value - min) / span) * plotHeight;
    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  const fillPath = `${linePath} L ${leftPadding + plotWidth} ${topPadding + plotHeight} L ${leftPadding} ${topPadding + plotHeight} Z`;
  const gridlines = [0, 0.5, 1].map((ratio) => {
    const y = topPadding + plotHeight * ratio;
    return `<line class="chart-gridline" x1="${leftPadding}" y1="${y.toFixed(2)}" x2="${(leftPadding + plotWidth).toFixed(2)}" y2="${y.toFixed(2)}"></line>`;
  }).join("");
  const latest = points.at(-1);
  const minLabel = formatCompactNumber(min, series.decimals);
  const maxLabel = formatCompactNumber(max, series.decimals);
  const midLabel = formatCompactNumber(min + span / 2, series.decimals);

  return `
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${series.label} trend">
      ${gridlines}
      <line class="chart-axis" x1="${leftPadding}" y1="${topPadding + plotHeight}" x2="${leftPadding + plotWidth}" y2="${topPadding + plotHeight}"></line>
      <path class="chart-fill" d="${fillPath}"></path>
      <path class="chart-path" d="${linePath}"></path>
      <circle class="chart-point" cx="${latest?.x.toFixed(2) ?? leftPadding}" cy="${latest?.y.toFixed(2) ?? topPadding}" r="4"></circle>
      <text class="chart-label" x="8" y="${(topPadding + 4).toFixed(2)}">${maxLabel}</text>
      <text class="chart-label" x="8" y="${(topPadding + plotHeight / 2 + 4).toFixed(2)}">${midLabel}</text>
      <text class="chart-label" x="8" y="${(topPadding + plotHeight + 2).toFixed(2)}">${minLabel}</text>
    </svg>
  `;
}

function createChartStat(label, value) {
  const stat = document.createElement("div");
  stat.className = "chart-stat";
  stat.innerHTML = `
    <p class="chart-stat__label">${label}</p>
    <p class="chart-stat__value">${value || "—"}</p>
  `;
  return stat;
}

function renderRangeButtons() {
  rangeButtonGroup.replaceChildren();

  for (const option of rangeOptions) {
    const node = rangeButtonTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.range = option.id;
    node.textContent = option.label;
    node.addEventListener("click", () => {
      if (option.id === activeRangeId) {
        return;
      }

      activeRangeId = option.id;
      hasInitializedRange = true;
      updateRangeButtons();

      if (latestPayload) {
        scheduleRangeViewRender(latestPayload);
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

function getDerivedView(payload, rangeId) {
  const cacheKey =
    payload?.fetchedAt ||
    `${payload?.timeRange?.endAt || ""}:${payload?.observationCount || 0}`;

  if (cacheKey !== derivedViewCacheKey) {
    derivedViewCacheKey = cacheKey;
    derivedViewCache.clear();
  }

  if (derivedViewCache.has(rangeId)) {
    return derivedViewCache.get(rangeId);
  }

  const derived = buildDerivedView(payload, rangeId);
  derivedViewCache.set(rangeId, derived);
  return derived;
}

function buildDerivedView(payload, rangeId) {
  const observations = Array.isArray(payload.observations) ? payload.observations : [];
  const filteredObservations = filterObservationsByRange(observations, rangeId);
  const latest = filteredObservations.at(-1) || null;

  return {
    observations: filteredObservations,
    latest,
    observationCount: filteredObservations.length,
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

function filterObservationsForCurrentDay(observations) {
  if (!observations.length) {
    return [];
  }

  const latestTimestamp = observations.at(-1)?.timestamp ?? 0;
  const latestDate = new Date(latestTimestamp);

  return observations.filter((observation) => {
    const timestamp = observation.timestamp ?? 0;
    const date = new Date(timestamp);
    return (
      date.getFullYear() === latestDate.getFullYear() &&
      date.getMonth() === latestDate.getMonth() &&
      date.getDate() === latestDate.getDate()
    );
  });
}

function getRangeOption(rangeId) {
  return rangeOptions.find((option) => option.id === rangeId) ?? null;
}

function describeRangeSummary(payload, derived, responseMeta = {}) {
  const option = getRangeOption(activeRangeId);
  const timeRange = payload.timeRange || {};
  const startAt = timeRange.startAt ? formatHeaderTimestamp(timeRange.startAt) : "unknown";
  const endAt = timeRange.endAt ? formatHeaderTimestamp(timeRange.endAt) : "unknown";
  const loadedSpan = formatSpan(timeRange.spanMs ?? 0);

  if (!derived.observationCount) {
    return "No observations are loaded yet.";
  }

  if (!option || option.durationMs === null) {
    return appendRangeMeta(
      `Showing the full loaded span from ${startAt} to ${endAt} across ${loadedSpan}.`,
      responseMeta,
    );
  }

  return appendRangeMeta(
    `Showing the last ${option.label.toLowerCase()} ending at ${endAt}. Loaded history spans ${loadedSpan} starting ${startAt}.`,
    responseMeta,
  );
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
            label: formatClock(observation.timestamp),
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
        current: points.at(-1)?.value ?? null,
        points,
      };
    })
    .filter(Boolean);
}

function flattenSnapshot(latest) {
  return Object.entries(latest)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => ({
      label: key,
      value: key === "timestamp" ? formatHeaderTimestamp(value) : String(value),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function createExtremeRow(observations, label, keys, mode, decimals, unit) {
  const result = pickExtremeObservation(observations, keys, mode);

  if (!result) {
    return null;
  }

  return {
    label,
    value: formatValue(result.value, decimals, unit),
    detail: formatClock(result.timestamp),
  };
}

function createRangeRow(observations, label, keys, decimals, unit) {
  const values = observations
    .map((observation) => ({
      value: pickNumber(observation, keys),
      timestamp: observation.timestamp ?? null,
    }))
    .filter((entry) => entry.value !== null);

  if (values.length < 2) {
    return null;
  }

  return {
    label,
    value: `${formatNumber(Math.min(...values.map((entry) => entry.value)), decimals)}${unit} to ${formatNumber(Math.max(...values.map((entry) => entry.value)), decimals)}${unit}`,
    detail: `${formatClock(values[0].timestamp)} to ${formatClock(values.at(-1).timestamp)}`,
  };
}

function createLatestValueRow(observations, label, keys, decimals, unit) {
  const latest = observations.at(-1) ?? null;

  if (!latest) {
    return null;
  }

  const value = pickNumber(latest, keys);

  if (value === null) {
    return null;
  }

  return {
    label,
    value: formatValue(value, decimals, unit),
    detail: "Current total",
  };
}

function createAverageRow(observations, label, keys, decimals, unit) {
  const values = observations
    .map((observation) => pickNumber(observation, keys))
    .filter((value) => value !== null);

  if (!values.length) {
    return null;
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;

  return {
    label,
    value: formatValue(average, decimals, unit),
    detail: "Average",
  };
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

function formatDefinitionValue(source, keys, decimals, unit) {
  const value = pickNumber(source, keys);
  return value === null ? "" : formatValue(value, decimals, unit);
}

function formatWind(source, speedKey, directionKey) {
  const speed = pickNumber(source, [speedKey]);

  if (speed === null) {
    return "";
  }

  const direction = pickNumber(source, [directionKey]);

  if (direction === null) {
    return `${formatNumber(speed, 1)} mph`;
  }

  return `${formatNumber(speed, 1)} mph ${degreesToCompass(direction)} (${Math.round(direction)} deg)`;
}

function degreesToCompass(degrees) {
  const points = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round((degrees % 360) / 22.5) % 16;
  return points[index];
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
  if (value === null || value === undefined) {
    return "";
  }

  const suffix = unit ? ` ${unit}` : "";
  return `${formatNumber(value, decimals)}${suffix}`;
}

function formatCompactNumber(value, decimals) {
  return Number(value).toLocaleString([], {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

function formatNumber(value, decimals) {
  return Number(value).toLocaleString([], {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

function formatHeaderTimestamp(value) {
  if (!value) {
    return "Waiting for station time";
  }

  return new Date(value).toLocaleString([], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

function formatClock(value) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
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

function spanBetween(startTimestamp, endTimestamp) {
  if (!startTimestamp || !endTimestamp) {
    return 0;
  }

  return Math.max(endTimestamp - startTimestamp, 0);
}

function closeNavMenu() {
  navMenu?.classList.remove("is-open");
  navToggle?.setAttribute("aria-expanded", "false");
}

function handleSectionLinkClick(event) {
  const link = event.currentTarget;

  if (!(link instanceof HTMLAnchorElement)) {
    return;
  }

  const href = link.getAttribute("href");

  if (!href?.startsWith("#")) {
    closeNavMenu();
    return;
  }

  const target = document.getElementById(href.slice(1));

  if (!target) {
    closeNavMenu();
    return;
  }

  event.preventDefault();
  setActiveSectionLink(target.id);
  closeNavMenu();
  scrollToSection(target);
}

function scrollToSection(target) {
  const navHeight = sectionNav?.offsetHeight ?? 0;
  const targetTop = target.getBoundingClientRect().top + window.scrollY - navHeight - 12;
  window.scrollTo({
    top: Math.max(targetTop, 0),
    behavior: "auto",
  });
}

function setActiveSectionLink(sectionId) {
  if (!sectionId) {
    return;
  }

  activeSectionId = sectionId;

  for (const link of sectionLinks) {
    const isActive = link.getAttribute("href") === `#${sectionId}`;
    link.classList.toggle("is-active", isActive);

    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  }
}

function handleWindowScroll() {
  if (sectionScrollFrame) {
    return;
  }

  sectionScrollFrame = window.requestAnimationFrame(() => {
    sectionScrollFrame = 0;
    updateActiveSectionFromScroll();
  });
}

function updateActiveSectionFromScroll() {
  if (!sectionTargets.length) {
    return;
  }

  const navHeight = sectionNav?.offsetHeight ?? 0;
  const activationOffset = navHeight + 28;
  let nextActiveSectionId = sectionTargets[0].id;

  for (const target of sectionTargets) {
    if (target.element.getBoundingClientRect().top - activationOffset <= 0) {
      nextActiveSectionId = target.id;
    } else {
      break;
    }
  }

  if (nextActiveSectionId !== activeSectionId) {
    setActiveSectionLink(nextActiveSectionId);
  }
}

function scheduleRangeViewRender(payload) {
  const renderId = pendingRangeRenderId + 1;
  pendingRangeRenderId = renderId;
  setRangeRenderPending(true);

  window.requestAnimationFrame(() => {
    if (renderId !== pendingRangeRenderId) {
      return;
    }

    window.requestAnimationFrame(() => {
      if (renderId !== pendingRangeRenderId) {
        return;
      }

      const derived = getDerivedView(payload, activeRangeId);
      renderRangeDependentSections(payload, derived, payload.responseMeta || {});
      updateActiveSectionFromScroll();
    });
  });
}

function setRangeRenderPending(isPending) {
  rangeButtonGroup.classList.toggle("is-pending", isPending);
  rangeButtonGroup.setAttribute("aria-busy", String(isPending));
}

function scheduleNextRefresh(delayMs = defaultRefreshIntervalMs) {
  if (refreshTimer !== null) {
    window.clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  if (delayMs <= 0) {
    return;
  }

  refreshTimer = window.setTimeout(() => {
    refreshTimer = null;
    loadDashboard();
  }, delayMs);
}

function getRecommendedRefreshMs(responseMeta = {}) {
  const recommended = Number(responseMeta.recommendedPollMs);

  if (Number.isFinite(recommended) && recommended > 0) {
    return recommended;
  }

  return defaultRefreshIntervalMs;
}

function getRetryDelayMs(error) {
  const retryAfterSec =
    error && typeof error === "object" && "retryAfterSec" in error
      ? Number(error.retryAfterSec)
      : NaN;

  if (Number.isFinite(retryAfterSec) && retryAfterSec > 0) {
    return retryAfterSec * 1000;
  }

  return rateLimitRefreshIntervalMs;
}

function describeErrorSummary(error) {
  const message = error instanceof Error ? error.message : String(error);
  const retryDelayMs = getRetryDelayMs(error);

  if (message.toLowerCase().includes("rate-limit")) {
    return `Ambient is rate-limiting this station right now. The dashboard will back off and retry in about ${formatSpan(retryDelayMs)}.`;
  }

  return "Check your Ambient credentials, selected station, and local network reachability.";
}

function describeErrorRangeSummary(error) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.toLowerCase().includes("rate-limit")) {
    return `Pausing automatic retries to avoid making the Ambient API throttle worse.`;
  }

  return "Waiting on the first successful data load.";
}

function appendRangeMeta(text, responseMeta = {}) {
  if (responseMeta.isStale) {
    return `${text} Cached data is being shown while Ambient recovers.`;
  }

  if (responseMeta.servedFromCache) {
    return `${text} Freshening is being throttled through the local cache.`;
  }

  return text;
}

function getSeriesColor(seriesId) {
  const palette = {
    temperature: "#df7a22",
    dewpoint: "#5aa5cc",
    humidity: "#4689a7",
    pressure: "#7f6cc4",
    wind: "#2e8b57",
    gust: "#188b5a",
    solar: "#d5a229",
    uv: "#b36ad8",
    rain: "#3c8fca",
  };

  return palette[seriesId] || "#18b8cf";
}

function setLoadingState(isLoading, label = "Syncing station feed") {
  if (loadingStatus && loadingStatusLabel) {
    loadingStatus.hidden = !isLoading;
    loadingStatusLabel.textContent = label;
  }

  if (isLoading) {
    startLoadingTitleAnimation();
    return;
  }

  stopLoadingTitleAnimation();
}

function setResolvedDocumentTitle(title) {
  resolvedDocumentTitle = title || "Monosyth Weather";

  if (loadingTitleTimer === null) {
    document.title = resolvedDocumentTitle;
  }
}

function startLoadingTitleAnimation() {
  if (loadingTitleTimer !== null) {
    updateLoadingTitle();
    return;
  }

  loadingTitleFrameIndex = 0;
  updateLoadingTitle();
  loadingTitleTimer = window.setInterval(updateLoadingTitle, 220);
}

function stopLoadingTitleAnimation() {
  if (loadingTitleTimer !== null) {
    window.clearInterval(loadingTitleTimer);
    loadingTitleTimer = null;
  }

  document.title = resolvedDocumentTitle;
}

function updateLoadingTitle() {
  const frame = loadingTitleFrames[loadingTitleFrameIndex % loadingTitleFrames.length];
  document.title = `${frame} ${resolvedDocumentTitle}`;
  loadingTitleFrameIndex += 1;
}

function normalizeAlertSeverity(severity) {
  return ["danger", "warning", "notice"].includes(severity) ? severity : "notice";
}

function formatAlertSeverity(severity) {
  const labels = {
    danger: "Urgent",
    warning: "Heads up",
    notice: "Notice",
  };

  return labels[severity] || "Notice";
}
