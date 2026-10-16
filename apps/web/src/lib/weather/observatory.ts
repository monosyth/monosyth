import SunCalc from "suncalc";
import type { WeatherOverview, WeatherObservation } from "./types";

export function reading(row: WeatherObservation | undefined, ...keys: string[]): number | null {
  for (const key of keys) {
    const raw = row?.[key];
    if (raw === null || raw === undefined || raw === "") continue;
    const value = Number(raw);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

export function cloudCoverFromForecast(description?: string): number | null {
  if (!description) return null;
  if (/overcast|mostly cloudy/i.test(description)) return 0.88;
  if (/partly|partially/i.test(description)) return 0.45;
  if (/mostly sunny|mostly clear/i.test(description)) return 0.2;
  if (/cloud|rain|shower|snow|fog|mist/i.test(description)) return 0.75;
  if (/sunny|clear/i.test(description)) return 0.08;
  return null;
}

export function compassPoint(degrees: number | null) {
  return degrees === null ? "—" : ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"][Math.round(((degrees % 360) + 360) % 360 / 22.5) % 16];
}

export function buildObservatory(data: WeatherOverview, latitude: number, longitude: number) {
  const now = new Date(data.fetchedAt).getTime();
  const rows = [...data.observations].filter(row => typeof row.timestamp === "number" && row.timestamp <= now).sort((a,b) => a.timestamp! - b.timestamp!);
  const latest = rows.at(-1);
  const recent = rows.filter(row => row.timestamp! >= now - 86_400_000);
  const currentForecast = data.forecast.find(period => Date.parse(period.startTime) <= now && Date.parse(period.endTime) > now);
  const temperature = reading(latest, "tempf");
  const wind = reading(latest, "windspeedmph");
  const rainRate = reading(latest, "hourlyrainin");
  const sun = SunCalc.getTimes(new Date(now), latitude, longitude);
  const sunPosition = SunCalc.getPosition(new Date(now), latitude, longitude);
  const moon = SunCalc.getMoonIllumination(new Date(now));
  const timestamp = latest?.timestamp ?? null;
  const stale = timestamp === null || now - timestamp > 20 * 60_000;
  const temperatures = recent.map(row => ({ timestamp: row.timestamp!, value: reading(row, "tempf") })).filter((point): point is {timestamp: number; value: number} => point.value !== null);
  const pressureTarget = (timestamp ?? now) - 3 * 3_600_000;
  const earlierPressure = [...recent].reverse().find(row => row.timestamp! <= pressureTarget && row.timestamp! >= pressureTarget - 20 * 60_000);
  const pressure = reading(latest, "baromrelin", "baromabsin");
  const priorPressure = reading(earlierPressure, "baromrelin", "baromabsin");
  const condition = currentForecast?.shortForecast || (rainRate !== null && rainRate > 0 ? "Recent rainfall" : "At the station");
  return {
    now, timestamp, stale, temperature, condition,
    forecastCondition: Boolean(currentForecast),
    cloudCover: cloudCoverFromForecast(currentForecast?.shortForecast),
    wind, windDirection: reading(latest, "winddir"), gust: reading(latest, "windgustmph"),
    humidity: reading(latest, "humidity"), dewpoint: reading(latest, "dewPoint", "dewpointf"),
    pressure, pressureChange: pressure !== null && priorPressure !== null ? pressure - priorPressure : null,
    rain: reading(latest, "dailyrainin"), rainRate,
    uv: reading(latest, "uv"), solar: reading(latest, "solarradiation"),
    high: temperatures.length ? Math.max(...temperatures.map(p => p.value)) : null,
    low: temperatures.length ? Math.min(...temperatures.map(p => p.value)) : null,
    temperatures,
    sunrise: sun.sunrise.getTime(), sunset: sun.sunset.getTime(),
    sunAltitude: sunPosition.altitude, sunAzimuth: sunPosition.azimuth,
    moonIllumination: moon.fraction,
    forecast: data.forecast.filter(period => Date.parse(period.endTime) > now).slice(0, 12),
  };
}
export type ObservatoryData = ReturnType<typeof buildObservatory>;
