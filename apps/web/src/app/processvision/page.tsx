import type { Metadata } from "next";
import Link from "next/link";

import styles from "./page.module.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://monosyth.com";

export const metadata: Metadata = {
  title: "Process Vision | Monosyth",
  description:
    "Why some people see systems instead of objects—and instinctively rewind the hidden processes behind everyday things.",
  alternates: {
    canonical: `${siteUrl}/processvision`,
  },
  openGraph: {
    title: "Process Vision",
    description: "Why some people see systems instead of objects.",
    url: `${siteUrl}/processvision`,
    siteName: "Monosyth",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Process Vision",
    description: "Why some people see systems instead of objects.",
  },
};

const rewindFrames = [
  {
    number: "01",
    label: "Object",
    title: "A bagel",
    detail: "The final frame",
    icon: "bagel",
  },
  {
    number: "02",
    label: "Variation",
    title: "Why smaller?",
    detail: "A visible clue",
    icon: "measure",
  },
  {
    number: "03",
    label: "Process",
    title: "Divide · proof · bake",
    detail: "The hidden sequence",
    icon: "sequence",
  },
  {
    number: "04",
    label: "System",
    title: "People · tools · tradeoffs",
    detail: "The world behind it",
    icon: "system",
  },
] as const;

const everydayRewinds = [
  {
    number: "01",
    object: "The bagel",
    prompt: "One is smaller.",
    questions: [
      "Was the divider off?",
      "Did it proof differently?",
      "What changed in the bake?",
    ],
    className: styles.bagelCard,
  },
  {
    number: "02",
    object: "The rice",
    prompt: "That bag is enormous.",
    questions: [
      "Who bought it by the pallet?",
      "How far did it travel?",
      "Where did the price disappear?",
    ],
    className: styles.riceCard,
  },
  {
    number: "03",
    object: "The seam",
    prompt: "It’s sewn inside out.",
    questions: [
      "Why must this seam happen first?",
      "What constraint sets the order?",
      "How does flat become dimensional?",
    ],
    className: styles.seamCard,
  },
] as const;

const curiosityLoop = [
  ["01", "Find", "a system with a mystery"],
  ["02", "Learn", "the logic underneath"],
  ["03", "Build", "one working thing"],
  ["04", "Prove", "the model is real"],
  ["05", "Move", "toward the next unknown"],
] as const;

function FrameIcon({ icon }: { icon: (typeof rewindFrames)[number]["icon"] }) {
  return (
    <span className={`${styles.frameIcon} ${styles[icon]}`} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export default function ProcessVisionPage() {
  return (
    <main className={styles.page}>
      <a className={styles.skipLink} href="#main-content">
        Skip to the idea
      </a>

      <header className={styles.siteHeader}>
        <Link className={styles.brand} href="/" aria-label="Monosyth home">
          monosyth
        </Link>

        <nav className={styles.nav} aria-label="Process Vision">
          <a href="#the-idea">The idea</a>
          <a href="#the-rewind">The rewind</a>
          <a href="#the-book">The book</a>
        </nav>

        <a className={styles.headerAction} href="#the-rewind">
          <span>Start rewinding</span>
          <span aria-hidden="true">↙</span>
        </a>
      </header>

      <div id="main-content">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span>Field note 001</span>
              <span>On seeing differently</span>
            </p>

            <h1 id="hero-title">
              Every object is the{" "}
              <span className={styles.heroAccent}>final frame</span> of a movie.
            </h1>

            <div className={styles.heroIntro}>
              <p>Most people see the final frame.</p>
              <p>Some people instinctively rewind the movie.</p>
            </div>

            <a className={styles.primaryAction} href="#the-idea">
              <span>See what’s behind the frame</span>
              <span className={styles.actionMark} aria-hidden="true">
                ↓
              </span>
            </a>
          </div>

          <div className={styles.rewindMachine} aria-hidden="true">
            <div className={styles.machineTopline}>
              <span>Process viewer</span>
              <span>REW ◀◀</span>
            </div>

            <div className={styles.frameStack}>
              {rewindFrames.map((frame, index) => (
                <article
                  className={styles.frame}
                  key={frame.number}
                  style={{ "--frame-index": index } as React.CSSProperties}
                >
                  <div className={styles.frameMeta}>
                    <span>{frame.number}</span>
                    <span>{frame.label}</span>
                  </div>
                  <FrameIcon icon={frame.icon} />
                  <div className={styles.frameCopy}>
                    <strong>{frame.title}</strong>
                    <span>{frame.detail}</span>
                  </div>
                </article>
              ))}
            </div>

            <div className={styles.machineScale}>
              <span>Surface</span>
              <span className={styles.scaleLine} />
              <span>System</span>
            </div>
          </div>

          <p className={styles.heroIndex} aria-hidden="true">
            PV / 01—05
          </p>
        </section>

        <section
          className={styles.ideaSection}
          id="the-idea"
          aria-labelledby="idea-title"
        >
          <div className={styles.sectionMarker}>
            <span>01</span>
            <span>The premise</span>
          </div>

          <div className={styles.ideaLead}>
            <p className={styles.kicker}>The world doesn’t arrive finished.</p>
            <h2 id="idea-title">
              I don’t experience the world as a collection of objects.
            </h2>
          </div>

          <div className={styles.ideaResponse}>
            <p>
              I experience it as a collection of{" "}
              <em>interconnected processes.</em>
            </p>
          </div>

          <div
            className={styles.lensFlow}
            aria-label="Process Vision moves from object to process to decisions to constraints"
          >
            <p>A different default</p>
            <ol>
              <li>
                <span>01</span>
                <strong>Object</strong>
              </li>
              <li>
                <span>02</span>
                <strong>Process</strong>
              </li>
              <li>
                <span>03</span>
                <strong>Decisions</strong>
              </li>
              <li>
                <span>04</span>
                <strong>Constraints</strong>
              </li>
            </ol>
          </div>

          <div className={styles.invisibleList}>
            <p>You can see the thing.</p>
            <ul>
              <li>Invisible factories</li>
              <li>Invisible decisions</li>
              <li>Invisible constraints</li>
              <li>Invisible tradeoffs</li>
              <li>Invisible people</li>
            </ul>
            <p className={styles.listConclusion}>Process vision sees both.</p>
          </div>
        </section>

        <section
          className={styles.rewindSection}
          id="the-rewind"
          aria-labelledby="rewind-title"
        >
          <div className={styles.sectionHeading}>
            <div className={styles.sectionMarker}>
              <span>02</span>
              <span>Everyday rewinds</span>
            </div>
            <h2 id="rewind-title">
              The object is an answer.
              <br />
              <span>The fun is finding the question.</span>
            </h2>
          </div>

          <div className={styles.rewindGrid}>
            {everydayRewinds.map((item) => (
              <article
                className={`${styles.rewindCard} ${item.className}`}
                key={item.number}
              >
                <div className={styles.cardTopline}>
                  <span>{item.number}</span>
                  <span>{item.object}</span>
                </div>

                <p className={styles.surfaceObservation}>{item.prompt}</p>

                <div className={styles.cardDiagram} aria-hidden="true">
                  <span className={styles.objectShape} />
                  <span className={styles.traceLine} />
                  <span className={styles.systemShape} />
                </div>

                <ul>
                  {item.questions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
                {item.number === "03" ? (
                  <p className={styles.cardFootnote}>
                    A pattern is a compressed record of someone else’s
                    engineering decisions.
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className={styles.makerSection} aria-labelledby="maker-title">
          <div className={styles.sectionMarker}>
            <span>03</span>
            <span>The maker’s instinct</span>
          </div>

          <div className={styles.makerHeadline}>
            <p>Most people see what something is.</p>
            <h2 id="maker-title">Makers see how it became what it is.</h2>
          </div>

          <div className={styles.loopGrid}>
            {curiosityLoop.map(([number, verb, detail]) => (
              <article className={styles.loopStep} key={number}>
                <span className={styles.loopNumber}>{number}</span>
                <div>
                  <h3>{verb}</h3>
                  <p>{detail}</p>
                </div>
              </article>
            ))}
          </div>

          <div className={styles.loopCaption}>
            <span aria-hidden="true">↗</span>
            <p>
              The interests change.
              <br />
              The process never does.
            </p>
          </div>
        </section>

        <section className={styles.jimothySection} aria-labelledby="jimothy-title">
          <div className={styles.jimothyTag}>
            Case study <span>04</span>
          </div>

          <div className={styles.jimothyStory}>
            <p className={styles.quoteMark} aria-hidden="true">
              “
            </p>
            <blockquote id="jimothy-title">
              I’m not going to make another. My crochet projects are one and
              done.
            </blockquote>
            <p className={styles.attribution}>— On Jimothy, a crocheted raccoon</p>
          </div>

          <div className={styles.jimothyInsight}>
            <p>
              The goal was never to own two raccoons. The goal was to solve the
              raccoon.
            </p>
            <p>
              Once the system is understood, repetition becomes manufacturing.
              The mystery—the reason for making—has gone.
            </p>
          </div>

          <p className={styles.jimothyFootnote}>
            Creation is how understanding gets tested.
          </p>
        </section>

        <section
          className={styles.bookSection}
          id="the-book"
          aria-labelledby="book-title"
        >
          <div className={styles.bookCover} aria-hidden="true">
            <div className={styles.coverTopline}>
              <span>Monosyth Field Library</span>
              <span>001</span>
            </div>
            <p>Process</p>
            <p>Vision</p>
            <div className={styles.coverDiagram}>
              <span />
              <span />
              <span />
            </div>
            <small>Why some people see systems instead of objects</small>
          </div>

          <div className={styles.bookCopy}>
            <div className={styles.sectionMarker}>
              <span>05</span>
              <span>The bigger idea</span>
            </div>
            <p className={styles.kicker}>A book in progress</p>
            <h2 id="book-title">Process Vision</h2>
            <p className={styles.bookSubtitle}>
              Why Some People See Systems Instead of Objects
            </p>
            <p className={styles.bookDescription}>
              A field guide to the invisible systems hiding inside ordinary
              life—from bagels and Costco to quilts, businesses, websites, and
              handmade things.
            </p>

            <div className={styles.vocabulary} aria-label="Related ideas">
              <span>Systems thinking</span>
              <span>Reverse engineering</span>
              <span>Causal reasoning</span>
              <span>First principles</span>
              <span>Mental models</span>
            </div>
          </div>
        </section>

        <section className={styles.closingSection} aria-label="Final reflection">
          <p className={styles.closingLabel}>The point of making</p>
          <p className={styles.closingLine}>Creation is not the goal.</p>
          <p className={styles.closingLine}>
            Creation is how I verify
            <br />
            that I truly <em>understand.</em>
          </p>
          <div className={styles.closingMeta}>
            <span>Don’t just think outside the box.</span>
            <span>Ask who built it.</span>
          </div>
        </section>
      </div>

      <footer className={styles.footer}>
        <Link href="/">monosyth</Link>
        <p>Process Vision © {new Date().getFullYear()}</p>
        <a href="#main-content">Rewind to top ↑</a>
      </footer>
    </main>
  );
}
