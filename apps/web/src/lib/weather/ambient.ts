import { buildWeatherOverview } from "@/lib/weather/overview";
import type { WeatherPageData } from "@/lib/weather/types";

const API_BASE_URL = "https://api.ambientweather.net/v1";

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
    const devices = await listDevices();
    const device = pickDevice(devices, env.macAddress);

    if (!device || !device.macAddress) {
      return {
        state: "error",
        message:
          "No Ambient Weather station was returned for this account. Try running the local devices script to confirm the station and macAddress.",
      };
    }

    const observations = await getDeviceHistory(device.macAddress, env.limit);

    return {
      state: "ready",
      data: buildWeatherOverview(device, observations),
    };
  } catch (error) {
    return {
      state: "error",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
