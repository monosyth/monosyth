import { getAmbientConfig } from "./env.mjs";
import { formatTimestamp } from "./time.mjs";

const API_BASE_URL = "https://api.ambientweather.net/v1";

function withAuth(params = {}) {
  const { apiKey, applicationKey } = getAmbientConfig();

  return new URLSearchParams({
    ...params,
    apiKey,
    applicationKey,
  });
}

async function ambientFetch(pathname, params = {}) {
  const { requestTimeoutMs } = getAmbientConfig();
  const url = new URL(`${API_BASE_URL}${pathname}`);
  url.search = withAuth(params).toString();

  let response;

  try {
    response = await fetch(url, {
      headers: {
        accept: "application/json",
      },
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new Error(`Ambient Weather API request timed out after ${requestTimeoutMs}ms.`);
    }

    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Ambient Weather network request failed: ${detail}`);
  }

  const body = await response.text();
  let parsed = body;

  if (body) {
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = body;
    }
  } else {
    parsed = null;
  }

  if (!response.ok) {
    const detail =
      parsed && typeof parsed === "object" && "error" in parsed
        ? parsed.error
        : `${response.status} ${response.statusText}`.trim();

    throw new Error(`Ambient Weather API request failed: ${detail}`);
  }

  return parsed;
}

export async function listDevices() {
  const devices = await ambientFetch("/devices");
  return Array.isArray(devices) ? devices : [];
}

export async function getDeviceHistory(macAddress, options = {}) {
  if (!macAddress) {
    throw new Error("A macAddress is required to fetch device history.");
  }

  const params = {};

  if (options.limit) {
    params.limit = String(options.limit);
  }

  const history = await ambientFetch(`/devices/${encodeURIComponent(macAddress)}`, params);
  return Array.isArray(history) ? history : [];
}

export function pickDevice(devices, preferredMacAddress = "") {
  if (!devices.length) {
    return null;
  }

  if (!preferredMacAddress) {
    return devices[0];
  }

  return (
    devices.find(
      (device) => device.macAddress?.toLowerCase() === preferredMacAddress.toLowerCase(),
    ) ?? null
  );
}

export function describeDevice(device, index = 0) {
  return {
    index,
    name: device?.info?.name ?? `Station ${index + 1}`,
    location: device?.info?.location ?? "",
    macAddress: device?.macAddress ?? "",
    lastObservationAt: formatTimestamp(device?.lastData?.dateutc),
  };
}

export function summarizeObservation(observation) {
  if (!observation || typeof observation !== "object") {
    return [];
  }

  const fields = [
    ["dateutc", "Observed"],
    ["tempf", "Temperature (F)"],
    ["feelsLike", "Feels Like (F)"],
    ["humidity", "Humidity (%)"],
    ["dewPoint", "Dew Point (F)"],
    ["baromrelin", "Pressure"],
    ["windspeedmph", "Wind Speed (mph)"],
    ["windgustmph", "Wind Gust (mph)"],
    ["winddir", "Wind Direction"],
    ["hourlyrainin", "Hourly Rain (in)"],
    ["dailyrainin", "Daily Rain (in)"],
    ["eventrainin", "Event Rain (in)"],
    ["weeklyrainin", "Weekly Rain (in)"],
    ["monthlyrainin", "Monthly Rain (in)"],
    ["totalrainin", "Total Rain (in)"],
    ["uv", "UV Index"],
    ["solarradiation", "Solar Radiation"],
  ];

  return fields
    .filter(([key]) => observation[key] !== undefined && observation[key] !== null)
    .map(([key, label]) => ({
      label,
      value: key === "dateutc" ? formatTimestamp(observation[key]) : observation[key],
    }));
}

function isTimeoutError(error) {
  return error instanceof Error && error.name === "TimeoutError";
}
