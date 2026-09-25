"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart, CartIcon } from "./cart-provider";
import { CheckoutForm } from "./checkout-form";
import { CheckoutTrust, LockIcon } from "./checkout-trust";
import styles from "@/app/shop/shop.module.css";

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
export function CartPage({ available, checkout = false }: { available: boolean; checkout?: boolean }) {
  const { products, slugs, remove, ready } = useCart();
  const items = slugs.flatMap(slug => products.filter(product => product.slug === slug));
  const subtotal = items.reduce((sum, product) => sum + product.priceCents, 0);
  const selection = [...slugs].sort().join(",");
  if (!ready) return <div className={styles.checkoutPage}><p role="status">Opening your cart…</p></div>;
  if (!items.length) return <div className={styles.emptyCart}><CartIcon /><p className={styles.eyebrow}>A little inspiration awaits</p><h1>Your next project is out there</h1><p>Your cart is empty. Explore the collection and add the patterns you love.</p><Link className={styles.primaryButton} href="/shop#patterns">Find your patterns <span>→</span></Link></div>;
  return <div className={styles.checkoutPage}>
    <Link className={styles.backLink} href={checkout ? "/shop/cart" : "/shop#patterns"}>{checkout ? "← Edit your cart" : "← Keep exploring"}</Link>
    <p className={styles.eyebrow}>{checkout ? "One payment, endless possibilities" : "Your next projects"}</p>
    <h1>{checkout ? "Make something beautiful" : "Your pattern cart"}</h1>
    <div className={styles.checkoutGrid}>
      <section className={styles.cartItems} aria-label="Your patterns">
        <div className={styles.cartSectionTitle}><h2>{checkout ? "Order summary" : "Ready to make"}</h2><span>{items.length} {items.length === 1 ? "pattern" : "patterns"}</span></div>
        {items.map(product => <article className={styles.cartItem} key={product.slug}>
          <Link href={`/shop/${product.slug}`} tabIndex={-1} aria-hidden="true"><Image src={product.image} alt="" width={104} height={88} sizes="104px" /></Link>
          <div><h3><Link href={`/shop/${product.slug}`}>{product.name}</Link></h3><p>PDF + EQ8 · Edition {product.version}</p>{!checkout && <button className={styles.removeItem} onClick={() => remove(product.slug)} aria-label={`Remove ${product.name} from cart`}>Remove</button>}</div>
          <strong>{money(product.priceCents)}</strong>
        </article>)}
        <div className={styles.cartSubtotal}><span>Subtotal</span><strong>{money(subtotal)} <small>USD</small></strong></div>
        <p className={styles.taxNote}>Applicable tax is calculated at checkout using your billing address.</p>
        <div className={styles.deliveryNote}><span aria-hidden="true">↓</span><div><strong>All your patterns, one private link</strong><p>Download after payment. We’ll also email your link so you can return anytime. These are digital files; nothing is shipped.</p></div></div>
        <p className={styles.small}>One copy of each pattern is all you need. Electric Quilt 8 is only required for the editable project; the PDF opens in a regular PDF reader.</p>
      </section>
      {checkout ? <CheckoutTrust>{available ? <CheckoutForm key={selection} slugs={slugs} /> : <p role="status" className={styles.notice}>Checkout is temporarily unavailable. Your cart is saved.</p>}</CheckoutTrust> : <aside className={styles.cartTotalCard} aria-label="Cart total">
        <p className={styles.eyebrow}>Good things are taking shape</p><h2>Your collection</h2>
        <div className={styles.cartSubtotal}><span>{items.length} {items.length === 1 ? "pattern" : "patterns"}</span><strong>{money(subtotal)}</strong></div>
        <p className={styles.taxNote}>USD · Tax calculated at checkout</p>
        {available ? <Link className={styles.primaryButton} href="/shop/checkout"><LockIcon /> Secure checkout <span>→</span></Link> : <p className={styles.notice}>Checkout is temporarily unavailable. Your cart is saved.</p>}
        <p className={styles.cartReassurance}>One-time payment · No account needed</p>
        <div className={styles.cartStripe}>Payments securely processed by <strong>stripe</strong></div>
        <p className={styles.small}>Need a hand? <a href="mailto:scott@monosyth.com">scott@monosyth.com</a></p>
      </aside>}
    </div>
  </div>;
}
