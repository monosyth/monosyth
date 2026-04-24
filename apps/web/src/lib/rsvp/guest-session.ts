/**
 * Lightweight guest identity for the RSVP app.
 *
 * This is NOT an authentication system — it's a name+email "account" so
 * guests who don't have / don't want to use Google can still RSVP, and so
 * we can recognise them if they come back with the same email. There's no
 * password, no verification: the email is the identity, and the name is
 * just a label we're happy to update if they revise it.
 *
 * Session payloads are signed with HMAC-SHA-256 server-side so the cookie
 * can't be tampered with client-side.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const GUEST_COOKIE_NAME = "rsvp_guest";
const GUEST_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180 days

export type GuestSession = {
  uid: string;
  name: string;
  email: string;
  /** ISO timestamp. */
  issuedAt: string;
};

function getSecret() {
  return (
    process.env.RSVP_GUEST_SESSION_SECRET ??
    // Deterministic local-dev default so things keep working without env
    // plumbing. Prod should set RSVP_GUEST_SESSION_SECRET to a random value.
    "monosyth-rsvp-guest-dev-secret-please-override-in-prod"
  );
}

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64urlDecode(s: string): Buffer {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function deriveGuestUid(email: string): string {
  const normalized = normalizeEmail(email);
  const digest = createHash("sha256").update(normalized).digest("hex");
  return `guest_${digest.slice(0, 24)}`;
}

export function createGuestSession(rawName: string, rawEmail: string): GuestSession {
  const email = normalizeEmail(rawEmail);
  const name = rawName.trim();
  return {
    uid: deriveGuestUid(email),
    name,
    email,
    issuedAt: new Date().toISOString(),
  };
}

export function signGuestSession(session: GuestSession): string {
  const payload = base64url(Buffer.from(JSON.stringify(session), "utf8"));
  const sig = createHmac("sha256", getSecret()).update(payload).digest();
  return `${payload}.${base64url(sig)}`;
}

export function verifyGuestSession(cookieValue: string | null | undefined): GuestSession | null {
  if (!cookieValue) return null;
  const [payload, signature] = cookieValue.split(".");
  if (!payload || !signature) return null;

  const expected = createHmac("sha256", getSecret()).update(payload).digest();
  const provided = base64urlDecode(signature);
  if (expected.length !== provided.length) return null;
  if (!timingSafeEqual(expected, provided)) return null;

  try {
    const json = base64urlDecode(payload).toString("utf8");
    const parsed = JSON.parse(json) as GuestSession;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.uid !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.name !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Helper for building the Set-Cookie string for a given session. */
export function buildGuestCookie(session: GuestSession | null) {
  if (!session) {
    return `${GUEST_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  }
  const signed = signGuestSession(session);
  const secure =
    process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${GUEST_COOKIE_NAME}=${signed}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${GUEST_COOKIE_MAX_AGE_SECONDS}${secure}`;
}
