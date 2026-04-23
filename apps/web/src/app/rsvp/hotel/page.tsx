"use client";

import { useEventStore } from "@/components/rsvp/event-store";
import { PageShell, SectionPanel } from "@/components/rsvp/ui";

export default function HotelPage() {
  const { content } = useEventStore();
  const { hotel } = content;

  return (
    <PageShell>
      <SectionPanel>
        <div className="flex flex-col items-center text-center">
          <span className="rsvp-eyebrow">{hotel.eyebrow}</span>
          <h1 className="mt-6 rsvp-script text-[3rem] leading-tight sm:text-[4.2rem]">
            {hotel.scriptTitle}
          </h1>
          <span className="mt-5 rsvp-divider" aria-hidden="true" />
          <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--rsvp-ink)]">
            {hotel.body}
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="font-[var(--font-bebas-neue)] text-2xl tracking-[0.2em] text-[var(--rsvp-teal)]">
              {hotel.nearbyTitle}
            </h3>
            <p className="mt-4 text-sm leading-7 text-[var(--rsvp-ink-dim)]">
              {hotel.nearbyBody}
            </p>

            <h4 className="mt-8 font-[var(--font-playfair-display)] text-xl text-[var(--rsvp-pink-soft)]">
              Recommended
            </h4>
            <ul className="mt-3 grid gap-3">
              {hotel.recommended.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.55)] px-4 py-3"
                >
                  <span className="font-[var(--font-bebas-neue)] text-lg tracking-[0.18em] text-[var(--rsvp-gold)]">
                    {h.name}
                  </span>
                  <span className="text-xs uppercase tracking-[0.22em] text-[var(--rsvp-ink-dim)]">
                    {h.tagline}
                  </span>
                </li>
              ))}
            </ul>

            <h4 className="mt-8 font-[var(--font-playfair-display)] text-xl text-[var(--rsvp-pink-soft)]">
              Other Properties
            </h4>
            <ul className="mt-3 grid gap-3">
              {hotel.other.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.45)] px-4 py-3"
                >
                  <span className="font-[var(--font-bebas-neue)] text-lg tracking-[0.18em] text-[var(--rsvp-teal)]">
                    {h.name}
                  </span>
                  <span className="text-xs uppercase tracking-[0.22em] text-[var(--rsvp-ink-dim)]">
                    {h.tagline}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="rounded-[1.4rem] border border-[var(--rsvp-pink)]/30 bg-[rgba(255,61,154,0.08)] px-6 py-6">
              <p className="font-[var(--font-bebas-neue)] text-lg tracking-[0.22em] text-[var(--rsvp-pink-soft)]">
                Stay close, walk everywhere
              </p>
              <p className="mt-4 text-sm leading-7 text-[var(--rsvp-ink)]">
                {hotel.closing}
              </p>
            </div>

            <div className="mt-6 rounded-[1.4rem] border border-[var(--rsvp-teal)]/30 bg-[rgba(77,225,255,0.08)] px-6 py-6">
              <p className="font-[var(--font-bebas-neue)] text-lg tracking-[0.22em] text-[var(--rsvp-teal)]">
                MGM Rewards tip
              </p>
              <p className="mt-4 text-sm leading-7 text-[var(--rsvp-ink)]">
                Sign up for MGM Rewards (free) for better rates — Dallas often gets rooms comped
                that way. Caesars properties work the same.
              </p>
            </div>
          </div>
        </div>
      </SectionPanel>
    </PageShell>
  );
}
