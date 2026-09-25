"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import styles from "@/app/shop/shop.module.css";
import { rememberCheckout } from "./cart-provider";

// The owner's Checkout builder uses Stripe's Embedded form preview SDK.
type StripeForm = {
  mount: (target: HTMLElement) => void;
  destroy: () => void;
  on: (event: "confirm", callback: (event: unknown) => void) => void;
};
type StripeFormSdk = {
  createForm: (options: { layout: "expanded" }) => StripeForm;
  loadActions: () => Promise<
    { type: "success"; actions: { confirm: (options: { formConfirmEvent: unknown }) => Promise<{ type: string; error?: { message?: string } }> } }
    | { type: "error"; error?: { message?: string } }
  >;
};
declare global {
  interface Window {
    Stripe?: (key: string, options: { betas: string[] }) => {
      initCheckoutFormSdk: (options: { clientSecret: string; appearance: object }) => StripeFormSdk;
    };
  }
}

const appearance = {
  theme: "stripe", inputs: "spaced", labels: "auto",
  variables: { borderRadius: "8px", colorBackground: "#ffffff", colorDanger: "#a43e2e", colorPrimary: "#233d34", colorSuccess: "#39724c", colorText: "#233d34", fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif', fontSizeBase: "16px", spacingUnit: "5px" },
};

export function CheckoutForm({ slugs }: { slugs: string[] }) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const attempt = useRef<{ selection: string; id: string } | null>(null);
  const target = useRef<HTMLDivElement>(null);
  const selection = [...slugs].sort().join(",");

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    let form: StripeForm | undefined;
    const controller = new AbortController();
    if (attempt.current?.selection !== selection) attempt.current = { selection, id: crypto.randomUUID() };
    const attemptId = attempt.current.id;
    rememberCheckout(attemptId, selection.split(","));
    async function start() {
      try {
        const response = await fetch("/api/shop/checkout", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slugs: selection.split(","), attemptId, uiMode: "form" }), signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Checkout is unavailable. Please try again.");
        if (cancelled) return;
        if (!window.Stripe || !target.current) throw new Error("Secure checkout could not load. Please refresh the page.");
        const returnUrl = new URL(result.returnUrl);
        if (returnUrl.origin !== window.location.origin || returnUrl.pathname !== "/shop/order") throw new Error("Invalid checkout response.");
        const sdk = window.Stripe(result.publishableKey, { betas: ["custom_checkout_payment_form_1"] })
          .initCheckoutFormSdk({ clientSecret: result.clientSecret, appearance });
        const loaded = await sdk.loadActions();
        if (cancelled) return;
        if (loaded.type !== "success") throw new Error(loaded.error?.message || "Checkout is unavailable. Please try again.");
        form = sdk.createForm({ layout: "expanded" });
        form.on("confirm", (event) => {
          setError(null);
          // The server already supplies the signed return_url on the session.
          void Promise.resolve().then(() => loaded.actions.confirm({ formConfirmEvent: event })).then(result => {
            if (cancelled) return;
            if (result.type === "error") setError(result.error?.message || "Payment could not be completed. Please try again.");
          }).catch(() => { if (!cancelled) setError("Payment could not be completed. Please try again."); });
        });
        form.mount(target.current!);
        setLoading(false);
      } catch (error) {
        if (!cancelled) {
          setError(error instanceof Error ? error.message : "Checkout is unavailable. Please try again.");
          setLoading(false);
        }
      }
    }
    void start();
    return () => { cancelled = true; controller.abort(); form?.destroy(); };
  }, [ready, retry, selection]);

  return <>
    <Script src="https://js.stripe.com/dahlia/stripe.js" onReady={() => setReady(true)} onError={() => { setLoading(false); setError("Secure checkout could not load. Please refresh the page."); }} />
    {loading && <p role="status">Loading secure checkout…</p>}
    <div ref={target} />
    {error && <div><p className={styles.error} role="alert">{error}</p>{ready && <button type="button" className={styles.primaryButton} onClick={() => { setError(null); setLoading(true); setRetry(value => value + 1); }}>Reload checkout</button>}</div>}
  </>;
}
