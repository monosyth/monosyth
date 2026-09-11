import assert from "node:assert/strict";
import { test } from "node:test";
import { applyCommand } from "../src/lib/move/commands";
import { createMoveHandler } from "../src/lib/move/http";
import {
  emptySetup,
  generateTasks,
  isDate,
  MoveError,
  parseSetup,
  progress,
  shiftDate,
  type MovePlan,
} from "../src/lib/move/model";

const setup = {
  ...emptySetup,
  date: "2026-11-01",
  leaving: "rent" as const,
  arriving: "own" as const,
  transport: "movers" as const,
  pets: true,
};
function create() {
  return applyCommand(null, { type: "create", setup })!;
}
function change(plan: MovePlan, command: Record<string, unknown>) {
  return applyCommand(plan, {
    planId: plan.id,
    revision: plan.revision,
    ...command,
  });
}
function rejectsStatus(fn: () => unknown, status: number) {
  assert.throws(
    fn,
    (error: unknown) => error instanceof MoveError && error.status === status,
  );
}

test("dates are exact and calendar arithmetic is stable across leap days and daylight saving", () => {
  assert.equal(isDate("2024-02-29"), true);
  for (const invalid of [
    "2025-02-29",
    "2026-13-01",
    "2026-04-31",
    "2026-1-1",
    "0001-01-01",
    "bad",
    null,
  ])
    assert.equal(isDate(invalid), false);
  assert.equal(shiftDate("2026-03-08", 1), "2026-03-09");
  assert.equal(shiftDate("2026-11-01", -1), "2026-10-31");
  assert.equal(shiftDate("2024-03-01", -1), "2024-02-29");
  assert.equal(shiftDate("", 2), "");
  assert.equal(shiftDate("invalid", 2), "");
});
test("setup is validated and strips client-controlled ownership fields", () => {
  assert.deepEqual(
    parseSetup({
      ...setup,
      uid: "victim",
      path: "other",
      origin: "  Seattle  ",
    }),
    { ...setup, origin: "Seattle" },
  );
  for (const invalid of [
    { date: "2025-02-29" },
    { origin: "x".repeat(101) },
    { pets: "yes" },
    { transport: "private" },
  ])
    rejectsStatus(() => parseSetup({ ...setup, ...invalid }), 400);
});
test("checklists reflect housing, transport, and household choices; unknown dates remain undated", () => {
  const ids = new Set(generateTasks(setup).map((t) => t.id));
  for (const id of ["lease", "new-home", "movers", "pets"])
    assert.ok(ids.has(id));
  for (const id of [
    "sale",
    "new-lease",
    "truck",
    "transport",
    "storage",
    "temporary",
  ])
    assert.ok(!ids.has(id));
  const alternate = generateTasks({
    ...setup,
    leaving: "own",
    arriving: "rent",
    transport: "diy",
    storage: true,
    temporary: true,
    pets: false,
  });
  for (const id of ["sale", "new-lease", "truck", "storage", "temporary"])
    assert.ok(alternate.some((t) => t.id === id));
  assert.ok(generateTasks(emptySetup).every((t) => t.due === ""));
  assert.ok(!JSON.stringify(generateTasks(setup)).includes("applies"));
});
test("rescheduling preserves completed, skipped, custom, and manually dated tasks", () => {
  let plan = create();
  plan = change(plan, {
    type: "task",
    id: "budget",
    patch: { status: "done" },
  })!;
  plan = change(plan, {
    type: "task",
    id: "inventory",
    patch: { status: "skipped" },
  })!;
  plan = change(plan, {
    type: "task",
    id: "lease",
    patch: { due: "2026-10-02" },
  })!;
  plan = change(plan, {
    type: "add",
    id: "custom-one",
    patch: { title: "Collect spare keys", due: "2026-10-20" },
  })!;
  const next = change(plan, { type: "date", date: "2026-12-01" })!;
  for (const id of ["budget", "inventory", "lease", "custom-one"])
    assert.deepEqual(
      next.tasks.find((t) => t.id === id),
      plan.tasks.find((t) => t.id === id),
    );
  assert.equal(next.tasks.find((t) => t.id === "arrival")!.due, "2026-12-01");
  assert.equal(
    next.tasks.find((t) => t.id === "arrival")!.revision,
    plan.tasks.find((t) => t.id === "arrival")!.revision + 1,
  );
  assert.equal(next.revision, plan.revision + 1);
  assert.equal(
    change(next, { type: "date", date: "" })!.tasks.find(
      (t) => t.id === "arrival",
    )!.due,
    "",
  );
});
test("progress excludes skipped tasks and handles an empty denominator", () => {
  const tasks = create().tasks.slice(0, 3);
  tasks[0].status = "done";
  tasks[1].status = "skipped";
  assert.deepEqual(progress(tasks), { done: 1, total: 2, percent: 50 });
  assert.deepEqual(progress([]), { done: 0, total: 0, percent: 0 });
  assert.deepEqual(progress([tasks[1]]), { done: 0, total: 0, percent: 0 });
});
test("stale versions and plans deleted then recreated cannot overwrite the current move", () => {
  const first = create();
  rejectsStatus(() => applyCommand(first, { type: "create", setup }), 409);
  const next = change(first, {
    type: "task",
    id: "budget",
    patch: { status: "done" },
  })!;
  rejectsStatus(
    () =>
      applyCommand(next, {
        type: "delete",
        planId: first.id,
        revision: first.revision,
      }),
    409,
  );
  const recreated = create();
  rejectsStatus(
    () =>
      applyCommand(recreated, {
        type: "delete",
        planId: first.id,
        revision: first.revision,
      }),
    409,
  );
  assert.equal(change(next, { type: "delete" }), null);
});
test("invalid edits, path injection, duplicates, and excessive task counts are rejected", () => {
  const plan = create();
  for (const patch of [
    { title: "" },
    { title: "x".repeat(181) },
    { detail: "x".repeat(1501) },
    { status: "secret" },
    { due: "2025-02-29" },
  ])
    rejectsStatus(
      () => change(plan, { type: "task", id: "budget", patch }),
      400,
    );
  rejectsStatus(
    () => change(plan, { type: "task", id: "missing", patch: { title: "x" } }),
    404,
  );
  for (const id of ["../victim", "budget"])
    rejectsStatus(
      () => change(plan, { type: "add", id, patch: { title: "x" } }),
      400,
    );
  rejectsStatus(
    () =>
      change(
        { ...plan, tasks: Array.from({ length: 100 }, () => plan.tasks[0]) },
        { type: "add", id: "extra", patch: { title: "x" } },
      ),
    400,
  );
});

function fixture() {
  const plans = new Map<string, MovePlan>();
  const calls: string[] = [];
  const handle = createMoveHandler({
    verify: async (token) => {
      if (token === "invalid") throw new Error("SECRET");
      return { uid: token, email_verified: token !== "unverified" };
    },
    read: async (uid) => {
      calls.push(uid);
      return plans.get(uid) ?? null;
    },
    change: async (uid, body) => {
      calls.push(uid);
      const next = applyCommand(plans.get(uid) ?? null, body);
      if (next) plans.set(uid, next);
      else plans.delete(uid);
      return next;
    },
  });
  async function request(
    token?: string,
    command?: unknown,
    extras: Record<string, string> = {},
  ) {
    return handle(
      new Request("https://monosyth.com/api/move", {
        method: command === undefined ? "GET" : "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
          ...extras,
        },
        body: command === undefined ? undefined : JSON.stringify(command),
      }),
    );
  }
  return { plans, calls, request, handle };
}
test("API rejects missing, invalid, and unverified credentials before accessing storage", async () => {
  const f = fixture();
  assert.equal((await f.request()).status, 401);
  assert.equal((await f.request("invalid")).status, 401);
  assert.equal((await f.request("unverified")).status, 403);
  assert.deepEqual(f.calls, []);
});
test("verified token owns reads and mutations; another account cannot target that move", async () => {
  const f = fixture();
  const created = await f.request("alice", {
    type: "create",
    setup,
    uid: "bob",
  });
  assert.equal(created.status, 200);
  const alice = (await created.json()).plan as MovePlan;
  const bob = await f.request("bob");
  assert.equal((await bob.json()).plan, null);
  assert.equal(
    (
      await f.request("bob", {
        type: "delete",
        uid: "alice",
        planId: alice.id,
        revision: alice.revision,
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await f.request("bob", {
        type: "task",
        uid: "alice",
        planId: alice.id,
        revision: alice.revision,
        id: "budget",
        patch: { title: "intrusion" },
      })
    ).status,
    404,
  );
  assert.equal(f.plans.get("alice")!.tasks[0].title, "Set a moving budget");
  const response = await f.request("alice");
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("Vary"), "Authorization");
  assert.equal((await response.json()).plan.id, alice.id);
});
test("API rejects cross-origin writes, malformed JSON, and oversized streamed bodies", async () => {
  const f = fixture();
  assert.equal(
    (
      await f.request(
        "alice",
        { type: "create", setup },
        { Origin: "https://other.example" },
      )
    ).status,
    403,
  );
  assert.equal((await f.request("alice", "x".repeat(12001))).status, 413);
  const malformed = await f.handle(
    new Request("https://monosyth.com/api/move", {
      method: "POST",
      headers: {
        Authorization: "Bearer alice",
        "Content-Type": "application/json",
      },
      body: "{",
    }),
  );
  assert.equal(malformed.status, 400);
  assert.deepEqual(f.calls, []);
  assert.equal(
    (
      await f.request(
        "alice",
        { type: "create", setup },
        { Origin: "https://monosyth.com" },
      )
    ).status,
    200,
  );
});
test("storage failures do not expose internal details or return an empty plan as success", async () => {
  const handler = createMoveHandler({
    verify: async () => ({ uid: "alice", email_verified: true }),
    read: async () => {
      throw new Error("SECRET database information");
    },
    change: async () => null,
  });
  const response = await handler(
    new Request("https://monosyth.com/api/move", {
      headers: { Authorization: "Bearer token" },
    }),
  );
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes("SECRET"));
});
