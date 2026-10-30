export const PROJECT_STATUSES = ["active", "waiting", "paused", "idea", "review", "complete"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "In progress", waiting: "Waiting on me", paused: "Paused", idea: "Idea", review: "Review status", complete: "Complete",
};
export const ENTRY_KINDS = ["progress", "milestone", "decision", "blocker", "note", "import"] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];
export type ProjectLink = { label: string; url: string };
// Public website addresses; a path (monosyth.com/weather) scopes Google summaries to that section.
export type ProjectSite = { label: string; url: string };
export type ProjectInput = {
  name: string; area: string; summary: string; status: ProjectStatus;
  nextStep: string; decisions: string[]; links: ProjectLink[]; sites?: ProjectSite[];
};
export type Project = ProjectInput & {
  id: string; revision: number; createdAt: string; updatedAt: string;
  latestEntry: string; lastWorkedAt: string | null;
};
export type WorkEntry = {
  id: string; projectId: string; title: string; body: string; kind: EntryKind;
  verification: string; source: string; author: string; createdAt: string;
};
export type EntryInput = Pick<WorkEntry, "id" | "title" | "body" | "kind" | "verification" | "source"> & {
  status?: ProjectStatus; nextStep?: string; expectedRevision?: number;
};
export type Board = { projects: Project[]; entries: WorkEntry[]; loadedAt: string };

export class TrackerError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TrackerError("Expected a JSON object.");
  return value as Record<string, unknown>;
}
function string(value: unknown, label: string, max: number, required = false): string {
  if (typeof value !== "string") throw new TrackerError(`${label} must be text.`);
  const result = value.trim();
  if ((required && !result) || result.length > max) throw new TrackerError(`${label} ${required ? "is required and " : ""}must be at most ${max} characters.`);
  return result;
}
export function validId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9_-]{0,79}$/.test(value)) throw new TrackerError("Use a project or entry ID with lowercase letters, numbers, hyphens, or underscores.");
  return value;
}
export function validStatus(value: unknown): ProjectStatus {
  if (!PROJECT_STATUSES.includes(value as ProjectStatus)) throw new TrackerError("Choose a valid project status.");
  return value as ProjectStatus;
}
export function validRevision(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) throw new TrackerError("A current project revision is required. Refresh and try again.");
  return value as number;
}
export function validLink(value: unknown): ProjectLink {
  const data = object(value);
  const label = string(data.label, "Link label", 100, true);
  const url = string(data.url, "Link address", 1500, true);
  if (url.startsWith("/Users/") && !/[\r\n\u0000]/.test(url)) return { label, url };
  try {
    const parsed = new URL(url);
    if ((parsed.protocol === "https:" || parsed.protocol === "http:") && !parsed.username && !parsed.password) return { label, url };
  } catch { /* Report a useful validation message below. */ }
  throw new TrackerError("Links must be web URLs or local /Users/ file paths, without embedded credentials.");
}
export function validSite(value: unknown): ProjectSite {
  const data = object(value);
  const label = string(data.label ?? "", "Website label", 100), url = string(data.url, "Website address", 300, true);
  let parsed: URL;
  try { parsed = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`); } catch { throw new TrackerError("Websites must be web addresses such as https://example.com."); }
  // The server checks uptime for these addresses, so only public host names on default ports are accepted.
  const privateHost = /^[\d.]+$|^\[|(^|\.)(localhost|local|internal|lan|home|arpa)$/i.test(parsed.hostname);
  if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.port || privateHost || !parsed.hostname.includes(".")) {
    throw new TrackerError("Websites must be plain web addresses such as https://example.com or https://example.com/section.");
  }
  return { label: label || parsed.hostname.replace(/^www\./, ""), url: parsed.toString() };
}
export function parseProject(value: unknown): ProjectInput {
  const data = object(value);
  if (!Array.isArray(data.decisions) || data.decisions.length > 30) throw new TrackerError("Use at most 30 open decisions.");
  if (!Array.isArray(data.links) || data.links.length > 30) throw new TrackerError("Use at most 30 project links.");
  if (data.sites !== undefined && (!Array.isArray(data.sites) || data.sites.length > 10)) throw new TrackerError("Use at most 10 project websites.");
  return {
    name: string(data.name, "Project name", 120, true), area: string(data.area, "Area", 80, true),
    summary: string(data.summary, "Summary", 1500), status: validStatus(data.status),
    nextStep: string(data.nextStep, "Next step", 1500),
    decisions: data.decisions.map(item => string(item, "Decision", 1000, true)),
    links: data.links.map(validLink),
    // Older clients omit websites; leaving the key out preserves the stored list on update.
    ...(Array.isArray(data.sites) ? { sites: data.sites.map(validSite) } : {}),
  };
}
export function parseEntry(value: unknown): EntryInput {
  const data = object(value);
  if (!ENTRY_KINDS.includes(data.kind as EntryKind)) throw new TrackerError("Choose a valid work entry kind.");
  const result: EntryInput = {
    id: validId(data.id), title: string(data.title, "Entry title", 180, true),
    body: string(data.body, "Work notes", 10000), kind: data.kind as EntryKind,
    verification: string(data.verification ?? "", "Verification", 3000),
    source: string(data.source ?? "", "Source", 1500),
  };
  if (data.status !== undefined) result.status = validStatus(data.status);
  if (data.nextStep !== undefined) result.nextStep = string(data.nextStep, "Next step", 1500);
  if (data.expectedRevision !== undefined) result.expectedRevision = validRevision(data.expectedRevision);
  if ((result.status !== undefined || result.nextStep !== undefined) && !result.expectedRevision) {
    throw new TrackerError("Refresh the project before changing its status or next step.");
  }
  return result;
}
