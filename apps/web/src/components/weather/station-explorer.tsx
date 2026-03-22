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
  { id: "1h", label: "1H", durationMs: 60 * 60 * 1000 },
  { id: "6h", label: "6H", durationMs: 6 * 60 * 60 * 1000 },
  { id: "24h", label: "24H", durationMs: 24 * 60 * 60 * 1000 },
  { id: "all", label: "All", durationMs: null },
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
  const metrics = buildWeatherMetrics(latest);
  const highlights = buildWeatherHighlights(filteredObservations);
  const series = buildWeatherSeries(filteredObservations);
  const snapshot = latest ? flattenWeatherSnapshot(latest).slice(0, 6) : [];

  return (
    <section className="glass-panel rounded-[2rem] bg-white/82 p-6 sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
            Station explorer
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-stone-950">
            Filter the live readings by time window
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600 sm:text-base">
            Compare the immediate pulse of the station against the full set of loaded
            observations without waiting for another server refresh.
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

      <div className="mt-5 rounded-[1.5rem] border border-stone-200/80 bg-stone-50/70 p-4">
        <p className="text-sm leading-6 text-stone-700">
          {describeRangeSummary(data, activeRangeId, filteredObservations.length)}
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        {metrics.map((metric) => (
          <article
            key={metric.id}
            className="rounded-[1.5rem] border border-stone-200/80 bg-stone-50/75 p-4"
          >
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
              {metric.label}
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.08em] text-stone-950">
              {metric.displayValue}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        {highlights.map((highlight) => (
          <article
            key={highlight.label}
            className="rounded-[1.5rem] border border-stone-200/80 bg-white/72 p-4"
          >
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
              {highlight.label}
            </p>
            <p className="mt-3 text-lg font-semibold tracking-[-0.04em] text-stone-950">
              {highlight.value}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {series.map((item) => (
          <WeatherChartCard
            key={`${activeRangeId}-${item.id}`}
            series={item}
            tone={pickSeriesTone(item.id)}
          />
        ))}
      </div>

      {snapshot.length ? (
        <div className="mt-6">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
            Latest sample in this view
          </p>
          <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {snapshot.map((item) => (
              <article
                key={`${activeRangeId}-${item.key}`}
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

  return `Showing ${count} observations from the last ${option.label.toLowerCase()}, ending ${loadedEnd}. Loaded history starts ${loadedStart}.`;
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
