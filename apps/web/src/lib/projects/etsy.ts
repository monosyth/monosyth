import "server-only";
import { getFirebaseAdminDb } from "../firebase/admin";
import type { EtsySetup, EtsyStats } from "./analytics-model";
import { authorizeUrl, hashState, mostFavorited, newState, openToken, pkcePair, sealToken, summarizeReceipts, type EtsyListing, type EtsyReceipt } from "./etsy-core";
import type { Unavailable } from "./insights-model";

const API = "https://api.etsy.com/v3/application";
const TOKEN_URL = "https://api.etsy.com/v3/public/oauth/token";
const DAY = 86_400_000;
const STATS_TTL = 15 * 60_000;
const PENDING_TTL = 10 * 60_000;
const MAX_RECEIPTS = 1000;
const MAX_LISTINGS = 300;

type Stored = {
  accessToken?: string; refreshToken?: string; accessExpiresAt?: number; shopId?: number; connectedAt?: string;
  pending?: { stateHash: string; verifier: string; expiresAt: number } | null;
};
type TokenReply = { access_token: string; refresh_token: string; expires_in: number };
class NeedsReconnect extends Error {}

const record = () => getFirebaseAdminDb().collection("privateProjectTracker").doc("owner").collection("integrations").doc("etsy");
const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://monosyth.com").replace(/\/$/, "");
export const etsyRedirectUri = () => `${siteUrl()}/api/projects/etsy/callback`;
export const etsyReturnUrl = (result: string) => `${siteUrl()}/projects?view=analytics&etsy=${encodeURIComponent(result)}`;
function config() {
  const keystring = process.env.ETSY_KEYSTRING?.trim() || "", secret = process.env.ETSY_SHARED_SECRET?.trim() || "";
  return keystring && secret ? { keystring, secret } : null;
}

export async function startEtsyConnection() {
  const keys = config();
  if (!keys) throw new Error("Etsy keys are not set on this host.");
  const state = newState(), { verifier, challenge } = pkcePair();
  await record().set({ pending: { stateHash: hashState(state), verifier: sealToken(verifier, keys.secret), expiresAt: Date.now() + PENDING_TTL } }, { merge: true });
  return authorizeUrl({ keystring: keys.keystring, redirectUri: etsyRedirectUri(), state, challenge });
}

async function requestToken(params: Record<string, string>) {
  const response = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(params), cache: "no-store", signal: AbortSignal.timeout(12_000) });
  if (response.status === 400 || response.status === 401) throw new NeedsReconnect();
  if (!response.ok) throw new Error("Etsy sign-in could not be reached.");
  return await response.json() as TokenReply;
}

async function etsyGet<T>(path: string, token: string | null, keys: { keystring: string; secret: string }) {
  const response = await fetch(`${API}${path}`, {
    headers: { "x-api-key": `${keys.keystring}:${keys.secret}`, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    cache: "no-store", signal: AbortSignal.timeout(12_000),
  });
  if (response.status === 401) throw new NeedsReconnect();
  if (!response.ok) throw new Error(`Etsy returned ${response.status}.`);
  return await response.json() as T;
}

// Single-use: the state is cleared before the code is exchanged, so a replayed callback cannot connect anything.
export async function finishEtsyConnection(input: { state: string; code: string | null }) {
  const keys = config();
  if (!keys) return "failed";
  const ref = record(), stateHash = hashState(input.state);
  const verifier = await getFirebaseAdminDb().runTransaction(async transaction => {
    const pending = (await transaction.get(ref)).data()?.pending as Stored["pending"];
    if (!pending || pending.stateHash !== stateHash || pending.expiresAt < Date.now()) return null;
    transaction.set(ref, { pending: null }, { merge: true });
    return pending.verifier;
  });
  if (!verifier) return "expired";
  if (!input.code) return "denied";
  const reply = await requestToken({ grant_type: "authorization_code", client_id: keys.keystring, redirect_uri: etsyRedirectUri(), code: input.code, code_verifier: openToken(verifier, keys.secret) });
  const me = await etsyGet<{ shop_id?: number }>("/users/me", reply.access_token, keys);
  if (!me.shop_id) return "no-shop";
  await ref.set({
    accessToken: sealToken(reply.access_token, keys.secret), refreshToken: sealToken(reply.refresh_token, keys.secret),
    accessExpiresAt: Date.now() + reply.expires_in * 1000, shopId: me.shop_id, connectedAt: new Date().toISOString(), pending: null,
  }, { merge: true });
  statsCache = null;
  return "connected";
}

let refreshing: Promise<string> | null = null;
async function refreshAccess(stored: Stored, keys: { keystring: string; secret: string }) {
  let refreshToken: string;
  try { refreshToken = openToken(stored.refreshToken!, keys.secret); } catch { throw new NeedsReconnect(); }
  try {
    const reply = await requestToken({ grant_type: "refresh_token", client_id: keys.keystring, refresh_token: refreshToken });
    await record().set({ accessToken: sealToken(reply.access_token, keys.secret), refreshToken: sealToken(reply.refresh_token, keys.secret), accessExpiresAt: Date.now() + reply.expires_in * 1000 }, { merge: true });
    return reply.access_token;
  } catch (error) {
    // Another server instance may have just rotated the token; use its result instead of asking to reconnect.
    if (error instanceof NeedsReconnect) {
      const latest = (await record().get()).data() as Stored | undefined;
      if (latest?.refreshToken && latest.refreshToken !== stored.refreshToken && latest.accessToken && (latest.accessExpiresAt ?? 0) > Date.now()) return openToken(latest.accessToken, keys.secret);
    }
    throw error;
  }
}
async function accessToken(stored: Stored, keys: { keystring: string; secret: string }, force = false) {
  if (!force && stored.accessToken && (stored.accessExpiresAt ?? 0) > Date.now() + 60_000) {
    try { return openToken(stored.accessToken, keys.secret); } catch { /* A rotated secret falls through to a refresh. */ }
  }
  refreshing ??= refreshAccess(stored, keys).finally(() => { refreshing = null; });
  return refreshing;
}

async function allReceipts(shopId: number, since: number, get: <T>(path: string) => Promise<T>) {
  const receipts: EtsyReceipt[] = [];
  for (let offset = 0; offset < MAX_RECEIPTS; offset += 100) {
    const page = await get<{ count: number; results: EtsyReceipt[] }>(`/shops/${shopId}/receipts?min_created=${Math.floor(since / 1000)}&was_paid=true&was_canceled=false&limit=100&offset=${offset}`);
    receipts.push(...page.results);
    if (page.results.length < 100) return { receipts, capped: false };
  }
  return { receipts, capped: true };
}
async function activeListings(shopId: number, get: <T>(path: string) => Promise<T>) {
  const listings: EtsyListing[] = [];
  for (let offset = 0; offset < MAX_LISTINGS; offset += 100) {
    const page = await get<{ results: EtsyListing[] }>(`/shops/${shopId}/listings?state=active&limit=100&offset=${offset}`);
    listings.push(...page.results);
    if (page.results.length < 100) break;
  }
  return listings;
}

let statsCache: { at: number; value: EtsyStats } | null = null;
export async function etsyStats(window: string[], now: number, dayOf: (time: number) => string, refresh: boolean): Promise<EtsyStats | EtsySetup | Unavailable> {
  const keys = config();
  if (!keys) return { connection: "keys" };
  if (!refresh && statsCache && now - statsCache.at < STATS_TTL) return statsCache.value;
  const stored = (await record().get()).data() as Stored | undefined;
  if (!stored?.refreshToken || !stored.shopId) return { connection: "connect" };
  const shopId = stored.shopId;
  try {
    let token = await accessToken(stored, keys);
    const get = async <T,>(path: string) => {
      try { return await etsyGet<T>(path, token, keys); }
      catch (error) {
        if (!(error instanceof NeedsReconnect)) throw error;
        token = await accessToken(stored, keys, true);
        return etsyGet<T>(path, token, keys);
      }
    };
    const shop = await get<{ shop_name: string; url: string; currency_code?: string; listing_active_count?: number; num_favorers?: number; review_count?: number; review_average?: number | null; transaction_sold_count?: number }>(`/shops/${shopId}`);
    const [{ receipts, capped }, listings] = await Promise.all([allReceipts(shopId, now - 60 * DAY, get), activeListings(shopId, get)]);
    const value: EtsyStats = {
      shopName: shop.shop_name, shopUrl: shop.url.split("?")[0], currency: shop.currency_code || "USD",
      ...summarizeReceipts(receipts, window, now - 30 * DAY, dayOf),
      activeListings: shop.listing_active_count ?? listings.length, favorites: shop.num_favorers ?? 0,
      reviewCount: shop.review_count ?? 0, reviewAverage: shop.review_average ?? null, soldAllTime: shop.transaction_sold_count ?? 0,
      mostFavorited: mostFavorited(listings), capped,
    };
    statsCache = { at: now, value };
    return value;
  } catch (error) {
    if (error instanceof NeedsReconnect) return { connection: "reconnect" };
    throw error;
  }
}
