import { ShopStar, DiagonalArrow } from "@/components/shop/brand-icons";
import type { Metadata } from "next";
import Link from "next/link";
import styles from "./shop.module.css";
import { CartProvider, CartLink } from "@/components/shop/cart-provider";
import { shopProducts } from "@/lib/shop/catalog";

export const metadata: Metadata = {
  title: { default: "Patterns & type | Monosyth", template: "%s | Monosyth" },
  description: "Original quilt patterns and independent typefaces from Monosyth. Digital downloads for your next creative project.",
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider products={shopProducts.map(({ slug, name, priceCents, image, version }) => ({ slug, name, priceCents, image, version }))}><div className={styles.shop}>
    <a href="#shop-main" className={styles.skip}>Skip to shop</a>
    <header className={styles.header}>
      <Link href="/shop" className={styles.brand} aria-label="Monosyth shop"><ShopStar className={styles.brandMark} />monosyth<span className={styles.brandSuffix}>Shop</span></Link>
      <nav aria-label="Shop"><Link href="/shop#patterns">Quilt patterns</Link><Link href="/shop/type">Monosyth Type</Link><Link href="/">Monosyth Labs <DiagonalArrow /></Link><CartLink /></nav>
    </header>
    <main id="shop-main">{children}</main>
    <footer className={styles.footer}>
      <div><Link className={styles.footerBrand} href="/shop">monosyth</Link><p>Small pieces, wonderful possibilities</p></div>
      <p>© {new Date().getFullYear()} Monosyth Labs, LLC<br />Patterns and type for things you create</p>
      <Link href="/">Back to Monosyth Labs <DiagonalArrow /></Link>
    </footer>
  </div></CartProvider>;
}
