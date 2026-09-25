import Image from "next/image";
import Link from "next/link";
import { shopProducts, formatPrice } from "@/lib/shop/catalog";
import { checkoutEnabled } from "@/lib/shop/config";
import styles from "./shop.module.css";
import { QuickAdd } from "@/components/shop/cart-provider";

export const dynamic = "force-dynamic";

export default function ShopPage() {
  const available = checkoutEnabled();
  const featured = shopProducts[0];
  return <>
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}><span />From our sewing studio to yours</p>
        <h1>A little fabric<br />A lot of <em>possibility</em></h1>
        <p className={styles.intro}>Quilt patterns with a playful spirit. Find your favorite, choose your colors, and make something that feels like you.</p>
        <Link className={styles.primaryButton} href="#patterns">Find your next quilt <span aria-hidden="true">↓</span></Link>
        <p className={styles.heroMeta}>Illustrated PDF patterns <span>✳</span> EQ8 projects included</p>
      </div>
      <Link href={`/shop/${featured.slug}`} className={styles.heroVisual} aria-label={`Explore ${featured.name}`}>
        <div className={styles.heroImage}><Image src={featured.image} alt={featured.imageAlt} fill sizes="(max-width: 760px) 100vw, 55vw" priority /></div>
        <span className={styles.imageCaption}>{featured.imageNote}</span>
        <div className={styles.featuredLabel}><div><span>Meet your next autumn project</span><strong>{featured.name}</strong></div><span aria-hidden="true">↗</span></div>
      </Link>
    </section>

    <div className={styles.ribbon}><span>Designed by Monosyth</span><span>Made with your favorite fabrics</span><span>Ready for your own color story</span></div>

    <section className={styles.collection} id="patterns" aria-labelledby="collection-title">
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>The Trellis collection</p><h2 id="collection-title">Which one feels like you?</h2></div><p>{shopProducts.length} patterns · {formatPrice(featured.priceCents)} each<br />PDF + editable EQ8 project</p></div>
      {!available && <p className={styles.notice}><span className={styles.noticeDot} />Our direct shop is opening soon. Take a look around and find your next project.</p>}
      <div className={styles.productGrid}>
        {shopProducts.map((product, index) => <article key={product.slug} className={styles.productCard}>
          <Link href={`/shop/${product.slug}`} className={styles.productImage} aria-label={`View ${product.name}`}>
            <Image src={product.image} alt={product.imageAlt} fill sizes="(max-width: 540px) 100vw, (max-width: 1000px) 50vw, 33vw" />
            <span className={styles.productNumber}>{String(index + 1).padStart(2, "0")}</span>
            <span className={styles.imageCaption}>{product.imageNote}</span>
          </Link>
          <div className={styles.productMeta}><span>{product.theme}</span><span>{formatPrice(product.priceCents)}</span></div>
          <h3><Link href={`/shop/${product.slug}`}>{product.name}<span aria-hidden="true">↗</span></Link></h3>
          <p>{product.size} finished · PDF + EQ8</p>
          <QuickAdd slug={product.slug} name={product.name} available={available} />
        </article>)}
      </div>
    </section>

    <section className={styles.howItWorks} id="how-it-works" aria-labelledby="how-title">
      <div><p className={styles.eyebrow}>From download to done</p><h2 id="how-title">Your next project,<br />one lovely step at a time</h2></div>
      <ol>
        <li><span>01</span><div><h3>Find your pattern</h3><p>Choose a design you love. Every pattern includes illustrated PDF instructions and an editable EQ8 companion.</p></div></li>
        <li><span>02</span><div><h3>Download and keep</h3><p>After payment, open your private download page. We’ll also email the link so you can come back later.</p></div></li>
        <li><span>03</span><div><h3>Make it yours</h3><p>Gather your fabrics and follow the booklet. If you use Electric Quilt 8, explore your own colors in the included project.</p></div></li>
      </ol>
    </section>

    <section className={styles.faq} aria-labelledby="questions-title"><div><p className={styles.eyebrow}>Before you begin</p><h2 id="questions-title">A few helpful details</h2></div><div>
      <details><summary>Am I buying a finished quilt?</summary><p>These are digital patterns to make your own quilt. No finished quilt, fabric, or printed booklet is shipped.</p></details>
      <details><summary>Do I need Electric Quilt 8?</summary><p>You can follow the PDF with a regular PDF reader. Electric Quilt 8 is only needed to open and edit the optional native project included in the EQ8 ZIP.</p></details>
      <details><summary>What size are these quilts?</summary><p>Each Trellis quilt in this collection finishes at 52 × 64 inches. Check the individual booklet for fabric requirements and construction instructions.</p></details>
      <details><summary>How do I get my downloads?</summary><p>After a successful payment, you’ll receive a private download page and an emailed link. Download the PDF and EQ8 ZIP separately, along with any printable labels included with your pattern. No shop account is required.</p></details>
    </div></section>
  </>;
}
