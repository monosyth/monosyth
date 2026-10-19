export type AirQuality = {
  value: number;
  category: string;
  timestamp: number;
  area: string;
  pollutant: string;
  agency: string;
};

export function aqiCategory(value: number) {
  return value <= 50 ? "Good" : value <= 100 ? "Moderate" : value <= 150 ? "Unhealthy for sensitive groups" :
    value <= 200 ? "Unhealthy" : value <= 300 ? "Very unhealthy" : "Hazardous";
}

// AirNow's documented reportingarea.dat format. O = observation; Y = primary pollutant.
// This fixed regional feed serves the Shoreline dashboard, not the station's own sensor.
export function parseSeattleAirQuality(text: string, now: number): AirQuality | null {
  const candidates: AirQuality[] = [];
  for (const line of text.split(/\r?\n/)) {
    const f = line.split("|").map(field => field.trim());
    if (f.length < 17 || f[5] !== "O" || f[6] !== "Y" || f[7] !== "Seattle-Bellevue-Kent Valley" || f[8] !== "WA") continue;
    if (!/^\d{1,3}$/.test(f[12])) continue;
    const value = Number(f[12]);
    if (value < 0 || value > 500) continue;
    const date = f[1].match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
    if (!date || !/^\d{2}:\d{2}$/.test(f[2]) || !["PDT", "PST"].includes(f[3])) continue;
    const timestamp = Date.parse(`20${date[3]}-${date[1]}-${date[2]}T${f[2]}:00${f[3] === "PDT" ? "-07:00" : "-08:00"}`);
    if (!Number.isFinite(timestamp) || timestamp > now || now - timestamp > 3 * 3_600_000) continue;
    candidates.push({ value, category: aqiCategory(value), timestamp, area: f[7], pollutant: f[11], agency: f[16] });
  }
  return candidates.sort((a, b) => b.timestamp - a.timestamp || b.value - a.value)[0] ?? null;
}

let cached: { expiresAt: number; value: AirQuality | null } | undefined;
let inflight: Promise<AirQuality | null> | undefined;

export async function getSeattleAirQuality(): Promise<AirQuality | null> {
  const now = Date.now();
  if (cached && cached.expiresAt > now && (!cached.value || now - cached.value.timestamp <= 3 * 3_600_000)) return cached.value;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const response = await fetch("https://files.airnowtech.org/airnow/today/reportingarea.dat", {
        cache: "no-store", signal: AbortSignal.timeout(4500),
      });
      if (!response.ok) return null;
      const text = await response.text();
      if (text.length > 4_000_000) return null;
      return parseSeattleAirQuality(text, Date.now());
    } catch { return null; }
  })().then(value => {
    cached = { expiresAt: Date.now() + (value ? 15 : 2) * 60_000, value };
    return value;
  }).finally(() => { inflight = undefined; });
  return inflight;
}
