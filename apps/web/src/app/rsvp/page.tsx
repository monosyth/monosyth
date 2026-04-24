"use client";

import Link from "next/link";

import { useEventStore } from "@/components/rsvp/event-store";
import { SectionPanel } from "@/components/rsvp/ui";

const QUICK_LINKS: Array<{
  label: string;
  href: string;
  hint: string;
  /**
   * Tone system:
   *   teal — informational / context sections (Overview, Hotel, Tips, Restaurants)
   *   gold — trip days (all five share one color to match the gold day chips)
   *   pink — action / headline items (Activities, RSVP, Deposits)
   */
  tone: "pink" | "teal" | "gold";
}> = [
  { label: "Overview", href: "/rsvp/overview", hint: "Day-by-day narrative", tone: "teal" },
  { label: "Hotel", href: "/rsvp/hotel", hint: "Where to stay", tone: "teal" },
  { label: "Travel Tips", href: "/rsvp/travel-tips", hint: "Weather, Uber, budget", tone: "teal" },
  { label: "Thursday · Day 1", href: "/rsvp/day/thursday", hint: "Arrive & prepare", tone: "gold" },
  { label: "Friday · Day 2", href: "/rsvp/day/friday", hint: "Cabana + Sinners Dinner", tone: "gold" },
  { label: "Saturday · Day 3", href: "/rsvp/day/saturday", hint: "Brunch + Kelly", tone: "gold" },
  { label: "Sunday · Day 4", href: "/rsvp/day/sunday", hint: "Speed Vegas + Last Supper", tone: "gold" },
  { label: "Monday · Day 5", href: "/rsvp/day/monday", hint: "Spa + Gymkhana", tone: "gold" },
  { label: "Activities & Shows", href: "/rsvp/activities", hint: "Absinthe, Kelly, Speed", tone: "pink" },
  { label: "Restaurants", href: "/rsvp/restaurants", hint: "Brunches & dinners", tone: "teal" },
  { label: "RSVP", href: "/rsvp/rsvp", hint: "Fill out the full form", tone: "pink" },
  { label: "Deposits", href: "/rsvp/deposits", hint: "Due June 10 · pay Scott or Dallas", tone: "pink" },
];

export default function RSVPHomePage() {
  const { content } = useEventStore();

  return (
    <div className="mx-auto flex w-full max-w-[78rem] flex-col gap-10 px-4 pb-16 pt-8 sm:px-8 lg:px-12">
      {/* HERO poster */}
      <SectionPanel hot className="px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="rsvp-eyebrow rsvp-eyebrow--gold">Dallas turns 34</span>
            <p className="mt-6 rsvp-script text-2xl sm:text-3xl">We&rsquo;re off to</p>
            <h1 className="mt-1 rsvp-neon rsvp-neon--pink rsvp-flicker text-[3.6rem] leading-[0.85] sm:text-[5.4rem] lg:text-[6.8rem]">
              Las Vegas
              <span className="rsvp-script ml-3 text-[2.6rem] sm:text-[3.8rem] lg:text-[4.6rem]">
                baby!
              </span>
            </h1>

            <div className="mt-8 flex items-center gap-4">
              <span className="rsvp-divider" aria-hidden="true" />
              <span className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--rsvp-ink-dim)]">
                July 30 – August 4 · Las Vegas, NV
              </span>
            </div>

            <h2 className="mt-8 font-[var(--font-playfair-display)] text-3xl leading-tight sm:text-[2.6rem]">
              <span className="text-white">Dallas&rsquo;s</span>
              <span className="ml-2 rsvp-neon rsvp-neon--teal">Sin City Birthday Party</span>
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-[var(--rsvp-ink-dim)] sm:text-lg">
              Six nights of dinners, shows, pool time, themed dinners, and just enough redemption.
              Use the guide to sort your travel, RSVP for each event, and get your deposit in before
              the June 10th deadline.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/rsvp/rsvp" className="rsvp-btn rsvp-btn-primary rsvp-sign-pulse">
                RSVP & send my deposit
                <span aria-hidden="true" className="-mr-1">→</span>
              </Link>
              <Link href="/rsvp/overview" className="rsvp-btn rsvp-btn-neon">
                Start with the overview
              </Link>
            </div>
          </div>

          {/* Hero portrait */}
          <div className="relative">
            <div
              className="relative mx-auto aspect-square w-full max-w-[24rem] overflow-hidden rounded-full border-2 border-[var(--rsvp-gold)]/70 shadow-[0_0_50px_rgba(244,201,93,0.3)]"
              style={{
                backgroundImage: `
                  linear-gradient(180deg, rgba(7,4,10,0.2) 0%, rgba(7,4,10,0.7) 100%),
                  url('/rsvp-images/dallas.jpg')`,
                backgroundSize: "cover",
                backgroundPosition: "center 25%",
              }}
            >
              <svg
                viewBox="0 0 200 200"
                className="absolute -left-6 -top-3 h-32 w-32 opacity-90"
                aria-hidden="true"
              >
                <g
                  fill="none"
                  stroke="var(--rsvp-gold)"
                  strokeWidth="2"
                  transform="translate(40 40)"
                >
                  <rect x="-20" y="-10" width="60" height="90" rx="6" transform="rotate(-18)" fill="#0a0610" fillOpacity="0.85" />
                  <rect x="0" y="-10" width="60" height="90" rx="6" transform="rotate(-4)" fill="#0a0610" fillOpacity="0.85" />
                  <rect x="20" y="-10" width="60" height="90" rx="6" transform="rotate(10)" fill="#0a0610" fillOpacity="0.85" />
                  <text x="5" y="30" fontSize="22" fontWeight="700" fill="var(--rsvp-gold)" fontFamily="serif">A</text>
                  <text x="28" y="28" fontSize="22" fontWeight="700" fill="var(--rsvp-gold)" fontFamily="serif">A</text>
                  <text x="48" y="26" fontSize="22" fontWeight="700" fill="var(--rsvp-gold)" fontFamily="serif">A</text>
                </g>
              </svg>
              <div className="flex h-full flex-col items-center justify-end px-6 pb-10 text-center">
                <span className="rsvp-script text-2xl">the one &amp; only</span>
                <h3 className="mt-1 rsvp-neon rsvp-neon--pink text-[3rem] leading-none">Dallas</h3>
                <p className="mt-2 font-mono text-[0.7rem] uppercase tracking-[0.35em] text-[var(--rsvp-gold)]">
                  Turns 34
                </p>
              </div>
            </div>

            <div
              className="mx-auto mt-6 w-fit rounded-[1.2rem] border-2 border-[var(--rsvp-gold)] bg-[#0e0815] px-8 py-5 text-center sm:px-12 sm:py-6"
              style={{
                boxShadow:
                  "0 0 32px rgba(244,201,93,0.3), inset 0 0 0 4px rgba(0,0,0,0.35)",
              }}
            >
              <p className="rsvp-script text-[2.4rem] leading-none text-[var(--rsvp-teal)] sm:text-[3rem]">
                July 30<span className="mx-2 text-[var(--rsvp-ink)]">–</span>Aug 4
              </p>
              <p className="mt-3 font-mono text-sm uppercase tracking-[0.4em] text-[var(--rsvp-pink)] sm:text-base">
                Las Vegas, NV
              </p>
            </div>
          </div>
        </div>
      </SectionPanel>

      {/* Table of contents */}
      <SectionPanel>
        <div className="flex flex-col items-center text-center">
          <span className="rsvp-eyebrow">Table of Contents</span>
          <h2 className="mt-5 rsvp-neon rsvp-neon--teal text-4xl sm:text-5xl">Your Guide</h2>
          <span className="mt-5 rsvp-divider" aria-hidden="true" />
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--rsvp-ink-dim)]">
            Everything you need — tap any section to dive in. Start with the Overview if this is
            your first look.
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center justify-between gap-4 rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.6)] px-5 py-4 transition hover:border-[var(--rsvp-pink)]/40 hover:bg-[rgba(21,10,22,0.8)]"
            >
              <div>
                <p
                  className={`font-[var(--font-bebas-neue)] text-lg tracking-[0.18em] ${
                    link.tone === "pink"
                      ? "text-[var(--rsvp-pink-soft)]"
                      : link.tone === "gold"
                      ? "text-[var(--rsvp-gold)]"
                      : "text-[var(--rsvp-teal)]"
                  }`}
                >
                  {link.label}
                </p>
                <p className="mt-1 text-[0.78rem] text-[var(--rsvp-ink-dim)]">{link.hint}</p>
              </div>
              <span
                aria-hidden="true"
                className="text-xl text-[var(--rsvp-ink-dim)] transition group-hover:translate-x-0.5 group-hover:text-[var(--rsvp-pink)]"
              >
                →
              </span>
            </Link>
          ))}
        </div>
      </SectionPanel>

      {/* Highlight row */}
      <SectionPanel>
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr_1fr]">
          <div>
            <span className="rsvp-eyebrow rsvp-eyebrow--pink">Deposits Due</span>
            <h3 className="mt-4 rsvp-neon rsvp-neon--pink text-4xl">June 10th</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--rsvp-ink-dim)]">
              Lock in group seating for Absinthe, the Bellagio cabana, and Kelly Clarkson. Pay Scott or
              Dallas — links are on the Deposits page.
            </p>
            <Link href="/rsvp/deposits" className="rsvp-btn rsvp-btn-primary mt-5 text-sm">
              View deposits
            </Link>
          </div>

          <div>
            <span className="rsvp-eyebrow">Preferred Hotel</span>
            <p className="mt-4 rsvp-script text-3xl text-[var(--rsvp-pink-soft)]">
              {content.hotel.scriptTitle}
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--rsvp-ink-dim)]">
              Central on strip, gorgeous terrace views (if you splurge), & iconic. Vdara / Aria /
              Bellagio are great nearby options.
            </p>
            <Link href="/rsvp/hotel" className="rsvp-btn rsvp-btn-neon mt-5 text-sm">
              Hotel picks
            </Link>
          </div>

          <div>
            <span className="rsvp-eyebrow rsvp-eyebrow--gold">Pro Tip</span>
            <p className="mt-4 font-[var(--font-playfair-display)] text-2xl leading-snug text-white">
              &ldquo;{content.travelTips.mandatoryTip}&rdquo;
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--rsvp-ink-dim)]">
              {content.travelTips.findDallasNote}
            </p>
            <Link href="/rsvp/travel-tips" className="rsvp-btn rsvp-btn-ghost mt-5 text-sm">
              Read the tips
            </Link>
          </div>
        </div>
      </SectionPanel>
    </div>
  );
}
