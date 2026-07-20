export const WEATHER_TIME_ZONE = "America/Los_Angeles";

const weatherDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: WEATHER_TIME_ZONE,
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const weatherWeekdayDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: WEATHER_TIME_ZONE,
  weekday: "short",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "numeric",
  minute: "2-digit",
});
const weatherClockFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: WEATHER_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});
const weatherLongFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: WEATHER_TIME_ZONE,
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});
const weatherHourFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: WEATHER_TIME_ZONE,
  hour: "numeric",
  hour12: false,
});
const weatherDayKeyFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: WEATHER_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const weatherDayHeadingFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: WEATHER_TIME_ZONE,
  weekday: "long",
  month: "long",
  day: "numeric",
});
const weatherDateTimePartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: WEATHER_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function toWeatherTimestamp(value: unknown) {
  if (typeof value === "number") {
    return value > 1e12 ? value : value * 1000;
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    return parsed > 1e12 ? parsed : parsed * 1000;
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function formatWeatherDateTime(value: string | number | Date) {
  return weatherDateTimeFormatter.format(new Date(value));
}

export function formatWeatherWeekdayDateTime(value: string | number | Date) {
  return weatherWeekdayDateTimeFormatter.format(new Date(value));
}

export function formatWeatherClock(value: string | number | Date) {
  return weatherClockFormatter.format(new Date(value));
}

export function formatWeatherLong(value: string | number | Date) {
  return weatherLongFormatter.format(new Date(value));
}

export function getWeatherHour(value: string | number | Date) {
  return Number(weatherHourFormatter.format(new Date(value)));
}

export function getWeatherDayKey(value: string | number | Date) {
  const parts = weatherDayKeyFormatter.formatToParts(new Date(value));
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return year && month && day ? `${year}-${month}-${day}` : "";
}

export function formatWeatherDayHeading(value: string | number | Date) {
  return weatherDayHeadingFormatter.format(new Date(value));
}

export function getWeatherDayBoundsUtc(year: number, month: number, day: number) {
  const startMs = weatherZonedMidnightToUtc(year, month, day);
  const nextCalendarDay = new Date(Date.UTC(year, month - 1, day + 1, 12));
  const endMs = weatherZonedMidnightToUtc(
    nextCalendarDay.getUTCFullYear(),
    nextCalendarDay.getUTCMonth() + 1,
    nextCalendarDay.getUTCDate(),
  );

  return { startMs, endMs };
}

function weatherZonedMidnightToUtc(year: number, month: number, day: number) {
  const utcGuess = Date.UTC(year, month - 1, day, 0, 0, 0);
  const parts = weatherDateTimePartsFormatter.formatToParts(new Date(utcGuess));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((candidate) => candidate.type === type)?.value ?? 0);
  const representedAsUtc = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second"),
  );
  const offsetAtGuess = representedAsUtc - utcGuess;

  return utcGuess - offsetAtGuess;
}
