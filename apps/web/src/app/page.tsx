import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import styles from "./page.module.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://monosyth.com";

export const metadata: Metadata = {
  title: "Monosyth Labs | Curiosity, made tangible.",
  description:
    "Monosyth Labs is an independent creative lab building useful, playful things from questions worth exploring.",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "Monosyth Labs | Curiosity, made tangible.",
    description:
      "An independent creative lab building useful, playful things from questions worth exploring.",
    url: siteUrl,
    siteName: "Monosyth Labs",
    type: "website",
    images: [
      {
        url: "/brand/monosyth-social-card.png",
        width: 1200,
        height: 630,
        alt: "Monosyth Labs — Curiosity, made tangible.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Monosyth Labs | Curiosity, made tangible.",
    description:
      "An independent creative lab building useful, playful things from questions worth exploring.",
    images: ["/brand/monosyth-social-card.png"],
  },
};

const processSteps = ["Observe", "Connect", "Make", "Learn"] as const;

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

        <span className={`${styles.trace} ${styles.traceStar}`} />
        <span className={`${styles.trace} ${styles.traceSphere}`} />
        <span className={`${styles.trace} ${styles.traceCluster}`} />
        <span className={`${styles.trace} ${styles.traceSheet}`} />
        <span className={`${styles.trace} ${styles.traceCube}`} />

        <span className={`${styles.specimenObject} ${styles.starObject}`}>
          <Image
            src="/brand/specimens/folded-star.png"
            alt=""
            width={150}
            height={150}
            loading="eager"
            unoptimized
          />
        </span>
        <span className={`${styles.specimenObject} ${styles.sphereObject}`}>
          <Image
            src="/brand/specimens/lattice-sphere.png"
            alt=""
            width={150}
            height={150}
            loading="eager"
            unoptimized
          />
        </span>
        <span className={`${styles.specimenObject} ${styles.clusterObject}`}>
          <Image
            src="/brand/specimens/orange-cluster.png"
            alt=""
            width={150}
            height={150}
            loading="eager"
            unoptimized
          />
        </span>
        <span className={`${styles.specimenObject} ${styles.sheetObject}`}>
          <Image
            src="/brand/specimens/violet-sheet.png"
            alt=""
            width={150}
            height={150}
            loading="eager"
            unoptimized
          />
        </span>
        <span className={`${styles.specimenObject} ${styles.cubeObject}`}>
          <Image
            src="/brand/specimens/cyan-cube.png"
            alt=""
            width={150}
            height={150}
            loading="eager"
            unoptimized
          />
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

        <p className={styles.headerLabel}>Independent creative lab</p>
      </header>

      <div id="main-content">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span className={styles.eyebrowSignal} />
              Inquiry / making
            </p>

            <h1 id="hero-title">
              Curiosity,
              <span>made tangible.</span>
            </h1>

            <p className={styles.heroIntro}>
              Monosyth Labs builds useful, playful things from questions worth
              exploring.
            </p>

            <ol className={styles.process} aria-label="Our creative process">
              {processSteps.map((step, index) => (
                <li key={step}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {step}
                </li>
              ))}
            </ol>

            <p className={styles.heroBelief}>
              <span>Serious curiosity.</span>
              <span>Playful results.</span>
            </p>
          </div>

          <div className={styles.heroVisual}>
            <CuriosityEngine />
          </div>
        </section>

        <section className={styles.productSection} aria-labelledby="product-title">
          <div className={styles.sectionHeading}>
            <p className={styles.sectionEyebrow}>In the lab / Product 01</p>
            <h2 id="product-title">One bright experiment, out in the world.</h2>
          </div>

          <article className={styles.productCard}>
            <div className={styles.productIdentity}>
              <p>A product of Monosyth Labs</p>
              <div className={styles.logoStage}>
                <Image
                  className={styles.funPartyLogo}
                  src="/brand/funparty-logo.svg"
                  alt="FunParty"
                  width={434}
                  height={132}
                  unoptimized
                />
                <span className={styles.logoGrid} aria-hidden="true" />
              </div>
            </div>

            <div className={styles.productCopy}>
              <p>
                FunParty turns guest photos into a host-controlled live wall
                and TV slideshow through one QR code—no guest app or account
                required.
              </p>

              <p className={styles.productDetail}>
                One QR code&nbsp;&nbsp;/&nbsp;&nbsp;Live photo wall&nbsp;&nbsp;/&nbsp;&nbsp;TV slideshow
              </p>

              <a
                className={styles.productLink}
                href="https://funpartyapp.com"
                aria-label="Visit FunParty"
              >
                <span>Visit FunParty</span>
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </article>
        </section>
      </div>

      <footer className={styles.footer}>
        <p>© 2026 Monosyth Labs, LLC</p>
        <p>Questions become things here.</p>
        <Link href="/app">Studio access</Link>
      </footer>
    </main>
  );
}
