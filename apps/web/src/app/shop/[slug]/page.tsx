import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findProduct, formatPrice, shopProducts } from "@/lib/shop/catalog";
import { checkoutEnabled } from "@/lib/shop/config";
import { BuyButton } from "@/components/shop/buy-button";
import styles from "../shop.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = findProduct((await params).slug);
  if (!product) return { title: "Pattern not found" };
  return { title: product.name, description: product.description, alternates: { canonical: `/shop/${product.slug}` }, openGraph: { title: product.name, description: product.description, images: [{ url: product.image, alt: product.imageAlt }] } };
}

export default async function ProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ checkout?: string }> }) {
  const product = findProduct((await params).slug);
  if (!product) notFound();
  const cancelled = (await searchParams).checkout === "cancelled";
  return <div className={styles.detailPage}>
    <Link href="/shop#patterns" className={styles.backLink}>← All quilt patterns</Link>
    {cancelled && <p role="status" className={styles.notice}>Checkout was cancelled. Your pattern is here whenever you’re ready.</p>}
    <section className={styles.productDetail}>
      <div className={styles.detailGallery}>
        <figure className={styles.detailImage}><Image src={product.image} alt={product.imageAlt} width={product.imageWidth} height={product.imageHeight} sizes="(max-width: 760px) 100vw, 55vw" priority /><figcaption>{product.imageNote} · Fabric colors and finished results will vary</figcaption></figure>
        <figure className={styles.detailImage}><Image src={product.layoutImage} alt={`${product.name} full quilt layout and pattern overview`} width={product.layoutWidth} height={product.layoutHeight} sizes="(max-width: 760px) 100vw, 55vw" /><figcaption>Full quilt layout · {product.size} finished</figcaption></figure>
      </div>
      <div className={styles.detailCopy}>
        <p className={styles.eyebrow}>The Trellis collection / {product.theme}</p>
        <h1>{product.name}</h1><p className={styles.tagline}>{product.tagline}</p><p>{product.description}</p>
        <div className={styles.specs}><div><span>Finished size</span><strong>{product.size}</strong></div><div><span>Format</span><strong>PDF + EQ8</strong></div><div><span>Edition</span><strong>{product.version}</strong></div></div>
        <p className={styles.price}>{formatPrice(product.priceCents)} <span>USD · Digital download</span></p>
        <BuyButton slug={product.slug} price={formatPrice(product.priceCents)} available={checkoutEnabled()} />
        <div className={styles.included}><h2>Inside your download</h2><ul>{product.files.map((file) => <li key={file.id}><span aria-hidden="true">✓</span>{file.label}</li>)}</ul><p>The PDF works with a regular PDF reader. Electric Quilt 8 is required to use the editable EQ8 project.</p></div>
        <p className={styles.small}>This is a digital quilt pattern. Fabric, a finished quilt, and a printed booklet are not included.</p>
      </div>
    </section>
    <section className={styles.related}><p className={styles.eyebrow}>More from the collection</p><div>{shopProducts.filter((p) => p.slug !== product.slug).slice(0, 3).map((p) => <Link href={`/shop/${p.slug}`} key={p.slug}><Image src={p.image} alt={p.imageAlt} width={500} height={375} /><span>{p.name} ↗</span></Link>)}</div></section>
  </div>;
}
