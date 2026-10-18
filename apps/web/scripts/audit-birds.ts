import assert from "node:assert/strict";
import test from "node:test";
import { birdDate, birdListenerIsFresh, normalizeBirdRecords, parseBirdDay, parseBirdSnapshot, validBirdDate } from "../src/lib/weather/birds";

const now = Date.parse("2026-10-17T01:30:00Z");
const record = { id: "bn-1", timestamp: "2026-10-17T01:20:00.000Z", commonName: "American Crow", scientificName: "Corvus brachyrhynchos", confidence: .92, verified: false };
const snapshot = { version: 1, updatedAt: new Date(now).toISOString(), startedAt: "2026-10-17T01:00:00Z", listener: { state: "listening", lastAnalysisAt: new Date(now).toISOString(), analysisWindows: 50, sourceSampleRate: 8000, threshold: .8, signalDb: -65 }, day: { date: "2026-10-16", records: [record] } };

test("history uses the Shoreline date across UTC midnight and daylight saving changes", () => {
  assert.equal(birdDate(now), "2026-10-16");
  assert.equal(birdDate(Date.parse("2026-11-01T08:30:00Z")), "2026-11-01");
  assert.equal(birdDate(Date.parse("2026-11-01T09:30:00Z")), "2026-11-01");
});
test("rejects impossible dates and path traversal", () => {
  for (const value of ["../../config", "2026-02-30", "2026-13-01", "2026-1-1"]) assert.equal(validBirdDate(value), false);
  assert.equal(validBirdDate("2028-02-29"), true);
});
test("rejects weak, future, invalid and duplicate detections", () => {
  const result = normalizeBirdRecords([record, record, { ...record, id: "bn-2", confidence: .79 }, { ...record, id: "bn-3", confidence: 1.1 }, { ...record, id: "bn-4", timestamp: "2027-01-01" }, { ...record, id: "bn-5", confidence: null }], now);
  assert.deepEqual(result, [record]);
});
test("public records discard camera URLs, audio paths, and arbitrary private fields", () => {
  assert.deepEqual(normalizeBirdRecords([{ ...record, source: "rtsp://secret@example", clipName: "/private/audio.wav", password: "private" }], now), [record]);
});
test("public feed keeps only approved source labels and live source flags", () => {
  assert.deepEqual(normalizeBirdRecords([{ ...record, source: "Yard microphone" }], now), [{ ...record, source: "Yard microphone" }]);
  const parsed = parseBirdSnapshot({ ...snapshot, listener: { ...snapshot.listener, sources: { yardMicrophone: true, camera: false, privateAddress: "192.168.88.200" } } }, now);
  assert.deepEqual(parsed.listener.sources, { yardMicrophone: true, camera: false });
});
test("daily archives cannot mix adjacent local dates", () => {
  assert.equal(parseBirdDay({ date: "2026-10-17", records: [record] }, now).records.length, 0);
});
test("stale or stopped analysis is never labelled listening", () => {
  const parsed = parseBirdSnapshot(snapshot, now);
  assert.equal(birdListenerIsFresh(parsed, now), true);
  assert.equal(birdListenerIsFresh(parsed, now + 181000), false);
  assert.equal(birdListenerIsFresh({ ...parsed, listener: { ...parsed.listener, state: "offline" } }, now), false);
  assert.equal(birdListenerIsFresh({ ...parsed, listener: { ...parsed.listener, lastAnalysisAt: null } }, now), false);
});
test("an empty healthy record is distinct from a missing or malformed feed", () => {
  const parsed = parseBirdSnapshot({ ...snapshot, day: { date: "2026-10-16", records: [] } }, now);
  assert.equal(birdListenerIsFresh(parsed, now), true);
  assert.equal(parsed.day.records.length, 0);
  assert.throws(() => parseBirdSnapshot({}, now));
});
