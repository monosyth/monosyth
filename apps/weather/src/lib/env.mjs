import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_WEATHER_LIMIT = 48;
const MAX_WEATHER_LIMIT = 288;
const DEFAULT_AMBIENT_REQUEST_TIMEOUT_MS = 15_000;
const MAX_AMBIENT_REQUEST_TIMEOUT_MS = 60_000;

function parseEnvFile(filePath) {
  const entries = {};
  const raw = readFileSync(filePath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  }

  return entries;
}

function loadEnvFiles() {
  const loaded = {};

  for (const fileName of [".env", ".env.local"]) {
    const filePath = path.join(projectRoot, fileName);

    if (!existsSync(filePath)) {
      continue;
    }

    Object.assign(loaded, parseEnvFile(filePath));
  }

  return loaded;
}

const fileEnv = loadEnvFiles();

function readValue(name) {
  const value = process.env[name] ?? fileEnv[name];
  return typeof value === "string" ? value.trim() : "";
}

export function getRequiredEnv(name) {
  const value = readValue(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getOptionalEnv(name, fallback = "") {
  const value = readValue(name);
  return value || fallback;
}

function parseWeatherLimit(value) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_WEATHER_LIMIT;
  }

  return Math.min(parsed, MAX_WEATHER_LIMIT);
}

function parseAmbientRequestTimeout(value) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_AMBIENT_REQUEST_TIMEOUT_MS;
  }

  return Math.min(parsed, MAX_AMBIENT_REQUEST_TIMEOUT_MS);
}

export function getAmbientConfig() {
  return {
    apiKey: getRequiredEnv("AMBIENT_API_KEY"),
    applicationKey: getRequiredEnv("AMBIENT_APPLICATION_KEY"),
    macAddress: getOptionalEnv("AMBIENT_MAC_ADDRESS"),
    limit: parseWeatherLimit(getOptionalEnv("WEATHER_LIMIT", String(DEFAULT_WEATHER_LIMIT))),
    requestTimeoutMs: parseAmbientRequestTimeout(
      getOptionalEnv(
        "AMBIENT_REQUEST_TIMEOUT_MS",
        String(DEFAULT_AMBIENT_REQUEST_TIMEOUT_MS),
      ),
    ),
  };
}
