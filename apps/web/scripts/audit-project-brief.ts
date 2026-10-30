import assert from "node:assert/strict";
import { test } from "node:test";
import { clip, projectBrief, stripEntry, summarizeEntry, summarizeHistory, validLimit, MAX_BRIEF_ENTRIES } from "../src/lib/projects/brief";
import type { Project, WorkEntry } from "../src/lib/projects/model";

const project: Project = {
  id: "krowshea", name: "Krowshea", area: "Language", summary: "A crochet language", status: "active", nextStep: "Review numbers",
  decisions: ["Approve 02A"], links: [{ label: "Folder", url: "/Users/scottwaite/claude/krowshea" }], revision: 7,
  createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-29T00:00:00.000Z", latestEntry: "Work", lastWorkedAt: "2026-10-29T00:00:00.000Z",
};
const entry = (id: string, body = "Short notes"): WorkEntry => ({
  id, projectId: "krowshea", title: `Entry ${id}`, body, kind: "progress", verification: "npm test 738/738", source: "commit abc", author: "Codex", createdAt: "2026-10-29T06:31:50.550Z",
});

test("clipping collapses whitespace and marks only long text", () => {
  assert.equal(clip("  a\n\n b  ", 10), "a b");
  assert.equal(clip("x".repeat(400), 320).length, 320);
  assert.ok(clip("x".repeat(400), 320).endsWith("…"));
});
test("entry summaries stay small and flag clipped content", () => {
  const short = summarizeEntry(entry("short"));
  assert.deepEqual(short, { id: "short", date: "2026-10-29", kind: "progress", title: "Entry short", body: "Short notes", verification: "npm test 738/738", source: "commit abc", author: "Codex" });
  const long = summarizeEntry({ ...entry("long", "y".repeat(5000)), verification: "", source: "" });
  assert.equal(long.clipped, true);
  assert.ok(long.body.length <= 320);
  assert.equal("verification" in long, false);
  assert.equal("source" in long, false);
});
test("the brief carries working fields, omits bookkeeping, and points to deeper reads", () => {
  const entries = Array.from({ length: 5 }, (_, index) => entry(`e${index}`, "z".repeat(3000)));
  const brief = projectBrief(project, entries, "e4", { entry: "pj entry krowshea <entry-id>", history: "pj history krowshea --cursor e4" });
  assert.equal(brief.project.nextStep, "Review numbers");
  assert.equal("latestEntry" in brief.project, false);
  assert.equal("createdAt" in brief.project, false);
  assert.equal(brief.recent.length, 5);
  assert.equal(brief.olderCursor, "e4");
  assert.match(brief.note, /pj entry krowshea <entry-id>/);
  assert.match(brief.note, /pj history krowshea --cursor e4/);
  // Five 3 KB entries would be about 15 KB of raw history; the brief stays a few KB.
  assert.ok(JSON.stringify(brief).length < 4000);
  const last = projectBrief(project, [entry("only")], null, { entry: "pj entry", history: "pj history" });
  assert.equal("olderCursor" in last, false);
  assert.doesNotMatch(last.note, /pj history/);
});
test("history pages are clipped and limits are bounded", () => {
  assert.deepEqual(summarizeHistory([entry("a")], null).entries.map(item => item.id), ["a"]);
  assert.equal(validLimit(undefined), 5);
  assert.equal(validLimit("", 10), 10);
  assert.equal(validLimit("20"), MAX_BRIEF_ENTRIES);
  for (const bad of ["0", "21", "2.5", "x", -1]) assert.throws(() => validLimit(bad), /history limit/);
});
test("internal retry fingerprints never leave the store", () => {
  const stored = { ...entry("f"), fingerprint: "abc" };
  assert.equal("fingerprint" in stripEntry(stored), false);
  assert.equal("fingerprint" in stored, true);
});
