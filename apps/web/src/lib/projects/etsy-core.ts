// Etsy helpers with no server or network dependencies, so the money and token rules can be tested directly.
import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from "node:crypto";
import type { EtsyStats } from "./analytics-model";

export const ETSY_SCOPES = "shops_r listings_r transactions_r";
export const ETSY_AUTHORIZE_URL = "https://www.etsy.com/oauth/connect";

export type EtsyMoney = { amount: number; divisor: number; currency_code: string };
export type EtsyTransaction = { title?: string | null; quantity?: number; price?: EtsyMoney };
// Only the fields the dashboard reads. Etsy also returns buyer details, which are never kept or sent to the browser.
export type EtsyReceipt = {
  status?: string; is_paid?: boolean;
  created_timestamp?: number; create_timestamp?: number;
  subtotal?: EtsyMoney;
  transactions?: EtsyTransaction[];
  refunds?: { amount?: EtsyMoney }[];
};
export type EtsyListing = { title?: string; url?: string; num_favorers?: number };

export const moneyCents = (money?: EtsyMoney) => money && money.divisor ? Math.round((money.amount * 100) / money.divisor) : 0;

const ENTITIES: Record<string, string> = { amp: "&", quot: "\"", apos: "'", lt: "<", gt: ">", nbsp: " " };
export function listingName(title?: string | null) {
  const text = (title ?? "")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match)
    .trim();
  // Etsy titles carry search terms after the first comma.
  return text.split(",")[0].trim() || "Etsy listing";
}

// What the shop kept from an order before Etsy's fees: items after coupons, less refunds. Tax and shipping are excluded.
export function receiptNetCents(receipt: EtsyReceipt) {
  const status = receipt.status?.toLowerCase();
  if (receipt.is_paid === false || status === "canceled" || status === "fully refunded") return null;
  const subtotal = moneyCents(receipt.subtotal);
  const refunded = (receipt.refunds ?? []).reduce((total, refund) => total + moneyCents(refund.amount), 0);
  return Math.max(0, subtotal - refunded);
}

type Summary = Pick<EtsyStats, "orders" | "previousOrders" | "revenueCents" | "previousRevenueCents" | "daily" | "topItems">;
export function summarizeReceipts(receipts: EtsyReceipt[], window: string[], cutoff: number, dayOf: (time: number) => string): Summary {
  const daily = new Map(window.map(date => [date, 0])), items = new Map<string, { count: number; cents: number }>();
  const summary: Summary = { orders: 0, previousOrders: 0, revenueCents: 0, previousRevenueCents: 0, daily: [], topItems: [] };
  for (const receipt of receipts) {
    const net = receiptNetCents(receipt), created = (receipt.created_timestamp ?? receipt.create_timestamp ?? 0) * 1000;
    if (net === null || !created) continue;
    if (created < cutoff) { summary.previousOrders++; summary.previousRevenueCents += net; continue; }
    summary.orders++; summary.revenueCents += net;
    const date = dayOf(created);
    if (daily.has(date)) daily.set(date, (daily.get(date) ?? 0) + net);
    // Coupons and refunds apply to the order, so each item takes its share of the net by list price.
    const lines = (receipt.transactions ?? []).map(line => ({ name: listingName(line.title), quantity: line.quantity ?? 1, gross: moneyCents(line.price) * (line.quantity ?? 1) }));
    const gross = lines.reduce((total, line) => total + line.gross, 0);
    for (const line of lines) {
      const item = items.get(line.name);
      const share = gross ? Math.round((net * line.gross) / gross) : Math.round(net / lines.length);
      items.set(line.name, { count: (item?.count ?? 0) + line.quantity, cents: (item?.cents ?? 0) + share });
    }
  }
  summary.daily = window.map(date => ({ date, cents: daily.get(date) ?? 0 }));
  summary.topItems = [...items].sort((a, b) => b[1].count - a[1].count || b[1].cents - a[1].cents).slice(0, 5).map(([name, item]) => ({ name, ...item }));
  return summary;
}

export function mostFavorited(listings: EtsyListing[], limit = 5) {
  return listings.filter(listing => (listing.num_favorers ?? 0) > 0)
    .sort((a, b) => (b.num_favorers ?? 0) - (a.num_favorers ?? 0)).slice(0, limit)
    .map(listing => ({ name: listingName(listing.title), favorites: listing.num_favorers ?? 0 }));
}

const base64url = (value: Buffer) => value.toString("base64url");
export function pkcePair() {
  const verifier = base64url(randomBytes(48));
  return { verifier, challenge: base64url(createHash("sha256").update(verifier).digest()) };
}
export const newState = () => base64url(randomBytes(32));
export const hashState = (state: string) => createHash("sha256").update(state).digest("hex");

export function authorizeUrl(input: { keystring: string; redirectUri: string; state: string; challenge: string }) {
  const url = new URL(ETSY_AUTHORIZE_URL);
  url.search = new URLSearchParams({ response_type: "code", client_id: input.keystring, redirect_uri: input.redirectUri, scope: ETSY_SCOPES, state: input.state, code_challenge: input.challenge, code_challenge_method: "S256" }).toString();
  return url.toString();
}

// Tokens are stored encrypted with a key derived from the Etsy shared secret.
const sealKey = (secret: string) => Buffer.from(hkdfSync("sha256", secret, "monosyth-etsy", "etsy-token-v1", 32));
export function sealToken(value: string, secret: string) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", sealKey(secret), iv);
  const body = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", base64url(iv), base64url(cipher.getAuthTag()), base64url(body)].join(".");
}
export function openToken(sealed: string, secret: string) {
  const [version, iv, tag, body] = sealed.split(".");
  if (version !== "v1" || !iv || !tag || body === undefined) throw new Error("Unreadable Etsy token.");
  const decipher = createDecipheriv("aes-256-gcm", sealKey(secret), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
}
