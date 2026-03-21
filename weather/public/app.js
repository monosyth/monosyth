const metricGrid = document.querySelector("#metric-grid");
const highlightGrid = document.querySelector("#highlight-grid");
const chartGrid = document.querySelector("#chart-grid");
const snapshotGrid = document.querySelector("#snapshot-grid");
const stationName = document.querySelector("#station-name");
const stationSummary = document.querySelector("#station-summary");
const lastUpdated = document.querySelector("#last-updated");
const refreshButton = document.querySelector("#refresh-button");

const metricTemplate = document.querySelector("#metric-card-template");
const highlightTemplate = document.querySelector("#highlight-card-template");
const snapshotTemplate = document.querySelector("#snapshot-item-template");

let refreshTimer = null;

refreshButton.addEventListener("click", () => {
  loadDashboard();
});

loadDashboard();
refreshTimer = window.setInterval(loadDashboard, 60_000);

async function loadDashboard() {
  refreshButton.disabled = true;

  try {
    const response = await fetch("/api/overview", { cache: "no-store" });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Failed to load the weather dashboard.");
    }

    renderDashboard(payload);
  } catch (error) {
    renderError(error instanceof Error ? error.message : String(error));
  } finally {
    refreshButton.disabled = false;
  }
}

function renderDashboard(payload) {
  const station = payload.station || {};
  const location = station.location ? `${station.location} . ` : "";

  stationName.textContent = station.name || "Your Weather Station";
  stationSummary.textContent = `${location}${payload.observationCount || 0} recent observations loaded for live exploration.`;
  lastUpdated.textContent = `Updated ${formatDate(payload.fetchedAt)}`;

  renderMetricGrid(payload.metrics || []);
  renderHighlightGrid(payload.highlights || []);
  renderChartGrid(payload.series || []);
  renderSnapshotGrid(payload.snapshot || []);
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
  stationName.textContent = "Dashboard waiting on station data";
  stationSummary.textContent = "The local UI is up, but the server could not load Ambient Weather data yet.";
  lastUpdated.textContent = "Needs attention";

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
