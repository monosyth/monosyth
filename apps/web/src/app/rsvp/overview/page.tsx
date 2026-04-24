"use client";

import Link from "next/link";

import { useEventStore } from "@/components/rsvp/event-store";
import { TocPager } from "@/components/rsvp/toc";
import { DayChip, PageShell, SectionHeading, SectionPanel } from "@/components/rsvp/ui";

export default function OverviewPage() {
  const { content } = useEventStore();
  const { overview, schedule } = content;

  return (
    <PageShell>
      <SectionPanel>
        <SectionHeading
          eyebrow={overview.eyebrow}
          title={overview.title}
          subtitle={overview.intro}
          tone="teal"
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {overview.days.map((day) => {
            const matchingDay = schedule.days.find(
              (d) => d.dayLabel.toLowerCase() === day.label.toLowerCase(),
            );
            return (
              <article
                key={day.id}
                className="relative flex flex-col rounded-[1.4rem] border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.55)] p-6 transition hover:border-[var(--rsvp-pink)]/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <DayChip tone="gold">{day.label}</DayChip>
                  <span className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-[var(--rsvp-ink-dim)]">
                    {day.dateLabel}
                  </span>
                </div>
                <h3 className="mt-6 font-[var(--font-playfair-display)] text-2xl text-[var(--rsvp-pink-soft)]">
                  {day.title}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-7 text-[var(--rsvp-ink-dim)]">
                  {day.body}
                </p>
                {matchingDay ? (
                  <Link
                    href={`/rsvp/day/${matchingDay.id}`}
                    className="rsvp-btn rsvp-btn-neon mt-5 self-start text-xs"
                  >
                    See the daily schedule →
                  </Link>
                ) : null}
              </article>
            );
          })}
        </div>
      </SectionPanel>

      <SectionPanel>
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="rsvp-eyebrow rsvp-eyebrow--pink">Next stop</span>
          <h2 className="rsvp-neon rsvp-neon--pink text-4xl">Pick your RSVP path</h2>
          <p className="max-w-xl text-sm leading-7 text-[var(--rsvp-ink-dim)]">
            You can lock everything in at once with the full RSVP form, or jump
            into each activity and restaurant page to decide piece by piece.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href="/rsvp/rsvp" className="rsvp-btn rsvp-btn-primary">
              Fill out the full RSVP →
            </Link>
            <Link href="/rsvp/activities" className="rsvp-btn rsvp-btn-neon">
              Activities & shows
            </Link>
            <Link href="/rsvp/restaurants" className="rsvp-btn rsvp-btn-ghost">
              Restaurants
            </Link>
          </div>
        </div>
      </SectionPanel>
      <TocPager />
    </PageShell>
  );
}
