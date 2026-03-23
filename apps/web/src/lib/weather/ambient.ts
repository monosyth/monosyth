import { buildWeatherOverview } from "@/lib/weather/overview";
import {
  persistWeatherHistory,
  readStoredWeatherObservations,
  readStoredWeatherObservationsForDay,
  readStoredWeatherStationMeta,
} from "@/lib/weather/history";
import { getHourlyForecast } from "@/lib/weather/nws";
import type { WeatherObservation, WeatherPageData } from "@/lib/weather/types";

const API_BASE_URL = "https://api.ambientweather.net/v1";
const CACHE_TTL_MS = 60_000;
const DEFAULT_WEATHER_LIMIT = 48;
const MAX_WEATHER_LIMIT = 288;
const DEFAULT_AMBIENT_REQUEST_TIMEOUT_MS = 15_000;
const MAX_AMBIENT_REQUEST_TIMEOUT_MS = 60_000;
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
type WeatherCacheEntry = {
  expiresAt: number;
  value: Extract<WeatherPageData, { state: "ready" }>;
};
type LiveWeatherSnapshot = {
  device: WeatherDevice;
  observations: WeatherObservation[];
};

export type WeatherDashboardView = "current" | "week" | "month" | "year";

let weatherCache: WeatherCacheEntry | null = null;

function parsePositiveInt(value: string, fallback: number, max: number) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max);
}

function readEnv() {
  const apiKey = process.env.AMBIENT_API_KEY?.trim() ?? "";
  const applicationKey = process.env.AMBIENT_APPLICATION_KEY?.trim() ?? "";
  const macAddress = process.env.AMBIENT_MAC_ADDRESS?.trim() ?? "";
  const stationName = process.env.WEATHER_STATION_NAME?.trim() ?? "";
  const stationLocation = process.env.WEATHER_STATION_LOCATION?.trim() ?? "";
  const limitValue = process.env.WEATHER_LIMIT?.trim() ?? String(DEFAULT_WEATHER_LIMIT);
  const timeoutValue =
    process.env.AMBIENT_REQUEST_TIMEOUT_MS?.trim() ??
    String(DEFAULT_AMBIENT_REQUEST_TIMEOUT_MS);

  return {
    apiKey,
    applicationKey,
    macAddress,
    stationName,
    stationLocation,
    limit: parsePositiveInt(limitValue, DEFAULT_WEATHER_LIMIT, MAX_WEATHER_LIMIT),
    requestTimeoutMs: parsePositiveInt(
      timeoutValue,
      DEFAULT_AMBIENT_REQUEST_TIMEOUT_MS,
      MAX_AMBIENT_REQUEST_TIMEOUT_MS,
    ),
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
  const { requestTimeoutMs } = readEnv();
  const url = new URL(`${API_BASE_URL}${pathname}`);
  url.search = withAuth(params).toString();

  let response: Response;

  try {
    response = await fetch(url, {
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error(`Ambient Weather API request timed out after ${requestTimeoutMs}ms.`);
    }

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

async function fetchLiveWeatherSnapshot(): Promise<LiveWeatherSnapshot> {
  const env = readEnv();

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
    throw new Error(
      "No Ambient Weather station was returned for this account. Try running the local devices script to confirm the station and macAddress.",
    );
  }

  const observations = await getDeviceHistory(device.macAddress, env.limit);

  return {
    device,
    observations,
  };
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

function applyStationOverrides(
  data: Extract<WeatherPageData, { state: "ready" }>["data"],
) {
  const env = readEnv();

  return {
    ...data,
    station: {
      ...data.station,
      name: env.stationName || data.station.name,
      location: env.stationLocation || data.station.location,
    },
  };
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

export function normalizeWeatherDashboardView(
  value?: string,
): WeatherDashboardView {
  if (value === "week" || value === "month" || value === "year") {
    return value;
  }

  return "current";
}

async function getCurrentWeatherPageData(): Promise<WeatherPageData> {
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
    const cached = readCachedWeatherPageData();

    if (cached) {
      return {
        ...cached,
        notice:
          "Showing a recently cached station snapshot to stay inside Ambient Weather's rate limits.",
      };
    }

    const { device, observations } = await fetchLiveWeatherSnapshot();
    await persistWeatherHistory({
      device,
      observations,
      source: "page",
    }).catch(() => null);
    const currentDayObservations = device.macAddress
      ? await readStoredWeatherObservationsForDay({
          macAddress: device.macAddress,
          ...getWeatherCalendarParts(Date.now()),
        }).catch(() => [])
      : [];
    const mergedObservations = mergeObservations(
      currentDayObservations.length ? currentDayObservations : observations,
      observations,
    );
    const coordinates = resolveForecastCoordinates(mergedObservations);
    const forecast = await getHourlyForecast(
      coordinates.latitude,
      coordinates.longitude,
    ).catch(() => []);
    const readyResult: Extract<WeatherPageData, { state: "ready" }> = {
      state: "ready",
      data: applyStationOverrides(buildWeatherOverview(device, mergedObservations, forecast)),
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

function buildFallbackDevice(observations: WeatherObservation[]): WeatherDevice {
  const env = readEnv();

  return {
    macAddress: env.macAddress,
    info: {
      name: env.stationName || "Ambient Station",
      location: env.stationLocation || "",
    },
    lastData: {
      dateutc: observations.at(-1)?.timestamp ?? observations.at(-1)?.dateutc ?? Date.now(),
    },
  };
}

function buildStoredDevice(
  observations: WeatherObservation[],
  storedMeta: Awaited<ReturnType<typeof readStoredWeatherStationMeta>>,
): WeatherDevice {
  const env = readEnv();
  const lastObservationAt = observations.at(-1)?.timestamp ?? observations.at(-1)?.dateutc ?? Date.now();

  return {
    macAddress: env.macAddress,
    info: {
      name: storedMeta?.name || env.stationName || "Ambient Station",
      location: storedMeta?.location || env.stationLocation || "",
    },
    lastData: {
      dateutc: lastObservationAt,
    },
  };
}

function buildViewNotice(view: WeatherDashboardView, count: number) {
  const label = view === "week" ? "week" : view === "month" ? "month" : "year";

  if (count === 0) {
    return `No persisted ${label} history is available yet, so this view is falling back to the most recent station window.`;
  }

  return `Showing stored ${label} history collected from the station logger instead of just the latest Ambient Weather snapshot.`;
}

export async function getWeatherPageData(
  view: WeatherDashboardView = "current",
): Promise<WeatherPageData> {
  if (view === "current") {
    return getCurrentWeatherPageData();
  }

  try {
    const env = readEnv();
    const [historicalObservations, storedMeta] = await Promise.all([
      readStoredWeatherObservations({
        macAddress: env.macAddress,
        range: view,
      }),
      readStoredWeatherStationMeta({
        macAddress: env.macAddress,
      }),
    ]);
    if (historicalObservations.length) {
      const readyResult: Extract<WeatherPageData, { state: "ready" }> = {
        state: "ready",
        data: applyStationOverrides(
          buildWeatherOverview(
            buildStoredDevice(historicalObservations, storedMeta),
            historicalObservations,
            [],
          ),
        ),
        notice: buildViewNotice(view, historicalObservations.length),
      };

      return readyResult;
    }
  } catch {
    // Fall through to the current snapshot path.
  }

  const currentResult = await getCurrentWeatherPageData();

  if (currentResult.state !== "ready") {
    return currentResult;
  }

  try {
    const env = readEnv();
    const historicalObservations = await readStoredWeatherObservations({
      macAddress: env.macAddress,
      range: view,
    });
    const observations = historicalObservations.length
      ? historicalObservations
      : currentResult.data.observations;
    const coordinates = resolveForecastCoordinates(
      observations.length ? observations : currentResult.data.observations,
    );
    const forecast =
      currentResult.data.forecast.length
        ? currentResult.data.forecast
        : await getHourlyForecast(coordinates.latitude, coordinates.longitude).catch(() => []);
    const readyResult: Extract<WeatherPageData, { state: "ready" }> = {
      state: "ready",
      data: applyStationOverrides(
        buildWeatherOverview(buildFallbackDevice(observations), observations, forecast),
      ),
      notice: buildViewNotice(view, historicalObservations.length),
    };

    return readyResult;
  } catch {
    return currentResult;
  }
}

export async function captureWeatherHistorySnapshot() {
  const missing = getMissingVars();

  if (missing.length > 0) {
    throw new Error(`Missing required weather config: ${missing.join(", ")}`);
  }

  const { device, observations } = await fetchLiveWeatherSnapshot();
  const persisted = await persistWeatherHistory({
    device,
    observations,
    source: "scheduler",
  });

  return {
    ...persisted,
    observationCount: observations.length,
  };
}

function mergeObservations(primary: WeatherObservation[], secondary: WeatherObservation[]) {
  const byTimestamp = new Map<number, WeatherObservation>();

  for (const observation of [...primary, ...secondary]) {
    const timestamp = pickNumber(observation, ["timestamp", "dateutc"]);

    if (timestamp === null) {
      continue;
    }

    const normalizedTimestamp = timestamp > 1e12 ? timestamp : timestamp * 1000;
    byTimestamp.set(normalizedTimestamp, {
      ...observation,
      timestamp: normalizedTimestamp,
    });
  }

  return [...byTimestamp.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([, observation]) => observation);
}

function getWeatherCalendarParts(value: number) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const parts = formatter.formatToParts(new Date(value));

  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? "0"),
    month: Number(parts.find((part) => part.type === "month")?.value ?? "0"),
    day: Number(parts.find((part) => part.type === "day")?.value ?? "0"),
  };
}
