import { loadEnvConfig } from "@next/env";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { applicationDefault, initializeApp, getApps, getApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { birdDate, normalizeBirdRecords, type BirdDay, type BirdSnapshot } from "../src/lib/weather/birds";

loadEnvConfig(process.cwd());
const run = promisify(execFile);
const root = process.env.BIRDNET_ROOT || path.join(os.homedir(), "monosyth/weather-birdnet");
const statePath = path.join(root, "data/sync-state.json");
type State = { predictions: number; analysisWindows: number; lastAnalysisAt: string | null; dayHashes: Record<string, string> };

function metric(text: string, name: string, label?: string): number | null {
  const lines = text.split("\n").filter(line => (line.startsWith(name + " ") || line.startsWith(name + "{")) && (!label || line.includes(label)));
  const values = lines.map(line => Number(line.trim().split(/\s+/).at(-1))).filter(Number.isFinite);
  return values.length ? values.reduce((a, b) => a + b, 0) : null;
}

async function main() {
  const now = Date.now(), updatedAt = new Date(now).toISOString();
  const trial = JSON.parse(await readFile(path.join(root, "trial.json"), "utf8"));
  let previous: State = { predictions: 0, analysisWindows: 0, lastAnalysisAt: null, dayHashes: {} };
  try { previous = { ...previous, ...JSON.parse(await readFile(statePath, "utf8")) }; } catch { /* first sync */ }
  const names = new Map((await readFile(path.join(root, "reference/labels-en-us.txt"), "utf8")).trim().split(/\r?\n/).map(line => {
    const split = line.indexOf("_"); return [line.slice(0, split), line.slice(split + 1)];
  }));
  let telemetry = "";
  try {
    const response = await fetch("http://127.0.0.1:8092/metrics", { signal: AbortSignal.timeout(5000) });
    if (response.ok) telemetry = await response.text();
  } catch { /* publish a disconnected state while preserving history */ }
  const predictions = metric(telemetry, "birdnet_predictions_total", 'status="success"') ?? 0;
  const advanced = predictions > 0 && predictions !== previous.predictions;
  const lastAnalysisAt = advanced ? updatedAt : previous.lastAnalysisAt;
  const analysisWindows = previous.analysisWindows + (advanced ? (predictions >= previous.predictions ? predictions - previous.predictions : predictions) : 0);
  let sources = { yardMicrophone: false, camera: false };
  try {
    const response = await fetch("http://127.0.0.1:8080/api/v2/health/audio", { signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      const health = await response.json() as { sources?: { source_id?: string; state?: string; last_dispatch?: string }[] };
      const live = (source: { state?: string; last_dispatch?: string }) => source.state === "HEALTHY" &&
        typeof source.last_dispatch === "string" && now - Date.parse(source.last_dispatch) < 90_000;
      sources = {
        yardMicrophone: health.sources?.some(source => source.source_id?.startsWith("audio_card_") && live(source)) ?? false,
        camera: health.sources?.some(source => source.source_id?.startsWith("rtsp_") && live(source)) ?? false,
      };
    }
  } catch { /* publish disconnected source status until the listener returns */ }
  const healthy = (sources.yardMicrophone || sources.camera) && metric(telemetry, "birdnet_model_loaded") === 1 &&
    lastAnalysisAt !== null && now - Date.parse(lastAnalysisAt) < 120_000;
  const signalDb = sources.yardMicrophone ? null : metric(telemetry, "myaudio_sound_level_db", 'measurement_type="overall"');
  const app = getApps().length ? getApp() : initializeApp({ credential: applicationDefault(), projectId: "monosyth" });
  const bucket = getStorage(app).bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
  const dayHashes = { ...previous.dayHashes };
  // Preserve every day's records in cloud storage. Revisit yesterday for midnight and delayed writes.
  const dates = [...new Set([birdDate(now), birdDate(now - 86_400_000)])].filter(date => date >= birdDate(Date.parse(trial.startedAt)));
  let currentDay: BirdDay = { date: birdDate(now), records: [] };
  for (const date of dates) {
    const midday = Date.parse(`${date}T12:00:00Z`);
    const from = Math.floor((midday - 36 * 3_600_000) / 1000), to = Math.ceil((midday + 36 * 3_600_000) / 1000);
    const query = `SELECT d.id, d.detected_at, d.confidence, l.scientific_name, coalesce(r.verified, '') AS verified,
        coalesce(a.source_type, '') AS source_type, coalesce(a.display_name, '') AS source_name
      FROM detections d JOIN labels l ON l.id=d.label_id JOIN taxonomic_classes t ON t.id=l.taxonomic_class_id
      LEFT JOIN detection_reviews r ON r.detection_id=d.id
      LEFT JOIN audio_sources a ON a.id=d.source_id
      WHERE t.name='Aves' AND d.confidence>=0.8 AND d.unlikely=0 AND coalesce(r.verified,'')!='false_positive'
      AND d.detected_at BETWEEN ${from} AND ${to} ORDER BY d.detected_at DESC;`;
    const { stdout } = await run("/usr/bin/sqlite3", ["-readonly", "-json", "-cmd", ".timeout 5000", path.join(root, "data/birdnet.db"), query], { maxBuffer: 10_000_000, timeout: 10_000 });
    const rows = JSON.parse(stdout || "[]") as { id: number; detected_at: number; confidence: number; scientific_name: string; verified: string; source_type: string; source_name: string }[];
    const records = normalizeBirdRecords(rows.map(row => ({ id: `bn-${row.id}`, timestamp: new Date(row.detected_at * 1000).toISOString(),
      commonName: names.get(row.scientific_name) || row.scientific_name, scientificName: row.scientific_name,
      confidence: row.confidence, verified: row.verified === "correct",
      source: row.source_name === "Yard USB Microphone" ? "Yard microphone" :
        row.source_type === "rtsp" && row.source_name === "WeatherCam" ? "WeatherCam" : undefined })), now).filter(row => birdDate(Date.parse(row.timestamp)) === date);
    const day = { date, records }, serialized = JSON.stringify(day);
    if (dayHashes[date] !== serialized) {
      await bucket.file(`weather/birds/days/${date}.json`).save(serialized, { resumable: false, contentType: "application/json", metadata: { cacheControl: "public, max-age=30" } });
      dayHashes[date] = serialized;
    }
    if (date === birdDate(now)) currentDay = day;
  }
  const snapshot: BirdSnapshot = { version: 1, updatedAt, startedAt: trial.startedAt,
    listener: { state: healthy ? "listening" : "offline", lastAnalysisAt, analysisWindows,
      sourceSampleRate: sources.yardMicrophone ? 48000 : trial.sampleRate, threshold: trial.threshold, signalDb, sources }, day: currentDay };
  await bucket.file("weather/birds/latest.json").save(JSON.stringify(snapshot), { resumable: false, contentType: "application/json", metadata: { cacheControl: "public, max-age=30" } });
  const state: State = { predictions, analysisWindows, lastAnalysisAt, dayHashes: Object.fromEntries(Object.entries(dayHashes).filter(([date]) => dates.includes(date))) };
  await writeFile(statePath + ".tmp", JSON.stringify(state), { mode: 0o600 });
  await rename(statePath + ".tmp", statePath);
  await writeFile(path.join(root, "data/latest-public.json"), JSON.stringify(snapshot, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ ok: true, updatedAt, state: snapshot.listener.state, analysisWindows, detectionsToday: currentDay.records.length }));
}
main().catch(() => { console.error("Bird history sync failed; the site will retain its last saved update."); process.exitCode = 1; });
