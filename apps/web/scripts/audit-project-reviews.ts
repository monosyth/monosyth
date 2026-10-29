import assert from "node:assert/strict";
import { test } from "node:test";
import type { Firestore } from "firebase-admin/firestore";
import { journalReviewer } from "../src/lib/projects/review";
import { POST } from "../src/app/api/projects/route";

const projectPath = "privateProjectTracker/owner/projects/proof";
class MemoryDb {
  rows = new Map<string, Record<string, unknown>>();
  collection(path: string) { return { doc: (id: string) => this.ref(`${path}/${id}`) }; }
  ref(path: string): { path: string; collection: (name: string) => ReturnType<MemoryDb["collection"]> } {
    return { path, collection: name => this.collection(`${path}/${name}`) };
  }
  async runTransaction<T>(operation: (tx: unknown) => Promise<T>) {
    const writes: (() => void)[] = [];
    const result = await operation({
      get: async ({ path }: { path: string }) => {
        assert.equal(writes.length, 0, "all reads precede writes");
        const row = this.rows.get(path);
        return { exists: Boolean(row), data: () => structuredClone(row) };
      },
      set: ({ path }: { path: string }, value: Record<string, unknown>) => writes.push(() => this.rows.set(path, structuredClone(value))),
      create: ({ path }: { path: string }, value: Record<string, unknown>) => {
        assert.equal(this.rows.has(path), false);
        writes.push(() => this.rows.set(path, structuredClone(value)));
      },
    });
    writes.forEach(write => write());
    return result;
  }
}
function setup(status = "review", decisions: string[] = []) {
  const db = new MemoryDb();
  const before = { id: "proof", name: "Proof", area: "Design", summary: "Keep this summary", revision: 4, status, decisions, nextStep: "Review the preview", links: [{ label: "Proof", url: "https://example.com/proof" }], createdAt: "2026-10-28T00:00:00Z", updatedAt: "2026-10-28T00:00:00Z", lastWorkedAt: null, latestEntry: "Proof prepared" };
  db.rows.set(projectPath, before);
  return { db, before, review: journalReviewer(db as unknown as Firestore) };
}
test("Reviewed clears the review flag without completing work or losing project details", async () => {
  const { db, before, review } = setup("review", ["Choose a color"]);
  const result = await review("proof", { id: "review-1", expectedRevision: 4 }, "you");
  assert.equal(result.project.status, "active");
  assert.equal(result.project.revision, 5);
  for (const key of ["name", "area", "summary", "links", "nextStep", "decisions", "createdAt"] as const) assert.deepEqual(result.project[key], before[key]);
  const entry = db.rows.get("privateProjectTracker/owner/workEntries/review-1")!;
  assert.equal(entry.kind, "decision"); assert.equal(entry.author, "you"); assert.equal(entry.title, "Project reviewed");
});
test("OK clears only the chosen decision and releases waiting only after the last one", async () => {
  const { review } = setup("waiting", ["Approve A", "Approve B"]);
  const first = await review("proof", { id: "decision-1", expectedRevision: 4, decisionIndex: 0 }, "you");
  assert.deepEqual(first.project.decisions, ["Approve B"]);
  assert.equal(first.project.status, "waiting");
  const last = await review("proof", { id: "decision-2", expectedRevision: 5, decisionIndex: 0 }, "you");
  assert.deepEqual(last.project.decisions, []); assert.equal(last.project.status, "active");
  assert.equal(last.project.nextStep, "Review the preview");
  const complete = setup("complete", ["Approve a note"]);
  assert.equal((await complete.review("proof", { id: "complete-decision", expectedRevision: 4, decisionIndex: 0 }, "you")).project.status, "complete");
});
test("stale reviews cannot clear a newer decision or write partial history", async () => {
  const { db, review } = setup("review", ["Original decision"]);
  db.rows.set(projectPath, { ...db.rows.get(projectPath), revision: 5, decisions: ["New decision"] });
  await assert.rejects(review("proof", { id: "stale", expectedRevision: 4, decisionIndex: 0 }, "you"), /changed in another session/);
  assert.equal(db.rows.size, 1); assert.deepEqual(db.rows.get(projectPath)!.decisions, ["New decision"]);
});
test("retries are idempotent and an ID cannot acknowledge a different item", async () => {
  const { db, review } = setup();
  const input = { id: "retry", expectedRevision: 4 };
  assert.equal((await review("proof", input, "you")).duplicate, false);
  assert.equal((await review("proof", input, "you")).duplicate, true);
  assert.equal(db.rows.size, 2); assert.equal(db.rows.get(projectPath)!.revision, 5);
  await assert.rejects(review("proof", { ...input, decisionIndex: 0 }, "you"), /another update/);
});
test("invalid and obsolete review actions do not change the journal", async () => {
  const { db, review } = setup("active");
  for (const input of [null, { id: "bad", expectedRevision: 0 }, { id: "bad", expectedRevision: 4, decisionIndex: -1 }, { id: "bad", expectedRevision: 4, decisionIndex: "0" }, { id: "bad", expectedRevision: 4, decisionIndex: 0 }]) await assert.rejects(review("proof", input, "you"));
  await assert.rejects(review("proof", { id: "not-review", expectedRevision: 4 }, "you"), /no longer needs a review/);
  assert.equal(db.rows.size, 1); assert.equal(db.rows.get(projectPath)!.revision, 4);
});
test("the review action requires the owner session", async () => {
  const response = await POST(new Request("https://monosyth.com/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "review", projectId: "proof", review: { id: "anonymous", expectedRevision: 4 } }) }));
  assert.equal(response.status, 401);
});
