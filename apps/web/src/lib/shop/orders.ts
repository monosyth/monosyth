import type Stripe from "stripe";
import { findRelease } from "./catalog";
import { ShopError } from "./security";
import { MAX_CART_PATTERNS } from "./cart";

// Checkout metadata and amounts are supplied by our server, never the buyer.
// The recorded purchase price survives later catalog price changes.
export function paidReleases(session: Stripe.Checkout.Session, live: boolean) {
  if (session.metadata?.shop !== "monosyth-patterns-v1" || session.livemode !== live || session.mode !== "payment") {
    throw new ShopError(404, "Order not found.");
  }
  if (session.status !== "complete" || session.payment_status !== "paid") {
    throw new ShopError(409, "Your payment hasn’t been confirmed yet. Wait a moment, then check again.");
  }
  let items: unknown = [[session.metadata.sku, Number(session.metadata.price_cents)]];
  if (session.metadata.cart_items !== undefined) {
    try { items = JSON.parse(session.metadata.cart_items); } catch { items = null; }
    if (session.metadata.sku) items = null;
  }
  if (!Array.isArray(items) || items.length < 1 || items.length > MAX_CART_PATTERNS) {
    throw new ShopError(409, "We couldn’t match this payment to your patterns. Please contact us with your receipt.");
  }
  const products = items.map((item: unknown) => {
    if (!Array.isArray(item) || item.length !== 2 || typeof item[0] !== "string" || !Number.isSafeInteger(item[1]) || item[1] < 50) {
      throw new ShopError(409, "This order needs a review. Please contact us with your receipt.");
    }
    const product = findRelease(item[0]);
    if (!product) throw new ShopError(409, "This pattern edition needs a review. Please contact us with your receipt.");
    return { product, price: item[1] as number };
  });
  const expected = Number(session.metadata.price_cents);
  if (new Set(products.map(item => item.product.slug)).size !== products.length || products.reduce((sum, item) => sum + item.price, 0) !== expected || !Number.isSafeInteger(expected) || expected < 50 || session.currency !== "usd" || session.amount_subtotal !== expected || (session.amount_total ?? 0) < expected) {
    throw new ShopError(409, "We couldn’t match this payment to a pattern. Please contact us with your receipt.");
  }
  const intent = session.payment_intent;
  if (!intent || typeof intent === "string" || intent.status !== "succeeded") {
    throw new ShopError(409, "Your payment hasn’t been confirmed yet. Wait a moment, then check again.");
  }
  const charge = intent.latest_charge;
  if (!charge || typeof charge === "string" || !charge.paid || !charge.captured || charge.refunded || charge.disputed) {
    throw new ShopError(403, "Downloads aren’t available for this payment. Please contact us with your receipt.");
  }
  return products.map(item => item.product);
}

// Retained for callers that explicitly require a legacy single-pattern order.
export function paidRelease(session: Stripe.Checkout.Session, live: boolean) {
  const products = paidReleases(session, live);
  if (products.length !== 1) throw new ShopError(409, "This order includes multiple patterns.");
  return products[0];
}
