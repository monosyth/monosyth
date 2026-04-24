import type React from "react";

/**
 * Shared presentational primitives used across the event app routes.
 */

export function PageShell({
  children,
  className = "",
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <div
      className={`mx-auto flex w-full max-w-[78rem] flex-col gap-10 px-4 py-10 sm:px-8 lg:px-12 ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export function SectionPanel({
  children,
  className = "",
  hot = false,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
  hot?: boolean;
}>) {
  return (
    <section
      className={`rsvp-panel ${
        hot ? "rsvp-panel--hot" : ""
      } rounded-[2rem] px-6 py-8 sm:px-10 sm:py-10 ${className}`.trim()}
    >
      {children}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  tone = "teal",
}: Readonly<{
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
  tone?: "teal" | "pink" | "gold";
}>) {
  const alignment = align === "center" ? "items-center text-center" : "items-start text-left";
  const neon =
    tone === "pink"
      ? "rsvp-neon--pink"
      : tone === "gold"
      ? "rsvp-neon--teal" // gold is rarely used as glow; fall back to teal
      : "rsvp-neon--teal";
  const eyebrowClass =
    tone === "pink"
      ? "rsvp-eyebrow rsvp-eyebrow--pink"
      : tone === "gold"
      ? "rsvp-eyebrow rsvp-eyebrow--gold"
      : "rsvp-eyebrow";
  return (
    <div className={`flex flex-col gap-5 ${alignment}`}>
      {eyebrow ? <span className={eyebrowClass}>{eyebrow}</span> : null}
      <h1 className={`rsvp-neon ${neon} text-4xl leading-[0.95] sm:text-5xl`}>
        {title}
      </h1>
      {subtitle ? (
        <p className="max-w-2xl text-sm leading-7 text-[var(--rsvp-ink-dim)] sm:text-base">
          {subtitle}
        </p>
      ) : null}
      <span className="rsvp-divider" aria-hidden="true" />
    </div>
  );
}

/**
 * Gold neon "DAY 1" style chip used on overview cards and day hero headers.
 * The `tone` prop is kept for back-compat but every variant renders the same
 * gold chip so fonts + sizing stay consistent across pages.
 */
export function DayChip({
  children,
}: Readonly<{ children: React.ReactNode; tone?: "gold" | "teal" }>) {
  return <span className="rsvp-day-chip">{children}</span>;
}

export function Tag({
  children,
  tone = "pending",
}: Readonly<{
  children: React.ReactNode;
  tone?: "pending" | "answered" | "hot" | "gold";
}>) {
  return <span className={`rsvp-tag rsvp-tag-${tone}`}>{children}</span>;
}
