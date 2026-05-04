"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Canonical Table of Contents order, shared by the /rsvp landing grid,
 * the top nav's Days dropdown, and the TocPager used at the bottom of
 * every sub-page.
 */
export type TocEntry = {
  /** Short label used in pill/tile layouts. */
  label: string;
  /** Slightly fuller label used at the foot of pages in the pager. */
  longLabel?: string;
  href: string;
  hint: string;
  tone: "pink" | "teal" | "gold";
};

export const TOC_ENTRIES: TocEntry[] = [
  {
    label: "Overview",
    href: "/rsvp/overview",
    hint: "Day-by-day narrative",
    tone: "teal",
  },
  {
    label: "Hotel",
    href: "/rsvp/hotel",
    hint: "Where to stay",
    tone: "teal",
  },
  {
    label: "Travel Tips",
    href: "/rsvp/travel-tips",
    hint: "Weather, Uber, budget",
    tone: "teal",
  },
  {
    label: "Thursday · Day 1",
    longLabel: "Thursday · Day 1",
    href: "/rsvp/day/thursday",
    hint: "Arrive & prepare",
    tone: "gold",
  },
  {
    label: "Friday · Day 2",
    longLabel: "Friday · Day 2",
    href: "/rsvp/day/friday",
    hint: "Cabana + Sinners Dinner",
    tone: "gold",
  },
  {
    label: "Saturday · Day 3",
    longLabel: "Saturday · Day 3",
    href: "/rsvp/day/saturday",
    hint: "Brunch + Kelly",
    tone: "gold",
  },
  {
    label: "Sunday · Day 4",
    longLabel: "Sunday · Day 4",
    href: "/rsvp/day/sunday",
    hint: "Brunch + Last Supper",
    tone: "gold",
  },
  {
    label: "Monday · Day 5",
    longLabel: "Monday · Day 5",
    href: "/rsvp/day/monday",
    hint: "Spa + Gymkhana",
    tone: "gold",
  },
  {
    label: "Activities & Shows",
    href: "/rsvp/activities",
    hint: "Absinthe, cabana, Kelly",
    tone: "pink",
  },
  {
    label: "Restaurants",
    href: "/rsvp/restaurants",
    hint: "Brunches & dinners",
    tone: "teal",
  },
  {
    label: "RSVP",
    href: "/rsvp/rsvp",
    hint: "Fill out the full form",
    tone: "pink",
  },
  {
    label: "Deposits",
    href: "/rsvp/deposits",
    hint: "Due June 10 · pay Scott or Dallas",
    tone: "pink",
  },
];

/**
 * Renders prev / next pills for the current ToC position, so mobile users
 * can thumb through the whole guide without scrolling back up to the
 * hamburger.
 */
export function TocPager() {
  const pathname = usePathname() ?? "";
  const idx = TOC_ENTRIES.findIndex((e) => e.href === pathname);
  if (idx < 0) return null;
  const prev = idx > 0 ? TOC_ENTRIES[idx - 1] : null;
  const next = idx < TOC_ENTRIES.length - 1 ? TOC_ENTRIES[idx + 1] : null;

  return (
    <nav
      aria-label="Guide pagination"
      className="grid gap-3 sm:grid-cols-2"
    >
      {prev ? (
        <Link
          href={prev.href}
          className="group flex items-center gap-3 rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.55)] px-4 py-3 text-left transition hover:border-[var(--rsvp-pink)]/40"
        >
          <span
            aria-hidden="true"
            className="font-mono text-lg text-[var(--rsvp-ink-dim)] group-hover:text-[var(--rsvp-pink)]"
          >
            ←
          </span>
          <span className="flex flex-col">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--rsvp-ink-dim)]">
              Previous
            </span>
            <span className="mt-0.5 font-[var(--font-bebas-neue)] text-base tracking-[0.14em] text-[var(--rsvp-ink)]">
              {prev.longLabel ?? prev.label}
            </span>
          </span>
        </Link>
      ) : (
        <span aria-hidden="true" className="hidden sm:block" />
      )}

      {next ? (
        <Link
          href={next.href}
          className="group flex items-center justify-end gap-3 rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.55)] px-4 py-3 text-right transition hover:border-[var(--rsvp-pink)]/40"
        >
          <span className="flex flex-col">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--rsvp-ink-dim)]">
              Up next
            </span>
            <span
              className={`mt-0.5 font-[var(--font-bebas-neue)] text-base tracking-[0.14em] ${
                next.tone === "pink"
                  ? "text-[var(--rsvp-pink-soft)]"
                  : next.tone === "gold"
                  ? "text-[var(--rsvp-gold)]"
                  : "text-[var(--rsvp-teal)]"
              }`}
            >
              {next.longLabel ?? next.label}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="font-mono text-lg text-[var(--rsvp-ink-dim)] group-hover:text-[var(--rsvp-pink)]"
          >
            →
          </span>
        </Link>
      ) : null}
    </nav>
  );
}
