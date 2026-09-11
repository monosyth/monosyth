/** Opt-in real Firestore audit. Identity verification is stubbed; this does not test Google sign-in. */
import assert from "node:assert/strict";
import {
  applicationDefault,
  initializeApp,
  deleteApp,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { accessPlan } from "../src/lib/move/server";
import { createMoveHandler } from "../src/lib/move/http";
import { emptySetup, type MovePlan } from "../src/lib/move/model";

async function main() {
  if (process.env.MOVEMORROW_LIVE_AUDIT !== "1")
    throw new Error(
      "Set MOVEMORROW_LIVE_AUDIT=1 to run the synthetic Firestore integration audit.",
    );
  const app = initializeApp({
    projectId: "monosyth",
    credential: applicationDefault(),
  });
  const db = getFirestore(app);
  const prefix = `movemorrow-audit-${crypto.randomUUID()}`;
  const uids = [`${prefix}-a`, `${prefix}-b`];
  // Stub identity only in this standalone script. Production always verifies real Firebase ID tokens.
  const handle = createMoveHandler({
    verify: async (token) => {
      if (!uids.includes(token)) throw new Error("Unknown audit identity");
      return { uid: token, email_verified: true };
    },
    read: (uid) => accessPlan(uid),
    change: (uid, body) => accessPlan(uid, body),
  });
  async function request(uid: string, body?: unknown) {
    return handle(
      new Request("https://monosyth.com/api/move", {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Authorization: `Bearer ${uid}`,
          "Content-Type": "application/json",
          Origin: "https://monosyth.com",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
  }
  try {
    const response = await request(uids[0], {
      type: "create",
      setup: {
        ...emptySetup,
        destination: "Synthetic QA destination",
        date: "2026-12-15",
        pets: true,
      },
      uid: uids[1],
    });
    assert.equal(response.status, 200, `Create failed: ${response.status}`);
    let plan = (await response.json()).plan as MovePlan;
    assert.ok(plan.tasks.some((t) => t.id === "pets"));
    assert.equal((await (await request(uids[1])).json()).plan, null);
    assert.equal(
      (
        await request(uids[1], {
          type: "delete",
          uid: uids[0],
          planId: plan.id,
          revision: plan.revision,
        })
      ).status,
      404,
    );
    const taskRef = db
      .collection("movemorrowUsers")
      .doc(uids[0])
      .collection("moves")
      .doc("current")
      .collection("tasks")
      .doc("inventory");
    const untouched = await taskRef.get();
    const old = plan;
    const edited = await request(uids[0], {
      type: "task",
      planId: plan.id,
      revision: plan.revision,
      id: "budget",
      patch: { status: "done", detail: "Synthetic QA note" },
    });
    assert.equal(edited.status, 200);
    plan = (await edited.json()).plan;
    const reloaded = (await (await request(uids[0])).json()).plan as MovePlan;
    assert.equal(
      reloaded.tasks.find((t) => t.id === "budget")!.detail,
      "Synthetic QA note",
    );
    assert.equal(reloaded.tasks.find((t) => t.id === "budget")!.status, "done");
    assert.ok(untouched.updateTime!.isEqual((await taskRef.get()).updateTime!));
    assert.equal(
      (
        await request(uids[0], {
          type: "delete",
          planId: old.id,
          revision: old.revision,
        })
      ).status,
      409,
    );
    const concurrent = await Promise.all(
      ["First", "Second"].map((title) =>
        request(uids[0], {
          type: "task",
          planId: plan.id,
          revision: plan.revision,
          id: "inventory",
          patch: { title },
        }),
      ),
    );
    assert.deepEqual(concurrent.map((r) => r.status).sort(), [200, 409]);
    plan = (await (await request(uids[0])).json()).plan;
    const direct = await fetch(
      `https://firestore.googleapis.com/v1/projects/monosyth/databases/(default)/documents/movemorrowUsers/${uids[0]}/moves/current`,
    );
    assert.equal(
      direct.status,
      403,
      "Unauthenticated direct Firestore access must be denied",
    );
    assert.equal(
      (
        await request(uids[0], {
          type: "delete",
          planId: plan.id,
          revision: plan.revision,
        })
      ).status,
      200,
    );
    assert.equal((await (await request(uids[0])).json()).plan, null);
    assert.equal((await taskRef.parent.get()).size, 0);
    console.log(
      "PASS: real Firestore create/edit/reload/delete; synthetic owner routing; unchanged task preservation; concurrent/stale write denial; unauthenticated database denial; task cleanup.",
    );
  } finally {
    const cleanup = await Promise.allSettled(
      uids.map((uid) =>
        db.recursiveDelete(db.collection("movemorrowUsers").doc(uid)),
      ),
    );
    await deleteApp(app);
    assert.ok(
      cleanup.every((result) => result.status === "fulfilled"),
      `Audit cleanup incomplete for ${prefix}`,
    );
    console.log(
      "Synthetic audit records removed. No real user data was accessed.",
    );
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Integration audit failed",
  );
  process.exitCode = 1;
});
