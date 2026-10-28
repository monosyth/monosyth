"use client";

import { useRef, useState } from "react";
import styles from "@/app/shop/type/type.module.css";

export function FontBuyButton({ slug, edition, price, available }: { slug: string; edition: string; price: string; available: boolean }) {
  const attempt = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function buy() {
    if (busy) return;
    setBusy(true); setError("");
    attempt.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/shop/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, attemptId: attempt.current }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Checkout couldn’t open. Please try again.");
      const url = new URL(result.url);
      if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") throw new Error("Checkout couldn’t open. Please try again.");
      window.location.assign(url.href);
    } catch (error) { setError(error instanceof Error ? error.message : "Checkout couldn’t open. Please try again."); setBusy(false); }
  }
  return <><button className={styles.buy} disabled={!available || busy} onClick={() => void buy()}>{!available ? "Available soon" : busy ? "Opening secure checkout…" : `Buy ${edition} · ${price}`}<span aria-hidden="true">↗</span></button>{error && <p className={styles.error} role="alert">{error}</p>}</>;
}
