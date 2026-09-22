"use client";

import { useRef, useState } from "react";
import styles from "@/app/shop/shop.module.css";

export function BuyButton({ slug, price, available }: { slug: string; price: string; available: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attempt = useRef<string | null>(null);

  async function buy() {
    if (busy) return;
    setBusy(true);
    setError(null);
    attempt.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/shop/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, attemptId: attempt.current }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Checkout is unavailable. Please try again.");
      const url = new URL(result.url);
      if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") throw new Error("Checkout is unavailable. Please try again.");
      window.location.assign(url.href);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Checkout is unavailable. Please try again.");
      setBusy(false);
    }
  }

  return <div className={styles.buyArea}>
    <button type="button" className={styles.primaryButton} disabled={!available || busy} onClick={() => void buy()}>
      {busy ? "Opening secure checkout…" : available ? `Buy pattern · ${price}` : "Available soon"}
      {!busy && <span aria-hidden="true">↗</span>}
    </button>
    <p className={styles.small}>{available ? "One-time purchase · Secure checkout with Stripe" : "Our direct shop is opening soon. Explore the collection below."}</p>
    {error && <p className={styles.error} role="alert">{error}</p>}
  </div>;
}
