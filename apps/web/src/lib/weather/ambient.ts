import { after } from "next/server";

import { buildWeatherOverview } from "@/lib/weather/overview";
import { buildWeatherSeries } from "@/lib/weather/derive";
import {
  persistWeatherHistory,
  readStoredArchiveSummary,
  readStoredWeatherObservations,
  readStoredWeatherObservationsBetween,
  readStoredWeatherStationMeta,
  writeStoredArchiveSummary,
} from "@/lib/weather/history";
import {
  applyDailyRollupsForObservations,
  readAllDailyRollups,
  readDailyRollupsBetween,
  type WeatherDailyRollup,
} from "@/lib/weather/rollups";
import { getHourlyForecast } from "@/lib/weather/nws";
import { getWeatherDayKey } from "@/lib/weather/time";
import {
  buildWeatherSummaryArchive,
  buildWeatherSummaryArchiveFromRollups,
} from "@/lib/weather/summary";
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
let weatherInflight: Promise<WeatherPageData> | null = null;

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

async function loadCurrentWeatherPageData(): Promise<WeatherPageData> {
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

    // Persisting a page snapshot and folding it into daily rollups are
    // important bookkeeping, but neither changes what this response renders.
    // Keep both jobs inside Next's request lifetime without making the user
    // wait for two Firestore writes before the page can start streaming.
    after(async () => {
      await persistWeatherHistory({
        device,
        observations,
        source: "page",
      }).catch(() => null);

      if (device.macAddress) {
        await applyDailyRollupsForObservations({
          macAddress: device.macAddress,
          observations: observations.map((observation) => ({
            ...observation,
            timestamp: normalizeObservationTimestamp(observation),
          })),
        }).catch(() => null);
      }
    });

    const latestObservationTimestamp =
      pickNumber(observations.at(-1) ?? null, ["dateutc", "timestamp"]) ?? Date.now();
    const normalizedLatestTimestamp =
      latestObservationTimestamp > 1e12
        ? latestObservationTimestamp
        : latestObservationTimestamp * 1000;
    const currentDayObservations = device.macAddress
      ? await readStoredWeatherObservationsBetween({
          macAddress: device.macAddress,
          startMs: normalizedLatestTimestamp - 27 * 60 * 60 * 1000,
          endMs: normalizedLatestTimestamp + 60_000,
        }).catch(() => [])
      : [];
    const mergedObservations = mergeObservations(
      currentDayObservations.length ? currentDayObservations : observations,
      observations,
    );
    const readyResult: Extract<WeatherPageData, { state: "ready" }> = {
      state: "ready",
      data: applyStationOverrides(
        buildWeatherOverview(device, mergedObservations, [], {
          includeSeries: false,
        }),
      ),
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

    if (message.includes("above-user-rate-limit")) {
      const storedResult = await getStoredCurrentWeatherPageData(
        "Ambient Weather rate-limited the live fetch, so this page is temporarily showing persisted logger history from Firestore.",
      );

      if (storedResult) {
        return storedResult;
      }
    }

    return {
      state: "error",
      message,
    };
  }
}

async function getCurrentWeatherPageData(
  options: { includeSeries?: boolean } = {},
): Promise<WeatherPageData> {
  const cached = readCachedWeatherPageData();

  if (cached) {
    return includeSeriesWhenRequested(
      {
        ...cached,
        notice:
          "Showing a recently cached station snapshot to stay inside Ambient Weather's rate limits.",
      },
      options.includeSeries,
    );
  }

  if (weatherInflight) {
    return includeSeriesWhenRequested(
      await weatherInflight,
      options.includeSeries,
    );
  }

  const inflight = loadCurrentWeatherPageData();
  weatherInflight = inflight;

  try {
    return includeSeriesWhenRequested(
      await inflight,
      options.includeSeries,
    );
  } finally {
    if (weatherInflight === inflight) {
      weatherInflight = null;
    }
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

async function getStoredCurrentWeatherPageData(
  notice: string,
): Promise<Extract<WeatherPageData, { state: "ready" }> | null> {
  const env = readEnv();
  const endMs = Date.now() + 60_000;
  const startMs = endMs - 27 * 60 * 60 * 1000;

  try {
    const [historicalObservations, storedMeta] = await Promise.all([
      readStoredWeatherObservationsBetween({
        macAddress: env.macAddress,
        startMs,
        endMs,
      }),
      readStoredWeatherStationMeta({
        macAddress: env.macAddress,
      }),
    ]);

    if (!historicalObservations.length) {
      return null;
    }

    return {
      state: "ready",
      data: applyStationOverrides(
        buildWeatherOverview(
          buildStoredDevice(historicalObservations, storedMeta),
          historicalObservations,
          [],
          { includeSeries: false },
        ),
      ),
      notice,
    };
  } catch {
    return null;
  }
}

function buildViewNotice(view: WeatherDashboardView, count: number) {
  const label = view === "week" ? "week" : view === "month" ? "month" : "year";

  if (count === 0) {
    return `No persisted ${label} history is available yet, so this view is falling back to the most recent station window.`;
  }

  return `Showing stored ${label} history collected from the station logger instead of just the latest Ambient Weather snapshot.`;
}

// Lightweight path used by the summaries tab — skip the unbounded
// historical observation read entirely and synthesize a "ready" payload
// from station meta + the most recent stored observations only. The
// summary renderer reads from rollup docs anyway, so the heavy raw history
// would just be thrown away.
export async function getWeatherStationOverview(
  options: { includeForecast?: boolean } = {},
): Promise<WeatherPageData> {
  const missing = getMissingVars();

  if (missing.length > 0) {
    return {
      state: "missing-config",
      missing,
      message:
        "Ambient Weather needs both a personal API key and a developer application key before live station data can render.",
    };
  }

  const env = readEnv();

  try {
    // Pull a small slice of recent observations so the dashboard masthead,
    // hero temperature, and "current" calendar slot still have data. The
    // 27-hour window matches the existing current-view path but capped low.
    const endMs = Date.now() + 60_000;
    const startMs = endMs - 27 * 60 * 60 * 1000;
    const [storedMeta, recentObservations] = await Promise.all([
      readStoredWeatherStationMeta({
        macAddress: env.macAddress,
      }),
      env.macAddress
        ? readStoredWeatherObservationsBetween({
            macAddress: env.macAddress,
            startMs,
            endMs,
            limit: 2_000,
          }).catch(() => [] as WeatherObservation[])
        : Promise.resolve([] as WeatherObservation[]),
    ]);

    const device = buildStoredDevice(recentObservations, storedMeta);
    const coordinates = resolveForecastCoordinates(recentObservations);
    const forecast = options.includeForecast
      ? await getHourlyForecast(coordinates.latitude, coordinates.longitude).catch(() => [])
      : [];

    return {
      state: "ready",
      data: applyStationOverrides(
        buildWeatherOverview(device, recentObservations, forecast, {
          includeSeries: false,
        }),
      ),
    };
  } catch (error) {
    return {
      state: "error",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getWeatherPageData(
  view: WeatherDashboardView = "current",
  options: { includeSeries?: boolean } = {},
): Promise<WeatherPageData> {
  if (view === "current") {
    return getCurrentWeatherPageData(options);
  }

  if (view === "month" || view === "year") {
    const rollupResult = await getRollupWeatherPageData(view, options).catch(
      () => null,
    );

    if (rollupResult) {
      return rollupResult;
    }
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
            { includeSeries: options.includeSeries },
          ),
        ),
        notice: buildViewNotice(view, historicalObservations.length),
      };

      return readyResult;
    }
  } catch {
    // Fall through to the current snapshot path.
  }

  const currentResult = await getCurrentWeatherPageData(options);

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
    const readyResult: Extract<WeatherPageData, { state: "ready" }> = {
      state: "ready",
      data: applyStationOverrides(
        buildWeatherOverview(buildFallbackDevice(observations), observations, [], {
          includeSeries: options.includeSeries,
        }),
      ),
      notice: buildViewNotice(view, historicalObservations.length),
    };

    return readyResult;
  } catch {
    return currentResult;
  }
}

async function getRollupWeatherPageData(
  view: "month" | "year",
  options: { includeSeries?: boolean },
): Promise<Extract<WeatherPageData, { state: "ready" }> | null> {
  const env = readEnv();

  if (!env.macAddress) {
    return null;
  }

  const endDayKey = getWeatherDayKey(new Date());
  const startDayKey = getWeatherDayKey(
    new Date(
      Date.now() -
        (view === "month" ? 32 : 366) * 24 * 60 * 60 * 1000,
    ),
  );
  const [rollups, storedMeta] = await Promise.all([
    readDailyRollupsBetween({
      macAddress: env.macAddress,
      startDayKey,
      endDayKey,
    }),
    readStoredWeatherStationMeta({ macAddress: env.macAddress }),
  ]);

  if (!rollups.length) {
    return null;
  }

  const observations = dailyRollupsToObservations(rollups);
  const overview = buildWeatherOverview(
    buildStoredDevice(observations, storedMeta),
    observations,
    [],
    { includeSeries: options.includeSeries },
  );

  return {
    state: "ready",
    data: applyStationOverrides({
      ...overview,
      observationCount: rollups.reduce(
        (sum, rollup) => sum + rollup.observationCount,
        0,
      ),
    }),
    notice: `Showing ${rollups.length} daily station rollups for the ${view} view instead of paging through raw minute observations.`,
  };
}

function dailyRollupsToObservations(
  rollups: WeatherDailyRollup[],
): WeatherObservation[] {
  const observations: WeatherObservation[] = [];

  for (const rollup of rollups) {
    const fallbackTimestamp = rollup.latestObservationAt || Date.now();
    const lowTimestamp =
      rollup.tempMin?.timestamp ||
      rollup.pressureMin?.timestamp ||
      Math.max(fallbackTimestamp - 1, 1);
    const highTimestamp =
      rollup.tempMax?.timestamp ||
      rollup.gustMax?.timestamp ||
      fallbackTimestamp;

    observations.push({
      dateutc: lowTimestamp,
      timestamp: lowTimestamp,
      tempf: rollup.tempMin?.value,
      dewPoint: rollup.dewpointMin?.value,
      humidity: rollup.humidityMin?.value,
      baromrelin: rollup.pressureMin?.value,
      windchillf: rollup.windChillMin?.value,
    });
    observations.push({
      dateutc: highTimestamp,
      timestamp: highTimestamp,
      tempf: rollup.tempMax?.value,
      dewPoint: rollup.dewpointMax?.value,
      humidity: rollup.humidityMax?.value,
      baromrelin: rollup.pressureMax?.value,
      heatindexf: rollup.heatIndexMax?.value,
      windspeedmph: rollup.windMax?.value,
      windgustmph: rollup.gustMax?.value,
      hourlyrainin: rollup.rainRateMax?.value,
      dailyrainin: rollup.rainTotal,
      solarradiation: rollup.solarMax?.value,
      brightness: rollup.brightnessMax?.value,
      lightning_day: rollup.lightningMax?.value,
    });
  }

  return observations.sort(
    (left, right) =>
      (Number(left.timestamp) || 0) - (Number(right.timestamp) || 0),
  );
}

// Reads the full station history once, computes the summary archive, and
// persists it at weatherStations/{id}/archives/summary so page renders only
// need a single Firestore read instead of paging through tens of thousands
// of observation docs.
//
// When `force` is true (manual backfill from the studio) we always walk the
// raw observations and (re)write rollup docs for every day. Without it the
// rollups-only fast path skips reaching back through history — fine for the
// cron, wrong for the first manual backfill on a new deployment.
export async function rebuildStoredWeatherArchive(
  options: { limit?: number; force?: boolean } = {},
) {
  const env = readEnv();

  if (!env.macAddress) {
    throw new Error("AMBIENT_MAC_ADDRESS is required to rebuild the archive.");
  }

  if (!options.force) {
    // Fast path — just rebuild the archive from existing rollup docs.
    const rollups = await readAllDailyRollups({ macAddress: env.macAddress });

    if (rollups.length) {
      const archive = buildWeatherSummaryArchiveFromRollups(rollups);
      const latestObservationAt =
        rollups.at(-1)?.latestObservationAt ?? Date.now();

      if (archive) {
        await writeStoredArchiveSummary({
          macAddress: env.macAddress,
          archive,
          latestObservationAt,
        });
      }

      return {
        macAddress: env.macAddress,
        source: "rollups" as const,
        observationCount: rollups.reduce((sum, rollup) => sum + rollup.observationCount, 0),
        dailyRollupCount: rollups.length,
        latestObservationAt: new Date(latestObservationAt).toISOString(),
        archiveStored: Boolean(archive),
      };
    }
  }

  // Full backfill: walk every stored observation, write a rollup doc for
  // every day we see, then build the archive from the union of pre-existing
  // and freshly-written rollups.
  const observations = await readStoredWeatherObservationsBetween({
    macAddress: env.macAddress,
    startMs: 0,
    endMs: Date.now() + 24 * 60 * 60 * 1000,
    limit: options.limit ?? 100_000,
  });

  if (observations.length) {
    await applyDailyRollupsForObservations({
      macAddress: env.macAddress,
      observations,
    }).catch(() => null);
  }

  // Re-read after writing so the archive sees the fresh rollups (plus any
  // older rollups that were already there). If the rollup read fails for
  // any reason we fall back to building the archive from the raw observations
  // we already pulled.
  const rollupsAfter = await readAllDailyRollups({
    macAddress: env.macAddress,
  }).catch(() => [] as Awaited<ReturnType<typeof readAllDailyRollups>>);

  const archive = rollupsAfter.length
    ? buildWeatherSummaryArchiveFromRollups(rollupsAfter)
    : buildWeatherSummaryArchive(observations);

  const latestObservationAt =
    rollupsAfter.at(-1)?.latestObservationAt ??
    observations.at(-1)?.timestamp ??
    Date.now();

  if (archive) {
    await writeStoredArchiveSummary({
      macAddress: env.macAddress,
      archive,
      latestObservationAt,
    });
  }

  return {
    macAddress: env.macAddress,
    source: options.force
      ? ("forced-backfill" as const)
      : ("observations-backfill" as const),
    observationCount: observations.length,
    dailyRollupCount: rollupsAfter.length,
    latestObservationAt: new Date(latestObservationAt).toISOString(),
    archiveStored: Boolean(archive),
  };
}

// The logger cron may run every few minutes, but rebuilding the archive
// every time would be wasteful. Refresh it at most once per hour from this
// path — the page itself also schedules background rebuilds via after().
const ARCHIVE_REFRESH_MIN_INTERVAL_MS = 60 * 60 * 1000;

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

  // Fold the new observations into per-day rollup docs so the summary tab
  // can read 31/365 daily docs instead of paging through thousands of
  // minute-resolution rows.
  if (device.macAddress) {
    await applyDailyRollupsForObservations({
      macAddress: device.macAddress,
      observations: observations.map((observation) => ({
        ...observation,
        timestamp: normalizeObservationTimestamp(observation),
      })),
    }).catch(() => null);
  }

  let archiveRefreshed = false;

  if (device.macAddress) {
    try {
      const stored = await readStoredArchiveSummary({ macAddress: device.macAddress });
      const isStale =
        !stored || Date.now() - stored.builtAt > ARCHIVE_REFRESH_MIN_INTERVAL_MS;

      if (isStale) {
        await rebuildStoredWeatherArchive();
        archiveRefreshed = true;
      }
    } catch {
      // Don't fail the snapshot if the archive rebuild misbehaves —
      // observations are already persisted, and the page can self-heal.
    }
  }

  return {
    ...persisted,
    observationCount: observations.length,
    archiveRefreshed,
  };
}

function normalizeObservationTimestamp(observation: WeatherObservation) {
  const raw =
    typeof observation.timestamp === "number"
      ? observation.timestamp
      : pickNumber(observation, ["timestamp", "dateutc"]);

  if (raw === null) {
    return 0;
  }

  return raw > 1e12 ? raw : raw * 1000;
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

function includeSeriesWhenRequested(
  result: WeatherPageData,
  includeSeries = false,
): WeatherPageData {
  if (
    !includeSeries ||
    result.state !== "ready" ||
    result.data.series.length > 0
  ) {
    return result;
  }

  return {
    ...result,
    data: {
      ...result.data,
      series: buildWeatherSeries(result.data.observations),
    },
  };
}
