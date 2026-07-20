import {
  formatWeatherDayHeading,
  getWeatherDayKey,
} from "@/lib/weather/time";
import type { WeatherForecastPeriod } from "@/lib/weather/types";

export type DaylightForecastDay = {
  dateKey: string;
  dominantCondition: string;
  highTemperature: number | null;
  label: string;
  lowTemperature: number | null;
  periods: WeatherForecastPeriod[];
  temperatureUnit: string;
};

export function buildDaylightForecastDays(
  periods: WeatherForecastPeriod[],
  options: { maxDays?: number; nowMs?: number } = {},
): DaylightForecastDay[] {
  const maxDays = Math.max(1, options.maxDays ?? 3);
  const nowMs = options.nowMs ?? Date.now();
  const groups = new Map<string, WeatherForecastPeriod[]>();

  for (const period of [...periods].sort(
    (left, right) => Date.parse(left.startTime) - Date.parse(right.startTime),
  )) {
    const endMs = Date.parse(period.endTime);

    if (!period.isDaytime || !Number.isFinite(endMs) || endMs <= nowMs) {
      continue;
    }

    const dateKey = getWeatherDayKey(period.startTime);

    if (!dateKey) {
      continue;
    }

    if (!groups.has(dateKey) && groups.size >= maxDays) {
      continue;
    }

    const day = groups.get(dateKey) ?? [];
    day.push(period);
    groups.set(dateKey, day);
  }

  return [...groups.entries()].map(([dateKey, dayPeriods]) => {
    const temperatures = dayPeriods
      .map((period) => period.temperature)
      .filter((value): value is number => value !== null && Number.isFinite(value));
    const conditions = new Map<string, number>();

    for (const period of dayPeriods) {
      const condition = period.shortForecast.trim();

      if (condition) {
        conditions.set(condition, (conditions.get(condition) ?? 0) + 1);
      }
    }

    const dominantCondition = [...conditions.entries()].sort(
      (left, right) => right[1] - left[1],
    )[0]?.[0] ?? "Daylight outlook";

    return {
      dateKey,
      dominantCondition,
      highTemperature: temperatures.length ? Math.max(...temperatures) : null,
      label: formatWeatherDayHeading(dayPeriods[0].startTime),
      lowTemperature: temperatures.length ? Math.min(...temperatures) : null,
      periods: dayPeriods,
      temperatureUnit: dayPeriods.find((period) => period.temperatureUnit)?.temperatureUnit ?? "F",
    };
  });
}
