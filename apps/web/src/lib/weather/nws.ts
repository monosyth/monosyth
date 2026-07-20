import type { WeatherForecastPeriod } from "@/lib/weather/types";

const NWS_API_BASE_URL = "https://api.weather.gov";
const NWS_USER_AGENT = "(monosyth.com/weather, weather@monosyth.com)";
const NWS_REQUEST_TIMEOUT_MS = 6_000;
const NWS_FORECAST_CACHE_TTL_MS = 10 * 60 * 1000;
const NWS_FORECAST_STALE_TTL_MS = 60 * 60 * 1000;

type ForecastCacheEntry = {
  expiresAt: number;
  staleUntil: number;
  value: WeatherForecastPeriod[];
  inflight: Promise<WeatherForecastPeriod[]> | null;
};

const forecastCache = new Map<string, ForecastCacheEntry>();

type NwsPointsResponse = {
  properties?: {
    forecastHourly?: string;
  };
};

type NwsForecastResponse = {
  properties?: {
    periods?: Array<{
      startTime?: string;
      endTime?: string;
      temperature?: number | null;
      temperatureUnit?: string;
      shortForecast?: string;
      detailedForecast?: string;
      windSpeed?: string;
      windDirection?: string;
      isDaytime?: boolean;
    }>;
  };
};

async function nwsFetch<T>(url: string) {
  let response: Response;

  try {
    response = await fetch(url, {
      cache: "no-store",
      headers: {
        accept: "application/geo+json",
        "user-agent": NWS_USER_AGENT,
      },
      signal: AbortSignal.timeout(NWS_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error(`NWS forecast request timed out after ${NWS_REQUEST_TIMEOUT_MS}ms.`);
    }

    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`NWS forecast request failed: ${detail}`);
  }

  const body = await response.text();
  let parsed: unknown = null;

  if (body) {
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = body;
    }
  }

  if (!response.ok) {
    const detail =
      parsed && typeof parsed === "object" && "detail" in parsed
        ? String(parsed.detail)
        : `${response.status} ${response.statusText}`.trim();

    throw new Error(`NWS forecast request failed: ${detail}`);
  }

  return parsed as T;
}

function normalizeCoordinate(value: number) {
  return value.toFixed(4);
}

export async function getHourlyForecast(
  latitude: number,
  longitude: number,
): Promise<WeatherForecastPeriod[]> {
  const cacheKey = `${normalizeCoordinate(latitude)},${normalizeCoordinate(longitude)}`;
  const now = Date.now();
  const cached = forecastCache.get(cacheKey);

  if (cached?.expiresAt && cached.expiresAt > now) {
    return cached.value;
  }

  if (cached?.inflight) {
    return cached.inflight;
  }

  const inflight = (async () => {
    const pointsUrl = `${NWS_API_BASE_URL}/points/${cacheKey}`;
    const points = await nwsFetch<NwsPointsResponse>(pointsUrl);
    const forecastHourlyUrl = points.properties?.forecastHourly ?? "";

    if (!forecastHourlyUrl) {
      throw new Error("NWS points lookup did not return an hourly forecast endpoint.");
    }

    const forecast = await nwsFetch<NwsForecastResponse>(forecastHourlyUrl);
    const periods = forecast.properties?.periods ?? [];

    return periods
      .map((period) => ({
        startTime: period.startTime ?? "",
        endTime: period.endTime ?? "",
        temperature:
          typeof period.temperature === "number" && Number.isFinite(period.temperature)
            ? period.temperature
            : null,
        temperatureUnit: period.temperatureUnit ?? "F",
        shortForecast: period.shortForecast ?? "",
        detailedForecast: period.detailedForecast ?? "",
        windSpeed: period.windSpeed ?? "",
        windDirection: period.windDirection ?? "",
        isDaytime: Boolean(period.isDaytime),
      }))
      .filter((period) => period.startTime && period.endTime);
  })();

  forecastCache.set(cacheKey, {
    expiresAt: cached?.expiresAt ?? 0,
    staleUntil: cached?.staleUntil ?? 0,
    value: cached?.value ?? [],
    inflight,
  });

  try {
    const value = await inflight;
    forecastCache.set(cacheKey, {
      expiresAt: Date.now() + NWS_FORECAST_CACHE_TTL_MS,
      staleUntil: Date.now() + NWS_FORECAST_STALE_TTL_MS,
      value,
      inflight: null,
    });
    return value;
  } catch (error) {
    if (cached?.value.length && cached.staleUntil > now) {
      forecastCache.set(cacheKey, {
        ...cached,
        inflight: null,
      });
      return cached.value;
    }

    forecastCache.delete(cacheKey);
    throw error;
  }
}
