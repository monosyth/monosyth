const WEATHER_TIME_ZONE = "America/Los_Angeles";

export function formatWeatherDateTime(value: string | number | Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: WEATHER_TIME_ZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatWeatherClock(value: string | number | Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: WEATHER_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatWeatherLong(value: string | number | Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: WEATHER_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}
