import type { Metadata } from "next";
import Link from "next/link";

import { MoveBrand } from "@/components/move/brand";
import styles from "./page.module.css";

const title = "MoveMorrow — More room for what’s next.";
const description =
  "Plan your move with MoveMorrow: preview a tailored checklist, then sign in to save your timeline and moving budget. An early planner by Monosyth Labs.";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://monosyth.com";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${siteUrl}/move` },
  openGraph: { title, description, url: `${siteUrl}/move`, type: "website", siteName: "MoveMorrow" },
  twitter: { card: "summary", title, description },
};

const stages = [
  { when: "Make a plan", title: "Start with your move.", detail: "Where you’re going, when you’re leaving, and what needs to happen along the way." },
  { when: "Get ready", title: "Know what comes next.", detail: "A checklist built around your situation, with space for the things only you know about." },
  { when: "Moving day & beyond", title: "Keep the details together.", detail: "Costs, contacts, and last-minute tasks, all the way through settling in." },
];

export default function MovePage() {
  return (
    <main className={styles.page}>
      <a className={styles.skipLink} href="#move-content">Skip to content</a>
      <header className={styles.header}>
        <MoveBrand />
        <Link href="/move/planner" className={styles.headerLink}>Your planner <span aria-hidden="true">↗</span></Link>
      </header>

      <div id="move-content" className={styles.content}>
        <section className={styles.hero} aria-labelledby="move-title">
          <div>
            <p className={styles.eyebrow}>A little order. A new beginning.</p>
            <h1 id="move-title">More room<br />for what’s<br /><span>next.</span></h1>
            <p className={styles.intro}>A move is a lot of small decisions. Bring the tasks, dates, costs, and contacts together—and see your next step.</p>
            <Link className={styles.link} href="/move/planner">Plan your move <span aria-hidden="true">↗</span></Link>
            <p className={styles.availability}>Free to try. No account needed to preview.</p>
          </div>
          <aside className={styles.heroNote} aria-label="A place for your next chapter">
            <div className={styles.noteTop}><span>YOUR NEXT CHAPTER</span><span aria-hidden="true">↗</span></div>
            <p className={styles.noteTitle}>A place<br />to begin<br />again.</p>
            <div className={styles.noteBottom}><span>Across town.<br />Across the country.</span><span>One step<br />at a time.</span></div>
          </aside>
        </section>

        <section className={styles.plan} id="the-plan" aria-labelledby="plan-title">
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>The plan</p>
            <h2 id="plan-title">From “we’re moving”<br />to “we’re home.”</h2>
            <p>For renters and homeowners. Across town or across the country. Built around your move.</p>
          </div>
          <ol className={styles.stages}>
            {stages.map((stage, index) => (
              <li key={stage.when}>
                <span className={styles.number} aria-hidden="true">0{index + 1}</span>
                <div><p className={styles.when}>{stage.when}</p><h3>{stage.title}</h3><p>{stage.detail}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.features} aria-label="Planner features">
          <article><span>01 / Tasks</span><h2>A checklist that fits.</h2><p>Relevant tasks for your situation, with dates you can adjust and your own items alongside them.</p></article>
          <article><span>02 / Timing</span><h2>The weeks ahead.</h2><p>A timeline organized around your move date, so urgent tasks don’t get buried in the whole list.</p></article>
          <article><span>03 / Money</span><h2>Costs in one place.</h2><p>Track estimates, actual costs, and paid items, with refundable deposits shown separately.</p></article>
        </section>
        <p className={styles.note}>Keep tasks, costs, contacts, and moving-day essentials together. Household sharing is planned for a later release.</p>
      </div>

      <footer className={styles.footer}><Link href="/">By Monosyth Labs</Link><Link href="/move/privacy">Privacy & your data</Link><span>© {new Date().getFullYear()} Monosyth Labs, LLC</span></footer>
    </main>
  );
}
