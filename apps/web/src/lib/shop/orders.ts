import type Stripe from "stripe";
import { findRelease } from "./catalog";
import { ShopError } from "./security";

// Checkout metadata and amounts are supplied by our server, never the buyer.
// The recorded purchase price survives later catalog price changes.
export function paidRelease(session: Stripe.Checkout.Session, live: boolean) {
  if (session.metadata?.shop !== "monosyth-patterns-v1" || session.livemode !== live || session.mode !== "payment") {
    throw new ShopError(404, "Order not found.");
  }
  if (session.status !== "complete" || session.payment_status !== "paid") {
    throw new ShopError(409, "Your payment hasn’t been confirmed yet. Wait a moment, then check again.");
  }
  const product = findRelease(session.metadata.sku || "");
  const expected = Number(session.metadata.price_cents);
  if (!product || !Number.isSafeInteger(expected) || expected < 50 || session.currency !== "usd" || session.amount_subtotal !== expected || (session.amount_total ?? 0) < expected) {
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
  return product;
}
