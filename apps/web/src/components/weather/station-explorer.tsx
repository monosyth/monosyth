"use client";

import { useState } from "react";

import { WeatherChartCard } from "@/components/weather/chart-card";
import {
  buildWeatherHighlights,
  buildWeatherMetrics,
  buildWeatherSeries,
  flattenWeatherSnapshot,
} from "@/lib/weather/derive";
import { formatWeatherDateTime } from "@/lib/weather/time";
import type { WeatherObservation, WeatherOverview } from "@/lib/weather/types";

const rangeOptions = [
  { id: "1h", label: "1 hour", durationMs: 60 * 60 * 1000 },
  { id: "6h", label: "6 hours", durationMs: 6 * 60 * 60 * 1000 },
  { id: "24h", label: "24 hours", durationMs: 24 * 60 * 60 * 1000 },
  { id: "all", label: "All loaded", durationMs: null },
] as const;

type RangeId = (typeof rangeOptions)[number]["id"];

export function StationExplorer({ data }: { data: WeatherOverview }) {
  const [activeRangeId, setActiveRangeId] = useState<RangeId>(() =>
    pickInitialRange(data.timeRange.spanMs),
  );

  const filteredObservations = filterObservationsByRange(
    data.observations,
    activeRangeId,
  );
  const latest = filteredObservations.at(-1) ?? null;
  const metrics = buildWeatherMetrics(latest).slice(0, 4);
  const highlights = buildWeatherHighlights(filteredObservations).slice(0, 4);
  const series = buildWeatherSeries(filteredObservations);
  const snapshot = latest ? flattenWeatherSnapshot(latest).slice(0, 8) : [];

  return (
    <section className="glass-panel rounded-[2rem] bg-white/82 p-6 sm:p-7">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
            History explorer
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-stone-950">
            See how the station changed across the loaded window
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600 sm:text-base">
            Switch time windows to compare the current reading against the short-term
            trend, then scan the charts for movement in temperature, wind, pressure,
            rain, and solar.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {rangeOptions.map((option) => {
            const isActive = option.id === activeRangeId;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setActiveRangeId(option.id);
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${isActive ? "bg-stone-950 text-white shadow-sm" : "border border-stone-300/80 bg-white/80 text-stone-700 hover:border-stone-950 hover:text-stone-950"}`}
                aria-pressed={isActive}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[1.7rem] border border-stone-200/80 bg-stone-50/80 p-5">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
            Window summary
          </p>
          <p className="mt-3 text-base leading-7 text-stone-700">
            {describeRangeSummary(data, activeRangeId, filteredObservations.length)}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {metrics.map((metric) => (
              <article
                key={metric.id}
                className="rounded-[1.3rem] border border-white/85 bg-white/90 p-4"
              >
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-stone-500">
                  {metric.label}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-stone-950">
                  {metric.displayValue}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            {highlights.map((highlight) => (
              <article
                key={highlight.label}
                className="rounded-[1.3rem] border border-stone-200/80 bg-white/85 p-4"
              >
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-stone-500">
                  {highlight.label}
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-700">{highlight.value}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {series.map((item) => (
            <WeatherChartCard
              key={`${activeRangeId}-${item.id}`}
              series={item}
              tone={pickSeriesTone(item.id)}
            />
          ))}
        </div>
      </div>

      {snapshot.length ? (
        <div className="mt-6 rounded-[1.7rem] border border-stone-200/80 bg-stone-50/78 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                Latest sample in this window
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-stone-950">
                Raw fields from the newest observation
              </h3>
            </div>
            <p className="text-sm text-stone-500">
              {latest?.timestamp ? formatWeatherDateTime(latest.timestamp) : "Time unknown"}
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {snapshot.map((item) => (
              <article
                key={`${activeRangeId}-${item.key}`}
                className="rounded-[1.3rem] border border-white/80 bg-white/90 p-4"
              >
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-stone-500">
                  {item.key}
                </p>
                <p className="mt-2 break-words text-sm leading-6 text-stone-700">
                  {item.value}
                </p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function pickInitialRange(spanMs: number): RangeId {
  if (spanMs >= 24 * 60 * 60 * 1000) {
    return "24h";
  }

  if (spanMs >= 6 * 60 * 60 * 1000) {
    return "6h";
  }

  if (spanMs >= 60 * 60 * 1000) {
    return "1h";
  }

  return "all";
}

function filterObservationsByRange(
  observations: WeatherObservation[],
  rangeId: RangeId,
) {
  if (!observations.length) {
    return [];
  }

  const option = rangeOptions.find((item) => item.id === rangeId);

  if (!option || option.durationMs === null) {
    return observations;
  }

  const endTimestamp = observations.at(-1)?.timestamp ?? 0;
  const cutoff = endTimestamp - option.durationMs;
  const filtered = observations.filter(
    (observation) => (observation.timestamp ?? 0) >= cutoff,
  );

  return filtered.length ? filtered : observations.slice(-1);
}

function describeRangeSummary(
  data: WeatherOverview,
  rangeId: RangeId,
  count: number,
) {
  const option = rangeOptions.find((item) => item.id === rangeId);
  const loadedStart = data.timeRange.startAt
    ? formatWeatherDateTime(data.timeRange.startAt)
    : "unknown";
  const loadedEnd = data.timeRange.endAt
    ? formatWeatherDateTime(data.timeRange.endAt)
    : "unknown";

  if (!option || option.durationMs === null) {
    return `Showing all ${count} loaded observations from ${loadedStart} through ${loadedEnd}.`;
  }

  return `Showing ${count} observations from the last ${option.label.toLowerCase()}, ending ${loadedEnd}. The loaded record begins at ${loadedStart}.`;
}

function pickSeriesTone(seriesId: string): "gold" | "sky" | "rain" | "pine" {
  if (seriesId === "temperature" || seriesId === "solar") {
    return "gold";
  }

  if (seriesId === "rain") {
    return "rain";
  }

  if (seriesId === "wind") {
    return "sky";
  }

  return "pine";
}
