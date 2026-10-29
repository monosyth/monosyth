import "server-only";
import { createHash } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { getFirebaseAdminDb } from "../firebase/admin";
import { TrackerError, validId, validRevision, type Project, type WorkEntry } from "./model";

// One transaction clears only the selected flag and preserves the review in history.
export function journalReviewer(database: Firestore) {
  return async (projectId: string, value: unknown, author: string) => {
    validId(projectId);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new TrackerError("Choose a review to clear.");
    const input = value as Record<string, unknown>;
    const id = validId(input.id), revision = validRevision(input.expectedRevision), index = input.decisionIndex;
    if (index !== undefined && (!Number.isSafeInteger(index) || (index as number) < 0)) throw new TrackerError("Choose an open decision.");
    const fingerprint = createHash("sha256").update(JSON.stringify({ action: "review", projectId, decisionIndex: index ?? null })).digest("hex");
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
      const timestamp = new Date().toISOString();
      const next = { ...before, revision: before.revision + 1, updatedAt: timestamp, lastWorkedAt: timestamp };
      let title: string, body: string;
      if (index === undefined) {
        if (before.status !== "review") throw new TrackerError("This project no longer needs a review.", 409);
        next.status = "active";
        title = "Project reviewed";
        body = "Marked reviewed and returned to In progress. The next step and any open decisions remain available.";
      } else {
        const decision = before.decisions[index as number];
        if (!decision) throw new TrackerError("This decision is no longer open. Refresh the project.", 409);
        next.decisions = before.decisions.filter((_, position) => position !== index);
        if (!next.decisions.length && (before.status === "waiting" || before.status === "review")) next.status = "active";
        title = "Decision approved";
        body = `Approved: ${decision}`;
      }
      next.latestEntry = title;
      const entry: WorkEntry = { id, projectId, title, body, kind: "decision", verification: "", source: "", author, createdAt: timestamp };
      tx.set(projectRef, next);
      tx.create(entryRef, { ...entry, fingerprint });
      return { project: next, duplicate: false };
    });
  };
}

export async function reviewProject(projectId: string, input: unknown, author: string) {
  return journalReviewer(getFirebaseAdminDb())(projectId, input, author);
}
