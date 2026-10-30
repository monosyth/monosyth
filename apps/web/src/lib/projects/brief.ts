import { TrackerError, type Project, type WorkEntry } from "./model";

// Agents read the journal at the start of every session. Full history for a busy
// project can exceed 100 KB and push a fresh chat straight into context
// compaction, so the default read is a small brief with clipped recent entries.
export const BRIEF_ENTRIES = 5;
export const MAX_BRIEF_ENTRIES = 20;
const CLIP = { body: 320, verification: 160, source: 160 } as const;

export type EntrySummary = {
  id: string; date: string; kind: WorkEntry["kind"]; title: string; body: string;
  verification?: string; source?: string; author: string; clipped?: true;
};

export function clip(text: string, max: number) {
  const value = text.replace(/\s+/g, " ").trim();
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}
export function validLimit(value: unknown, fallback = BRIEF_ENTRIES) {
  if (value === undefined || value === null || value === "") return fallback;
  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_BRIEF_ENTRIES) throw new TrackerError(`Use a history limit from 1 to ${MAX_BRIEF_ENTRIES}.`);
  return limit;
}
export function summarizeEntry(entry: WorkEntry): EntrySummary {
  const body = clip(entry.body, CLIP.body), verification = clip(entry.verification, CLIP.verification), source = clip(entry.source, CLIP.source);
  const clipped = body !== entry.body.trim() || verification !== entry.verification.trim() || source !== entry.source.trim();
  return {
    id: entry.id, date: entry.createdAt.slice(0, 10), kind: entry.kind, title: entry.title, body,
    ...(verification ? { verification } : {}), ...(source ? { source } : {}), author: entry.author, ...(clipped ? { clipped: true as const } : {}),
  };
}
export function summarizeHistory(entries: WorkEntry[], nextCursor: string | null) {
  return { entries: entries.map(summarizeEntry), nextCursor };
}
export function projectBrief(project: Project, entries: WorkEntry[], nextCursor: string | null, commands: { entry: string; history: string }) {
  const { id, name, area, status, revision, summary, nextStep, decisions, links, updatedAt, lastWorkedAt } = project;
  return {
    project: { id, name, area, status, revision, summary, nextStep, decisions, links, updatedAt, lastWorkedAt },
    recent: entries.map(summarizeEntry),
    note: `Compact brief: the ${entries.length} most recent entries, clipped. Read one in full with \`${commands.entry}\`${nextCursor ? `; page older work with \`${commands.history}\`` : ""}. Use history only when a specific earlier detail is needed.`,
    ...(nextCursor ? { olderCursor: nextCursor } : {}),
  };
}
export function stripEntry(entry: WorkEntry & { fingerprint?: string }): WorkEntry {
  const result = { ...entry };
  delete result.fingerprint;
  return result;
}
