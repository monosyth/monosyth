import type { Metadata } from "next";
import Link from "next/link";
import styles from "./shop.module.css";

export const metadata: Metadata = {
  title: { default: "Quilt patterns | Monosyth", template: "%s | Monosyth Patterns" },
  description: "Original Monosyth quilt patterns. Illustrated PDF instructions and editable EQ8 projects for your next handmade quilt.",
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.shop}>
    <a href="#shop-main" className={styles.skip}>Skip to patterns</a>
    <header className={styles.header}>
      <Link href="/shop" className={styles.brand} aria-label="Monosyth pattern shop"><span className={styles.brandMark} aria-hidden="true">✳</span>monosyth<span className={styles.brandSuffix}>Patterns</span></Link>
      <nav aria-label="Pattern shop"><Link href="/shop#patterns">The collection</Link><Link href="/shop#how-it-works">How it works</Link><Link href="/">Monosyth Labs ↗</Link></nav>
    </header>
    <main id="shop-main">{children}</main>
    <footer className={styles.footer}>
      <div><Link className={styles.footerBrand} href="/shop">monosyth</Link><p>Small pieces, wonderful possibilities</p></div>
      <p>© {new Date().getFullYear()} Monosyth Labs, LLC<br />Digital patterns for things made by hand</p>
      <Link href="/">Back to Monosyth Labs ↗</Link>
    </footer>
  </div>;
}
