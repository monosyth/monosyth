"use client";

import Link from "next/link";

import { EditableText } from "@/components/rsvp/editable";
import { useEventStore } from "@/components/rsvp/event-store";
import { TocPager } from "@/components/rsvp/toc";
import { DayChip, PageShell, SectionPanel } from "@/components/rsvp/ui";

export default function OverviewPage() {
  const { content } = useEventStore();
  const { overview, schedule } = content;

  return (
    <PageShell>
      <SectionPanel>
        <div className="flex flex-col items-center gap-5 text-center">
          <EditableText
            path="overview.eyebrow"
            value={overview.eyebrow}
            className="rsvp-eyebrow"
          />
          <EditableText
            path="overview.title"
            value={overview.title}
            as="h1"
            className="rsvp-neon rsvp-neon--teal text-4xl leading-[0.95] sm:text-5xl"
          />
          <EditableText
            path="overview.intro"
            value={overview.intro}
            as="p"
            multiline
            className="max-w-2xl text-sm leading-7 text-[var(--rsvp-ink-dim)] sm:text-base"
          />
          <span className="rsvp-divider" aria-hidden="true" />
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {overview.days.map((day, i) => {
            const matchingDay = schedule.days.find(
              (d) => d.dayLabel.toLowerCase() === day.label.toLowerCase(),
            );
            return (
              <article
                key={day.id}
                className="relative flex flex-col rounded-[1.4rem] border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.55)] p-6 transition hover:border-[var(--rsvp-pink)]/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <DayChip tone="gold">
                    <EditableText
                      path={`overview.days[${i}].label`}
                      value={day.label}
                    />
                  </DayChip>
                  <EditableText
                    path={`overview.days[${i}].dateLabel`}
                    value={day.dateLabel}
                    className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-[var(--rsvp-ink-dim)]"
                  />
                </div>
                <EditableText
                  path={`overview.days[${i}].title`}
                  value={day.title}
                  as="h3"
                  className="mt-6 font-[var(--font-playfair-display)] text-2xl text-[var(--rsvp-pink-soft)]"
                />
                <EditableText
                  path={`overview.days[${i}].body`}
                  value={day.body}
                  as="p"
                  multiline
                  className="mt-3 flex-1 text-sm leading-7 text-[var(--rsvp-ink-dim)]"
                />
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
