import "server-only";
import { ShopError } from "./security";

export function shopOrigin() {
  const url = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://monosyth.com");
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
    throw new Error("Invalid shop origin");
  }
  return url.origin;
}

export function shopConfig() {
  const config = {
    stripeKey: process.env.STRIPE_SECRET_KEY?.trim() || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim() || "",
    downloadSecret: process.env.SHOP_DOWNLOAD_SECRET?.trim() || "",
    bucket: process.env.SHOP_STORAGE_BUCKET?.trim() || "",
    emailKey: process.env.RESEND_API_KEY?.trim() || "",
    from: process.env.SHOP_FROM_EMAIL?.trim() || "",
    support: process.env.SHOP_SUPPORT_EMAIL?.trim() || "",
    taxMode: process.env.SHOP_TAX_MODE?.trim() || "",
  };
  if (Object.values(config).some((value) => !value) || config.downloadSecret.length < 32 || !["automatic", "manual"].includes(config.taxMode)) {
    throw new ShopError(503, "The pattern shop is getting ready. Please check back soon.");
  }
  return config;
}

export function checkoutEnabled() {
  if (process.env.SHOP_ENABLED !== "true") return false;
  try { shopConfig(); shopOrigin(); return true; } catch { return false; }
}
