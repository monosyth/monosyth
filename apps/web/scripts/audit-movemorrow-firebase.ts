/** Opt-in real Firestore audit. Identity verification is stubbed; this does not test Google sign-in. */
import assert from "node:assert/strict";
import {
  applicationDefault,
  initializeApp,
  deleteApp,
} from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { accessPlan } from "../src/lib/move/server";
import { createMoveHandler } from "../src/lib/move/http";
import { emptySetup, reviewSetupChange, type MovePlan } from "../src/lib/move/model";

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
    // Exercise a pre-budget schema without touching any existing user's plan.
    await taskRef.parent.parent!.update({ schemaVersion: 1 });
    const tasksBeforeBudget = structuredClone(plan.tasks);
    const taskBeforeBudget = await taskRef.get();
    const addBudget = await request(uids[0], {
      type: "expense-add",
      planId: plan.id,
      revision: plan.revision,
      id: "movers",
      patch: { title: "Synthetic movers", estimate: "500.25" },
    });
    assert.equal(addBudget.status, 200);
    plan = (await addBudget.json()).plan;
    assert.deepEqual(plan.tasks, tasksBeforeBudget);
    assert.ok(
      taskBeforeBudget.updateTime!.isEqual((await taskRef.get()).updateTime!),
    );
    assert.equal(plan.expenses[0].estimatedCents, 50025);
    assert.equal(
      (
        await request(uids[1], {
          type: "expense-update",
          uid: uids[0],
          planId: plan.id,
          revision: plan.revision,
          id: "movers",
          patch: { actual: "9999" },
        })
      ).status,
      404,
    );
    const updateBudget = await request(uids[0], {
      type: "expense-update",
      planId: plan.id,
      revision: plan.revision,
      id: "movers",
      patch: { actual: "480.10", paid: true },
    });
    assert.equal(updateBudget.status, 200);
    plan = (await (await request(uids[0])).json()).plan;
    assert.equal(plan.expenses[0].actualCents, 48010);
    assert.equal(plan.expenses[0].paid, true);
    assert.deepEqual(plan.tasks, tasksBeforeBudget);
    const depositResponse = await request(uids[0], {
      type: "expense-add",
      planId: plan.id,
      revision: plan.revision,
      id: "deposit",
      patch: {
        title: "Synthetic deposit",
        kind: "deposit",
        actual: "800",
        paid: true,
      },
    });
    assert.equal(depositResponse.status, 200);
    plan = (await depositResponse.json()).plan;
    const expenseRef = taskRef.parent.parent!.collection("expenses");
    const depositBefore = await expenseRef.doc("deposit").get();
    const removal = await request(uids[0], {
      type: "expense-delete",
      planId: plan.id,
      revision: plan.revision,
      id: "movers",
    });
    assert.equal(removal.status, 200);
    plan = (await removal.json()).plan;
    assert.equal((await expenseRef.doc("movers").get()).exists, false);
    assert.ok(
      depositBefore.updateTime!.isEqual(
        (await expenseRef.doc("deposit").get()).updateTime!,
      ),
    );
    assert.equal(plan.expenses.length, 1);
    assert.equal(plan.expenses[0].kind, "deposit");
    await taskRef.parent.parent!.update({
      schemaVersion: 2,
      notes: FieldValue.delete(),
    });
    plan = (await (await request(uids[0])).json()).plan;
    assert.equal(plan.notes, "");
    assert.deepEqual(plan.contacts, []);
    const beforeContacts = structuredClone(plan);
    const contactResponse = await request(uids[0], {
      type: "contact-add",
      planId: plan.id,
      revision: plan.revision,
      id: "helper",
      patch: {
        name: "Synthetic helper",
        phone: "206-555-0123",
        movingDay: true,
      },
    });
    assert.equal(contactResponse.status, 200);
    plan = (await contactResponse.json()).plan;
    assert.deepEqual(plan.tasks, beforeContacts.tasks);
    assert.deepEqual(plan.expenses, beforeContacts.expenses);
    assert.equal(
      (
        await request(uids[1], {
          type: "contact-delete",
          uid: uids[0],
          planId: plan.id,
          revision: plan.revision,
          id: "helper",
        })
      ).status,
      404,
    );
    const notesResponse = await request(uids[0], {
      type: "notes",
      planId: plan.id,
      revision: plan.revision,
      notes: "Synthetic arrival instructions",
    });
    assert.equal(notesResponse.status, 200);
    plan = (await (await request(uids[0])).json()).plan;
    assert.equal(plan.notes, "Synthetic arrival instructions");
    assert.equal(plan.contacts[0].movingDay, true);
    const contactsRef = taskRef.parent.parent!.collection("contacts");
    const untouchedContact = await contactsRef.doc("helper").get();
    const pinResponse = await request(uids[0], {
      type: "task",
      planId: plan.id,
      revision: plan.revision,
      id: "inventory",
      patch: { movingDay: true },
    });
    assert.equal(pinResponse.status, 200);
    plan = (await pinResponse.json()).plan;
    assert.ok(
      untouchedContact.updateTime!.isEqual(
        (await contactsRef.doc("helper").get()).updateTime!,
      ),
    );
    const contactEdit = await request(uids[0], {
      type: "contact-update",
      planId: plan.id,
      revision: plan.revision,
      id: "helper",
      patch: { company: "Synthetic movers", email: "helper@example.com" },
    });
    assert.equal(contactEdit.status, 200);
    plan = (await contactEdit.json()).plan;
    const anotherContact = await request(uids[0], {
      type: "contact-add",
      planId: plan.id,
      revision: plan.revision,
      id: "remove",
      patch: { name: "Temporary contact" },
    });
    assert.equal(anotherContact.status, 200);
    plan = (await anotherContact.json()).plan;
    const removeContact = await request(uids[0], {
      type: "contact-delete",
      planId: plan.id,
      revision: plan.revision,
      id: "remove",
    });
    assert.equal(removeContact.status, 200);
    plan = (await removeContact.json()).plan;
    assert.equal((await contactsRef.doc("remove").get()).exists, false);
    assert.equal(plan.contacts[0].email, "helper@example.com");
    assert.equal(plan.notes, "Synthetic arrival instructions");
    const beforeSetup = structuredClone(plan);
    const unchangedBudget = await expenseRef.doc("deposit").get();
    const unchangedContact = await contactsRef.doc("helper").get();
    const completedTask = await taskRef.parent.doc("budget").get();
    const newSetup = { ...plan.setup, destination: "Synthetic revised destination", transport: "movers" as const, pets: false, storage: true, date: "2027-01-15" };
    const preview = reviewSetupChange(plan, newSetup);
    const detailsCommand = { type: "setup", planId: plan.id, revision: plan.revision, setup: newSetup };
    const detailsResponse = await request(uids[0], detailsCommand);
    assert.equal(detailsResponse.status, 200);
    plan = (await (await request(uids[0])).json()).plan;
    assert.deepEqual(plan.setup, newSetup);
    assert.deepEqual([...plan.tasks].sort((a, b) => a.id.localeCompare(b.id)), [...preview.tasks].sort((a, b) => a.id.localeCompare(b.id)));
    assert.equal(plan.tasks.find((t) => t.id === "transport")!.setupSkipped, true);
    assert.equal(plan.tasks.find((t) => t.id === "pets")!.status, "skipped");
    assert.equal(plan.tasks.find((t) => t.id === "arrival")!.due, "2027-01-15");
    assert.equal((await request(uids[0], detailsCommand)).status, 409);
    assert.deepEqual(plan.expenses, beforeSetup.expenses);
    assert.deepEqual(plan.contacts, beforeSetup.contacts);
    assert.equal(plan.notes, beforeSetup.notes);
    assert.ok(unchangedBudget.updateTime!.isEqual((await expenseRef.doc("deposit").get()).updateTime!));
    assert.ok(unchangedContact.updateTime!.isEqual((await contactsRef.doc("helper").get()).updateTime!));
    assert.ok(completedTask.updateTime!.isEqual((await taskRef.parent.doc("budget").get()).updateTime!));
    const restoreDetails = await request(uids[0], { type: "setup", planId: plan.id, revision: plan.revision, setup: beforeSetup.setup });
    assert.equal(restoreDetails.status, 200);
    plan = (await (await request(uids[0])).json()).plan;
    assert.equal(plan.tasks.find((t) => t.id === "transport")!.status, "todo");
    assert.equal(plan.tasks.find((t) => t.id === "pets")!.status, "todo");
    assert.equal(plan.tasks.find((t) => t.id === "movers")!.status, "skipped");
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
    assert.equal((await expenseRef.get()).size, 0);
    assert.equal((await contactsRef.get()).size, 0);
    console.log(
      "PASS: real Firestore create/edit/reload/delete; synthetic owner routing; unchanged task preservation; concurrent/stale write denial; unauthenticated database denial; task and budget cleanup; legacy upgrade; budget/contact/notes persistence and owner isolation; pinned tasks; reviewed setup changes and restoration persisted; completed and unrelated records unchanged; full contact cleanup.",
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
