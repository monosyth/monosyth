"use client";

import Link from "next/link";
import styles from "@/app/shop/shop.module.css";

export function BuyButton({ slug, price, available }: { slug: string; price: string; available: boolean }) {
  return <div className={styles.buyArea}>
    {available ? <Link className={styles.primaryButton} href={`/shop/checkout/${slug}`}>Buy pattern · {price}<span aria-hidden="true">→</span></Link> : <button type="button" className={styles.primaryButton} disabled>Available soon</button>}
    <p className={styles.small}>{available ? "One-time purchase · Secure checkout with Stripe" : "Our direct shop is opening soon. Explore the collection below."}</p>
  </div>;
}
