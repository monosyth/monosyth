import { buildWeatherOverview } from "@/lib/weather/overview";
import { getHourlyForecast } from "@/lib/weather/nws";
import type { WeatherPageData } from "@/lib/weather/types";

const API_BASE_URL = "https://api.ambientweather.net/v1";
const CACHE_TTL_MS = 60_000;
const SEATTLE_COORDINATES = {
  latitude: 47.6062,
  longitude: -122.3321,
};

type WeatherDevice = {
  macAddress?: string;
  info?: {
    name?: string;
    location?: string;
  };
  lastData?: {
    dateutc?: string | number;
  };
};

type WeatherObservation = Record<string, string | number | null | undefined>;
type WeatherCacheEntry = {
  expiresAt: number;
  value: Extract<WeatherPageData, { state: "ready" }>;
};

let weatherCache: WeatherCacheEntry | null = null;

function readEnv() {
  const apiKey = process.env.AMBIENT_API_KEY?.trim() ?? "";
  const applicationKey = process.env.AMBIENT_APPLICATION_KEY?.trim() ?? "";
  const macAddress = process.env.AMBIENT_MAC_ADDRESS?.trim() ?? "";
  const limitValue = process.env.WEATHER_LIMIT?.trim() ?? "48";
  const limit = Number.parseInt(limitValue, 10);

  return {
    apiKey,
    applicationKey,
    macAddress,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 48,
  };
}

function getMissingVars() {
  const env = readEnv();
  const missing: string[] = [];

  if (!env.apiKey) {
    missing.push("AMBIENT_API_KEY");
  }

  if (!env.applicationKey) {
    missing.push("AMBIENT_APPLICATION_KEY");
  }

  return missing;
}

function withAuth(params: Record<string, string>) {
  const { apiKey, applicationKey } = readEnv();

  return new URLSearchParams({
    ...params,
    apiKey,
    applicationKey,
  });
}

async function ambientFetch<T>(pathname: string, params: Record<string, string> = {}) {
  const url = new URL(`${API_BASE_URL}${pathname}`);
  url.search = withAuth(params).toString();

  let response: Response;

  try {
    response = await fetch(url, {
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Ambient Weather network request failed: ${detail}`);
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
      parsed && typeof parsed === "object" && "error" in parsed
        ? String(parsed.error)
        : `${response.status} ${response.statusText}`.trim();

    throw new Error(`Ambient Weather API request failed: ${detail}`);
  }

  return parsed as T;
}

async function listDevices() {
  const devices = await ambientFetch<WeatherDevice[]>("/devices");
  return Array.isArray(devices) ? devices : [];
}

async function getDeviceHistory(macAddress: string, limit: number) {
  if (!macAddress) {
    throw new Error("A macAddress is required to fetch device history.");
  }

  const observations = await ambientFetch<WeatherObservation[]>(
    `/devices/${encodeURIComponent(macAddress)}`,
    { limit: String(limit) },
  );

  return Array.isArray(observations) ? observations : [];
}

function pickDevice(devices: WeatherDevice[], preferredMacAddress: string) {
  if (!devices.length) {
    return null;
  }

  if (!preferredMacAddress) {
    return devices[0];
  }

  return (
    devices.find(
      (device) =>
        device.macAddress?.toLowerCase() === preferredMacAddress.toLowerCase(),
    ) ?? null
  );
}

function readCachedWeatherPageData() {
  if (!weatherCache) {
    return null;
  }

  if (Date.now() > weatherCache.expiresAt) {
    weatherCache = null;
    return null;
  }

  return weatherCache.value;
}

function writeCachedWeatherPageData(
  value: Extract<WeatherPageData, { state: "ready" }>,
) {
  weatherCache = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value,
  };
}

function pickNumber(source: WeatherObservation | null, keys: string[]) {
  if (!source) {
    return null;
  }

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

function resolveForecastCoordinates(observations: WeatherObservation[]) {
  const latest = observations.at(-1) ?? null;
  const latitude = pickNumber(latest, ["lat", "latitude"]);
  const longitude = pickNumber(latest, ["lon", "long", "longitude"]);

  return {
    latitude: latitude ?? SEATTLE_COORDINATES.latitude,
    longitude: longitude ?? SEATTLE_COORDINATES.longitude,
  };
}

export async function getWeatherPageData(): Promise<WeatherPageData> {
  const missing = getMissingVars();

  if (missing.length > 0) {
    return {
      state: "missing-config",
      missing,
      message:
        "Ambient Weather needs both a personal API key and a developer application key before live station data can render.",
    };
  }

  try {
    const env = readEnv();
    const cached = readCachedWeatherPageData();

    if (cached) {
      return {
        ...cached,
        notice:
          "Showing a recently cached station snapshot to stay inside Ambient Weather's rate limits.",
      };
    }

    let device: WeatherDevice | null = null;

    if (env.macAddress) {
      device = {
        macAddress: env.macAddress,
      };
    } else {
      const devices = await listDevices();
      device = pickDevice(devices, env.macAddress);
    }

    if (!device || !device.macAddress) {
      return {
        state: "error",
        message:
          "No Ambient Weather station was returned for this account. Try running the local devices script to confirm the station and macAddress.",
      };
    }

    const observations = await getDeviceHistory(device.macAddress, env.limit);
    const coordinates = resolveForecastCoordinates(observations);
    const forecast = await getHourlyForecast(
      coordinates.latitude,
      coordinates.longitude,
    ).catch(() => []);
    const readyResult: Extract<WeatherPageData, { state: "ready" }> = {
      state: "ready",
      data: buildWeatherOverview(device, observations, forecast),
    };

    writeCachedWeatherPageData(readyResult);

    return readyResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const cached = readCachedWeatherPageData();

    if (message.includes("above-user-rate-limit") && cached) {
      return {
        ...cached,
        notice:
          "Ambient Weather rate-limited the live fetch, so this page is temporarily showing the last successful station snapshot.",
      };
    }

    return {
      state: "error",
      message,
    };
  }
}
