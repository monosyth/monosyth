"use client";

import { useEventStore } from "@/components/rsvp/event-store";
import { PageShell, SectionHeading, SectionPanel } from "@/components/rsvp/ui";

export default function TravelTipsPage() {
  const { content } = useEventStore();
  const { travelTips } = content;

  return (
    <PageShell>
      <SectionPanel>
        <SectionHeading
          eyebrow={travelTips.eyebrow}
          title="Travel Tips"
          subtitle="Vegas in peak summer is a marathon. Here's what Dallas wants you to know before you land."
          tone="teal"
        />

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {travelTips.tips.map((tip) => (
            <article
              key={tip.id}
              className="rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.6)] px-5 py-5"
            >
              <p className="font-[var(--font-bebas-neue)] text-lg tracking-[0.22em] text-[var(--rsvp-pink-soft)]">
                {tip.label}
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--rsvp-ink)] sm:text-[0.95rem]">
                {tip.body}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-[1.4rem] border-2 border-[var(--rsvp-gold)]/50 bg-[rgba(244,201,93,0.08)] px-6 py-6 text-center">
          <p className="font-[var(--font-bebas-neue)] text-xl tracking-[0.25em] text-[var(--rsvp-gold)]">
            Mandatory
          </p>
          <p className="mt-3 font-[var(--font-playfair-display)] text-2xl italic text-white">
            &ldquo;{travelTips.mandatoryTip}&rdquo;
          </p>
        </div>

        <div className="mt-6 rounded-[1.4rem] border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.5)] px-6 py-5 text-center">
          <p className="font-mono text-[0.78rem] uppercase tracking-[0.28em] text-[var(--rsvp-ink-dim)]">
            {travelTips.findDallasNote}
          </p>
        </div>
      </SectionPanel>
    </PageShell>
  );
}
