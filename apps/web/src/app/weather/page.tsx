import Link from "next/link";

import { RefreshButton } from "@/components/weather/refresh-button";
import { getWeatherPageData } from "@/lib/weather/ambient";
import type { WeatherSeries } from "@/lib/weather/types";

export const dynamic = "force-dynamic";

export default async function WeatherPage() {
  const result = await getWeatherPageData();

  return (
    <main className="grid-lines min-h-screen px-5 py-6 text-stone-950 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="glass-panel overflow-hidden rounded-[2rem] bg-white/85 p-7 sm:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-5">
              <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.32em] text-teal-800">
                <span className="inline-flex h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.14)]" />
                Ambient Weather
              </div>
              <div className="space-y-3">
                <h1 className="max-w-4xl text-5xl font-semibold leading-none tracking-[-0.08em] text-balance sm:text-6xl lg:text-7xl">
                  {result.state === "ready"
                    ? result.data.station.name
                    : "Personal weather, live on Monosyth"}
                </h1>
                <p className="max-w-3xl text-base leading-7 text-stone-600 sm:text-lg">
                  {result.state === "ready"
                    ? buildSummary(result.data.station.location, result.data.observationCount)
                    : "This route is wired for your Ambient Weather station and keeps all credentials on the server. Add the missing Ambient configuration and it will switch from setup mode to live conditions automatically."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="rounded-full border border-stone-300/80 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-950 hover:text-stone-950"
              >
                Back Home
              </Link>
              <RefreshButton />
            </div>
          </div>
        </section>

        {result.state === "ready" ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {result.data.metrics.map((metric) => (
                <article
                  key={metric.id}
                  className="glass-panel rounded-[1.75rem] bg-white/82 p-5"
                >
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                    {metric.label}
                  </p>
                  <p className="mt-4 text-3xl font-semibold tracking-[-0.06em] text-stone-950 sm:text-4xl">
                    {metric.displayValue}
                  </p>
                </article>
              ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="glass-panel rounded-[2rem] bg-white/82 p-6 sm:p-7">
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                      Recent Motion
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-stone-950">
                      Fast trend read
                    </h2>
                  </div>
                  <p className="text-sm text-stone-500">
                    Last update {formatDate(result.data.fetchedAt)}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {result.data.series.map((series) => (
                    <WeatherChartCard key={series.id} series={series} />
                  ))}
                </div>
              </div>

              <div className="glass-panel rounded-[2rem] bg-white/82 p-6 sm:p-7">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                  At A Glance
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-stone-950">
                  Useful rollups
                </h2>
                <div className="mt-6 grid gap-4">
                  {result.data.highlights.map((highlight) => (
                    <article
                      key={highlight.label}
                      className="rounded-[1.5rem] border border-stone-200/80 bg-stone-50/75 p-4"
                    >
                      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                        {highlight.label}
                      </p>
                      <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-stone-950">
                        {highlight.value}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section className="glass-panel rounded-[2rem] bg-white/82 p-6 sm:p-7">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                    Raw Snapshot
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-stone-950">
                    Latest station payload
                  </h2>
                </div>
                <p className="text-sm text-stone-500">
                  {result.data.station.macAddress
                    ? `Station ${result.data.station.macAddress}`
                    : "Station connected"}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {result.data.snapshot.map((item) => (
                  <article
                    key={item.key}
                    className="rounded-[1.4rem] border border-stone-200/80 bg-white/70 p-4"
                  >
                    <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-stone-500">
                      {item.key}
                    </p>
                    <p className="mt-2 break-words text-sm leading-6 text-stone-700">
                      {item.value}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="glass-panel rounded-[2rem] bg-white/82 p-6 sm:p-7">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
              Weather Setup
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-stone-950">
              {result.state === "missing-config"
                ? "One more Ambient key and this route goes live."
                : "The weather route is wired, but Ambient returned an error."}
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-stone-600">
              {result.message}
            </p>

            {result.state === "missing-config" ? (
              <div className="mt-6 flex flex-wrap gap-3">
                {result.missing.map((key) => (
                  <span
                    key={key}
                    className="rounded-full border border-stone-300 bg-stone-50 px-4 py-2 font-mono text-sm text-stone-700"
                  >
                    {key}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <article className="rounded-[1.5rem] border border-stone-200/80 bg-stone-50/75 p-4">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                  Route
                </p>
                <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-stone-950">
                  /weather
                </p>
              </article>
              <article className="rounded-[1.5rem] border border-stone-200/80 bg-stone-50/75 p-4">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                  Runtime
                </p>
                <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-stone-950">
                  Server-side Ambient fetch
                </p>
              </article>
              <article className="rounded-[1.5rem] border border-stone-200/80 bg-stone-50/75 p-4">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                  Next Step
                </p>
                <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-stone-950">
                  Add the Ambient application key
                </p>
              </article>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function buildSummary(location: string, observationCount: number) {
  const locationPrefix = location ? `${location}. ` : "";
  return `${locationPrefix}${observationCount} recent observations are powering this private station dashboard, with refresh-on-demand and server-side Ambient requests.`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function WeatherChartCard({ series }: { series: WeatherSeries }) {
  const width = 320;
  const height = 124;
  const span = series.max - series.min || 1;
  const points = series.points.map((point, index) => {
    const x = (index / Math.max(series.points.length - 1, 1)) * width;
    const y = height - ((point.value - series.min) / span) * (height - 12) - 6;
    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const fillPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return (
    <article className="rounded-[1.5rem] border border-stone-200/80 bg-stone-50/75 p-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-stone-950">{series.label}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.22em] text-stone-500">
            {formatSeriesRange(series)}
          </p>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${series.label} trend`}
        className="mt-4 h-32 w-full overflow-visible"
      >
        <line
          x1="0"
          y1={height}
          x2={width}
          y2={height}
          className="stroke-stone-300"
          strokeWidth="1"
        />
        <path d={fillPath} className="fill-teal-500/12" />
        <path
          d={linePath}
          className="stroke-teal-700"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>

      <div className="mt-3 flex justify-between gap-3 text-xs text-stone-500">
        <span>{series.points[0]?.label}</span>
        <span>{series.points.at(-1)?.label}</span>
      </div>
    </article>
  );
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
