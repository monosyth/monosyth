"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import styles from "@/app/shop/shop.module.css";
import { finishCartCheckout } from "./cart-provider";

type OrderFile = { id: string; name: string; label: string; bytes: number };
type OrderProduct = { sku: string; slug: string; name: string; version: string; files: OrderFile[] };
type Order = { orderId: string; products: OrderProduct[]; emailSent: boolean };

export function OrderDownloads({ sessionId, orderKey, support }: { sessionId: string; orderKey: string; support: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const query = new URLSearchParams({ session_id: sessionId, key: orderKey }).toString();

  const load = useCallback(async (signal?: AbortSignal) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/shop/order?${query}`, { cache: "no-store", signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We couldn’t retrieve your order.");
      setOrder(result);
      finishCartCheckout(result.orderId, result.products.map((product: OrderProduct) => product.slug));
    } catch (error) {
      if (signal?.aborted) return;
      setError(error instanceof Error ? error.message : "We couldn’t retrieve your order.");
    } finally { if (!signal?.aborted) setBusy(false); }
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function download(product: OrderProduct, file: OrderFile) {
    setDownloading(`${product.sku}:${file.id}`);
    setError(null);
    try {
      const response = await fetch(`/api/shop/download?${query}&sku=${encodeURIComponent(product.sku)}&file=${encodeURIComponent(file.id)}`, { cache: "no-store" });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "The download didn’t finish. Please try again.");
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = file.name;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (error) { setError(error instanceof Error ? error.message : "The download didn’t finish. Please try again."); }
    finally { setDownloading(null); }
  }

  return <section className={styles.orderCard} aria-busy={busy}>
    <p className={styles.eyebrow}>{order ? "Your pattern collection starts here" : "Your order"}</p>
    <h1>{order ? "Time to make something" : busy ? "Checking your payment" : "Let’s find your pattern"}</h1>
    {busy && <p role="status">Checking your order securely. This may take a moment.</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {!busy && !order && <button className={styles.primaryButton} onClick={() => void load()}>Check again</button>}
    {order && <>
      <p>Your payment is confirmed. Download each file below, and keep this private page for later.</p>
      {order.products.map(product => <section className={styles.orderProduct} key={product.sku} aria-label={product.name}>
      <h2 className={styles.orderName}>{product.name} <span>Edition {product.version}</span></h2>
      <div className={styles.downloads}>
        {product.files.map((file) => <button key={file.id} disabled={downloading !== null} onClick={() => void download(product, file)}>
          <span><strong>{file.label}</strong><small>{file.name} · {(file.bytes / 1024 / 1024).toFixed(1)} MB</small></span>
          <span>{downloading === `${product.sku}:${file.id}` ? "Preparing…" : "Download ↓"}</span>
        </button>)}
      </div>
      </section>)}
      <p className={styles.small}>Open the pattern in your PDF reader. The EQ8 ZIP contains an editable project and opening guide; Electric Quilt 8 is required for that file.</p>
      <p className={styles.small}>{order.emailSent ? "Your download link has also been emailed to you. Check spam if you don’t see it." : "Your download email is being prepared. You can download now and bookmark this page."}</p>
    </>}
    <div className={styles.orderLinks}><Link href="/shop">← Back to the shop</Link>{support && <a href={`mailto:${support}`}>Get order help</a>}</div>
  </section>;
}
