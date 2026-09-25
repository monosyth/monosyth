"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import styles from "@/app/shop/shop.module.css";

export type CartProduct = { slug: string; name: string; priceCents: number; image: string; version: string };
const storageKey = "monosyth-pattern-cart-v1";
const checkoutKey = "monosyth-pattern-checkout-v1";
const changeEvent = "monosyth-pattern-cart-change";
let memory = "[]";
function snapshot() {
  try { return localStorage.getItem(storageKey) || memory; } catch { return memory; }
}
function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(changeEvent, notify);
  return () => { window.removeEventListener("storage", notify); window.removeEventListener(changeEvent, notify); };
}
function parse(value: string): string[] {
  try {
    const result: unknown = JSON.parse(value);
    return Array.isArray(result) ? [...new Set(result.filter((item): item is string => typeof item === "string"))].slice(0, 10) : [];
  } catch { return []; }
}
function update(change: (slugs: string[]) => string[]) {
  memory = JSON.stringify(change(parse(snapshot())));
  try { localStorage.setItem(storageKey, memory); } catch { /* The cart still works in this tab if browser storage is unavailable. */ }
  window.dispatchEvent(new Event(changeEvent));
}

export function rememberCheckout(attemptId: string, slugs: string[]) {
  try { sessionStorage.setItem(checkoutKey, JSON.stringify({ attemptId, slugs })); } catch { /* Storage is optional. */ }
}

export function finishCartCheckout(orderId: string, purchased: string[]) {
  try {
    const pending = JSON.parse(sessionStorage.getItem(checkoutKey) || "null");
    if (pending?.attemptId !== orderId) return;
    update(slugs => slugs.filter(slug => !purchased.includes(slug)));
    sessionStorage.removeItem(checkoutKey);
  } catch { /* Viewing an old order must not clear the current cart. */ }
}

const CartContext = createContext<{ products: CartProduct[]; slugs: string[]; ready: boolean; add: (slug: string) => void; remove: (slug: string) => void } | null>(null);
export function CartProvider({ products, children }: { products: CartProduct[]; children: React.ReactNode }) {
  const stored = useSyncExternalStore(subscribe, snapshot, () => "[]");
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const slugs = useMemo(() => parse(stored).filter(slug => products.some(product => product.slug === slug)), [stored, products]);
  return <CartContext.Provider value={{ products, slugs, ready,
    add: slug => { if (products.some(product => product.slug === slug)) update(current => [...new Set([...current.filter(item => products.some(product => product.slug === item)), slug])].slice(0, 10)); },
    remove: slug => update(current => current.filter(item => item !== slug)),
  }}>{children}</CartContext.Provider>;
}
export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("Cart provider is missing");
  return cart;
}

export function CartIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M6 7h14l-2 10H8L5 3H2" /><circle cx="9" cy="21" r="1" /><circle cx="17" cy="21" r="1" /></svg>;
}
export function CartLink() {
  const { slugs } = useCart();
  return <Link href="/shop/cart" className={styles.cartLink} aria-label={`Cart, ${slugs.length} ${slugs.length === 1 ? "pattern" : "patterns"}`}><CartIcon />Cart <span>{slugs.length}</span></Link>;
}
export function QuickAdd({ slug, name, available }: { slug: string; name: string; available: boolean }) {
  const { slugs, add, ready } = useCart();
  return slugs.includes(slug) ? <Link className={styles.quickAdd} href="/shop/cart">✓ In your cart <span>View cart →</span></Link> : <button className={styles.quickAdd} disabled={!available || !ready} onClick={() => add(slug)} aria-label={`Add ${name} to cart`}>{available ? "Add to cart" : "Available soon"}<span aria-hidden="true">+</span></button>;
}
