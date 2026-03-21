import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

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

export function getAmbientConfig() {
  return {
    apiKey: getRequiredEnv("AMBIENT_API_KEY"),
    applicationKey: getRequiredEnv("AMBIENT_APPLICATION_KEY"),
    macAddress: getOptionalEnv("AMBIENT_MAC_ADDRESS"),
    limit: Number.parseInt(getOptionalEnv("WEATHER_LIMIT", "1"), 10) || 1,
  };
}
