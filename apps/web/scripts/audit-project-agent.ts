import assert from "node:assert/strict";
import { test } from "node:test";
import type { Firestore, Transaction } from "firebase-admin/firestore";
import { createAgentService, hashSecret } from "../src/lib/projects/agent-store";
import { assertGrant, parseAgentEntry, safeGrant, tokenValue, userCode } from "../src/lib/projects/agent-model";
import { agentBody, checkOrigin } from "../src/lib/projects/agent-http";
import { journalRecorder } from "../src/lib/projects/store";
import { GET as agentGet, POST as agentPost, DELETE as agentDelete } from "../src/app/api/projects/agent/route";
import { GET as accessGet, POST as accessPost } from "../src/app/api/projects/agent-access/route";
import { POST as connectPost } from "../src/app/api/projects/agent-connect/route";
import { isPublicAnalyticsPath } from "../src/lib/analytics";

// Transactional test double: writes commit together and reads after writes fail,
// matching Firestore's ordering requirement. Production service logic is unchanged.
class MemoryDb {
  rows = new Map<string, Record<string, unknown>>();
  tail: Promise<unknown> = Promise.resolve();
  collection(path: string) { return new Collection(this, path); }
  async runTransaction<T>(operation: (tx: unknown) => Promise<T>): Promise<T> {
    const task = this.tail.then(async () => {
      const writes: (() => void)[] = [];
      const tx = {
        get: async (ref: Reference) => { assert.equal(writes.length, 0, "transaction reads precede writes"); return ref.get(); },
        create: (ref: Reference, value: Record<string, unknown>) => { assert.equal(this.rows.has(ref.path), false); writes.push(() => { this.rows.set(ref.path, structuredClone(value)); }); },
        set: (ref: Reference, value: Record<string, unknown>) => { writes.push(() => { this.rows.set(ref.path, structuredClone(value)); }); },
        update: (ref: Reference, value: Record<string, unknown>) => { assert.equal(this.rows.has(ref.path), true); writes.push(() => { this.rows.set(ref.path, { ...this.rows.get(ref.path), ...structuredClone(value) }); }); },
      };
      const result = await operation(tx);
      writes.forEach(write => write());
      return result;
    });
    this.tail = task.catch(() => {});
    return task;
  }
}
class Reference {
  constructor(public db: MemoryDb, public path: string) {}
  collection(name: string) { return new Collection(this.db, `${this.path}/${name}`); }
  async get() { const row = this.db.rows.get(this.path); return { exists: Boolean(row), data: () => row ? structuredClone(row) : undefined }; }
}
class Collection {
  sort = ""; maximum = Infinity;
  constructor(public db: MemoryDb, public path: string) {}
  doc(id: string) { return new Reference(this.db, `${this.path}/${id}`); }
  orderBy(key: string) { this.sort = key; return this; }
  limit(count: number) { this.maximum = count; return this; }
  async get() {
    const rows = [...this.db.rows.entries()].filter(([path]) => path.startsWith(this.path + "/") && !path.slice(this.path.length + 1).includes("/"));
    if (this.sort) rows.sort((a, b) => String(b[1][this.sort]).localeCompare(String(a[1][this.sort])));
    return { docs: rows.slice(0, this.maximum).map(([, row]) => ({ data: () => structuredClone(row) })) };
  }
}
function setup() {
  const db = new MemoryDb();
  let now = Date.parse("2026-10-29T15:00:00Z"), owner = "owner@example.com";
  const service = createAgentService(db as unknown as Firestore, () => owner, () => now);
  db.rows.set("privateProjectTracker/owner/projects/krowshea", { id: "krowshea", name: "Krowshea", revision: 10, status: "active", nextStep: "Owner review" });
  return { db, service, advance: (ms: number) => { now += ms; }, changeOwner: () => { owner = "another@example.com"; }, removeOwner: () => { owner = ""; } };
}
async function connected() {
  const context = setup(), pair = await context.service.start("krowshea", "Claude test");
  await context.service.decide(pair.userCode, true, 7);
  context.advance(5000);
  const result = await context.service.poll(pair.deviceCode);
  assert.equal(result.status, "connected");
  if (result.status !== "connected") throw Error("Expected connection");
  return { ...context, pair, token: result.token, connection: result.connection };
}
test("pairing reveals no project data, requires owner approval and issues a token once", async () => {
  const { service, db, advance } = setup();
  const pair = await service.start("krowshea", "Claude Linux");
  assert.match(pair.deviceCode, /^[\w-]{43}$/);
  assert.match(pair.userCode, /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.equal(JSON.stringify([...db.rows]).includes(pair.deviceCode), false);
  assert.equal(JSON.stringify([...db.rows]).includes(pair.userCode.replaceAll("-", "")), false);
  assert.equal((await service.poll(pair.deviceCode)).status, "slow_down");
  advance(5000);
  assert.equal((await service.poll(pair.deviceCode)).status, "pending");
  assert.deepEqual(await service.lookup(pair.userCode.toLowerCase()), { projectId: "krowshea", projectName: "Krowshea", label: "Claude Linux", expiresAt: new Date(Date.parse("2026-10-29T15:00:00Z") + 600000).toISOString() });
  await service.decide(pair.userCode, true, 1);
  advance(5000);
  const results = await Promise.allSettled([service.poll(pair.deviceCode), service.poll(pair.deviceCode)]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  const result = results.find(result => result.status === "fulfilled")!.value;
  assert.equal(result.status, "connected");
  if (result.status !== "connected") throw Error("Expected token");
  assert.match(result.token, /^mjp_[\w-]{43}$/);
  assert.equal(JSON.stringify([...db.rows]).includes(result.token), false);
  assert.equal("ownerHash" in result.connection, false);
});
test("expired and denied pairings cannot issue credentials", async () => {
  const { service, advance } = setup();
  const expired = await service.start("krowshea", "Expired");
  advance(600001);
  await assert.rejects(service.lookup(expired.userCode), /expired/);
  await assert.rejects(service.decide(expired.userCode, true, 7), /expired/);
  await assert.rejects(service.poll(expired.deviceCode), /expired/);
  const denied = await service.start("krowshea", "Denied");
  await service.decide(denied.userCode, false, undefined); advance(5000);
  await assert.rejects(service.poll(denied.deviceCode), /declined/);
});
test("nonexistent projects and invalid durations cannot be approved", async () => {
  const { service } = setup();
  const pair = await service.start("absent", "Claude");
  await assert.rejects(service.lookup(pair.userCode), /does not exist/);
  await assert.rejects(service.decide(pair.userCode, true, 7), /does not exist/);
  const good = await service.start("krowshea", "Claude");
  for (const days of [0, 2, 365, "7", undefined]) await assert.rejects(service.decide(good.userCode, true, days), /1, 7, or 30/);
});
test("grants enforce project scope, expiry, revocation and owner changes", async () => {
  const { service, token, connection, advance } = await connected();
  assert.equal((await service.authorize(token, "krowshea")).projectId, "krowshea");
  await assert.rejects(service.authorize(token, "sewstudio"), /limited/);
  await service.revoke(connection.id);
  await assert.rejects(service.authorize(token, "krowshea"), /revoked/);
  const expired = await connected(); expired.advance(7 * 86400000);
  await assert.rejects(expired.service.authorize(expired.token, "krowshea"), /expired/);
  const changed = await connected(); changed.changeOwner();
  await assert.rejects(changed.service.authorize(changed.token, "krowshea"), /revoked/);
  advance(5000);
});
test("missing owner configuration fails closed and request rates are bounded", async () => {
  const absent = setup(); absent.removeOwner();
  await assert.rejects(absent.service.start("krowshea", "Claude"), /unavailable/);
  const { service, advance } = setup();
  for (let n = 0; n < 10; n++) await service.start("krowshea", "Claude");
  await assert.rejects(service.start("krowshea", "Too many"), /Too many/);
  advance(60000); await service.start("krowshea", "Allowed again");
  const client = await connected();
  for (let n = 0; n < 120; n++) await client.service.authorize(client.token, "krowshea");
  await assert.rejects(client.service.authorize(client.token, "krowshea"), /too quickly/);
  client.advance(60000); await client.service.authorize(client.token, "krowshea");
  assert.equal("requests" in (await client.service.list())[0], false);
});
test("agent entries cannot edit project fields, spoof attribution or delete entries", () => {
  const input = { id: "unique-entry", title: "Work finished", body: "Actual changes", kind: "progress" };
  assert.equal(parseAgentEntry(input).id, input.id);
  for (const extra of [{ status: "complete" }, { nextStep: "Deploy" }, { expectedRevision: 10 }, { author: "Owner" }, { action: "delete" }, { projectId: "other" }]) assert.throws(() => parseAgentEntry({ ...input, ...extra }), /documented journal fields/);
  assert.throws(() => userCode("../../secret"));
  for (const token of ["", "Bearer abc", "Bearer mjp_short", "Bearer a\nb"]) assert.throws(() => tokenValue(new Request("https://monosyth.com", { headers: { authorization: token.replaceAll("\n", " ") } })));
});
test("revocation is rechecked inside the append transaction and retry IDs are idempotent", async () => {
  const { service, db, token } = await connected();
  const recorder = journalRecorder(db as unknown as Firestore), guard = (tx: Transaction) => service.guardWrite(token, "krowshea", tx);
  const input = parseAgentEntry({ id: "agent-checked-work", title: "Work checked", body: "Completed and verified", kind: "progress" });
  assert.equal((await recorder("krowshea", input, "Claude · Test", guard)).duplicate, false);
  assert.equal((await recorder("krowshea", input, "Claude · Test", guard)).duplicate, true);
  await assert.rejects(recorder("krowshea", { ...input, body: "Different content" }, "Claude · Test", guard), /different content/);
  const project = db.rows.get("privateProjectTracker/owner/projects/krowshea")!;
  assert.equal(project.status, "active"); assert.equal(project.nextStep, "Owner review"); assert.equal(project.revision, 11);
  await service.authorize(token, "krowshea");
  await service.revokeToken(token);
  await assert.rejects(recorder("krowshea", { ...input, id: "revocation-race" }, "Claude · Test", guard), /revoked/);
  assert.equal(db.rows.has("privateProjectTracker/owner/workEntries/revocation-race"), false);
  // A revoked token cannot even replay a successful write as a duplicate.
  await assert.rejects(recorder("krowshea", input, "Claude · Test", guard), /revoked/);
});
test("all owner and agent endpoints reject unauthenticated access before database work", async () => {
  for (const [method, handler] of [["GET", agentGet], ["POST", agentPost], ["DELETE", agentDelete], ["GET", accessGet], ["POST", accessPost]] as const) {
    const response = await handler(new Request("https://monosyth.com/api/projects/agent", { method }));
    assert.equal(response.status, 401);
    assert.match(response.headers.get("cache-control")!, /no-store/);
    assert.match(response.headers.get("x-robots-tag")!, /noindex/);
    assert.equal(response.headers.has("access-control-allow-origin"), false);
  }
});
test("cross-origin browser requests and oversized streamed bodies are rejected", async () => {
  assert.throws(() => checkOrigin(new Request("https://monosyth.com/api/projects/agent", { headers: { origin: "https://evil.example" } })), /own connection page/);
  const cross = await connectPost(new Request("https://monosyth.com/api/projects/agent-connect", { method: "POST", headers: { origin: "https://evil.example", "Content-Type": "application/json" }, body: JSON.stringify({ action: "start", projectId: "krowshea", label: "Claude" }) }));
  assert.equal(cross.status, 403);
  await assert.rejects(agentBody(new Request("https://monosyth.com", { method: "POST", headers: { "Content-Type": "application/json" }, body: "x".repeat(20001) })), /too large/);
  await assert.rejects(agentBody(new Request("https://monosyth.com", { method: "POST", headers: { "Content-Type": "text/plain" }, body: "{}" })), /JSON/);
  for (const path of ["/projects/connections", "/api/projects/agent", "/api/projects/agent-access", "/api/projects/agent-connect"]) assert.equal(isPublicAnalyticsPath(path), false);
});
test("grant views contain only the intended connection metadata", () => {
  assert.throws(() => assertGrant(undefined, "", "krowshea", Date.now()), /expired/);
  const view = safeGrant({ id: "id", projectId: "krowshea", label: "Claude", ownerHash: "private", createdAt: "now", expiresAt: "later", revokedAt: null, lastUsedAt: null });
  assert.equal(JSON.stringify(view).includes("private"), false);
  assert.equal(hashSecret("credential").length, 64);
});
