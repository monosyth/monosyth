import "server-only";
import { createHash } from "node:crypto";
import Stripe from "stripe";
import { getStorage } from "firebase-admin/storage";
import { getFirebaseAdminApp } from "@/lib/firebase/admin";
import { releaseId, storagePath, type ShopProduct, type ShopFile } from "./catalog";
import { cartProducts } from "./cart";
import { checkoutEnabled, formPublishableKey, shopConfig, shopOrigin } from "./config";
import { paidReleases } from "./orders";
import { orderKey, verifyOrderKey, validateSessionId, ShopError } from "./security";
import { checkoutLineItem } from "./stripe-prices";
import { orderEmail } from "./email";

export function stripeClient() {
  return new Stripe(shopConfig().stripeKey, { maxNetworkRetries: 2, timeout: 15000, httpClient: Stripe.createFetchHttpClient() });
}

function shopBucket() {
  // Separate from the site's public weather/image bucket. No Firebase download tokens.
  return getStorage(getFirebaseAdminApp()).bucket(shopConfig().bucket);
}

export async function verifyPrivateFiles(product: ShopProduct) {
  const bucket = shopBucket();
  const [metadata] = await bucket.getMetadata();
  if (metadata.iamConfiguration?.publicAccessPrevention !== "enforced" || !metadata.iamConfiguration?.uniformBucketLevelAccess?.enabled) {
    throw new Error("Shop bucket must enforce private uniform access");
  }
  await Promise.all(product.files.map(async (file) => {
    const [meta] = await bucket.file(storagePath(product, file)).getMetadata();
    if (Number(meta.size) !== file.bytes || meta.metadata?.sha256 !== file.sha256 || meta.metadata?.firebaseStorageDownloadTokens) {
      throw new Error("Shop file verification failed");
    }
  }));
}

async function createCheckoutSession(selection: string | string[], attemptId: string, form = false) {
  if (!checkoutEnabled()) throw new ShopError(503, "The pattern shop is getting ready. Please check back soon.");
  const products = cartProducts(selection);
  if (!/^[0-9a-f-]{36}$/.test(attemptId)) throw new ShopError(400, "Please refresh the page and try again.");
  await Promise.all(products.map(verifyPrivateFiles));
  const config = shopConfig();
  const origin = shopOrigin();
  // Deterministic for a browser attempt: retries create the same Checkout Session.
  const orderId = attemptId;
  const key = orderKey(orderId, config.downloadSecret);
  const items = products.map(product => [releaseId(product), product.priceCents]);
  const metadata: Record<string, string> = { shop: "monosyth-patterns-v1", order_id: orderId, price_cents: String(products.reduce((sum, product) => sum + product.priceCents, 0)),
    ...(products.length === 1 ? { sku: releaseId(products[0]) } : { cart_items: JSON.stringify(items) }),
  };
  const cartId = products.length === 1 ? products[0].slug : createHash("sha256").update(JSON.stringify(items)).digest("hex");
  const returnUrl = `${origin}/shop/order?session_id={CHECKOUT_SESSION_ID}&key=${key}`;
  const session = await stripeClient().checkout.sessions.create({
    mode: "payment",
    ...(form ? { ui_mode: "form", integration_identifier: "custom_embedded_web_0001", return_url: returnUrl } : {
      success_url: returnUrl,
      cancel_url: products.length === 1 ? `${origin}/shop/${products[0].slug}?checkout=cancelled` : `${origin}/shop/cart?checkout=cancelled`,
    }),
    payment_method_types: ["card"],
    adaptive_pricing: { enabled: false },
    billing_address_collection: "required",
    automatic_tax: { enabled: config.taxMode === "automatic" },
    line_items: products.map(product => checkoutLineItem(product, config.stripeKey)),
    metadata,
    payment_intent_data: { metadata },
    ...(!form ? { custom_text: { submit: { message: "Digital files only. Your PDF and EQ8 download link will be emailed after payment. EQ8 software is required only for the editable project." } } } : {}),
  }, {
    idempotencyKey: `shop-checkout${form ? "-form" : ""}:${cartId}:${attemptId}`,
    ...(form ? { apiVersion: "2026-08-26.dahlia; custom_checkout_payment_form_preview=v1" } : {}),
  });
  return { session, returnUrl: returnUrl.replace("{CHECKOUT_SESSION_ID}", session.id) };
}

export async function createCheckout(selection: string | string[], attemptId: string) {
  const { session } = await createCheckoutSession(selection, attemptId);
  if (!session.url) throw new Error("Checkout URL missing");
  return session.url;
}

export async function createFormCheckout(selection: string | string[], attemptId: string) {
  const publishableKey = formPublishableKey();
  const { session, returnUrl } = await createCheckoutSession(selection, attemptId, true);
  if (!session.client_secret) throw new Error("Checkout client secret missing");
  return { clientSecret: session.client_secret, publishableKey, returnUrl };
}

export async function retrieveOrder(sessionId: string, key?: string) {
  validateSessionId(sessionId);
  const config = shopConfig();
  const stripe = stripeClient();
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent.latest_charge"] });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeInvalidRequestError && error.code === "resource_missing") throw new ShopError(404, "Order not found.");
    throw error;
  }
  if (key !== undefined && !verifyOrderKey(session.metadata?.order_id || "", key, config.downloadSecret)) {
    throw new ShopError(403, "This download link isn’t valid. Open the full link from your order email.");
  }
  const products = paidReleases(session, config.stripeKey.startsWith("sk_live_") || config.stripeKey.startsWith("rk_live_"));
  return { session, products };
}

export async function fulfillOrder(sessionId: string) {
  const { session, products } = await retrieveOrder(sessionId);
  if (session.metadata?.delivery_email_id) return;
  const config = shopConfig();
  const orderId = session.metadata?.order_id || "";
  if (!/^[0-9a-f-]{36}$/.test(orderId)) throw new Error("Invalid order reference");
  const email = session.customer_details?.email;
  if (!email) throw new Error("Paid order missing email");
  const url = `${shopOrigin()}/shop/order?session_id=${encodeURIComponent(session.id)}&key=${orderKey(orderId, config.downloadSecret)}`;
  // Stripe retains the durable delivery marker. Resend deduplicates concurrent
  // webhook retries in the gap between sending and recording that marker.
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.emailKey}`, "Content-Type": "application/json", "Idempotency-Key": `pattern-order/${session.id}` },
    body: JSON.stringify({
      from: config.from, to: [email], reply_to: config.support,
      ...orderEmail(products, url, config.support, session.amount_total!),
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Order email delivery failed");
  const result = await response.json() as { id?: string };
  if (!result.id) throw new Error("Order email response missing ID");
  await stripeClient().checkout.sessions.update(session.id, { metadata: { delivery_email_id: result.id } });
}

export async function downloadFile(product: ShopProduct, file: ShopFile) {
  const [bytes] = await shopBucket().file(storagePath(product, file)).download();
  if (bytes.length !== file.bytes || createHash("sha256").update(bytes).digest("hex") !== file.sha256) {
    throw new Error("Download integrity check failed");
  }
  return bytes;
}
