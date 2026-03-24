import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getDeviceHistory, listDevices, pickDevice } from "./src/lib/ambient.mjs";
import { getAmbientConfig, getOptionalEnv } from "./src/lib/env.mjs";
import { buildOverviewPayload } from "./src/lib/overview.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "public");
const host = "127.0.0.1";
const port = Number.parseInt(getOptionalEnv("WEATHER_PORT", "8787"), 10) || 8787;
const overviewCacheMs = parseDurationMs(
  getOptionalEnv("WEATHER_CACHE_MS", String(5 * 60 * 1000)),
  5 * 60 * 1000,
);
const rateLimitCooldownMs = parseDurationMs(
  getOptionalEnv("AMBIENT_RATE_LIMIT_COOLDOWN_MS", String(15 * 60 * 1000)),
  15 * 60 * 1000,
);
const deviceCacheMs = parseDurationMs(
  getOptionalEnv("AMBIENT_DEVICE_CACHE_MS", String(60 * 60 * 1000)),
  60 * 60 * 1000,
);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const overviewCache = {
  payload: null,
  fetchedAtMs: 0,
  expiresAtMs: 0,
  rateLimitedUntilMs: 0,
};

const deviceCache = {
  device: null,
  fetchedAtMs: 0,
};

function sendJson(request, response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(request.method === "HEAD" ? undefined : JSON.stringify(payload));
}

function sendMethodNotAllowed(request, response) {
  response.writeHead(405, {
    allow: "GET, HEAD",
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
  });
  response.end(request.method === "HEAD" ? undefined : JSON.stringify({ error: "method-not-allowed" }));
}

function parseDurationMs(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isRateLimitError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("above-user-rate-limit");
}

function withResponseMeta(payload, meta = {}) {
  return {
    ...payload,
    responseMeta: {
      servedFromCache: false,
      isStale: false,
      warning: "",
      recommendedPollMs: 60_000,
      ...payload?.responseMeta,
      ...meta,
    },
  };
}

function createFallbackDevice(macAddress, cachedDevice = null) {
  if (cachedDevice?.macAddress?.toLowerCase() === macAddress.toLowerCase()) {
    return cachedDevice;
  }

  return {
    macAddress,
    info: {
      name: `Ambient Station ${macAddress.slice(-5)}`,
      location: "",
    },
  };
}

function applyStationOverrides(payload, config) {
  return {
    ...payload,
    station: {
      ...payload.station,
      name: config.stationName || payload.station?.name || "",
      location: config.stationLocation || payload.station?.location || "",
    },
  };
}

async function resolveDevice(config) {
  const now = Date.now();
  const cachedDevice = deviceCache.device;

  if (config.macAddress) {
    return createFallbackDevice(config.macAddress, cachedDevice);
  }

  if (cachedDevice && now - deviceCache.fetchedAtMs < deviceCacheMs) {
    return cachedDevice;
  }

  const devices = await listDevices();
  const device = pickDevice(devices, config.macAddress);

  if (!device) {
    return null;
  }

  deviceCache.device = device;
  deviceCache.fetchedAtMs = now;
  return device;
}

async function fetchOverviewPayload() {
  const config = getAmbientConfig();
  const device = await resolveDevice(config);

  if (!device) {
    return {
      statusCode: 404,
      payload: { error: "No Ambient Weather device was found for this account." },
    };
  }

  const observations = await getDeviceHistory(device.macAddress, {
    limit: config.limit,
  });

  const payload = applyStationOverrides(buildOverviewPayload(device, observations, config), config);
  const now = Date.now();
  overviewCache.payload = payload;
  overviewCache.fetchedAtMs = now;
  overviewCache.expiresAtMs = now + overviewCacheMs;
  overviewCache.rateLimitedUntilMs = 0;

  return {
    statusCode: 200,
    payload: withResponseMeta(payload, {
      servedFromCache: false,
      isStale: false,
      recommendedPollMs: Math.max(Math.min(overviewCacheMs, 60_000), 15_000),
      cacheExpiresAt: new Date(overviewCache.expiresAtMs).toISOString(),
    }),
  };
}

function normalizePathname(pathname) {
  let decodedPathname;

  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  if (decodedPathname.includes("\0")) {
    return null;
  }

  const normalized = path.posix.normalize(decodedPathname);
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

async function serveStatic(request, response, pathname) {
  const normalizedPathname = normalizePathname(pathname);

  if (!normalizedPathname) {
    sendJson(request, response, 400, { error: "bad-request" });
    return;
  }

  const resolvedPath = normalizedPathname === "/" ? "/index.html" : normalizedPathname;
  const filePath = path.resolve(publicDir, `.${resolvedPath}`);

  if (filePath !== publicDir && !filePath.startsWith(`${publicDir}${path.sep}`)) {
    sendJson(request, response, 403, { error: "forbidden" });
    return;
  }

  try {
    const body = await readFile(filePath);
    const extension = path.extname(filePath);
    response.writeHead(200, {
      "content-type": contentTypes[extension] ?? "application/octet-stream",
      "cache-control": extension === ".html" ? "no-store" : "public, max-age=300",
      "x-content-type-options": "nosniff",
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    sendJson(request, response, 404, { error: "not-found" });
  }
}

async function handleOverview(request, response) {
  const now = Date.now();

  if (overviewCache.payload && now < overviewCache.expiresAtMs) {
    sendJson(
      request,
      response,
      200,
      withResponseMeta(overviewCache.payload, {
        servedFromCache: true,
        isStale: false,
        recommendedPollMs: Math.max(Math.min(overviewCacheMs, 60_000), 15_000),
        cacheExpiresAt: new Date(overviewCache.expiresAtMs).toISOString(),
      }),
    );
    return;
  }

  if (overviewCache.payload && now < overviewCache.rateLimitedUntilMs) {
    sendJson(
      request,
      response,
      200,
      withResponseMeta(overviewCache.payload, {
        servedFromCache: true,
        isStale: true,
        warning: `Ambient Weather is rate-limiting requests. Showing cached data until ${new Date(
          overviewCache.rateLimitedUntilMs,
        ).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })}.`,
        recommendedPollMs: Math.max(overviewCache.rateLimitedUntilMs - now, 60_000),
        cacheExpiresAt: new Date(overviewCache.expiresAtMs).toISOString(),
        nextRetryAt: new Date(overviewCache.rateLimitedUntilMs).toISOString(),
      }),
    );
    return;
  }

  try {
    const result = await fetchOverviewPayload();
    sendJson(request, response, result.statusCode, result.payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (isRateLimitError(error)) {
      overviewCache.rateLimitedUntilMs = Date.now() + rateLimitCooldownMs;

      if (overviewCache.payload) {
        sendJson(
          request,
          response,
          200,
          withResponseMeta(overviewCache.payload, {
            servedFromCache: true,
            isStale: true,
            warning: `Ambient Weather is rate-limiting requests. Showing cached data until ${new Date(
              overviewCache.rateLimitedUntilMs,
            ).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}.`,
            recommendedPollMs: rateLimitCooldownMs,
            cacheExpiresAt: new Date(overviewCache.expiresAtMs).toISOString(),
            nextRetryAt: new Date(overviewCache.rateLimitedUntilMs).toISOString(),
          }),
        );
        return;
      }

      sendJson(request, response, 429, {
        error: "Ambient Weather is rate-limiting requests right now. Please try again in a few minutes.",
        retryAfterSec: Math.ceil(rateLimitCooldownMs / 1000),
      });
      return;
    }

    if (overviewCache.payload) {
      sendJson(
        request,
        response,
        200,
        withResponseMeta(overviewCache.payload, {
          servedFromCache: true,
          isStale: true,
          warning: `Ambient Weather could not be reached. Showing cached data while the connection recovers.`,
          recommendedPollMs: 2 * 60_000,
          cacheExpiresAt: new Date(overviewCache.expiresAtMs).toISOString(),
        }),
      );
      return;
    }

    sendJson(request, response, 500, { error: message });
  }
}

const server = createServer(async (request, response) => {
  if (!["GET", "HEAD"].includes(request.method ?? "GET")) {
    sendMethodNotAllowed(request, response);
    return;
  }

  let requestUrl;

  try {
    requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  } catch {
    sendJson(request, response, 400, { error: "bad-request" });
    return;
  }

  if (requestUrl.pathname === "/api/health") {
    sendJson(request, response, 200, { ok: true });
    return;
  }

  if (requestUrl.pathname === "/api/overview") {
    await handleOverview(request, response);
    return;
  }

  await serveStatic(request, response, requestUrl.pathname);
});

server.listen(port, host, () => {
  console.log(`Weather dashboard running at http://${host}:${port}`);
});
