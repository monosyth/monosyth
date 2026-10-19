export const BIRD_TIME_ZONE = "America/Los_Angeles";
export const BIRD_CONFIDENCE_THRESHOLD = 0.8;

export type BirdPicture = { url: string; author: string; license: string; licenseUrl: string };

export type BirdRecord = {
  id: string;
  timestamp: string;
  commonName: string;
  scientificName: string;
  confidence: number;
  verified: boolean;
  picture?: BirdPicture;
  source?: "Yard microphone" | "WeatherCam";
};
export type BirdDay = { date: string; records: BirdRecord[] };
export type BirdListener = {
  state: "listening" | "offline";
  lastAnalysisAt: string | null;
  analysisWindows: number;
  sourceSampleRate: number;
  threshold: number;
  signalDb: number | null;
  sources: { yardMicrophone: boolean; camera: boolean };
};
export type BirdSnapshot = {
  version: 1;
  updatedAt: string;
  startedAt: string;
  listener: BirdListener;
  day: BirdDay;
};

export function birdDate(time: number | Date = Date.now()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BIRD_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(time);
}

export function validBirdDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T12:00:00Z`)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}
function iso(value: unknown): string | null {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
}
function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function parseBirdPicture(input: unknown): BirdPicture | undefined {
  const row = object(input);
  if (typeof row.url !== "string" || typeof row.author !== "string" || !row.author.trim() || row.author.length > 200 ||
      typeof row.license !== "string" || !row.license.trim() || row.license.length > 120 || typeof row.licenseUrl !== "string") return;
  try {
    const image = new URL(row.url), license = new URL(row.licenseUrl);
    if (image.protocol !== "https:" || !["static.avicommons.org", "upload.wikimedia.org"].includes(image.hostname) || image.username || image.password || image.port ||
        license.protocol !== "https:" || license.hostname !== "creativecommons.org" || license.username || license.password || license.port) return;
    return { url: image.href, author: row.author, license: row.license, licenseUrl: license.href };
  } catch { return; }
}

// Publish only approved report and picture fields, never source URLs or local clip paths.
export function normalizeBirdRecords(input: unknown, now = Date.now()): BirdRecord[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  return input.flatMap((raw): BirdRecord[] => {
    const row = object(raw);
    const timestamp = iso(row.timestamp);
    if (typeof row.id !== "string" || !/^bn-\d+$/.test(row.id) || seen.has(row.id) ||
        !timestamp || Date.parse(timestamp) > now ||
        typeof row.commonName !== "string" || !row.commonName.trim() || row.commonName.length > 120 ||
        typeof row.scientificName !== "string" || !row.scientificName.trim() || row.scientificName.length > 120 ||
        !finite(row.confidence) || row.confidence < BIRD_CONFIDENCE_THRESHOLD || row.confidence > 1) return [];
    seen.add(row.id);
    const source = row.source === "Yard microphone" || row.source === "WeatherCam" ? row.source : undefined;
    const picture = parseBirdPicture(row.picture);
    return [{ id: row.id, timestamp, commonName: row.commonName, scientificName: row.scientificName,
      confidence: row.confidence, verified: row.verified === true, ...(source ? { source } : {}),
      ...(picture ? { picture } : {}) }];
  }).sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
}

export function parseBirdDay(input: unknown, now = Date.now()): BirdDay {
  const day = object(input);
  if (typeof day.date !== "string" || !validBirdDate(day.date)) throw new Error("Invalid bird date");
  return { date: day.date, records: normalizeBirdRecords(day.records, now).filter(r => birdDate(Date.parse(r.timestamp)) === day.date) };
}

export function parseBirdSnapshot(input: unknown, now = Date.now()): BirdSnapshot {
  const raw = object(input), listener = object(raw.listener);
  const updatedAt = iso(raw.updatedAt), startedAt = iso(raw.startedAt);
  if (raw.version !== 1 || !updatedAt || !startedAt || Date.parse(updatedAt) > now + 60_000) throw new Error("Invalid bird feed");
  const lastAnalysisAt = iso(listener.lastAnalysisAt);
  return { version: 1, updatedAt, startedAt, day: parseBirdDay(raw.day, now), listener: {
    state: listener.state === "listening" ? "listening" : "offline",
    lastAnalysisAt: lastAnalysisAt && Date.parse(lastAnalysisAt) <= now + 60_000 ? lastAnalysisAt : null,
    analysisWindows: finite(listener.analysisWindows) ? Math.max(0, Math.floor(listener.analysisWindows)) : 0,
    sourceSampleRate: finite(listener.sourceSampleRate) ? listener.sourceSampleRate : 8000,
    threshold: finite(listener.threshold) ? Math.max(BIRD_CONFIDENCE_THRESHOLD, Math.min(1, listener.threshold)) : BIRD_CONFIDENCE_THRESHOLD,
    signalDb: finite(listener.signalDb) ? listener.signalDb : null,
    sources: { yardMicrophone: object(listener.sources).yardMicrophone === true, camera: object(listener.sources).camera === true },
  } };
}

export function birdListenerIsFresh(snapshot: BirdSnapshot, now: number): boolean {
  const last = snapshot.listener.lastAnalysisAt;
  return snapshot.listener.state === "listening" && Boolean(last) &&
    now - Date.parse(snapshot.updatedAt) < 180_000 &&
    now - Date.parse(last!) < 120_000;
}

export function buildBirdActivity(records: BirdRecord[]) {
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  const groups = new Map<string, { name: string; scientificName: string; count: number; latest: string; confidence: number; picture?: BirdPicture }>();
  const hourFormat = new Intl.DateTimeFormat("en-US", { timeZone: BIRD_TIME_ZONE, hour: "numeric", hourCycle: "h23" });
  for (const record of records) {
    const hour = Number(hourFormat.format(new Date(record.timestamp)));
    if (hours[hour]) hours[hour].count++;
    const species = groups.get(record.scientificName);
    if (species) {
      species.count++;
      if (Date.parse(record.timestamp) > Date.parse(species.latest)) species.latest = record.timestamp;
      species.confidence = Math.max(species.confidence, record.confidence);
      species.picture ??= record.picture;
    } else groups.set(record.scientificName, { name: record.commonName, scientificName: record.scientificName, count: 1, latest: record.timestamp, confidence: record.confidence, picture: record.picture });
  }
  return { hours, species: [...groups.values()].sort((a,b) => b.count-a.count || a.name.localeCompare(b.name)) };
}
