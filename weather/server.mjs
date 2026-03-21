import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getDeviceHistory, listDevices, pickDevice } from "./src/lib/ambient.mjs";
import { getAmbientConfig, getOptionalEnv } from "./src/lib/env.mjs";
import { buildOverviewPayload } from "./src/lib/overview.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const host = "127.0.0.1";
const port = Number.parseInt(getOptionalEnv("WEATHER_PORT", "8787"), 10) || 8787;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

async function serveStatic(response, pathname) {
  const resolvedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(publicDir, resolvedPath);

  if (!filePath.startsWith(publicDir)) {
    sendJson(response, 403, { error: "forbidden" });
    return;
  }

  try {
    const body = await readFile(filePath);
    const extension = path.extname(filePath);
    response.writeHead(200, {
      "content-type": contentTypes[extension] ?? "application/octet-stream",
      "cache-control": extension === ".html" ? "no-store" : "public, max-age=300",
    });
    response.end(body);
  } catch {
    sendJson(response, 404, { error: "not-found" });
  }
}

async function handleOverview(response) {
  try {
    const config = getAmbientConfig();
    const devices = await listDevices();
    const device = pickDevice(devices, config.macAddress);

    if (!device) {
      sendJson(response, 404, { error: "No Ambient Weather device was found for this account." });
      return;
    }

    const observations = await getDeviceHistory(device.macAddress, {
      limit: config.limit,
    });

    sendJson(response, 200, buildOverviewPayload(device, observations));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendJson(response, 500, { error: message });
  }
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (requestUrl.pathname === "/api/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (requestUrl.pathname === "/api/overview") {
    await handleOverview(response);
    return;
  }

  await serveStatic(response, requestUrl.pathname);
});

server.listen(port, host, () => {
  console.log(`Weather dashboard running at http://${host}:${port}`);
});
