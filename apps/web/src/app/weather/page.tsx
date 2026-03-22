import Link from "next/link";

import { RefreshButton } from "@/components/weather/refresh-button";
import { getWeatherPageData } from "@/lib/weather/ambient";
import {
  formatWeatherClock,
  formatWeatherDateTime,
  formatWeatherLong,
} from "@/lib/weather/time";
import type {
  WeatherForecastPeriod,
  WeatherObservation,
  WeatherOverview,
  WeatherPageData,
  WeatherSeries,
} from "@/lib/weather/types";

export const dynamic = "force-dynamic";

type FactRow = {
  label: string;
  value: string;
};

type SummaryRow = {
  label: string;
  value: string;
  detail: string;
};

const currentConditionDefinitions = [
  { label: "Outside Temperature", keys: ["tempf"], decimals: 1, unit: "F" },
  { label: "Feels Like", keys: ["feelsLike", "feelslikef"], decimals: 1, unit: "F" },
  { label: "Dewpoint", keys: ["dewPoint", "dewpointf"], decimals: 1, unit: "F" },
  { label: "Humidity", keys: ["humidity"], decimals: 0, unit: "%" },
  { label: "Barometer", keys: ["baromrelin", "baromabsin"], decimals: 3, unit: "inHg" },
  {
    label: "Wind",
    render: (observation: WeatherObservation) =>
      formatWind(observation, "windspeedmph", "winddir"),
  },
  {
    label: "Wind Gust",
    render: (observation: WeatherObservation) =>
      formatWind(observation, "windgustmph", "winddir"),
  },
  { label: "Hourly Rain", keys: ["hourlyrainin"], decimals: 2, unit: "in" },
  { label: "Daily Rain", keys: ["dailyrainin"], decimals: 2, unit: "in" },
  { label: "UV Index", keys: ["uv"], decimals: 1, unit: "" },
  { label: "Solar Radiation", keys: ["solarradiation"], decimals: 0, unit: "W/m2" },
] as const;

const navItems = [
  { id: "current-section", label: "Current" },
  { id: "today-section", label: "Today" },
  { id: "recent-section", label: "Recent" },
  { id: "graphs-section", label: "Graphs" },
  { id: "station-section", label: "Station" },
  { id: "raw-section", label: "Raw" },
] as const;

export default async function WeatherPage() {
  const result = await getWeatherPageData();

  if (result.state !== "ready") {
    return <WeatherState result={result} />;
  }

  const { data, notice } = result;
  const currentRows = buildCurrentConditionRows(data.observations);
  const todayRows = buildDaySummaryRows(data.observations);
  const recentRows = buildRecentSummaryRows(data);
  const mastheadRows = buildMastheadRows(data, notice);
  const stationRows = buildStationDetailRows(data, notice);
  const rawRows = data.snapshot.slice(0, 22).map((item) => ({
    label: item.key,
    value: item.value,
  }));
  const graphSeries = data.series.slice(0, 8);
  const mapUrl = buildMapUrl(data);

  return (
    <main className="min-h-screen bg-[#ececec] text-stone-800">
      <header className="bg-[#1eb7ce] text-white shadow-[0_10px_28px_rgba(0,0,0,0.12)]">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-white/78">
                Monosyth Personal Weather
              </p>
              <h1 className="mt-3 text-4xl font-light tracking-[-0.04em] sm:text-5xl">
                {data.station.name}
              </h1>
              <p className="mt-3 text-xl font-light text-white/92 sm:text-2xl">
                {buildHeaderMeta(data)}
                {mapUrl ? (
                  <>
                    {" "}
                    <a
                      className="underline decoration-white/55 underline-offset-4 hover:decoration-white"
                      href={mapUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Show on map
                    </a>
                  </>
                ) : null}
              </p>

              <h2 className="mt-8 text-3xl font-light tracking-[-0.03em] sm:text-4xl">
                Current Weather Conditions
              </h2>
              <p className="mt-3 text-lg text-white/88">
                {data.station.lastObservationAt || formatWeatherLong(data.fetchedAt)}
              </p>
            </div>

            <div className="lg:justify-self-end lg:text-right">
              <table className="w-full border-collapse text-left text-lg lg:max-w-md lg:text-right">
                <tbody>
                  {mastheadRows.map((row) => (
                    <tr key={row.label} className="border-b border-white/18 last:border-b-0">
                      <th className="px-0 py-2 pr-4 font-semibold text-white/90 lg:text-right">
                        {row.label}:
                      </th>
                      <td className="px-0 py-2 text-white/80">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-white/18 pt-6 text-2xl font-light">
            {navItems.map((item, index) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`border-b-4 pb-2 transition hover:text-white ${index === 0 ? "border-[#f4d24f] text-white" : "border-transparent text-white/85 hover:border-white/40"}`}
              >
                {item.label}
              </a>
            ))}
            <div className="ml-auto flex flex-wrap items-center gap-3 text-base font-medium">
              <RefreshButton />
              <Link
                href="/"
                className="rounded-full border border-white/35 bg-white/12 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/22"
              >
                Back Home
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        {notice ? (
          <div className="mb-6 rounded-sm border border-[#e9c65a] bg-[#fff8de] px-5 py-4 text-sm leading-6 text-[#7d5b00]">
            {notice}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-2">
          <TablePanel
            id="current-section"
            title="Current Conditions"
            subtitle="Live station readings in the same table-first style as the reference dashboard."
          >
            <TwoColumnTable
              rows={currentRows}
              emptyMessage="Current conditions will appear after the next successful station fetch."
            />
          </TablePanel>

          <TablePanel
            id="forecast-section"
            title="Forecast Outlook"
            subtitle="Short-range hourly forecast pulled alongside the station feed."
          >
            <ForecastTable periods={data.forecast.slice(0, 6)} />
          </TablePanel>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <TablePanel
            id="today-section"
            title="Since Midnight"
            subtitle="Today's highs, lows, and peaks from the loaded station observations."
          >
            <ThreeColumnTable
              rows={todayRows}
              emptyMessage="Today's highs and lows will populate once observations are available for the current day."
            />
          </TablePanel>

          <TablePanel
            id="recent-section"
            title="Recent Range"
            subtitle="A quick summary of the loaded weather window and where the readings moved."
          >
            <ThreeColumnTable
              rows={recentRows}
              emptyMessage="Recent range details will appear once enough observations are available."
            />
          </TablePanel>
        </div>

        <TablePanel
          id="graphs-section"
          title="Graphs"
          subtitle="Instrument-style trend panels modeled after a classic weather station dashboard."
          className="mt-6"
        >
          {graphSeries.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {graphSeries.map((series) => (
                <TrendPanel key={series.id} series={series} />
              ))}
            </div>
          ) : (
            <PanelState message="Trend charts need at least two recent observations with matching fields." />
          )}
        </TablePanel>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <TablePanel
            id="station-section"
            title="Station Details"
            subtitle="Quick context about the feed, refresh cadence, and currently loaded history."
          >
            <TwoColumnTable
              rows={stationRows}
              emptyMessage="Station details will appear after the first successful station fetch."
            />
          </TablePanel>

          <TablePanel
            id="raw-section"
            title="Raw Snapshot"
            subtitle="Latest key and value pairs from the newest Ambient Weather sample."
          >
            <TwoColumnTable
              rows={rawRows}
              emptyMessage="The newest raw payload will appear here after a successful fetch."
              monoLabels
            />
          </TablePanel>
        </div>
      </div>
    </main>
  );
}

function WeatherState({ result }: { result: Exclude<WeatherPageData, { state: "ready" }> }) {
  const title =
    result.state === "missing-config"
      ? "Weather data needs a little setup"
      : "Weather data is temporarily unavailable";
  const detail =
    result.state === "missing-config"
      ? `${result.message} Missing: ${result.missing.join(", ")}.`
      : result.message;

  return (
    <main className="min-h-screen bg-[#ececec] px-5 py-10 text-stone-800 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-sm bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
        <div className="bg-[#1eb7ce] px-8 py-10 text-white">
          <p className="text-sm uppercase tracking-[0.18em] text-white/78">
            Monosyth Personal Weather
          </p>
          <h1 className="mt-4 text-4xl font-light tracking-[-0.04em]">{title}</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-white/88">{detail}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/weather"
              className="rounded-full border border-white/35 bg-white/12 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/22"
            >
              Reload Weather
            </Link>
            <Link
              href="/"
              className="rounded-full border border-white/35 bg-white/12 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/22"
            >
              Back Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function TablePanel({
  id,
  title,
  subtitle,
  children,
  className = "",
}: {
  id: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`overflow-hidden rounded-sm border border-stone-200 bg-white shadow-[0_8px_20px_rgba(0,0,0,0.06)] ${className}`.trim()}
    >
      <div className="border-b border-stone-200 px-6 py-5">
        <h2 className="text-3xl font-light tracking-[-0.03em] text-stone-700">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-500">{subtitle}</p>
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

function TwoColumnTable({
  rows,
  emptyMessage,
  monoLabels = false,
}: {
  rows: FactRow[];
  emptyMessage: string;
  monoLabels?: boolean;
}) {
  if (!rows.length) {
    return <PanelState message={emptyMessage} />;
  }

  return (
    <table className="w-full border-collapse">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b border-stone-200 last:border-b-0">
            <th
              className={`w-[44%] px-2 py-3 text-left align-top text-base font-normal text-stone-700 ${monoLabels ? "font-mono text-sm uppercase tracking-[0.14em] text-stone-500" : ""}`}
            >
              {row.label}
            </th>
            <td className="px-2 py-3 text-left text-base text-stone-800">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ThreeColumnTable({
  rows,
  emptyMessage,
}: {
  rows: SummaryRow[];
  emptyMessage: string;
}) {
  if (!rows.length) {
    return <PanelState message={emptyMessage} />;
  }

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-stone-300 text-left text-sm uppercase tracking-[0.14em] text-stone-500">
          <th className="px-2 py-3 font-medium">Reading</th>
          <th className="px-2 py-3 font-medium">Value</th>
          <th className="px-2 py-3 font-medium">Time</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b border-stone-200 last:border-b-0">
            <th className="px-2 py-3 text-left font-normal text-stone-700">{row.label}</th>
            <td className="px-2 py-3 text-stone-800">{row.value}</td>
            <td className="px-2 py-3 text-stone-500">{row.detail}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ForecastTable({ periods }: { periods: WeatherForecastPeriod[] }) {
  if (!periods.length) {
    return (
      <PanelState message="NOAA did not return an hourly forecast for this fetch, so the live station data on this page is the most reliable read for now." />
    );
  }

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-stone-300 text-left text-sm uppercase tracking-[0.14em] text-stone-500">
          <th className="px-2 py-3 font-medium">Period</th>
          <th className="px-2 py-3 font-medium">Temp</th>
          <th className="px-2 py-3 font-medium">Conditions</th>
          <th className="px-2 py-3 font-medium">Wind</th>
        </tr>
      </thead>
      <tbody>
        {periods.map((period) => (
          <tr key={period.startTime} className="border-b border-stone-200 last:border-b-0">
            <td className="px-2 py-3 text-stone-700">
              {formatWeatherDateTime(period.startTime)}
            </td>
            <td className="px-2 py-3 text-stone-800">
              {period.temperature === null
                ? "Not reported"
                : `${period.temperature} ${period.temperatureUnit}`}
            </td>
            <td className="px-2 py-3 text-stone-800">{period.shortForecast}</td>
            <td className="px-2 py-3 text-stone-500">
              {period.windSpeed} {period.windDirection}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TrendPanel({ series }: { series: WeatherSeries }) {
  const width = 420;
  const height = 168;
  const left = 18;
  const right = 14;
  const top = 10;
  const bottom = 22;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const span = series.max - series.min || 1;
  const latestPoint = series.points.at(-1) ?? null;
  const accent = pickSeriesAccent(series.id);
  const fill = `${accent}22`;
  const points = series.points.map((point, index) => {
    const x = left + (index / Math.max(series.points.length - 1, 1)) * plotWidth;
    const y = top + (1 - (point.value - series.min) / span) * plotHeight;
    return { x, y };
  });
  const linePath = points
    .map((point, index) =>
      `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
    )
    .join(" ");
  const fillPath = `${linePath} L ${(left + plotWidth).toFixed(2)} ${(top + plotHeight).toFixed(2)} L ${left} ${(top + plotHeight).toFixed(2)} Z`;

  return (
    <article className="rounded-sm border border-stone-200 bg-[#fafafa] p-4 shadow-[0_4px_14px_rgba(0,0,0,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xl font-light tracking-[-0.02em] text-stone-700">
            {series.label}
          </p>
          <p className="mt-1 text-sm text-stone-500">
            {formatSeriesRange(series)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Now</p>
          <p className="mt-1 text-2xl font-light text-stone-800">
            {formatSeriesValue(latestPoint?.value ?? null, series.decimals, series.unit)}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-sm border border-stone-200 bg-white p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${series.label} trend`}
          className="h-44 w-full"
        >
          {[0, 0.5, 1].map((ratio) => {
            const y = top + plotHeight * ratio;
            return (
              <line
                key={ratio}
                x1={left}
                y1={y}
                x2={left + plotWidth}
                y2={y}
                stroke="#dadada"
                strokeWidth="1"
              />
            );
          })}
          <path d={fillPath} fill={fill} />
          <path
            d={linePath}
            fill="none"
            stroke={accent}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {latestPoint ? (
            <circle
              cx={points.at(-1)?.x ?? left}
              cy={points.at(-1)?.y ?? top}
              r="4"
              fill={accent}
            />
          ) : null}
          <text x="6" y={top + 4} fill="#7a7a7a" fontSize="12">
            {formatCompact(series.max, series.decimals)}
          </text>
          <text x="6" y={top + plotHeight / 2 + 4} fill="#7a7a7a" fontSize="12">
            {formatCompact(series.min + span / 2, series.decimals)}
          </text>
          <text x="6" y={top + plotHeight + 4} fill="#7a7a7a" fontSize="12">
            {formatCompact(series.min, series.decimals)}
          </text>
        </svg>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-stone-500">
        <span>{series.points[0]?.label}</span>
        <span>
          Low {formatCompact(series.min, series.decimals)} / High{" "}
          {formatCompact(series.max, series.decimals)}
        </span>
        <span>{series.points.at(-1)?.label}</span>
      </div>
    </article>
  );
}

function PanelState({ message }: { message: string }) {
  return (
    <div className="rounded-sm border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-sm leading-6 text-stone-500">
      {message}
    </div>
  );
}

function buildHeaderMeta(data: WeatherOverview) {
  const parts = [];

  if (data.station.location) {
    parts.push(data.station.location);
  }

  if (data.station.latitude !== null && data.station.longitude !== null) {
    parts.push(
      `${formatCoordinate(data.station.latitude, "N", "S")} | ${formatCoordinate(data.station.longitude, "E", "W")}`,
    );
  }

  return parts.join(" | ");
}

function buildMastheadRows(data: WeatherOverview, notice?: string): FactRow[] {
  return [
    { label: "Station", value: data.station.name || "Unknown station" },
    { label: "Software", value: "Ambient Weather + NOAA" },
    {
      label: "Last report",
      value: data.station.lastObservationAt || formatWeatherLong(data.fetchedAt),
    },
    { label: "Loaded", value: `${data.observationCount} observations` },
    { label: "History", value: formatSpan(data.timeRange.spanMs) },
    { label: "Status", value: notice ? "Cached snapshot" : "Live fetch" },
  ];
}

function buildStationDetailRows(data: WeatherOverview, notice?: string): FactRow[] {
  return [
    { label: "Station", value: data.station.name || "Unknown station" },
    { label: "Location", value: data.station.location || "Location not provided" },
    {
      label: "Coordinates",
      value:
        data.station.latitude !== null && data.station.longitude !== null
          ? `${data.station.latitude.toFixed(4)}, ${data.station.longitude.toFixed(4)}`
          : "Not reported",
    },
    { label: "MAC Address", value: data.station.macAddress || "Not reported" },
    {
      label: "Last Station Report",
      value: data.station.lastObservationAt || formatWeatherLong(data.fetchedAt),
    },
    { label: "Local Refresh", value: formatWeatherLong(data.fetchedAt) },
    { label: "Loaded Observations", value: String(data.observationCount) },
    { label: "Loaded History", value: formatSpan(data.timeRange.spanMs) },
    { label: "Forecast Source", value: data.forecast.length ? "NOAA hourly forecast" : "Unavailable on this fetch" },
    { label: "Feed Status", value: notice ? "Serving recent cache" : "Serving latest fetch" },
  ];
}

function buildCurrentConditionRows(observations: WeatherObservation[]): FactRow[] {
  const latest = observations.at(-1) ?? null;

  if (!latest) {
    return [];
  }

  const rows: FactRow[] = [];

  for (const definition of currentConditionDefinitions) {
    const value =
      "render" in definition
        ? definition.render(latest)
        : formatObservationValue(latest, definition.keys, definition.decimals, definition.unit);

    if (!value) {
      continue;
    }

    rows.push({
      label: definition.label,
      value,
    });

    if (definition.label === "Barometer") {
      const trend = buildTrendValue(observations, ["baromrelin", "baromabsin"], 3 * 60 * 60 * 1000, 3, "inHg");

      if (trend) {
        rows.push({
          label: "Barometer Trend (3 Hours)",
          value: trend,
        });
      }
    }
  }

  return rows;
}

function buildDaySummaryRows(observations: WeatherObservation[]): SummaryRow[] {
  if (!observations.length) {
    return [];
  }

  const latestTimestamp = observations.at(-1)?.timestamp ?? 0;
  const todayObservations = observations.filter(
    (observation) =>
      formatDayKey(observation.timestamp ?? 0) === formatDayKey(latestTimestamp),
  );

  if (!todayObservations.length) {
    return [];
  }

  return [
    createExtremeRow(todayObservations, "High Temperature", ["tempf"], "max", 1, "F"),
    createExtremeRow(todayObservations, "Low Temperature", ["tempf"], "min", 1, "F"),
    createExtremeRow(todayObservations, "High Dewpoint", ["dewPoint", "dewpointf"], "max", 1, "F"),
    createExtremeRow(todayObservations, "Low Dewpoint", ["dewPoint", "dewpointf"], "min", 1, "F"),
    createExtremeRow(todayObservations, "High Humidity", ["humidity"], "max", 0, "%"),
    createExtremeRow(todayObservations, "Low Humidity", ["humidity"], "min", 0, "%"),
    createExtremeRow(todayObservations, "High Barometer", ["baromrelin", "baromabsin"], "max", 3, "inHg"),
    createExtremeRow(todayObservations, "Low Barometer", ["baromrelin", "baromabsin"], "min", 3, "inHg"),
    createLatestValueRow(todayObservations, "Today's Rain", ["dailyrainin"], 2, "in"),
    createExtremeRow(todayObservations, "High Wind", ["windspeedmph"], "max", 1, "mph"),
    createAverageRow(todayObservations, "Average Wind", ["windspeedmph"], 1, "mph"),
    createExtremeRow(todayObservations, "Peak Gust", ["windgustmph"], "max", 1, "mph"),
    createExtremeRow(todayObservations, "High UV", ["uv"], "max", 1, ""),
    createExtremeRow(todayObservations, "High Solar", ["solarradiation"], "max", 0, "W/m2"),
  ].filter((row): row is SummaryRow => row !== null);
}

function buildRecentSummaryRows(data: WeatherOverview): SummaryRow[] {
  const { observations } = data;

  if (!observations.length) {
    return [];
  }

  return [
    {
      label: "Loaded Window",
      value: `${formatWeatherDateTime(data.timeRange.startAt || data.fetchedAt)} to ${formatWeatherDateTime(data.timeRange.endAt || data.fetchedAt)}`,
      detail: formatSpan(data.timeRange.spanMs),
    },
    {
      label: "Observations Loaded",
      value: String(data.observationCount),
      detail: "Most recent local history",
    },
    createRangeRow(observations, "Temperature Range", ["tempf"], 1, "F"),
    createRangeRow(observations, "Humidity Range", ["humidity"], 0, "%"),
    createRangeRow(observations, "Pressure Range", ["baromrelin", "baromabsin"], 3, "inHg"),
    createExtremeRow(observations, "Peak Gust", ["windgustmph"], "max", 1, "mph"),
    createAverageRow(observations, "Average Wind", ["windspeedmph"], 1, "mph"),
    createLatestValueRow(observations, "Rain So Far", ["dailyrainin"], 2, "in"),
    createExtremeRow(observations, "High UV", ["uv"], "max", 1, ""),
    createExtremeRow(observations, "High Solar", ["solarradiation"], "max", 0, "W/m2"),
  ].filter((row): row is SummaryRow => row !== null);
}

function createExtremeRow(
  observations: WeatherObservation[],
  label: string,
  keys: string[],
  mode: "min" | "max",
  decimals: number,
  unit: string,
) {
  const matches = observations
    .map((observation) => {
      const value = pickNumber(observation, keys);

      if (value === null) {
        return null;
      }

      return {
        value,
        timestamp: observation.timestamp ?? 0,
      };
    })
    .filter((entry): entry is { value: number; timestamp: number } => entry !== null);

  if (!matches.length) {
    return null;
  }

  const winner = matches.reduce((current, entry) => {
    if (mode === "max") {
      return entry.value > current.value ? entry : current;
    }

    return entry.value < current.value ? entry : current;
  });

  return {
    label,
    value: formatSeriesValue(winner.value, decimals, unit),
    detail: winner.timestamp ? formatWeatherClock(winner.timestamp) : "--",
  };
}

function createAverageRow(
  observations: WeatherObservation[],
  label: string,
  keys: string[],
  decimals: number,
  unit: string,
) {
  const values = observations
    .map((observation) => pickNumber(observation, keys))
    .filter((value): value is number => value !== null);

  if (!values.length) {
    return null;
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;

  return {
    label,
    value: formatSeriesValue(average, decimals, unit),
    detail: `${values.length} samples`,
  };
}

function createLatestValueRow(
  observations: WeatherObservation[],
  label: string,
  keys: string[],
  decimals: number,
  unit: string,
) {
  const latest = [...observations].reverse().find((observation) => pickNumber(observation, keys) !== null);

  if (!latest) {
    return null;
  }

  const value = pickNumber(latest, keys);

  if (value === null) {
    return null;
  }

  return {
    label,
    value: formatSeriesValue(value, decimals, unit),
    detail: latest.timestamp ? formatWeatherClock(latest.timestamp) : "--",
  };
}

function createRangeRow(
  observations: WeatherObservation[],
  label: string,
  keys: string[],
  decimals: number,
  unit: string,
) {
  const matches = observations
    .map((observation) => {
      const value = pickNumber(observation, keys);

      if (value === null) {
        return null;
      }

      return {
        value,
        timestamp: observation.timestamp ?? 0,
      };
    })
    .filter((entry): entry is { value: number; timestamp: number } => entry !== null);

  if (matches.length < 2) {
    return null;
  }

  const min = matches.reduce((current, entry) =>
    entry.value < current.value ? entry : current,
  );
  const max = matches.reduce((current, entry) =>
    entry.value > current.value ? entry : current,
  );

  return {
    label,
    value: `${formatSeriesValue(min.value, decimals, unit)} to ${formatSeriesValue(max.value, decimals, unit)}`,
    detail: `${formatWeatherClock(min.timestamp)} / ${formatWeatherClock(max.timestamp)}`,
  };
}

function buildTrendValue(
  observations: WeatherObservation[],
  keys: string[],
  lookbackMs: number,
  decimals: number,
  unit: string,
) {
  if (observations.length < 2) {
    return null;
  }

  const latest = observations.at(-1) ?? null;
  const latestValue = latest ? pickNumber(latest, keys) : null;
  const latestTimestamp = latest?.timestamp ?? 0;

  if (latestValue === null || latestTimestamp === 0) {
    return null;
  }

  const cutoff = latestTimestamp - lookbackMs;
  const prior = [...observations]
    .reverse()
    .find(
      (observation) =>
        (observation.timestamp ?? 0) <= cutoff && pickNumber(observation, keys) !== null,
    );

  if (!prior) {
    return null;
  }

  const priorValue = pickNumber(prior, keys);

  if (priorValue === null) {
    return null;
  }

  const delta = latestValue - priorValue;
  const sign = delta > 0 ? "+" : "";

  return `${sign}${formatCompact(delta, decimals)} ${unit}`.trim();
}

function buildMapUrl(data: WeatherOverview) {
  if (data.station.latitude === null || data.station.longitude === null) {
    return "";
  }

  return `https://maps.google.com/?q=${data.station.latitude},${data.station.longitude}`;
}

function formatObservationValue(
  observation: WeatherObservation,
  keys: readonly string[],
  decimals: number,
  unit: string,
) {
  const value = pickNumber(observation, keys);

  if (value === null) {
    return null;
  }

  return formatSeriesValue(value, decimals, unit);
}

function formatSeriesValue(value: number | null, decimals: number, unit: string) {
  if (value === null) {
    return "Not reported";
  }

  const suffix = unit ? ` ${unit}` : "";

  return `${formatCompact(value, decimals)}${suffix}`;
}

function formatSeriesRange(series: WeatherSeries) {
  return `${formatCompact(series.min, series.decimals)} to ${formatCompact(series.max, series.decimals)} ${series.unit}`.trim();
}

function formatCompact(value: number, decimals: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

function formatWind(
  observation: WeatherObservation,
  speedKey: string,
  directionKey: string,
) {
  const speed = pickNumber(observation, [speedKey]);
  const direction = pickNumber(observation, [directionKey]);

  if (speed === null) {
    return null;
  }

  const directionLabel =
    direction === null ? "" : ` ${degreesToCompass(direction)} (${Math.round(direction)} degrees)`;

  return `${formatCompact(speed, 1)} mph${directionLabel}`;
}

function pickNumber(source: WeatherObservation, keys: readonly string[]) {
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

function degreesToCompass(degrees: number) {
  const points = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % points.length;
  return points[index];
}

function formatDayKey(value: string | number | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatCoordinate(value: number, positive: string, negative: string) {
  const suffix = value >= 0 ? positive : negative;
  return `${Math.abs(value).toFixed(4)} ${suffix}`;
}

function formatSpan(spanMs: number) {
  if (spanMs <= 0) {
    return "No history loaded";
  }

  const totalMinutes = Math.round(spanMs / 60_000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];

  if (days) {
    parts.push(`${days}d`);
  }

  if (hours) {
    parts.push(`${hours}h`);
  }

  if (minutes && parts.length < 2) {
    parts.push(`${minutes}m`);
  }

  return parts.join(" ") || "Less than 1m";
}

function pickSeriesAccent(seriesId: string) {
  if (seriesId === "temperature") {
    return "#d97b23";
  }

  if (seriesId === "dewpoint") {
    return "#8d6fd1";
  }

  if (seriesId === "humidity") {
    return "#16a1b7";
  }

  if (seriesId === "wind" || seriesId === "gust") {
    return "#3b82f6";
  }

  if (seriesId === "pressure") {
    return "#159957";
  }

  if (seriesId === "uv" || seriesId === "solar") {
    return "#e6a400";
  }

  return "#0f92a7";
}
