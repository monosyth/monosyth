import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { authorizeUrl, listingName, mostFavorited, moneyCents, openToken, pkcePair, receiptNetCents, sealToken, summarizeReceipts, type EtsyReceipt } from "../src/lib/projects/etsy-core";

const usd = (cents: number) => ({ amount: cents, divisor: 100, currency_code: "USD" });
const at = (iso: string) => Date.parse(iso) / 1000;
const dayOf = (time: number) => new Date(time).toISOString().slice(0, 10);

test("money respects Etsy's divisor", () => {
  assert.equal(moneyCents(usd(695)), 695);
  assert.equal(moneyCents({ amount: 6950, divisor: 1000, currency_code: "USD" }), 695);
  assert.equal(moneyCents(undefined), 0);
});

test("net sales leave out canceled and fully refunded orders and subtract partial refunds", () => {
  assert.equal(receiptNetCents({ status: "paid", subtotal: usd(695) }), 695);
  assert.equal(receiptNetCents({ status: "partially refunded", subtotal: usd(695), refunds: [{ amount: usd(200) }] }), 495);
  assert.equal(receiptNetCents({ status: "partially refunded", subtotal: usd(695), refunds: [{ amount: usd(900) }] }), 0);
  assert.equal(receiptNetCents({ status: "fully refunded", subtotal: usd(695) }), null);
  assert.equal(receiptNetCents({ status: "Canceled", subtotal: usd(695) }), null);
  assert.equal(receiptNetCents({ is_paid: false, subtotal: usd(695) }), null);
});

test("receipts split into this period and the last, with coupons shared across items", () => {
  const receipts: EtsyReceipt[] = [
    { status: "completed", created_timestamp: at("2026-11-20T12:00:00Z"), subtotal: usd(900), transactions: [{ title: "Evergreen Trellis Quilt Pattern PDF, Includes EQ8 File", quantity: 1, price: usd(800) }, { title: "Mushroom Laser Cut Files, Fungi", quantity: 1, price: usd(200) }] },
    { status: "paid", created_timestamp: at("2026-11-21T12:00:00Z"), subtotal: usd(800), transactions: [{ title: "Evergreen Trellis Quilt Pattern PDF, Includes EQ8 File", quantity: 1, price: usd(800) }] },
    { status: "paid", created_timestamp: at("2026-10-01T12:00:00Z"), subtotal: usd(300), transactions: [{ title: "Old", quantity: 1, price: usd(300) }] },
    { status: "canceled", created_timestamp: at("2026-11-21T13:00:00Z"), subtotal: usd(5000), transactions: [{ title: "Canceled", quantity: 1, price: usd(5000) }] },
  ];
  const summary = summarizeReceipts(receipts, ["2026-11-20", "2026-11-21"], Date.parse("2026-10-23T00:00:00Z"), dayOf);
  assert.equal(summary.orders, 2);
  assert.equal(summary.revenueCents, 1700);
  assert.equal(summary.previousOrders, 1);
  assert.equal(summary.previousRevenueCents, 300);
  assert.deepEqual(summary.daily, [{ date: "2026-11-20", cents: 900 }, { date: "2026-11-21", cents: 800 }]);
  assert.deepEqual(summary.topItems[0], { name: "Evergreen Trellis Quilt Pattern PDF", count: 2, cents: 1520 });
  assert.deepEqual(summary.topItems[1], { name: "Mushroom Laser Cut Files", count: 1, cents: 180 });
});

test("summaries contain no buyer details", () => {
  const receipt = { status: "paid", created_timestamp: at("2026-11-20T12:00:00Z"), subtotal: usd(695), name: "Private Buyer", buyer_email: "buyer@example.com", first_line: "1 Private St", transactions: [{ title: "Pattern", quantity: 1, price: usd(695) }] } as EtsyReceipt;
  const text = JSON.stringify(summarizeReceipts([receipt], ["2026-11-20"], 0, dayOf));
  for (const secret of ["Private Buyer", "buyer@example.com", "Private St"]) assert.equal(text.includes(secret), false);
});

test("listing names decode Etsy's entities and drop search terms", () => {
  assert.equal(listingName("Autumn Leaves &amp; Pumpkins Runner, Digital PDF"), "Autumn Leaves & Pumpkins Runner");
  assert.equal(listingName("Baker&#39;s Box, SVG"), "Baker's Box");
  assert.equal(listingName(""), "Etsy listing");
  assert.deepEqual(mostFavorited([{ title: "A, x", num_favorers: 2 }, { title: "B, y", num_favorers: 9 }, { title: "C", num_favorers: 0 }]), [{ name: "B", favorites: 9 }, { name: "A", favorites: 2 }]);
});

test("the sign-in link uses PKCE and read-only scopes", () => {
  const { verifier, challenge } = pkcePair();
  assert.match(verifier, /^[A-Za-z0-9_-]{43,128}$/);
  assert.equal(challenge, createHash("sha256").update(verifier).digest("base64url"));
  const url = new URL(authorizeUrl({ keystring: "key", redirectUri: "https://monosyth.com/api/projects/etsy/callback", state: "state", challenge }));
  assert.equal(url.origin + url.pathname, "https://www.etsy.com/oauth/connect");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  const scopes = url.searchParams.get("scope")!.split(" ");
  assert.deepEqual(scopes.sort(), ["listings_r", "shops_r", "transactions_r"]);
  assert.equal(url.toString().includes(verifier), false);
});

test("stored tokens are encrypted and tamper-evident", () => {
  const sealed = sealToken("123.access-token", "shared-secret");
  assert.equal(sealed.includes("access-token"), false);
  assert.notEqual(sealed, sealToken("123.access-token", "shared-secret"));
  assert.equal(openToken(sealed, "shared-secret"), "123.access-token");
  assert.throws(() => openToken(sealed, "other-secret"));
  const parts = sealed.split(".");
  parts[3] = Buffer.from("tampered").toString("base64url");
  assert.throws(() => openToken(parts.join("."), "shared-secret"));
});
