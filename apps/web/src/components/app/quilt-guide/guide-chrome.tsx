"use client";

import Link from "next/link";

import { useAuth } from "@/components/auth/auth-provider";

import { GuideNav, PrintGuideButton } from "./guide-nav";
import styles from "./quilt-guide.module.css";

function QuiltMark() {
  return (
    <svg viewBox="0 0 48 48" width="42" height="42" aria-hidden="true">
      <rect x="1" y="1" width="46" height="46" rx="9" fill="#fffaf0" stroke="#302b28" strokeWidth="1.5" />
      <path d="M5 5h19v19H5z" fill="#d94f3f" />
      <path d="M24 5h19L24 24z" fill="#167471" />
      <path d="M43 5v19H24z" fill="#e3a52e" />
      <path d="M5 24h19v19z" fill="#9078b6" />
      <path d="M5 43V24h19z" fill="#233451" />
      <path d="M24 24h19v19H24z" fill="#df8194" />
      <path d="M24 2v44M2 24h44" stroke="#fffaf0" strokeWidth="1.5" strokeDasharray="2 2" />
    </svg>
  );
}

export function GuideChrome({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <main className={styles.guideGate}>
        <div className={styles.guideGateCard} role="status">
          <span className={styles.guideGateSpinner} aria-hidden="true" />
          <p>Opening the Quilt Field Guide…</p>
        </div>
      </main>
    );
  }

  if (status !== "signed_in") {
    return (
      <main className={styles.guideGate}>
        <section className={styles.guideGateCard}>
          <QuiltMark />
          <p className={styles.eyebrow}>Private studio guide</p>
          <h1>Sign in through Monosyth Studio first.</h1>
          <p>The Quilt Field Guide lives alongside your other private sewing and planning tools.</p>
          <Link href="/app" className={styles.primaryAction}>Go to Studio sign-in <span>→</span></Link>
        </section>
      </main>
    );
  }

  return (
    <div className={styles.guideRoot}>
      <a href="#guide-content" className={styles.skipLink}>Skip to guide content</a>
      <header className={styles.guideHeader}>
        <div className={styles.guideHeaderInner}>
          <Link href="/app" className={styles.guideBrand} aria-label="Back to Monosyth Studio">
            <QuiltMark />
            <span>
              <small>Monosyth Studio · Sewing desk</small>
              <strong>Quilt Field Guide</strong>
            </span>
          </Link>
          <div className={styles.guideHeaderActions}>
            <span className={styles.seamPill}><i /> ¼″ seam standard</span>
            <PrintGuideButton />
            <Link href="/app" className={styles.headerAction}>Studio <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </header>
      <GuideNav />
      <main id="guide-content" className={styles.guideMain}>{children}</main>
      <footer className={styles.guideFooter}>
        <div>
          <QuiltMark />
          <p><strong>Quilt Field Guide</strong><br />Cut labels, unit math, and original diagrams for a reliable ¼″ seam.</p>
        </div>
        <p>
          Precut counts vary by maker. Measure actual fabric before cutting. Pattern-specific instructions and your longarmer’s requirements always win.
        </p>
        <div className={styles.footerLinks}>
          <Link href="/app/quilt-guide/sources">Research & terms</Link>
          <Link href="/app">Monosyth Studio</Link>
        </div>
      </footer>
    </div>
  );
}
