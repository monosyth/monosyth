import "server-only";
import { createHash } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { getFirebaseAdminDb } from "../firebase/admin";
import { STATUS_LABELS, TrackerError, validId, validRevision, validStatus, type Project, type WorkEntry } from "./model";

type Plan = { title: string; body: string; changes: Partial<Project>; worked: boolean };
function object(value: unknown, message: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TrackerError(message);
  return value as Record<string, unknown>;
}
// Owner quick actions share one shape: a revision-checked project change and
// its history entry commit together, and a retried ID replays as a duplicate.
function quickAction(database: Firestore, projectId: string, id: string, revision: number, fingerprint: string, author: string, plan: (before: Project) => Plan) {
  const tracker = database.collection("privateProjectTracker").doc("owner");
  return database.runTransaction(async tx => {
    const projectRef = tracker.collection("projects").doc(projectId), entryRef = tracker.collection("workEntries").doc(id);
    const [projectDoc, existing] = await Promise.all([tx.get(projectRef), tx.get(entryRef)]);
    if (!projectDoc.exists) throw new TrackerError("This project could not be found.", 404);
    const before = projectDoc.data() as Project;
    if (existing.exists) {
      if (existing.data()?.projectId !== projectId || existing.data()?.fingerprint !== fingerprint) throw new TrackerError("This review ID already belongs to another update.", 409);
      return { project: before, duplicate: true };
    }
    if (before.revision !== revision) throw new TrackerError("This project changed in another session. Refresh and review the latest version.", 409);
    const { title, body, changes, worked } = plan(before), timestamp = new Date().toISOString();
    const next: Project = { ...before, ...changes, revision: before.revision + 1, updatedAt: timestamp, latestEntry: title, ...(worked ? { lastWorkedAt: timestamp } : {}) };
    const entry: WorkEntry = { id, projectId, title, body, kind: "decision", verification: "", source: "", author, createdAt: timestamp };
    tx.set(projectRef, next);
    tx.create(entryRef, { ...entry, fingerprint });
    return { project: next, duplicate: false };
  });
}
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

// One transaction clears only the selected flag and preserves the review in history.
// A decision can be approved (OK), answered with the owner's words, or dropped.
export function journalReviewer(database: Firestore) {
  return async (projectId: string, value: unknown, author: string) => {
    validId(projectId);
    const input = object(value, "Choose a review to clear.");
    const id = validId(input.id), revision = validRevision(input.expectedRevision), index = input.decisionIndex, resolution = input.resolution;
    if (index !== undefined && (!Number.isSafeInteger(index) || (index as number) < 0)) throw new TrackerError("Choose an open decision.");
    if (resolution !== undefined && (index === undefined || !["answer", "drop"].includes(resolution as string))) throw new TrackerError("Answer or drop an open decision.");
    let answer = "";
    if (resolution === "answer") {
      answer = typeof input.answer === "string" ? input.answer.trim() : "";
      if (!answer || answer.length > 3000) throw new TrackerError("Write an answer of at most 3000 characters.");
    }
    // Plain OK keeps its original fingerprint so retries from older pages still match.
    const fingerprint = hash({ action: "review", projectId, decisionIndex: index ?? null, ...(resolution ? { resolution, answer } : {}) });
    return quickAction(database, projectId, id, revision, fingerprint, author, before => {
      if (index === undefined) {
        if (before.status !== "review") throw new TrackerError("This project no longer needs a review.", 409);
        return { title: "Project reviewed", body: "Marked reviewed and returned to In progress. The next step and any open decisions remain available.", changes: { status: "active" }, worked: true };
      }
      const decision = before.decisions[index as number];
      if (!decision) throw new TrackerError("This decision is no longer open. Refresh the project.", 409);
      const decisions = before.decisions.filter((_, position) => position !== index);
      const changes: Partial<Project> = { decisions };
      if (!decisions.length && (before.status === "waiting" || before.status === "review")) changes.status = "active";
      if (resolution === "answer") return { title: "Decision answered", body: `Q: ${decision}\nA: ${answer}`, changes, worked: true };
      if (resolution === "drop") return { title: "Decision dropped", body: `Dropped without approval: ${decision}`, changes, worked: true };
      return { title: "Decision approved", body: `Approved: ${decision}`, changes, worked: true };
    });
  };
}

// One-click status moves record what changed but do not count as project work.
export function journalStatusChanger(database: Firestore) {
  return async (projectId: string, value: unknown, author: string) => {
    validId(projectId);
    const input = object(value, "Choose a status.");
    const id = validId(input.id), revision = validRevision(input.expectedRevision), status = validStatus(input.status);
    return quickAction(database, projectId, id, revision, hash({ action: "status", projectId, status }), author, before => {
      if (before.status === status) throw new TrackerError(`This project is already ${STATUS_LABELS[status]}.`, 409);
      return { title: `Status changed to ${STATUS_LABELS[status]}`, body: `${STATUS_LABELS[before.status]} → ${STATUS_LABELS[status]}`, changes: { status }, worked: false };
    });
  };
}

export async function reviewProject(projectId: string, input: unknown, author: string) {
  return journalReviewer(getFirebaseAdminDb())(projectId, input, author);
}
export async function changeStatus(projectId: string, input: unknown, author: string) {
  return journalStatusChanger(getFirebaseAdminDb())(projectId, input, author);
}
