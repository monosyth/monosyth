import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { Firestore, Transaction } from "firebase-admin/firestore";
import { getFirebaseAdminDb } from "../firebase/admin";
import { trackerOwnerEmail } from "./auth";
import { TrackerError, validId } from "./model";
import { assertGrant, connectionLabel, deviceCode, PAIRING_LIFETIME_MS, POLL_INTERVAL_MS, safeGrant, TOKEN_LIFETIMES, userCode, type AgentGrant, type Pairing } from "./agent-model";

export const hashSecret = (value: string) => createHash("sha256").update(value).digest("hex");
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function createAgentService(db: Firestore, owner: () => string, clock = Date.now) {
  const root = db.collection("privateProjectTracker").doc("owner");
  const pairings = root.collection("agentPairings"), codes = root.collection("agentPairingCodes"), grants = root.collection("agentGrants");
  const ownerHash = () => { const email = owner(); return email ? hashSecret(email) : ""; };
  function ownerConfigured() { if (!ownerHash()) throw new TrackerError("Journal connections are unavailable.", 503); }
  async function start(projectId: unknown, label: unknown) {
    ownerConfigured();
    const project = validId(projectId), name = connectionLabel(label), timestamp = clock();
    const secret = randomBytes(32).toString("base64url"), code = Array.from(randomBytes(12), byte => alphabet[byte % alphabet.length]).join("");
    const expiresAt = new Date(timestamp + PAIRING_LIFETIME_MS).toISOString();
    const pairing: Pairing = { projectId: project, label: name, createdAt: new Date(timestamp).toISOString(), expiresAt, state: "pending", lastPollAt: timestamp };
    const id = hashSecret(secret), limitRef = root.collection("agentRateLimits").doc("connection-start");
    await db.runTransaction(async tx => {
      const current = (await tx.get(limitRef)).data();
      const fresh = !current || current.windowStart + 60_000 <= timestamp;
      if (!fresh && current.count >= 10) throw new TrackerError("Too many connection requests. Wait a minute and try again.", 429);
      tx.set(limitRef, { windowStart: fresh ? timestamp : current.windowStart, count: fresh ? 1 : current.count + 1 });
      tx.create(pairings.doc(id), { ...pairing, deleteAfter: new Date(timestamp + 24 * 60 * 60_000) });
      tx.create(codes.doc(hashSecret(code)), { pairingId: id, expiresAt, deleteAfter: new Date(timestamp + 24 * 60 * 60_000) });
    });
    return { deviceCode: secret, userCode: code.match(/.{4}/g)!.join("-"), verificationUri: "https://monosyth.com/projects/connections", expiresIn: PAIRING_LIFETIME_MS / 1000, interval: POLL_INTERVAL_MS / 1000 };
  }
  async function pairingForCode(value: unknown) {
    const code = userCode(value), mapping = await codes.doc(hashSecret(code)).get();
    const data = mapping.data();
    if (!data || Date.parse(data.expiresAt) <= clock()) throw new TrackerError("This connection code is invalid or expired.", 404);
    return pairings.doc(data.pairingId);
  }
  function activePairing(data: Pairing | undefined) {
    if (!data || Date.parse(data.expiresAt) <= clock() || data.state !== "pending") throw new TrackerError("This request has expired or was already handled. Start a new connection.", 409);
    return data;
  }
  async function lookup(value: unknown) {
    const ref = await pairingForCode(value), data = activePairing((await ref.get()).data() as Pairing | undefined);
    const project = await root.collection("projects").doc(data.projectId).get();
    if (!project.exists) throw new TrackerError("The requested project does not exist. Start again with the correct project ID.", 404);
    return { projectId: data.projectId, projectName: project.data()!.name as string, label: data.label, expiresAt: data.expiresAt };
  }
  async function decide(value: unknown, approve: boolean, lifetimeDays: unknown) {
    ownerConfigured();
    if (approve && !TOKEN_LIFETIMES.includes(lifetimeDays as 1 | 7 | 30)) throw new TrackerError("Choose a connection lasting 1, 7, or 30 days.");
    const ref = await pairingForCode(value);
    await db.runTransaction(async tx => {
      const data = activePairing((await tx.get(ref)).data() as Pairing | undefined);
      if (approve && !(await tx.get(root.collection("projects").doc(data.projectId))).exists) throw new TrackerError("The requested project does not exist.", 404);
      tx.update(ref, approve ? { state: "approved", ownerHash: ownerHash(), lifetimeDays } : { state: "denied" });
    });
    return { approved: approve };
  }
  async function poll(value: unknown) {
    ownerConfigured();
    const secret = deviceCode(value), ref = pairings.doc(hashSecret(secret));
    return db.runTransaction(async tx => {
      const timestamp = clock();
      const data = (await tx.get(ref)).data() as Pairing | undefined;
      if (!data || Date.parse(data.expiresAt) <= timestamp) throw new TrackerError("This connection request expired. Start again.", 401);
      if (data.state === "denied" || data.state === "consumed") throw new TrackerError("This connection was declined or already used. Start again.", 401);
      if (data.lastPollAt + POLL_INTERVAL_MS > timestamp) return { status: "slow_down", interval: 10 } as const;
      if (data.state === "pending") { tx.update(ref, { lastPollAt: timestamp }); return { status: "pending", interval: 5 } as const; }
      if (data.ownerHash !== ownerHash() || !TOKEN_LIFETIMES.includes(data.lifetimeDays as 1 | 7 | 30)) throw new TrackerError("This approval is no longer valid. Start again.", 401);
      const token = `mjp_${randomBytes(32).toString("base64url")}`, id = hashSecret(token);
      const grant: AgentGrant = { id, projectId: data.projectId, label: data.label, ownerHash: data.ownerHash, createdAt: new Date(timestamp).toISOString(), expiresAt: new Date(timestamp + data.lifetimeDays! * 24 * 60 * 60_000).toISOString(), revokedAt: null, lastUsedAt: null };
      tx.create(grants.doc(id), grant);
      tx.update(ref, { state: "consumed", lastPollAt: timestamp });
      return { status: "connected", token, connection: safeGrant(grant) } as const;
    });
  }
  function grantRef(token: string) { return grants.doc(hashSecret(token)); }
  async function authorize(token: string, projectId: string) {
    const ref = grantRef(token);
    return db.runTransaction(async tx => {
      const doc = await tx.get(ref), data = doc.data() as AgentGrant | undefined;
      assertGrant(data, ownerHash(), projectId, clock());
      const rate = doc.data()!, timestamp = clock(), fresh = !rate.windowStart || rate.windowStart + 60_000 <= timestamp;
      if (!fresh && rate.requests >= 120) throw new TrackerError("This connection is making requests too quickly. Wait a minute.", 429);
      tx.update(ref, { lastUsedAt: new Date(timestamp).toISOString(), windowStart: fresh ? timestamp : rate.windowStart, requests: fresh ? 1 : rate.requests + 1 });
      return data!;
    });
  }
  // Re-check inside the history transaction so revocation cannot race a write.
  async function guardWrite(token: string, projectId: string, tx: Transaction) {
    assertGrant((await tx.get(grantRef(token))).data() as AgentGrant | undefined, ownerHash(), projectId, clock());
  }
  async function list() {
    const rows = await grants.orderBy("createdAt", "desc").limit(200).get();
    return rows.docs.map(doc => safeGrant(doc.data() as AgentGrant));
  }
  async function revoke(id: unknown) {
    if (typeof id !== "string" || !/^[a-f0-9]{64}$/.test(id)) throw new TrackerError("Choose a valid connection.");
    const ref = grants.doc(id);
    await db.runTransaction(async tx => {
      if (!(await tx.get(ref)).exists) throw new TrackerError("This connection could not be found.", 404);
      tx.update(ref, { revokedAt: new Date(clock()).toISOString() });
    });
    return { revoked: true };
  }
  return { start, lookup, decide, poll, authorize, guardWrite, list, revoke, revokeToken: (token: string) => revoke(hashSecret(token)) };
}
export const agentService = () => createAgentService(getFirebaseAdminDb(), trackerOwnerEmail);
