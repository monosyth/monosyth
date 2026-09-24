import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findProduct, formatPrice } from "@/lib/shop/catalog";
import { formCheckoutEnabled } from "@/lib/shop/config";
import { CheckoutForm } from "@/components/shop/checkout-form";
import styles from "../../shop.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Secure checkout", robots: { index: false, follow: false } };

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = findProduct((await params).slug);
  if (!product) notFound();
  return <div className={styles.checkoutPage}>
    <Link className={styles.backLink} href={`/shop/${product.slug}`}>← Back to {product.name}</Link>
    <h1>Make something beautiful</h1>
    <div className={styles.checkoutGrid}>
      <section className={styles.checkoutSummary} aria-label="Your pattern">
        <Image src={product.layoutImage} alt={`${product.name} quilt layout`} width={product.layoutWidth} height={product.layoutHeight} sizes="(max-width: 760px) 100vw, 400px" />
        <h2>{product.name}</h2>
        <p>{formatPrice(product.priceCents)} USD · One-time purchase</p>
        <ul>{product.files.map(file => <li key={file.id}>{file.label}</li>)}</ul>
        <p className={styles.small}>Digital files only. Your private download link will appear after payment and arrive by email. Electric Quilt 8 is required only for the editable project.</p>
        <p className={styles.small}>Need help? <a href="mailto:scott@monosyth.com">scott@monosyth.com</a></p>
      </section>
      <section className={styles.checkoutPayment} aria-label="Secure payment">
        {formCheckoutEnabled() ? <CheckoutForm slug={product.slug} /> : <p role="status" className={styles.notice}>Our direct shop is opening soon. Please check back for purchases.</p>}
      </section>
    </div>
  </div>;
}
