import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveAdminAccess } from "../src/lib/auth/admin-access";

const approvedAccounts = ["owner@example.com", "second@example.com"];
process.env.MONOSYTH_ADMIN_EMAILS = approvedAccounts.join(",");

test("configured approved accounts retain server-verified admin access", async () => {
  for (const email of approvedAccounts) {
    let verified = false;
    const result = await resolveAdminAccess("signed-token", async (token) => {
      assert.equal(token, "signed-token"); verified = true; return { email };
    });
    assert.ok(verified);
    assert.deepEqual(result, { isAdmin: true, status: 200 });
    assert.ok(!JSON.stringify(result).includes(email));
  }
});
test("missing, invalid, and non-admin credentials cannot authorize the browser", async () => {
  assert.deepEqual(await resolveAdminAccess(undefined, async () => { throw Error("must not verify"); }), { isAdmin: false, status: 401 });
  assert.deepEqual(await resolveAdminAccess("forged", async () => { throw Error("invalid signature"); }), { isAdmin: false, status: 401 });
  assert.deepEqual(await resolveAdminAccess("valid-other-user", async () => ({ email: "other@example.com" })), { isAdmin: false, status: 403 });
  assert.deepEqual(await resolveAdminAccess("no-email", async () => ({})), { isAdmin: false, status: 403 });
});

test("missing private configuration fails closed", async () => {
  const configured = process.env.MONOSYTH_ADMIN_EMAILS;
  delete process.env.MONOSYTH_ADMIN_EMAILS;
  try {
    assert.deepEqual(await resolveAdminAccess("valid-owner", async () => ({ email: approvedAccounts[0] })), { isAdmin: false, status: 403 });
  } finally {
    process.env.MONOSYTH_ADMIN_EMAILS = configured;
  }
});
