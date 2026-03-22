import Link from "next/link";
import type { ReactNode } from "react";

import { RefreshButton } from "@/components/weather/refresh-button";
import {
  getWeatherPageData,
  normalizeWeatherDashboardView,
  type WeatherDashboardView,
} from "@/lib/weather/ambient";
import { buildWeatherAlmanac } from "@/lib/weather/almanac";
import { readStoredWeatherObservationsForDay } from "@/lib/weather/history";
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

type GraphGroup = {
  title: string;
  subtitle: string;
  series: WeatherSeries[];
};

type WeatherPageProps = {
  searchParams?: Promise<{
    view?: string;
  }>;
};

const DISPLAY_COORDINATES = {
  latitude: 47.7565,
  longitude: -122.345,
};

const currentConditionDefinitions = [
  { label: "Outside Temperature", keys: ["tempf"], decimals: 1, unit: "F" },
  { label: "Wind Chill", keys: ["windchillf"], decimals: 1, unit: "F" },
  { label: "Heat Index", keys: ["heatindexf"], decimals: 1, unit: "F" },
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
  { label: "Rain Rate", keys: ["hourlyrainin"], decimals: 2, unit: "in/h" },
  { label: "Daily Rain", keys: ["dailyrainin"], decimals: 2, unit: "in" },
  { label: "UV Index", keys: ["uv"], decimals: 1, unit: "" },
  { label: "Solar Radiation", keys: ["solarradiation"], decimals: 0, unit: "W/m2" },
  { label: "Brightness", keys: ["brightness", "lux"], decimals: 0, unit: "lx" },
  { label: "Lightning Strikes", keys: ["lightning_day", "lightning"], decimals: 0, unit: "" },
] as const;

const summaryTabs = [
  { label: "Current", view: "current" },
  { label: "Week", view: "week" },
  { label: "Month", view: "month" },
  { label: "Year", view: "year" },
] as const satisfies ReadonlyArray<{ label: string; view: WeatherDashboardView }>;

const sectionTabs = [
  { label: "Summaries", href: "#summary-section" },
  { label: "Radar", href: "#radar-section" },
  { label: "Almanac", href: "#almanac-section" },
  { label: "Graphs", href: "#graphs-section" },
  { label: "About", href: "#about-section" },
] as const;

export default async function WeatherPage({ searchParams }: WeatherPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const activeView = normalizeWeatherDashboardView(resolvedSearchParams.view);
  const result = await getWeatherPageData(activeView);

  if (result.state !== "ready") {
    return <WeatherState result={result} />;
  }

  const { data } = result;
  const currentRows = buildCurrentConditionRows(data.observations);
  const periodRows = buildPeriodSummaryRows(data, activeView);
  const rangeRows = buildRecentSummaryRows(data);
  const mastheadRows = buildMastheadRows(data, activeView);
  const stationRows = buildStationDetailRows(data, result.notice);
  const rawRows = data.snapshot.slice(0, 24).map((item) => ({
    label: item.key,
    value: item.value,
  }));
  const graphSeries = prepareGraphSeries(data.series).slice(0, 12);
  const coordinates = resolveDisplayCoordinates(data);
  const almanac = buildWeatherAlmanac({
    date: new Date(data.fetchedAt),
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
  });
  const mapUrl = buildMapUrl(coordinates.latitude, coordinates.longitude);
  const radarUrl = buildRadarEmbedUrl(coordinates.latitude, coordinates.longitude);
  const viewMeta = getViewMeta(activeView);
  const historicalComparison = await getHistoricalComparison(data, activeView);
  const graphDeck = buildGraphDeck(graphSeries);

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
                {buildHeaderMeta(data, coordinates)}
                {" "}
                <a
                  className="underline decoration-white/55 underline-offset-4 hover:decoration-white"
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Show on map
                </a>
              </p>

              <h2 className="mt-8 text-3xl font-light tracking-[-0.03em] sm:text-4xl">
                {viewMeta.heading}
              </h2>
              <p className="mt-3 max-w-3xl text-lg leading-8 text-white/88">
                {viewMeta.subtitle}
              </p>
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
        </div>
      </header>

      <div className="sticky top-0 z-20 border-b border-stone-300 bg-[#f5f5f5] shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex max-w-7xl items-center gap-4 overflow-x-auto px-5 py-3 sm:px-8 lg:px-10">
          <div className="flex min-w-max items-center gap-2 pr-3">
            {summaryTabs.map((tab) => {
              const isActive = tab.view === activeView;
              const href = tab.view === "current" ? "/weather" : `/weather?view=${tab.view}`;

              return (
                <Link
                  key={tab.view}
                  href={href}
                  prefetch
                  scroll={false}
                  className={`border-b-4 px-2 py-1 text-2xl font-light transition ${isActive ? "border-[#f4d24f] text-stone-800" : "border-transparent text-stone-600 hover:border-stone-300 hover:text-stone-800"}`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          <div className="h-8 w-px shrink-0 bg-stone-300" />

          <div className="flex min-w-max items-center gap-2">
            {sectionTabs.map((tab) => (
              <a
                key={tab.href}
                href={tab.href}
                className="border-b-4 border-transparent px-2 py-1 text-2xl font-light text-stone-600 transition hover:border-stone-300 hover:text-stone-800"
              >
                {tab.label}
              </a>
            ))}
          </div>

          <div className="ml-auto flex min-w-max items-center gap-3">
            <RefreshButton />
            <Link
              href="/"
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-950 hover:text-stone-950"
            >
              Back Home
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        {result.notice ? (
          <div className="mb-6 rounded-sm border border-[#e9c65a] bg-[#fff8de] px-5 py-4 text-sm leading-6 text-[#7d5b00]">
            {result.notice}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-2">
          <TablePanel
            id="current-section"
            title="Current Conditions"
            subtitle={`The latest station reading in the active ${viewMeta.label.toLowerCase()} tab.`}
          >
            <TwoColumnTable
              rows={currentRows}
              emptyMessage="Current conditions will appear after the next successful station fetch."
            />
          </TablePanel>

          <TablePanel
            id="almanac-section"
            title="Almanac"
            subtitle="Sun and moon timing computed for the station area, similar to the reference weather station page."
          >
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-2xl font-light text-stone-700">Sun</h3>
                <div className="mt-3">
                  <TwoColumnTable rows={almanac.sun} emptyMessage="Sun details unavailable." />
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-light text-stone-700">Moon</h3>
                <div className="mt-3">
                  <TwoColumnTable rows={almanac.moon} emptyMessage="Moon details unavailable." />
                </div>
              </div>
            </div>
          </TablePanel>
        </div>

        <div id="summary-section" className="mt-6 grid gap-6 xl:grid-cols-2">
          <TablePanel
            id="today-section"
            title={viewMeta.periodTitle}
            subtitle={viewMeta.periodSubtitle}
          >
            <ThreeColumnTable
              rows={periodRows}
              emptyMessage="Period highs and lows will populate once enough observations are available."
            />
          </TablePanel>

          <TablePanel
            id="recent-section"
            title={historicalComparison.title}
            subtitle={historicalComparison.subtitle}
          >
            <ThreeColumnTable
              rows={historicalComparison.rows.length ? historicalComparison.rows : rangeRows}
              emptyMessage={historicalComparison.rows.length ? "Historical comparison rows unavailable." : "Range details will appear once enough observations are available."}
            />
          </TablePanel>
        </div>

        <TablePanel
          id="radar-section"
          title="Radar"
          subtitle="Regional radar centered on the station area, using an external live weather map embed."
          className="mt-6 xl:max-w-4xl"
        >
          <div className="overflow-hidden rounded-sm border border-stone-200 bg-white">
            <iframe
              title="Weather radar"
              src={radarUrl}
              className="h-[520px] w-full"
              loading="lazy"
            />
          </div>
          <p className="mt-3 text-sm text-stone-500">
            The radar panel uses a live external map embed so we can get closer to the reference site&apos;s regional weather context without needing a separate radar API key.
          </p>
        </TablePanel>

        <TablePanel
          id="graphs-section"
          title="Graphs"
          subtitle="A wider set of classic station graphs, tuned to feel closer to Century Farm's graph catalog."
          className="mt-6"
        >
          {graphSeries.length ? (
            <div className="space-y-4">
              {graphDeck.featured.length ? (
                <div className="grid gap-4 xl:grid-cols-3">
                  {graphDeck.featured.map((group) => (
                    <CombinedTrendPanel
                      key={group.title}
                      title={group.title}
                      subtitle={group.subtitle}
                      seriesList={group.series}
                    />
                  ))}
                </div>
              ) : null}
              <div className="grid gap-4 xl:grid-cols-2">
                {graphDeck.singles.map((series) => (
                <TrendPanel key={series.id} series={series} />
                ))}
              </div>
            </div>
          ) : (
            <PanelState message="Trend charts need at least two recent observations with matching fields." />
          )}
        </TablePanel>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <TablePanel
            id="forecast-section"
            title="Forecast Outlook"
            subtitle="Short-range hourly forecast pulled alongside the station feed."
          >
            <ForecastTable periods={data.forecast.slice(0, 8)} />
          </TablePanel>

          <TablePanel
            id="about-section"
            title="About This Station"
            subtitle="Station metadata, source details, and the newest raw payload values."
          >
            <div className="grid gap-6">
              <TwoColumnTable
                rows={stationRows}
                emptyMessage="Station details will appear after the first successful station fetch."
              />
              <div className="border-t border-stone-200 pt-5">
                <h3 className="text-2xl font-light text-stone-700">Raw Snapshot</h3>
                <div className="mt-3">
                  <TwoColumnTable
                    rows={rawRows}
                    emptyMessage="The newest raw payload will appear here after a successful fetch."
                    monoLabels
                  />
                </div>
              </div>
            </div>
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
  children: ReactNode;
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
              className={`w-[46%] px-2 py-3 text-left align-top text-base font-normal text-stone-700 ${monoLabels ? "font-mono text-sm uppercase tracking-[0.14em] text-stone-500" : ""}`}
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

function CombinedTrendPanel({
  title,
  subtitle,
  seriesList,
}: {
  title: string;
  subtitle: string;
  seriesList: WeatherSeries[];
}) {
  const width = 420;
  const height = 180;
  const left = 18;
  const right = 14;
  const top = 10;
  const bottom = 22;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const values = seriesList.flatMap((series) => series.points.map((point) => point.value));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const labelSeries = seriesList[0]!;

  return (
    <article className="rounded-sm border border-stone-200 bg-[#fafafa] p-4 shadow-[0_4px_14px_rgba(0,0,0,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xl font-light tracking-[-0.02em] text-stone-700">{title}</p>
          <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        {seriesList.map((series) => (
          <div
            key={series.id}
            className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700"
          >
            <span
              className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: pickSeriesAccent(series.id) }}
            />
            {series.label}:{" "}
            {formatSeriesValue(series.points.at(-1)?.value ?? null, series.decimals, series.unit)}
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-sm border border-stone-200 bg-white p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${title} trend`}
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
          {seriesList.map((series) => {
            const points = series.points.map((point, index) => {
              const x = left + (index / Math.max(series.points.length - 1, 1)) * plotWidth;
              const y = top + (1 - (point.value - min) / span) * plotHeight;
              return { x, y };
            });
            const linePath = points
              .map((point, index) =>
                `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
              )
              .join(" ");
            const accent = pickSeriesAccent(series.id);

            return (
              <g key={series.id}>
                <path
                  d={linePath}
                  fill="none"
                  stroke={accent}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {points.at(-1) ? (
                  <circle
                    cx={points.at(-1)?.x ?? left}
                    cy={points.at(-1)?.y ?? top}
                    r="4"
                    fill={accent}
                  />
                ) : null}
              </g>
            );
          })}
          <text x="6" y={top + 4} fill="#7a7a7a" fontSize="12">
            {formatCompact(max, labelSeries.decimals)}
          </text>
          <text x="6" y={top + plotHeight / 2 + 4} fill="#7a7a7a" fontSize="12">
            {formatCompact(min + span / 2, labelSeries.decimals)}
          </text>
          <text x="6" y={top + plotHeight + 4} fill="#7a7a7a" fontSize="12">
            {formatCompact(min, labelSeries.decimals)}
          </text>
        </svg>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-stone-500">
        <span>{labelSeries.points[0]?.label}</span>
        <span>{labelSeries.unit || "Multi-series"}</span>
        <span>{labelSeries.points.at(-1)?.label}</span>
      </div>
    </article>
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
          <p className="mt-1 text-sm text-stone-500">{formatSeriesRange(series)}</p>
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
      const trend = buildTrendValue(
        observations,
        ["baromrelin", "baromabsin"],
        3 * 60 * 60 * 1000,
        3,
        "inHg",
      );

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

function buildPeriodSummaryRows(
  data: WeatherOverview,
  view: WeatherDashboardView,
): SummaryRow[] {
  const observations = view === "current"
    ? filterObservationsForLatestDay(data.observations)
    : data.observations;

  if (!observations.length) {
    return [];
  }

  return buildPeriodSummaryRowsFromObservations(observations);
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

function buildMastheadRows(data: WeatherOverview, view: WeatherDashboardView): FactRow[] {
  return [
    { label: "Station", value: data.station.name || "Unknown station" },
    { label: "View", value: getViewMeta(view).label },
    { label: "Software", value: "Ambient Weather + Firestore + NOAA" },
    {
      label: "Last report",
      value: data.station.lastObservationAt || formatWeatherLong(data.fetchedAt),
    },
    { label: "Loaded", value: `${data.observationCount} observations` },
    { label: "History", value: formatSpan(data.timeRange.spanMs) },
  ];
}

function buildStationDetailRows(data: WeatherOverview, notice?: string): FactRow[] {
  const coordinates = resolveDisplayCoordinates(data);

  return [
    { label: "Station", value: data.station.name || "Unknown station" },
    { label: "Location", value: data.station.location || "Location not provided" },
    {
      label: "Coordinates",
      value: `${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`,
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
    { label: "Feed Status", value: notice ? "Serving cached or persisted data" : "Serving latest fetch" },
  ];
}

function getViewMeta(view: WeatherDashboardView) {
  if (view === "year") {
    return {
      label: "Year",
      heading: "Yearly Weather History",
      subtitle: "A longer station view built from persisted observations, keeping the top tabs closer to the reference site's page behavior.",
      periodTitle: "This Year",
      periodSubtitle: "Highs, lows, and peaks across the stored yearly view.",
    };
  }

  if (view === "month") {
    return {
      label: "Month",
      heading: "Monthly Weather History",
      subtitle: "A month-scale summary view from the station archive, tuned to feel more like a dedicated weather page than a dashboard card set.",
      periodTitle: "This Month",
      periodSubtitle: "Highs, lows, and peaks across the stored monthly view.",
    };
  }

  if (view === "week") {
    return {
      label: "Week",
      heading: "Weekly Weather History",
      subtitle: "A seven-day station view using persisted observations so the tabs behave more like real page tabs.",
      periodTitle: "This Week",
      periodSubtitle: "Highs, lows, and peaks across the stored weekly view.",
    };
  }

  return {
    label: "Current",
    heading: "Current Weather Conditions",
    subtitle: "Live station conditions with dense tables, almanac timing, and a wider graph stack inspired by Century Farm Weather.",
    periodTitle: "Since Midnight",
    periodSubtitle: "Today's highs, lows, and peaks from the loaded station observations.",
  };
}

async function getHistoricalComparison(
  data: WeatherOverview,
  view: WeatherDashboardView,
) {
  if (view !== "current" || !data.station.macAddress) {
    return {
      title: "Recent Range",
      subtitle: "A compact summary of the active tab window and where the readings moved.",
      rows: [] as SummaryRow[],
    };
  }

  const latestDate = new Date(data.fetchedAt);
  const parts = getWeatherCalendarParts(latestDate);
  const priorYear = parts.year - 1;
  const observations = await readStoredWeatherObservationsForDay({
    macAddress: data.station.macAddress,
    year: priorYear,
    month: parts.month,
    day: parts.day,
  }).catch(() => []);

  return {
    title: `Last ${formatWeatherDayLabel(parts.month, parts.day)} (${priorYear})`,
    subtitle: observations.length
      ? "A same-day historical comparison from the stored station archive."
      : "No same-day historical archive is available yet, so this panel falls back to the current range summary.",
    rows: observations.length
      ? buildPeriodSummaryRowsFromObservations(observations)
      : [],
  };
}

function buildHeaderMeta(
  data: WeatherOverview,
  coordinates: { latitude: number; longitude: number },
) {
  const parts = [];

  if (data.station.location) {
    parts.push(data.station.location);
  }

  parts.push(
    `${formatCoordinate(coordinates.latitude, "N", "S")} | ${formatCoordinate(coordinates.longitude, "E", "W")}`,
  );

  return parts.join(" | ");
}

function resolveDisplayCoordinates(data: WeatherOverview) {
  return {
    latitude: data.station.latitude ?? DISPLAY_COORDINATES.latitude,
    longitude: data.station.longitude ?? DISPLAY_COORDINATES.longitude,
  };
}

function buildMapUrl(latitude: number, longitude: number) {
  return `https://maps.google.com/?q=${latitude},${longitude}`;
}

function buildRadarEmbedUrl(latitude: number, longitude: number) {
  const params = new URLSearchParams({
    lat: latitude.toFixed(4),
    lon: longitude.toFixed(4),
    detailLat: latitude.toFixed(4),
    detailLon: longitude.toFixed(4),
    width: "650",
    height: "520",
    zoom: "7",
    level: "surface",
    overlay: "radar",
    product: "radar",
    menu: "",
    message: "true",
    marker: "true",
    calendar: "now",
    pressure: "true",
    type: "map",
    location: "coordinates",
    detail: "true",
    metricWind: "mph",
    metricTemp: "°F",
  });

  return `https://embed.windy.com/embed2.html?${params.toString()}`;
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

function buildPeriodSummaryRowsFromObservations(observations: WeatherObservation[]) {
  return [
    createExtremeRow(observations, "High Temperature", ["tempf"], "max", 1, "F"),
    createExtremeRow(observations, "Low Temperature", ["tempf"], "min", 1, "F"),
    createExtremeRow(observations, "High Heat Index", ["heatindexf"], "max", 1, "F"),
    createExtremeRow(observations, "Low Wind Chill", ["windchillf"], "min", 1, "F"),
    createExtremeRow(observations, "High Dewpoint", ["dewPoint", "dewpointf"], "max", 1, "F"),
    createExtremeRow(observations, "Low Dewpoint", ["dewPoint", "dewpointf"], "min", 1, "F"),
    createExtremeRow(observations, "High Humidity", ["humidity"], "max", 0, "%"),
    createExtremeRow(observations, "Low Humidity", ["humidity"], "min", 0, "%"),
    createExtremeRow(observations, "High Barometer", ["baromrelin", "baromabsin"], "max", 3, "inHg"),
    createExtremeRow(observations, "Low Barometer", ["baromrelin", "baromabsin"], "min", 3, "inHg"),
    createLatestValueRow(observations, "Rain", ["dailyrainin"], 2, "in"),
    createExtremeRow(observations, "High Rain Rate", ["hourlyrainin"], "max", 2, "in/h"),
    createExtremeRow(observations, "High Wind", ["windspeedmph"], "max", 1, "mph"),
    createAverageRow(observations, "Average Wind", ["windspeedmph"], 1, "mph"),
    createExtremeRow(observations, "Peak Gust", ["windgustmph"], "max", 1, "mph"),
    createExtremeRow(observations, "High UV", ["uv"], "max", 1, ""),
    createExtremeRow(observations, "High Radiation", ["solarradiation"], "max", 0, "W/m2"),
    createExtremeRow(observations, "High Brightness", ["brightness", "lux"], "max", 0, "lx"),
    createLatestValueRow(observations, "Lightning Strikes", ["lightning_day", "lightning"], 0, ""),
  ].filter((row): row is SummaryRow => row !== null);
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
  const latest = [...observations]
    .reverse()
    .find((observation) => pickNumber(observation, keys) !== null);

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

function filterObservationsForLatestDay(observations: WeatherObservation[]) {
  const latestTimestamp = observations.at(-1)?.timestamp ?? 0;
  const latestDayKey = formatDayKey(latestTimestamp);

  return observations.filter(
    (observation) => formatDayKey(observation.timestamp ?? 0) === latestDayKey,
  );
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

function prepareGraphSeries(seriesList: WeatherSeries[]) {
  return seriesList
    .map((series) => ({
      ...series,
      points: condenseSeriesPoints(series.points, 240),
    }))
    .filter((series) => series.points.length > 1);
}

function buildGraphDeck(seriesList: WeatherSeries[]) {
  const byId = new Map(seriesList.map((series) => [series.id, series] as const));
  const usedIds = new Set<string>();
  const featured: GraphGroup[] = [];
  const combinations = [
    {
      title: "Temperature Family",
      subtitle: "Outdoor temperature, dew point, and indoor temperature",
      ids: ["temperature", "dewpoint", "indoorTemperature"],
    },
    {
      title: "Inside/Outside Humidity",
      subtitle: "Outdoor humidity compared with the indoor sensor",
      ids: ["humidity", "indoorHumidity"],
    },
    {
      title: "Wind and Gust",
      subtitle: "Wind speed and gusts on the same chart",
      ids: ["wind", "gust"],
    },
  ];

  for (const combo of combinations) {
    const series = combo.ids
      .map((id) => byId.get(id))
      .filter((item): item is WeatherSeries => Boolean(item));

    if (series.length < 2) {
      continue;
    }

    for (const item of series) {
      usedIds.add(item.id);
    }

    featured.push({
      title: combo.title,
      subtitle: combo.subtitle,
      series,
    });
  }

  return {
    featured,
    singles: seriesList.filter((series) => !usedIds.has(series.id)),
  };
}

function condenseSeriesPoints(points: WeatherSeries["points"], maxPoints: number) {
  if (points.length <= maxPoints) {
    return points;
  }

  const step = Math.ceil(points.length / maxPoints);
  const condensed = points.filter((_, index) => index % step === 0);
  const last = points.at(-1);

  if (last && condensed.at(-1)?.timestamp !== last.timestamp) {
    condensed.push(last);
  }

  return condensed;
}

function pickSeriesAccent(seriesId: string) {
  if (seriesId === "temperature" || seriesId === "indoorTemperature") {
    return "#d97b23";
  }

  if (seriesId === "dewpoint") {
    return "#8d6fd1";
  }

  if (seriesId === "humidity" || seriesId === "indoorHumidity") {
    return "#16a1b7";
  }

  if (seriesId === "wind" || seriesId === "gust") {
    return "#3b82f6";
  }

  if (seriesId === "pressure") {
    return "#159957";
  }

  if (seriesId === "uv" || seriesId === "solar" || seriesId === "brightness") {
    return "#e6a400";
  }

  if (seriesId === "rain" || seriesId === "rainRate") {
    return "#2563eb";
  }

  return "#0f92a7";
}

function getWeatherCalendarParts(value: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(value);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? "0");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "0");
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "0");

  return { year, month, day };
}

function formatWeatherDayLabel(month: number, day: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(2026, month - 1, day, 12, 0, 0, 0));
}
