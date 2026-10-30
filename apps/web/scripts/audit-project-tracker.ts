import assert from "node:assert/strict";
import { test } from "node:test";
import { parseEntry, parseProject, validId, validLink, validSite } from "../src/lib/projects/model";
import { isTrackerOwner, requireTrackerOwner } from "../src/lib/projects/auth";
import { GET, POST } from "../src/app/api/projects/route";
import { isPublicAnalyticsPath } from "../src/lib/analytics";

process.env.MONOSYTH_PROJECT_OWNER_EMAIL = "owner@example.com";

const project = { name: "Typeface", area: "Design", summary: "An original family", status: "active", nextStep: "Review proofs", decisions: [], links: [] };
test("the tracker requires the verified owner, independently of broader site administration", () => {
  assert.equal(isTrackerOwner({ email: "owner@example.com", email_verified: true }), true);
  for (const user of [{}, { email: "owner@example.com" }, { email: "owner@example.com", email_verified: false }, { email: "another-admin@example.com", email_verified: true }, { email: "visitor@example.com", email_verified: true }]) assert.equal(Boolean(isTrackerOwner(user)), false);
});
test("private endpoints reject missing and forged tokens before accessing any database", async () => {
  for (const method of [GET, POST]) {
    const response = await method(new Request("https://monosyth.com/api/projects", { method: method === GET ? "GET" : "POST" }));
    assert.equal(response.status, 401);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/);
    assert.deepEqual(await response.json(), { error: "Sign in to open your projects." });
  }
  await assert.rejects(requireTrackerOwner(new Request("https://monosyth.com/api/projects", { headers: { authorization: "Bearer forged" } }), async () => { throw Error("invalid signature"); }), /expired/);
});
test("validation rejects path traversal, script URLs, embedded credentials, and oversized updates", () => {
  for (const id of ["../private", "a/b", "", "a".repeat(81)]) assert.throws(() => validId(id));
  for (const url of ["javascript:alert(1)", "file:///etc/passwd", "https://user:secret@example.com", "/etc/passwd"]) assert.throws(() => validLink({ label: "Unsafe", url }));
  assert.deepEqual(validLink({ label: "Folder", url: "/Users/scottwaite/monosyth" }), { label: "Folder", url: "/Users/scottwaite/monosyth" });
  assert.throws(() => parseProject({ ...project, summary: "a".repeat(1501) }));
  assert.throws(() => parseProject({ ...project, status: "invented" }));
  assert.equal(parseProject(project).name, "Typeface");
});
test("work logging allows append-only updates but requires a revision when changing project state", () => {
  const entry = { id: "session-2026-10-28", title: "Proofs inspected", body: "Checked the Medium", kind: "progress" };
  assert.equal(parseEntry(entry).verification, "");
  assert.throws(() => parseEntry({ ...entry, status: "complete" }), /Refresh/);
  assert.throws(() => parseEntry({ ...entry, nextStep: "Approve", expectedRevision: -1 }));
  assert.equal(parseEntry({ ...entry, nextStep: "Approve", expectedRevision: 2 }).expectedRevision, 2);
});
test("project pages and their API are excluded from public analytics", () => {
  for (const path of ["/projects", "/projects/font-foundry", "/api/projects"]) assert.equal(isPublicAnalyticsPath(path), false);
});

test("a missing owner setting fails closed", () => {
  const owner = process.env.MONOSYTH_PROJECT_OWNER_EMAIL;
  delete process.env.MONOSYTH_PROJECT_OWNER_EMAIL;
  assert.equal(isTrackerOwner({ email: "owner@example.com", email_verified: true }), false);
  process.env.MONOSYTH_PROJECT_OWNER_EMAIL = owner;
});
test("project websites normalize bare domains, keep section paths, and are preserved when omitted", () => {
  assert.deepEqual(validSite({ url: "www.example.com" }), { label: "example.com", url: "https://www.example.com/" });
  assert.deepEqual(validSite({ label: "Weather", url: "https://monosyth.com/weather" }), { label: "Weather", url: "https://monosyth.com/weather" });
  for (const url of ["https://example.com/?ref=1", "https://user:pw@example.com", "ftp://example.com", "localhost", "javascript:alert(1)"]) assert.throws(() => validSite({ url }));
  assert.equal("sites" in parseProject(project), false);
  assert.deepEqual(parseProject({ ...project, sites: [{ label: "", url: "example.com" }] }).sites, [{ label: "example.com", url: "https://example.com/" }]);
  assert.throws(() => parseProject({ ...project, sites: Array.from({ length: 11 }, (_, index) => ({ url: `site${index}.com` })) }));
});
