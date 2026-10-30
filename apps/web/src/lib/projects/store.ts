import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { Firestore, Transaction } from "firebase-admin/firestore";
import { getFirebaseAdminDb } from "../firebase/admin";
import { parseEntry, parseProject, validId, validRevision, TrackerError, type Board, type EntryInput, type Project, type WorkEntry } from "./model";
import { stripEntry } from "./brief";

const root = () => getFirebaseAdminDb().collection("privateProjectTracker").doc("owner");
const projects = () => root().collection("projects");
const entries = () => root().collection("workEntries");
const now = () => new Date().toISOString();
export async function getProject(id: string) {
  const doc = await projects().doc(validId(id)).get();
  if (!doc.exists) throw new TrackerError("This project could not be found.", 404);
  return doc.data() as Project;
}
export async function listBoard(): Promise<Board> {
  const [projectRows, entryRows] = await Promise.all([
    projects().orderBy("updatedAt", "desc").limit(500).get(),
    entries().orderBy("createdAt", "desc").limit(100).get(),
  ]);
  return { projects: projectRows.docs.map(row => row.data() as Project), entries: entryRows.docs.map(row => stripEntry(row.data() as WorkEntry)), loadedAt: now() };
}
export async function listEntries(projectId: string, cursor?: string, limit = 50) {
  validId(projectId);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) throw new TrackerError("Use a history page size from 1 to 50.");
  let query = entries().where("projectId", "==", projectId).orderBy("createdAt", "desc").orderBy("__name__", "desc").limit(limit + 1);
  if (cursor) {
    const doc = await entries().doc(validId(cursor)).get();
    if (!doc.exists || doc.data()?.projectId !== projectId) throw new TrackerError("The history page is no longer available. Refresh the project.");
    query = query.startAfter(doc);
  }
  const rows = await query.get();
  return { entries: rows.docs.slice(0, limit).map(row => stripEntry(row.data() as WorkEntry)), nextCursor: rows.docs.length > limit ? rows.docs[limit - 1].id : null };
}
export async function getEntry(projectId: string, entryId: string) {
  validId(projectId);
  const doc = await entries().doc(validId(entryId)).get();
  if (!doc.exists || doc.data()?.projectId !== projectId) throw new TrackerError("This entry could not be found in the project.", 404);
  return stripEntry(doc.data() as WorkEntry);
}
export async function createProject(id: string, value: unknown, author: string) {
  validId(id);
  const data = parseProject(value), timestamp = now();
  const project: Project = { sites: [], ...data, id, revision: 1, createdAt: timestamp, updatedAt: timestamp, latestEntry: "Project added to the journal", lastWorkedAt: null };
  const entry: WorkEntry = { id: randomUUID(), projectId: id, title: "Project added to the journal", body: data.summary, kind: "note", verification: "", source: "", author, createdAt: timestamp };
  await getFirebaseAdminDb().runTransaction(async tx => {
    const ref = projects().doc(id);
    if ((await tx.get(ref)).exists) throw new TrackerError("A project already uses this ID. Choose another.", 409);
    tx.create(ref, project);
    tx.create(entries().doc(entry.id), entry);
  });
  return project;
}
export async function updateProject(id: string, value: unknown, revision: unknown, author: string) {
  validId(id);
  const data = parseProject(value), expectedRevision = validRevision(revision);
  return getFirebaseAdminDb().runTransaction(async tx => {
    const ref = projects().doc(id), doc = await tx.get(ref);
    if (!doc.exists) throw new TrackerError("This project could not be found.", 404);
    const before = doc.data() as Project;
    if (before.revision !== expectedRevision) throw new TrackerError("This project changed in another session. Refresh before saving your edits.", 409);
    const changed = (Object.keys(data) as (keyof typeof data)[]).filter(key => JSON.stringify(data[key]) !== JSON.stringify(before[key]));
    if (!changed.length) return before;
    const timestamp = now(), next = { ...before, ...data, revision: before.revision + 1, updatedAt: timestamp };
    const entry: WorkEntry = { id: randomUUID(), projectId: id, title: "Project details updated", body: changed.map(key => {
      const label = key === "nextStep" ? "Next step" : key.charAt(0).toUpperCase() + key.slice(1);
      return `${label}: ${typeof data[key] === "string" ? data[key] : JSON.stringify(data[key])}`;
    }).join("\n"), kind: "note", verification: "", source: "", author, createdAt: timestamp };
    next.latestEntry = entry.title;
    tx.set(ref, next);
    tx.create(entries().doc(entry.id), entry);
    return next;
  });
}
function fingerprint(input: EntryInput) {
  // Revisions can advance on retry; the substantive content must still match.
  const content = { ...input };
  delete content.expectedRevision;
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}
export function journalRecorder(database: Firestore) {
 return async (projectId: string, value: unknown, author: string, guard?: (tx: Transaction) => Promise<void>) => {
  validId(projectId);
  const input = parseEntry(value), hash = fingerprint(input);
  const tracker = database.collection("privateProjectTracker").doc("owner");
  return database.runTransaction(async tx => {
    if (guard) await guard(tx);
    const projectRef = tracker.collection("projects").doc(projectId), entryRef = tracker.collection("workEntries").doc(input.id);
    const [projectDoc, existing] = await Promise.all([tx.get(projectRef), tx.get(entryRef)]);
    if (!projectDoc.exists) throw new TrackerError("This project could not be found.", 404);
    if (existing.exists) {
      if (existing.data()?.projectId !== projectId || existing.data()?.fingerprint !== hash) {
        throw new TrackerError("This entry ID already belongs to different content. Use a new ID for a new update.", 409);
      }
      return { entry: existing.data() as WorkEntry, duplicate: true };
    }
    const project = projectDoc.data() as Project;
    if (input.expectedRevision && project.revision !== input.expectedRevision) throw new TrackerError("This project changed in another session. Refresh before changing its status or next step.", 409);
    const timestamp = now();
    const entry: WorkEntry = { id: input.id, projectId, title: input.title, body: input.body, kind: input.kind, verification: input.verification, source: input.source, author, createdAt: timestamp };
    const next = { ...project, revision: project.revision + 1, updatedAt: timestamp, latestEntry: input.title };
    if (input.kind !== "import") next.lastWorkedAt = timestamp;
    if (input.status !== undefined) next.status = input.status;
    if (input.nextStep !== undefined) next.nextStep = input.nextStep;
    tx.create(entryRef, { ...entry, fingerprint: hash });
    tx.set(projectRef, next);
    return { entry, duplicate: false };
  });
 };
}
export async function recordEntry(projectId: string, value: unknown, author: string, guard?: (tx: Transaction) => Promise<void>) {
  return journalRecorder(getFirebaseAdminDb())(projectId, value, author, guard);
}
export async function exportJournal() {
  // An explicit owner export includes the entire journal, not just the recent view.
  const [projectRows, entryRows] = await Promise.all([projects().get(), entries().get()]);
  return { format: "monosyth-project-journal", version: 1, exportedAt: now(), projects: projectRows.docs.map(doc => doc.data() as Project), entries: entryRows.docs.map(doc => stripEntry(doc.data() as WorkEntry)) };
}
