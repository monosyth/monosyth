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

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
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
  try {
    const config = getAmbientConfig();
    const devices = await listDevices();
    const device = pickDevice(devices, config.macAddress);

    if (!device) {
      sendJson(request, response, 404, {
        error: "No Ambient Weather device was found for this account.",
      });
      return;
    }

    const observations = await getDeviceHistory(device.macAddress, {
      limit: config.limit,
    });

    sendJson(request, response, 200, buildOverviewPayload(device, observations));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
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
