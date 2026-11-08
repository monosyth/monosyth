import type { WeatherObservation } from "./types";
import { getWeatherDayKey } from "./time";

const HOUR = 3_600_000;

function amount(row: WeatherObservation | undefined, key: string): number | null {
  const raw = row?.[key];
  if (raw === undefined || raw === null || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function buildRainSummary(observations: WeatherObservation[], now: number) {
  const rows = observations.filter(row => typeof row.timestamp === "number" &&
    Number.isFinite(row.timestamp) && row.timestamp <= now).sort((a, b) => a.timestamp! - b.timestamp!);
  const latest = rows.at(-1);
  const timestamp = latest?.timestamp ?? null;
  const sameDay = timestamp !== null && getWeatherDayKey(timestamp) === getWeatherDayKey(now);
  const current = sameDay ? latest : undefined;
  const start = now - 24 * HOUR;
  const timeline = Array.from({ length: 24 }, (_, index) => {
    const from = start + index * HOUR;
    const to = from + HOUR;
    const report = rows.findLast(row => row.timestamp! > from && row.timestamp! <= to && amount(row, "hourlyrainin") !== null);
    return { timestamp: report?.timestamp ?? to, rate: amount(report, "hourlyrainin") };
  });
  // Ambient documents hourlyrainin as a rain rate in in/hr, not an accumulation.
  // https://github.com/ambient-weather/api-docs/wiki/Device-Data-Specs
  // Each timeline slot samples a rate; never add these into rainfall totals.
  const available = timeline.filter(point => point.rate !== null);
  return {
    timestamp,
    today: amount(current, "dailyrainin"),
    currentRate: amount(latest, "hourlyrainin"),
    week: amount(current, "weeklyrainin"),
    month: amount(current, "monthlyrainin"),
    year: amount(current, "yearlyrainin"),
    timeline,
    reports: available.length,
    peakRate: available.length ? Math.max(...available.map(point => point.rate!)) : null,
  };
}

export type RainSummaryData = ReturnType<typeof buildRainSummary>;
