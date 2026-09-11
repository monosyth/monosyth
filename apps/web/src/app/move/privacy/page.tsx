import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/move/planner.module.css";
export const metadata: Metadata = {
  title: "Privacy & your data | MoveMorrow",
  description:
    "How the early MoveMorrow planner uses and stores your information.",
};
export default function MovePrivacy() {
  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/move">
          Move<span>Morrow</span>
        </Link>
        <Link href="/move/planner">Your planner</Link>
      </header>
      <article className={`${styles.content} ${styles.panel}`}>
        <p className={styles.kicker}>
          Early planner / Updated September 11, 2026
        </p>
        <h1>Your move. Your information.</h1>
        <p>
          MoveMorrow is operated by Monosyth Labs, LLC. This first version saves
          one moving plan per account.
        </p>
        <h2>What you share</h2>
        <p>
          Before saving, your checklist preview stays in this page’s memory and
          disappears when you leave or refresh. Google sign-in identifies your
          account. When you save, we store the cities, move date, household
          choices, task details, and budget items (including estimates, actual
          amounts, payment status, and notes) you enter, along with your account
          identifier and save timestamps. We display your Google account name
          while you’re signed in.
        </p>
        <h2>How it is used</h2>
        <p>
          Your details create and save your checklist and budget so you can
          return on another device. Google Firebase provides account sign-in,
          database storage, and hosting. MoveMorrow’s server checks your account
          before returning or changing a saved plan. Plans are not publicly
          shared. Authorized service operators may access records when needed to
          maintain the service.
        </p>
        <p>
          This version does not send your plan to an AI service, sell your
          moving details, or include advertising or product-analytics trackers.
          Hosting and authentication providers may process operational
          information such as request and security logs.
        </p>
        <h2>Keep a copy or remove your plan</h2>
        <p>
          Use Export plan in the planner to download your details, tasks, and
          budget items, or print the current planner view. Delete this move
          removes the active saved plan and all its tasks and budget items.
          Signing out does not delete it. Google authentication records and
          provider operational logs are separate from your plan and are not
          deleted by that button. We keep the active plan until you delete it.
        </p>
        <h2>What to leave out</h2>
        <p>
          The planner does not need your exact address, payment card details,
          identification numbers, passwords, or medical information. Avoid
          putting those in task notes. This is an early version; keep a separate
          copy of important moving information.
        </p>
        <Link className={styles.button} href="/move/planner">
          Back to your planner
        </Link>
      </article>
    </main>
  );
}
