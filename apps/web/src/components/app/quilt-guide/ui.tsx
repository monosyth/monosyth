import Link from "next/link";

import styles from "./quilt-guide.module.css";

export function PageIntro({
  eyebrow,
  title,
  intro,
  chapter,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  chapter: string;
  children?: React.ReactNode;
}) {
  return (
    <header className={styles.pageIntro}>
      <div className={styles.pageIntroCopy}>
        <p className={styles.eyebrow}><span>{chapter}</span>{eyebrow}</p>
        <h1>{title}</h1>
        <p className={styles.pageLead}>{intro}</p>
      </div>
      {children ? <div className={styles.pageIntroAside}>{children}</div> : null}
    </header>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <header className={styles.sectionHeading}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </header>
  );
}

export function Metric({
  label,
  value,
  note,
  tone = "teal",
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "teal" | "tomato" | "gold" | "lilac";
}) {
  return (
    <div className={`${styles.metric} ${styles[`metric${tone[0].toUpperCase()}${tone.slice(1)}`]}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </div>
  );
}

export function GuideLinkCard({
  href,
  number,
  title,
  body,
  meta,
  accent = "teal",
  children,
}: {
  href: string;
  number: string;
  title: string;
  body: string;
  meta: string;
  accent?: "teal" | "tomato" | "gold" | "lilac";
  children?: React.ReactNode;
}) {
  return (
    <Link href={href} className={`${styles.guideLinkCard} ${styles[`cardAccent${accent[0].toUpperCase()}${accent.slice(1)}`]}`}>
      <span className={styles.guideLinkNumber}>{number}</span>
      {children ? <div className={styles.guideLinkVisual}>{children}</div> : null}
      <div className={styles.guideLinkBody}>
        <p>{meta}</p>
        <h3>{title}</h3>
        <span>{body}</span>
      </div>
      <b aria-hidden="true">↗</b>
    </Link>
  );
}

export function Note({
  title,
  children,
  tone = "teal",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "teal" | "tomato" | "gold";
}) {
  return (
    <aside className={`${styles.note} ${styles[`note${tone[0].toUpperCase()}${tone.slice(1)}`]}`}>
      <span aria-hidden="true">✦</span>
      <div><strong>{title}</strong><p>{children}</p></div>
    </aside>
  );
}

export function Label({ children, tone = "dark" }: { children: React.ReactNode; tone?: "dark" | "light" | "tomato" | "teal" }) {
  return <span className={`${styles.label} ${styles[`label${tone[0].toUpperCase()}${tone.slice(1)}`]}`}>{children}</span>;
}
