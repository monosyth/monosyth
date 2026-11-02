import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import styles from "./page.module.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://monosyth.com";

const pageTitle = "Monosyth Labs | Curiosity, made tangible";
const pageDescription =
  "Monosyth Labs is an independent product studio turning questions worth exploring into apps, websites, quilt patterns, and type.";

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
        url: "/brand/monosyth-social-card-v2.png",
        width: 1200,
        height: 630,
        alt: "Monosyth Labs — Curiosity, made tangible",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: ["/brand/monosyth-social-card-v2.png"],
  },
};

type Product = {
  name: string;
  category: string;
  status: "Live" | "Beta" | "Early access";
  description: string;
  href: string;
  domain: string;
  image: string;
  imageAlt: string;
  cta: string;
};

const featuredProduct: Product & { details: string[] } = {
  name: "FunParty",
  category: "Party photo wall",
  status: "Live",
  description:
    "Guests scan one QR code and their photos join a live party wall and TV slideshow. The host decides what appears, and nobody needs an app or an account.",
  details: ["One QR code", "Live photo wall", "TV slideshow"],
  href: "https://funpartyapp.com",
  domain: "funpartyapp.com",
  image: "/brand/products/funparty.jpg",
  imageAlt: "The FunParty homepage showing a live party photo screen",
  cta: "Visit FunParty",
};

const products: Product[] = [
  {
    name: "MenuToEat",
    category: "Restaurant discovery",
    status: "Live",
    description:
      "Complete restaurant menus with prices, photos, and ratings. Browse by dish, cuisine, or neighborhood.",
    href: "https://menutoeat.com/",
    domain: "menutoeat.com",
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
    domain: "monosyth.com/shop",
    image: "/brand/products/patterns.jpg",
    imageAlt: "Seaside Trellis quilt with sailboat and seashell blocks",
    cta: "Shop quilt patterns",
  },
  {
    name: "Monosyth Type",
    category: "Fonts",
    status: "Live",
    description:
      "Everyday Carved, a warm and weighty display serif with a little carved character. Commercial licenses from $8.",
    href: "/shop/type",
    domain: "monosyth.com/shop/type",
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
    domain: "fogsaltpine.com",
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
    domain: "foraquieterlife.com",
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
    domain: "krowshea.com",
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
    domain: "monosyth.com/move",
    image: "/brand/products/movemorrow.jpg",
    imageAlt: "The MoveMorrow planner homepage",
    cta: "Plan a move",
  },
];

const allProducts = [featuredProduct, ...products, ...workbench];

const processSteps = [
  ["Observe", "Start with a question from everyday life."],
  ["Connect", "Pull from design, code, craft, and data."],
  ["Make", "Ship something real people can use."],
  ["Learn", "Watch how it is used and keep refining."],
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

type SpecimenProps = {
  className: string;
  src: string;
};

function Specimen({ className, src }: SpecimenProps) {
  return (
    <span className={`${styles.specimenObject} ${className}`}>
      <span className={styles.specimenCounter}>
        <span className={styles.specimenAura} />
        <span className={styles.specimenDrift}>
          <Image
            className={styles.specimenImage}
            src={src}
            alt=""
            width={384}
            height={384}
            loading="eager"
            unoptimized
          />
        </span>
      </span>
    </span>
  );
}

function CuriosityEngine() {
  return (
    <div className={styles.engine} aria-hidden="true">
      <div className={styles.engineTopbar}>
        <span>Curiosity engine</span>
        <span>MSL / 001</span>
      </div>

      <div className={styles.engineCanvas}>
        <span className={styles.axisHorizontal} />
        <span className={styles.axisVertical} />

        <span className={styles.orbitAnchor}>
          <span className={styles.orbitTrace} />
          <span className={styles.orbitProbe} />
          <span className={styles.orbitField}>
            <Specimen
              className={styles.starObject}
              src="/brand/specimens/folded-star-clean.png"
            />
            <Specimen
              className={styles.sphereObject}
              src="/brand/specimens/lattice-sphere-clean.png"
            />
            <Specimen
              className={styles.clusterObject}
              src="/brand/specimens/orange-cluster-clean.png"
            />
            <Specimen
              className={styles.sheetObject}
              src="/brand/specimens/violet-sheet-clean.png"
            />
            <Specimen
              className={styles.cubeObject}
              src="/brand/specimens/cyan-cube-clean.png"
            />
          </span>
        </span>

        <span className={styles.synthesis}>
          <span className={styles.synthesisRing} />
          <span className={styles.synthesisCore} />
          <span className={styles.synthesisLabel}>New idea</span>
        </span>

        <span className={styles.coordinateTop}>Y 47.61</span>
        <span className={styles.coordinateBottom}>X 122.09</span>
      </div>

      <div className={styles.engineReadout}>
        <span>Input / unknown</span>
        <span className={styles.readoutStatus}>
          <span />
          Exploring
        </span>
      </div>
    </div>
  );
}

function BrowserFrame({
  domain,
  image,
  imageAlt,
  sizes,
}: Pick<Product, "domain" | "image" | "imageAlt"> & { sizes: string }) {
  return (
    <figure className={styles.frame}>
      <figcaption className={styles.frameBar}>
        <span className={styles.frameDots} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span className={styles.frameUrl}>{domain}</span>
      </figcaption>
      <Image
        className={styles.frameImage}
        src={image}
        alt={imageAlt}
        width={1200}
        height={750}
        sizes={sizes}
      />
    </figure>
  );
}

function StatusTag({ status, category }: Pick<Product, "status" | "category">) {
  return (
    <p className={styles.productMeta}>
      <span
        className={
          status === "Live" ? styles.statusLive : styles.statusEarly
        }
      >
        {status}
      </span>
      <span>{category}</span>
    </p>
  );
}

function ProductLink({
  href,
  className,
  label,
  children,
}: {
  href: string;
  className: string;
  label: string;
  children: React.ReactNode;
}) {
  if (isExternal(href)) {
    return (
      <a
        className={className}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${label} (opens in a new tab)`}
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

function ProductCard({ product }: { product: Product }) {
  return (
    <li>
      <ProductLink
        className={styles.productCard}
        href={product.href}
        label={`${product.name}: ${product.cta}`}
      >
        <BrowserFrame
          domain={product.domain}
          image={product.image}
          imageAlt={product.imageAlt}
          sizes="(max-width: 40rem) 100vw, (max-width: 68rem) 50vw, 26rem"
        />
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
    <main className={styles.page}>
      <a className={styles.skipLink} href="#main-content">
        Skip to main content
      </a>

      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Monosyth Labs home">
          <BrandMark />
          <span className={styles.wordmark}>monosyth</span>
          <span className={styles.labs}>Labs</span>
        </Link>

        <nav className={styles.nav} aria-label="Primary">
          <a href="#products">Products</a>
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
            <p className={styles.eyebrow}>
              <span className={styles.eyebrowSignal} />
              Independent product studio
            </p>

            <h1 id="hero-title">
              Curiosity,
              <span>made tangible</span>
            </h1>

            <p className={styles.heroIntro}>
              Monosyth Labs turns questions worth exploring into things people
              actually use: apps, websites, quilt patterns, and type.
            </p>

            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href="#products">
                <span>See what we make</span>
                <span aria-hidden="true">↓</span>
              </a>
              <Link className={styles.secondaryButton} href="/shop">
                <span>Shop patterns</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            <dl className={styles.heroStats}>
              <div>
                <dt>Live products</dt>
                <dd>{products.length + 1}</dd>
              </div>
              <div>
                <dt>On the workbench</dt>
                <dd>{workbench.length}</dd>
              </div>
              <div>
                <dt>Approach</dt>
                <dd className={styles.heroBelief}>
                  Serious curiosity / Playful results
                </dd>
              </div>
            </dl>
          </div>

          <div className={styles.heroVisual}>
            <CuriosityEngine />
          </div>
        </section>

        <section
          id="products"
          className={styles.productSection}
          aria-labelledby="product-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionEyebrow}>From the lab</p>
              <h2 id="product-title">Out in the world</h2>
            </div>
            <p>
              Every product here started as a question. These are the ones that
              grew into something you can use today.
            </p>
          </div>

          <article className={styles.featured}>
            <div className={styles.featuredCopy}>
              <StatusTag
                status={featuredProduct.status}
                category={featuredProduct.category}
              />
              <Image
                className={styles.funPartyLogo}
                src="/brand/funparty-logo.svg"
                alt="FunParty"
                width={434}
                height={132}
                unoptimized
              />
              <p className={styles.featuredDescription}>
                {featuredProduct.description}
              </p>
              <ul className={styles.featuredDetails}>
                {featuredProduct.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
              <ProductLink
                className={styles.primaryButton}
                href={featuredProduct.href}
                label={featuredProduct.cta}
              >
                <span>{featuredProduct.cta}</span>
                <span aria-hidden="true">↗</span>
              </ProductLink>
            </div>

            <div className={styles.featuredVisual}>
              <BrowserFrame
                domain={featuredProduct.domain}
                image={featuredProduct.image}
                imageAlt={featuredProduct.imageAlt}
                sizes="(max-width: 56rem) 100vw, 42rem"
              />
            </div>
          </article>

          <ul className={styles.productGrid}>
            {products.map((product) => (
              <ProductCard key={product.name} product={product} />
            ))}
          </ul>

          <div className={styles.workbenchHeading}>
            <h3 id="workbench-title">On the workbench</h3>
            <p>In beta and early access. Try them now and help shape what comes next.</p>
          </div>

          <ul className={styles.workbenchGrid} aria-labelledby="workbench-title">
            {workbench.map((product) => (
              <ProductCard key={product.name} product={product} />
            ))}
          </ul>
        </section>

        <section className={styles.approach} aria-labelledby="approach-title">
          <div className={styles.approachHeading}>
            <p className={styles.sectionEyebrow}>How the lab works</p>
            <h2 id="approach-title">Questions become things here</h2>
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
          <Link className={styles.brand} href="/" aria-label="Monosyth Labs home">
            <BrandMark />
            <span className={styles.wordmark}>monosyth</span>
            <span className={styles.labs}>Labs</span>
          </Link>
          <p>
            An independent product studio making useful, playful things.
          </p>
        </div>

        <nav className={styles.footerLinks} aria-label="Products">
          <p>Products</p>
          {allProducts.map((product) =>
            isExternal(product.href) ? (
              <a
                key={product.name}
                href={product.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {product.name}
              </a>
            ) : (
              <Link key={product.name} href={product.href}>
                {product.name}
              </Link>
            ),
          )}
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
