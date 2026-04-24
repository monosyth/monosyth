"use client";

import { EditableText } from "@/components/rsvp/editable";
import { useEventStore } from "@/components/rsvp/event-store";
import { TocPager } from "@/components/rsvp/toc";
import { PageShell, SectionPanel } from "@/components/rsvp/ui";

export default function TravelTipsPage() {
  const { content } = useEventStore();
  const { travelTips } = content;

  return (
    <PageShell>
      <SectionPanel>
        <div className="flex flex-col items-center gap-5 text-center">
          <EditableText
            path="travelTips.eyebrow"
            value={travelTips.eyebrow}
            className="rsvp-eyebrow"
          />
          <h1 className="rsvp-neon rsvp-neon--teal text-4xl leading-[0.95] sm:text-5xl">
            Travel Tips
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-[var(--rsvp-ink-dim)] sm:text-base">
            Vegas in peak summer is a marathon. Here&rsquo;s what Dallas wants you to know before you land.
          </p>
          <span className="rsvp-divider" aria-hidden="true" />
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {travelTips.tips.map((tip, i) => (
            <article
              key={tip.id}
              className="rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.6)] px-5 py-5"
            >
              <EditableText
                path={`travelTips.tips[${i}].label`}
                value={tip.label}
                as="p"
                className="font-[var(--font-bebas-neue)] text-lg tracking-[0.22em] text-[var(--rsvp-pink-soft)]"
              />
              <EditableText
                path={`travelTips.tips[${i}].body`}
                value={tip.body}
                as="p"
                multiline
                className="mt-3 text-sm leading-7 text-[var(--rsvp-ink)] sm:text-[0.95rem]"
              />
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-[1.4rem] border-2 border-[var(--rsvp-gold)]/50 bg-[rgba(244,201,93,0.08)] px-6 py-6 text-center">
          <p className="font-[var(--font-bebas-neue)] text-xl tracking-[0.25em] text-[var(--rsvp-gold)]">
            Mandatory
          </p>
          <p className="mt-3 font-[var(--font-playfair-display)] text-2xl italic text-white">
            &ldquo;
            <EditableText
              path="travelTips.mandatoryTip"
              value={travelTips.mandatoryTip}
              multiline
            />
            &rdquo;
          </p>
        </div>

        <div className="mt-6 rounded-[1.4rem] border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.5)] px-6 py-5 text-center">
          <EditableText
            path="travelTips.findDallasNote"
            value={travelTips.findDallasNote}
            as="p"
            multiline
            className="font-mono text-[0.78rem] uppercase tracking-[0.28em] text-[var(--rsvp-ink-dim)]"
          />
        </div>
      </SectionPanel>
      <TocPager />
    </PageShell>
  );
}
