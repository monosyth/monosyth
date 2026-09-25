"use client";

import Link from "next/link";
import styles from "@/app/shop/shop.module.css";
import { useCart, CartIcon } from "./cart-provider";

export function BuyButton({ slug, price, available }: { slug: string; price: string; available: boolean }) {
  const { slugs, add, ready } = useCart();
  const added = slugs.includes(slug);
  return <div className={styles.buyArea}>
    {available ? added ? <Link className={styles.primaryButton} href="/shop/cart">✓ Added to your cart<span>View cart →</span></Link> : <button className={styles.primaryButton} disabled={!ready} onClick={() => add(slug)}><CartIcon /> Add to cart · {price}<span aria-hidden="true">+</span></button> : <button type="button" className={styles.primaryButton} disabled>Available soon</button>}
    <p className={styles.small} aria-live="polite">{available ? added ? "Ready when you are. Keep exploring or check out with your collection." : "Collect your favorites and pay once · Secure checkout with Stripe" : "Our direct shop is opening soon. Explore the collection below."}</p>
    {available && <Link className={styles.buyNowLink} href={`/shop/checkout/${slug}`}>Just this pattern? Buy now →</Link>}
  </div>;
}
