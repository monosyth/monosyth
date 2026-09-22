import { createHmac, timingSafeEqual } from "node:crypto";

export class ShopError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function orderKey(orderId: string, secret: string) {
  return createHmac("sha256", secret).update(`monosyth-shop:v1:${orderId}`).digest("hex");
}

export function verifyOrderKey(orderId: string, key: string, secret: string) {
  if (!/^[0-9a-f]{64}$/.test(key) || !/^[0-9a-f-]{36}$/.test(orderId)) return false;
  return timingSafeEqual(Buffer.from(orderKey(orderId, secret), "hex"), Buffer.from(key, "hex"));
}

export function validateSessionId(value: string) {
  if (!/^cs_(test_|live_)?[A-Za-z0-9]{16,200}$/.test(value)) {
    throw new ShopError(400, "This download link is incomplete. Open the full link from your order email.");
  }
  return value;
}

export function checkOrigin(request: Request, siteOrigin: string) {
  if (request.headers.get("origin") !== siteOrigin) {
    throw new ShopError(403, "Please start checkout from the pattern shop.");
  }
}

export async function readLimitedText(request: Request, maxBytes: number) {
  if (Number(request.headers.get("content-length")) > maxBytes) throw new ShopError(413, "Request too large.");
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new ShopError(413, "Request too large.");
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString("utf8");
}

export const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "X-Content-Type-Options": "nosniff",
};

export function shopErrorResponse(error: unknown) {
  // Never log Stripe payloads, customer emails, keys or private order URLs.
  if (!(error instanceof ShopError)) console.error("Shop request failed", error instanceof Error ? error.name : "UnknownError");
  return Response.json({ error: error instanceof ShopError ? error.message : "We couldn’t complete that request. Please try again shortly." }, {
    status: error instanceof ShopError ? error.status : 503, headers: privateHeaders,
  });
}
