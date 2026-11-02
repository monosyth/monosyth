import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import Image from "next/image";
import Link from "next/link";

import styles from "./page.module.css";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["600"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://monosyth.com";

const pageTitle = "Monosyth Labs | Curious things, carefully made";
const pageDescription =
  "Monosyth Labs is an independent studio by Scott Waite making apps, websites, quilt patterns, and type.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: siteUrl,
    siteName: "Monosyth Labs",
    type: "website",
    images: [
      {
        url: "/brand/monosyth-social-card-v3.png",
        width: 1200,
        height: 630,
        alt: "Monosyth Labs: Curious things, carefully made",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: ["/brand/monosyth-social-card-v3.png"],
  },
};

type Product = {
  name: string;
  category: string;
  status: "Live" | "Beta" | "Early access";
  description: string;
  href: string;
  image: string;
  imageAlt: string;
  cta: string;
};

const products: Product[] = [
  {
    name: "FunParty",
    category: "Party photo wall",
    status: "Live",
    description:
      "Guests scan one QR code and their photos join a live party wall and TV slideshow. No guest app or account needed.",
    href: "https://funpartyapp.com",
    image: "/brand/products/funparty.jpg",
    imageAlt: "The FunParty homepage showing a live party photo screen",
    cta: "Visit FunParty",
  },
  {
    name: "MenuToEat",
    category: "Restaurant discovery",
    status: "Live",
    description:
      "Complete restaurant menus with prices, photos, and ratings. Browse by dish, cuisine, or neighborhood.",
    href: "https://menutoeat.com/",
    image: "/brand/products/menutoeat.jpg",
    imageAlt: "The MenuToEat homepage with a restaurant menu search",
    cta: "Visit MenuToEat",
  },
  {
    name: "Monosyth Patterns",
    category: "Quilt patterns",
    status: "Live",
    description:
      "Original quilts with a playful spirit. The Trellis collection includes illustrated PDF instructions and editable EQ8 projects.",
    href: "/shop",
    image: "/brand/products/patterns-orchard.jpg",
    imageAlt: "Orchard Trellis quilt with apple blocks",
    cta: "Shop quilt patterns",
  },
  {
    name: "Monosyth Type",
    category: "Fonts",
    status: "Live",
    description:
      "Everyday Carved, a warm and weighty display serif with a little carved character. Commercial licenses from $8.",
    href: "/shop/type",
    image: "/brand/products/type.jpg",
    imageAlt: "Everyday Carved type specimen",
    cta: "Try Everyday Carved",
  },
  {
    name: "Fog, Salt & Pine",
    category: "Home goods",
    status: "Live",
    description:
      "Thoughtfully crafted home goods inspired by the forests and coastlines of the Pacific Northwest.",
    href: "https://fogsaltpine.com/",
    image: "/brand/products/fogsaltpine.jpg",
    imageAlt: "Fog, Salt & Pine badge over a misty Pacific Northwest coastline",
    cta: "Visit Fog, Salt & Pine",
  },
  {
    name: "For a Quieter Life",
    category: "Slow living journal",
    status: "Live",
    description:
      "Quiet hobbies, small outings, and everyday rituals for a slower, more intentional life.",
    href: "https://foraquieterlife.com/",
    image: "/brand/products/foraquieterlife.jpg",
    imageAlt: "For a Quieter Life homepage with a mossy forest banner",
    cta: "Visit For a Quieter Life",
  },
];

const workbench: Product[] = [
  {
    name: "Krowshea",
    category: "Crochet programming language",
    status: "Beta",
    description:
      "Write crochet patterns as code, check every stitch count, and get charts, written instructions, and yarn estimates from one pattern. No AI inside.",
    href: "https://krowshea.com/",
    image: "/brand/products/krowshea.jpg",
    imageAlt: "The Krowshea homepage with its crow and teal yarn logo",
    cta: "Join the Krowshea beta",
  },
  {
    name: "MoveMorrow",
    category: "Moving planner",
    status: "Early access",
    description:
      "A tailored checklist, timeline, and budget for your next move. Preview your plan, then sign in to save it.",
    href: "/move",
    image: "/brand/products/movemorrow.jpg",
    imageAlt: "The MoveMorrow planner homepage",
    cta: "Plan a move",
  },
];

const allProducts = [...products, ...workbench];

const collage = [
  {
    name: "Monosyth Patterns",
    src: "/brand/collage/quilt.jpg",
    alt: "Seaside Trellis quilt draped over a chair",
    width: 1200,
    height: 896,
    className: "collageQuilt",
  },
  {
    name: "Monosyth Type",
    src: "/brand/collage/type.jpg",
    alt: "Everyday Carved on a notebook, a poster, and a label",
    width: 1400,
    height: 1050,
    className: "collageType",
  },
  {
    name: "Krowshea",
    src: "/brand/collage/krowshea.png",
    alt: "The Krowshea crow holding teal yarn",
    width: 900,
    height: 655,
    className: "collageCrow",
  },
  {
    name: "FunParty",
    src: "/brand/collage/funparty.jpg",
    alt: "FunParty live photo wall on a TV at a birthday party",
    width: 1400,
    height: 804,
    className: "collageParty",
  },
  {
    name: "Fog, Salt & Pine",
    src: "/brand/collage/fogsaltpine.jpg",
    alt: "Fog, Salt & Pine badge over a misty coastline",
    width: 1200,
    height: 750,
    className: "collageCoast",
  },
] as const;

const processSteps = [
  ["Notice", "Start with a question from everyday life."],
  ["Explore", "Pull from design, code, craft, and data."],
  ["Make", "Ship something real people can use."],
  ["Refine", "Watch how it is used and keep improving it."],
] as const;

function isExternal(href: string) {
  return href.startsWith("http");
}

function BrandMark() {
  return (
    <span className={styles.brandMark} aria-hidden="true">
      <span className={styles.markNodeOne} />
      <span className={styles.markNodeTwo} />
      <span className={styles.markNodeThree} />
      <span className={styles.markCore} />
    </span>
  );
}

function Brand() {
  return (
    <Link className={styles.brand} href="/" aria-label="Monosyth Labs home">
      <BrandMark />
      <span className={styles.wordmark}>monosyth</span>
      <span className={styles.labs}>labs</span>
    </Link>
  );
}

function ProductLink({
  href,
  className,
  label,
  children,
}: {
  href: string;
  className?: string;
  label?: string;
  children: React.ReactNode;
}) {
  if (isExternal(href)) {
    return (
      <a
        className={className}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label ? `${label} (opens in a new tab)` : undefined}
      >
        {children}
      </a>
    );
  }

  return (
    <Link className={className} href={href} aria-label={label}>
      {children}
    </Link>
  );
}

function StatusTag({ status, category }: Pick<Product, "status" | "category">) {
  return (
    <p className={styles.productMeta}>
      <span className={status === "Live" ? styles.statusLive : styles.statusSoon}>
        {status}
      </span>
      <span>{category}</span>
    </p>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <li>
      <ProductLink
        className={styles.productCard}
        href={product.href}
        label={`${product.name}: ${product.cta}`}
      >
        <span className={styles.productImage}>
          <Image
            src={product.image}
            alt={product.imageAlt}
            width={1200}
            height={750}
            sizes="(max-width: 40rem) 100vw, (max-width: 68rem) 50vw, 26rem"
          />
        </span>
        <div className={styles.productBody}>
          <StatusTag status={product.status} category={product.category} />
          <h3>{product.name}</h3>
          <p className={styles.productDescription}>{product.description}</p>
          <span className={styles.textLink}>
            {product.cta}
            <span aria-hidden="true">
              {isExternal(product.href) ? "↗" : "→"}
            </span>
          </span>
        </div>
      </ProductLink>
    </li>
  );
}

export default function Home() {
  return (
    <main className={`${styles.page} ${interTight.variable} ${inter.variable}`}>
      <a className={styles.skipLink} href="#main-content">
        Skip to main content
      </a>

      <header className={styles.header}>
        <Brand />

        <nav className={styles.nav} aria-label="Primary">
          <a href="#work">Work</a>
          <Link href="/shop">Patterns</Link>
          <Link href="/shop/type">Type</Link>
          <a className={styles.navContact} href="mailto:support@monosyth.com">
            Contact
          </a>
        </nav>
      </header>

      <div id="main-content">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>An independent studio by Scott Waite</p>

            <h1 id="hero-title">
              Curious things,
              <span>carefully made</span>
            </h1>

            <p className={styles.heroIntro}>
              Apps, websites, quilt patterns, and type, each one started as a
              question worth chasing.
            </p>

            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href="#work">
                See the work
              </a>
              <Link className={styles.secondaryButton} href="/shop">
                Shop patterns
              </Link>
            </div>
          </div>

          <div className={styles.collage}>
            {collage.map((item, index) => (
              <figure
                key={item.name}
                className={`${styles.collageTile} ${styles[item.className]}`}
              >
                <Image
                  src={item.src}
                  alt={item.alt}
                  width={item.width}
                  height={item.height}
                  sizes="(max-width: 56rem) 50vw, 24rem"
                  preload={index < 2}
                />
                <figcaption>{item.name}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <nav className={styles.productIndex} aria-label="All products">
          {allProducts.map((product) => (
            <ProductLink
              key={product.name}
              href={product.href}
              className={product.status === "Live" ? styles.indexLive : styles.indexSoon}
            >
              {product.name}
              {product.status !== "Live" && <em>{product.status.toLowerCase()}</em>}
            </ProductLink>
          ))}
        </nav>

        <section id="work" className={styles.productSection} aria-labelledby="work-title">
          <div className={styles.sectionHeading}>
            <h2 id="work-title">Out in the world</h2>
            <p>
              Every product here started as a question. These are the ones that
              grew into something you can use today.
            </p>
          </div>

          <ul className={styles.productGrid}>
            {products.map((product) => (
              <ProductCard key={product.name} product={product} />
            ))}
          </ul>

          <div className={styles.sectionHeading}>
            <h2 id="workbench-title">On the workbench</h2>
            <p>In beta and early access. Try them now and help shape what comes next.</p>
          </div>

          <ul className={styles.workbenchGrid} aria-labelledby="workbench-title">
            {workbench.map((product) => (
              <ProductCard key={product.name} product={product} />
            ))}
          </ul>
        </section>

        <section className={styles.approach} aria-labelledby="approach-title">
          <div>
            <h2 id="approach-title">How the studio works</h2>
            <p>
              Monosyth Labs is one person following good questions wherever they
              lead, from crochet and quilting to party apps and restaurant menus.
            </p>
          </div>

          <ol className={styles.process}>
            {processSteps.map(([step, detail], index) => (
              <li key={step}>
                <span className={styles.processNumber}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <strong>{step}</strong>
                <span>{detail}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <Brand />
          <p>Curious things, carefully made by an independent studio.</p>
        </div>

        <nav className={styles.footerLinks} aria-label="Products">
          <p>Products</p>
          {allProducts.map((product) => (
            <ProductLink key={product.name} href={product.href}>
              {product.name}
            </ProductLink>
          ))}
        </nav>

        <nav className={styles.footerLinks} aria-label="Studio">
          <p>Studio</p>
          <Link href="/processvision">Process Vision essay</Link>
          <a href="mailto:support@monosyth.com">support@monosyth.com</a>
          <Link href="/app">Studio access</Link>
        </nav>

        <p className={styles.copyright}>© 2026 Monosyth Labs, LLC</p>
      </footer>
    </main>
  );
}
