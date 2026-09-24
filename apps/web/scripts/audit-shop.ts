import assert from "node:assert/strict";
import { test, mock, afterEach } from "node:test";
import { createHash } from "node:crypto";
import Stripe from "stripe";
import { getStorage } from "firebase-admin/storage";
import { getFirebaseAdminApp } from "../src/lib/firebase/admin";
import { shopProducts, releaseId, storagePath } from "../src/lib/shop/catalog";
import { paidRelease } from "../src/lib/shop/orders";
import { orderKey, verifyOrderKey, ShopError, readLimitedText } from "../src/lib/shop/security";
import { createCheckout, createFormCheckout, downloadFile, fulfillOrder, retrieveOrder } from "../src/lib/shop/server";
import { checkoutLineItem } from "../src/lib/shop/stripe-prices";
import liveCatalog from "../src/lib/shop/stripe-live-catalog.json";
import { POST as checkoutRoute } from "../src/app/api/shop/checkout/route";
import { POST as webhookRoute } from "../src/app/api/shop/webhook/route";
import { GET as downloadRoute } from "../src/app/api/shop/download/route";
import { GET as orderRoute } from "../src/app/api/shop/order/route";

const product = shopProducts[0];
const orderId = "02878b3e-5659-4d04-a2dd-4bb57b648095";
const sessionId = "cs_test_abcdefghijklmnopqrstuvwxyz123456";
const secret = "test-download-secret-32-characters-long";
const stripe = new Stripe("sk_test_offline");
const fixture = () => ({
  id: sessionId, object: "checkout.session", livemode: false,
  status: "complete", payment_status: "paid", mode: "payment", currency: "usd",
  amount_subtotal: product.priceCents, amount_total: product.priceCents,
  metadata: { shop: "monosyth-patterns-v1", sku: releaseId(product), order_id: orderId, price_cents: String(product.priceCents) },
  customer_details: { email: "buyer@example.invalid" },
  payment_intent: { status: "succeeded", latest_charge: { paid: true, captured: true, refunded: false, disputed: false } },
}) as unknown as Stripe.Checkout.Session;

process.env.SHOP_ENABLED = "true";
process.env.STRIPE_SECRET_KEY = "sk_test_offline";
process.env.STRIPE_PUBLISHABLE_KEY = "pk_test_offline";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_offline_test";
process.env.SHOP_DOWNLOAD_SECRET = secret;
process.env.SHOP_STORAGE_BUCKET = "offline-test-bucket";
process.env.RESEND_API_KEY = "re_offline";
process.env.SHOP_FROM_EMAIL = "Patterns <patterns@example.invalid>";
process.env.SHOP_SUPPORT_EMAIL = "support@example.invalid";
process.env.SHOP_TAX_MODE = "manual";
process.env.NEXT_PUBLIC_SITE_URL = "https://monosyth.com";

afterEach(() => { mock.restoreAll(); process.env.SHOP_ENABLED = "true"; process.env.SHOP_TAX_MODE = "manual"; process.env.STRIPE_SECRET_KEY = "sk_test_offline"; process.env.STRIPE_PUBLISHABLE_KEY = "pk_test_offline"; });

function mockBucket(options: { private?: boolean; badHash?: boolean; bytes?: Buffer } = {}) {
  const storage = getStorage(getFirebaseAdminApp());
  const bucket = {
    getMetadata: async () => [{ iamConfiguration: { publicAccessPrevention: options.private === false ? "inherited" : "enforced", uniformBucketLevelAccess: { enabled: true } } }],
    file: (path: string) => ({
      getMetadata: async () => {
        const file = product.files.find((file) => storagePath(product, file) === path);
        assert.ok(file);
        return [{ size: file.bytes, metadata: { sha256: options.badHash ? "wrong" : file.sha256 } }];
      },
      download: async () => [options.bytes || Buffer.from("corrupt")],
    }),
  };
  mock.method(storage, "bucket", () => bucket as unknown as ReturnType<typeof storage.bucket>);
}

function mockNetwork(session = fixture(), emailStatus = 200) {
  const requests: { url: string; method: string; body: string; headers: Headers }[] = [];
  mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method || "GET";
    const body = String(init?.body || "");
    requests.push({ url, method, body, headers: new Headers(init?.headers) });
    if (url === "https://api.resend.com/emails") return Response.json(emailStatus === 200 ? { id: "email_test_1" } : { error: "failed" }, { status: emailStatus });
    if (!url.startsWith("https://api.stripe.com/v1/checkout/sessions")) throw new Error(`Unexpected network request: ${url}`);
    if (method === "POST" && new URL(url).pathname.endsWith("/sessions")) return Response.json({ id: sessionId, client_secret: "cs_test_fixture_secret_example", url: "https://checkout.stripe.com/c/pay/test_only" });
    if (method === "POST") {
      const data = new URLSearchParams(body);
      session.metadata!.delivery_email_id = data.get("metadata[delivery_email_id]") || "";
    }
    return Response.json(session);
  });
  return requests;
}

test("all ten editions have unique slugs, exact file hashes, PDF and EQ8 deliverables", () => {
  assert.equal(shopProducts.length, 10);
  assert.equal(new Set(shopProducts.map((p) => p.slug)).size, 10);
  for (const p of shopProducts) {
    assert.equal(p.priceCents, 695);
    assert.ok(p.files.some((f) => f.name.endsWith(".pdf")));
    assert.ok(p.files.some((f) => f.name.endsWith(".zip")));
    for (const file of p.files) { assert.match(file.sha256, /^[0-9a-f]{64}$/); assert.ok(file.bytes > 0 && file.bytes < 50_000_000); }
  }
});

test("private download keys reject tampering, a different order and a different secret", () => {
  const key = orderKey(orderId, secret);
  assert.equal(verifyOrderKey(orderId, key, secret), true);
  assert.equal(verifyOrderKey(orderId, "a".repeat(64), secret), false);
  assert.equal(verifyOrderKey(orderId.replace("0287", "0288"), key, secret), false);
  assert.equal(verifyOrderKey(orderId, key, "another-secret"), false);
  assert.equal(verifyOrderKey(orderId, "", secret), false);
});

test("payment verification allows paid orders including tax and retains their original price", () => {
  const session = fixture();
  session.amount_total = 760;
  assert.equal(paidRelease(session, false).slug, product.slug);
  session.metadata!.price_cents = "895";
  session.amount_subtotal = 895;
  session.amount_total = 895;
  assert.equal(paidRelease(session, false).slug, product.slug);
});

for (const [name, edit] of Object.entries({
  unpaid: (s: Stripe.Checkout.Session) => { s.payment_status = "unpaid"; },
  incomplete: (s: Stripe.Checkout.Session) => { s.status = "open"; },
  free: (s: Stripe.Checkout.Session) => { s.payment_status = "no_payment_required"; },
  subscription: (s: Stripe.Checkout.Session) => { s.mode = "subscription"; },
  foreign: (s: Stripe.Checkout.Session) => { s.metadata!.shop = "other"; },
  underpaid: (s: Stripe.Checkout.Session) => { s.amount_subtotal = 1; },
  discounted: (s: Stripe.Checkout.Session) => { s.amount_total = 1; },
  currency: (s: Stripe.Checkout.Session) => { s.currency = "eur"; },
  missingEdition: (s: Stripe.Checkout.Session) => { s.metadata!.sku = "unknown@1"; },
  wrongMode: (s: Stripe.Checkout.Session) => { s.livemode = true; },
  unexpanded: (s: Stripe.Checkout.Session) => { s.payment_intent = "pi_123"; },
  refunded: (s: Stripe.Checkout.Session) => { ((s.payment_intent as Stripe.PaymentIntent).latest_charge as Stripe.Charge).refunded = true; },
  disputed: (s: Stripe.Checkout.Session) => { ((s.payment_intent as Stripe.PaymentIntent).latest_charge as Stripe.Charge).disputed = true; },
  uncaptured: (s: Stripe.Checkout.Session) => { ((s.payment_intent as Stripe.PaymentIntent).latest_charge as Stripe.Charge).captured = false; },
})) {
  test(`denies ${name} payment`, () => { const session = fixture(); edit(session); assert.throws(() => paidRelease(session, false), ShopError); });
}

test("checkout ignores a buyer-supplied price and uses stable retry idempotency", async () => {
  mockBucket(); const requests = mockNetwork();
  const makeRequest = () => new Request("https://monosyth.com/api/shop/checkout", { method: "POST", headers: { Origin: "https://monosyth.com", "Content-Type": "application/json" }, body: JSON.stringify({ slug: product.slug, attemptId: orderId, priceCents: 1 }) });
  assert.equal((await checkoutRoute(makeRequest())).status, 200);
  assert.equal((await checkoutRoute(makeRequest())).status, 200);
  const params = new URLSearchParams(requests[0].body);
  assert.equal(params.get("line_items[0][price_data][unit_amount]"), "695");
  assert.equal(params.get("line_items[0][quantity]"), "1");
  assert.equal(params.get("line_items[0][price]"), null);
  assert.equal(params.get("line_items[0][price_data][product_data][tax_code]"), liveCatalog.taxCode);
  assert.equal(params.get("automatic_tax[enabled]"), "false");
  assert.equal(requests[0].headers.get("idempotency-key"), requests[1].headers.get("idempotency-key"));
  assert.equal(params.get("success_url"), `https://monosyth.com/shop/order?session_id={CHECKOUT_SESSION_ID}&key=${orderKey(orderId, secret)}`);
});

test("all live editions use distinct saved Stripe prices, while sandbox uses inline prices", () => {
  const prices = new Set<string>();
  const products = new Set<string>();
  for (const p of shopProducts) {
    const saved = liveCatalog.prices.find((entry) => entry.sku === releaseId(p));
    assert.ok(saved);
    assert.match(saved.productId, /^prod_[A-Za-z0-9]+$/);
    assert.match(saved.priceId, /^price_[A-Za-z0-9]+$/);
    products.add(saved.productId);
    prices.add(saved.priceId);
    for (const key of ["rk_live_offline", "sk_live_offline"]) {
      assert.deepEqual(checkoutLineItem(p, key), { quantity: 1, price: saved.priceId });
    }
    for (const key of ["rk_test_offline", "sk_test_offline"]) {
      const item = checkoutLineItem(p, key);
      assert.equal(item.price, undefined);
      assert.equal(item.price_data?.unit_amount, p.priceCents);
      assert.equal(item.price_data?.product_data?.metadata?.sku, releaseId(p));
    }
  }
  assert.equal(prices.size, shopProducts.length);
  assert.equal(products.size, shopProducts.length);
});

test("live checkout refuses an unmapped edition or a changed catalog price or currency", () => {
  for (const changed of [{ ...product, version: "unpublished" }, { ...product, priceCents: 895 }, { ...product, currency: "cad" }]) {
    assert.throws(() => checkoutLineItem(changed, "rk_live_offline"), (e: unknown) => e instanceof ShopError && e.status === 503);
  }
});

test("live checkout sends the saved price and retains private order fulfillment metadata", async () => {
  process.env.STRIPE_SECRET_KEY = "rk_live_offline";
  mockBucket(); const requests = mockNetwork();
  await createCheckout(product.slug, orderId);
  const params = new URLSearchParams(requests[0].body);
  assert.equal(params.get("line_items[0][price]"), liveCatalog.prices[0].priceId);
  assert.equal(params.get("line_items[0][price_data][unit_amount]"), null);
  assert.equal(params.get("metadata[sku]"), releaseId(product));
  assert.equal(params.get("metadata[price_cents]"), "695");
  assert.equal(params.get("payment_intent_data[metadata][order_id]"), orderId);
  assert.equal(params.get("mode"), "payment");
});

test("checkout rejects cross-origin requests and malformed input", async () => {
  const response = await checkoutRoute(new Request("https://monosyth.com/api/shop/checkout", { method: "POST", headers: { Origin: "https://evil.invalid" }, body: "{}" }));
  assert.equal(response.status, 403);
  assert.equal((await checkoutRoute(new Request("https://monosyth.com/api/shop/checkout", { method: "POST", headers: { Origin: "https://monosyth.com" }, body: "{" }))).status, 400);
});

test("disabled shop, unavailable files and public storage cannot start checkout", async () => {
  process.env.SHOP_ENABLED = "false";
  await assert.rejects(createCheckout(product.slug, orderId), (e: unknown) => e instanceof ShopError && e.status === 503);
  process.env.SHOP_ENABLED = "true";
  mockBucket({ private: false });
  await assert.rejects(createCheckout(product.slug, orderId), /private uniform access/);
  mock.restoreAll(); mockBucket({ badHash: true });
  await assert.rejects(createCheckout(product.slug, orderId), /file verification/);
});

test("automatic tax is explicit in checkout", async () => {
  mockBucket(); const requests = mockNetwork(); process.env.SHOP_TAX_MODE = "automatic";
  await createCheckout(product.slug, orderId);
  assert.equal(new URLSearchParams(requests[0].body).get("automatic_tax[enabled]"), "true");
});

test("embedded form keeps tax, edition and private return link on the server", async () => {
  mockBucket(); const requests = mockNetwork(); process.env.SHOP_TAX_MODE = "automatic";
  const response = await checkoutRoute(new Request("https://monosyth.com/api/shop/checkout", {
    method: "POST", headers: { Origin: "https://monosyth.com" },
    body: JSON.stringify({ slug: product.slug, attemptId: orderId, uiMode: "form", returnUrl: "https://evil.invalid", priceCents: 1 }),
  }));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.publishableKey, "pk_test_offline");
  assert.equal(result.clientSecret, "cs_test_fixture_secret_example");
  assert.equal(result.returnUrl, `https://monosyth.com/shop/order?session_id=${sessionId}&key=${orderKey(orderId, secret)}`);
  assert.match(response.headers.get("cache-control") || "", /no-store/);
  assert.equal(JSON.stringify(result).includes("sk_test_offline"), false);
  const params = new URLSearchParams(requests[0].body);
  assert.equal(params.get("ui_mode"), "form");
  assert.equal(params.get("integration_identifier"), "custom_embedded_web_0001");
  assert.equal(params.get("automatic_tax[enabled]"), "true");
  assert.equal(params.get("adaptive_pricing[enabled]"), "false");
  assert.equal(params.get("metadata[sku]"), releaseId(product));
  assert.equal(params.get("success_url"), null);
  assert.equal(params.get("cancel_url"), null);
  assert.match(params.get("return_url") || "", /session_id=\{CHECKOUT_SESSION_ID\}&key=/);
  assert.match(requests[0].headers.get("stripe-version") || "", /custom_checkout_payment_form_preview=v1/);
  await createCheckout(product.slug, orderId);
  assert.notEqual(requests[0].headers.get("idempotency-key"), requests[1].headers.get("idempotency-key"));
});

test("embedded form refuses missing or mismatched keys and an unset tax mode", async () => {
  const requests = mockNetwork();
  for (const key of ["", "pk_live_wrongmode"]) {
    process.env.STRIPE_PUBLISHABLE_KEY = key;
    await assert.rejects(createFormCheckout(product.slug, orderId), ShopError);
  }
  process.env.STRIPE_PUBLISHABLE_KEY = "pk_test_offline";
  process.env.SHOP_TAX_MODE = "";
  await assert.rejects(createFormCheckout(product.slug, orderId), ShopError);
  assert.equal(requests.length, 0);
});

test("tampered links and unpurchased file IDs cannot download", async () => {
  mockNetwork();
  await assert.rejects(retrieveOrder(sessionId, "f".repeat(64)), (e: unknown) => e instanceof ShopError && e.status === 403);
  const params = new URLSearchParams({ session_id: sessionId, key: orderKey(orderId, secret), file: "../../other.pdf" });
  assert.equal((await downloadRoute(new Request(`https://monosyth.com/api/shop/download?${params}`))).status, 404);
  assert.equal((await orderRoute(new Request(`https://monosyth.com/api/shop/order?session_id=${sessionId}`))).status, 403);
});

test("private order response contains no buyer email or storage source paths", async () => {
  mockNetwork();
  const response = await orderRoute(new Request(`https://monosyth.com/api/shop/order?session_id=${sessionId}&key=${orderKey(orderId, secret)}`));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") || "", /no-store/);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  const text = await response.text();
  assert.ok(!text.includes("buyer@example")); assert.ok(!text.includes("source")); assert.ok(!text.includes("sha256"));
});

test("download integrity rejects replaced bytes and accepts exact versioned content", async () => {
  mockBucket(); await assert.rejects(downloadFile(product, product.files[0]), /integrity/);
  mock.restoreAll();
  const bytes = Buffer.from("%PDF-test-file"); mockBucket({ bytes });
  const file = { ...product.files[0], bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
  assert.deepEqual(await downloadFile(product, file), bytes);
});

test("duplicate fulfillment sends one email and persists delivery on Stripe", async () => {
  const requests = mockNetwork();
  await fulfillOrder(sessionId); await fulfillOrder(sessionId);
  const emails = requests.filter((request) => request.url.includes("resend.com"));
  assert.equal(emails.length, 1);
  assert.equal(emails[0].headers.get("idempotency-key"), `pattern-order/${sessionId}`);
  const body = JSON.parse(emails[0].body);
  assert.deepEqual(body.to, ["buyer@example.invalid"]);
  assert.ok(body.text.includes(orderKey(orderId, secret)));
  assert.ok(body.text.includes("EQ8"));
  assert.ok(!body.text.includes("gs://"));
});

test("email failure remains retryable and does not mark delivery complete", async () => {
  const requests = mockNetwork(fixture(), 400);
  await assert.rejects(fulfillOrder(sessionId), /email delivery failed/);
  assert.equal(requests.filter((r) => r.url.includes("stripe.com") && r.method === "POST").length, 0);
});

test("webhook requires a valid signature and tolerates legitimate duplicate notifications", async () => {
  const requests = mockNetwork();
  const body = JSON.stringify({ id: "evt_test", object: "event", type: "checkout.session.completed", data: { object: fixture() } });
  const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret: "whsec_offline_test" });
  const request = (sig: string) => new Request("https://monosyth.com/api/shop/webhook", { method: "POST", headers: { "stripe-signature": sig }, body });
  assert.equal((await webhookRoute(request("bad"))).status, 400);
  assert.equal(requests.length, 0);
  assert.equal((await webhookRoute(request(signature))).status, 200);
  assert.equal((await webhookRoute(request(signature))).status, 200);
  assert.equal(requests.filter((r) => r.url.includes("resend.com")).length, 1);
});

test("unpaid webhook never delivers, including async checkout completion", async () => {
  const requests = mockNetwork(); const session = fixture(); session.payment_status = "unpaid";
  const body = JSON.stringify({ type: "checkout.session.completed", data: { object: session } });
  const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret: "whsec_offline_test" });
  assert.equal((await webhookRoute(new Request("https://monosyth.com/api/shop/webhook", { method: "POST", headers: { "stripe-signature": signature }, body }))).status, 200);
  assert.equal(requests.length, 0);
});

test("request size limit also applies when content-length is omitted", async () => {
  await assert.rejects(readLimitedText(new Request("https://monosyth.com", { method: "POST", body: "x".repeat(2049) }), 2048), (e: unknown) => e instanceof ShopError && e.status === 413);
});
