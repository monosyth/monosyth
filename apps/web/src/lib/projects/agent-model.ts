import { parseEntry, TrackerError, validId, type EntryInput } from "./model";

export const PAIRING_LIFETIME_MS = 10 * 60_000;
export const POLL_INTERVAL_MS = 5_000;
export const TOKEN_LIFETIMES = [1, 7, 30] as const;
export type AgentGrant = {
  id: string; projectId: string; label: string; ownerHash: string;
  createdAt: string; expiresAt: string; revokedAt: string | null; lastUsedAt: string | null;
};
export type Pairing = {
  projectId: string; label: string; createdAt: string; expiresAt: string;
  state: "pending" | "approved" | "denied" | "consumed";
  lastPollAt: number; lifetimeDays?: number; ownerHash?: string;
};
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TrackerError("Send a JSON object.");
  return value as Record<string, unknown>;
}
export function exactKeys(data: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(data).some(key => !allowed.includes(key))) throw new TrackerError("This connection only supports the documented journal fields.");
}
export function connectionLabel(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 80 || /[\u0000-\u001f\u007f]/.test(value)) throw new TrackerError("Use a connection name of 1–80 characters.");
  return value.trim();
}
export function userCode(value: unknown) {
  if (typeof value !== "string") throw new TrackerError("Enter the code shown by your Linux client.");
  const code = value.toUpperCase().replace(/[\s-]/g, "");
  if (!/^[A-HJ-NP-Z2-9]{12}$/.test(code)) throw new TrackerError("Enter the 12-character code shown by your Linux client.");
  return code;
}
export function deviceCode(value: unknown) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{43}$/.test(value)) throw new TrackerError("This connection request is invalid or expired.", 401);
  return value;
}
export function tokenValue(request: Request) {
  const match = /^Bearer (mjp_[A-Za-z0-9_-]{43})$/.exec(request.headers.get("authorization") ?? "");
  if (!match) throw new TrackerError("Connect this client to the project journal first.", 401);
  return match[1];
}
export function assertGrant(grant: AgentGrant | undefined, ownerHash: string, projectId: string, timestamp: number) {
  if (!grant || !ownerHash || grant.ownerHash !== ownerHash || grant.revokedAt || !Number.isFinite(Date.parse(grant.expiresAt)) || Date.parse(grant.expiresAt) <= timestamp) throw new TrackerError("This journal connection has expired or was revoked. Connect again.", 401);
  if (grant.projectId !== validId(projectId)) throw new TrackerError("This connection is limited to its approved project.", 403);
}
export function parseAgentEntry(value: unknown): EntryInput {
  const data = object(value);
  exactKeys(data, ["id", "title", "body", "kind", "verification", "source"]);
  return parseEntry(data);
}
export function safeGrant(grant: AgentGrant) {
  return { id: grant.id, projectId: grant.projectId, label: grant.label, createdAt: grant.createdAt, expiresAt: grant.expiresAt, revokedAt: grant.revokedAt, lastUsedAt: grant.lastUsedAt };
}
