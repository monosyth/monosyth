import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DressBoardView } from "@/components/rsvp/dress-board";
import { DayChip, PageShell, SectionPanel } from "@/components/rsvp/ui";
import { DALLAS_EVENT_CONTENT } from "@/lib/rsvp/event-content";

type Params = { dayId: string };

export function generateStaticParams(): Params[] {
  return DALLAS_EVENT_CONTENT.schedule.days.map((day) => ({ dayId: day.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { dayId } = await params;
  const day = DALLAS_EVENT_CONTENT.schedule.days.find((d) => d.id === dayId);
  if (!day) return { title: "Day" };
  return {
    title: `${day.dayLabel} · ${day.dayName}`,
    description: day.headline,
  };
}

export default async function DayPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { dayId } = await params;
  const day = DALLAS_EVENT_CONTENT.schedule.days.find((d) => d.id === dayId);
  if (!day) {
    notFound();
  }

  const dressBoard = day.dressBoardId
    ? DALLAS_EVENT_CONTENT.dressBoards.find((b) => b.id === day.dressBoardId)
    : undefined;

  // Prev/next day for footer nav
  const days = DALLAS_EVENT_CONTENT.schedule.days;
  const idx = days.findIndex((d) => d.id === day.id);
  const prev = idx > 0 ? days[idx - 1] : null;
  const next = idx >= 0 && idx < days.length - 1 ? days[idx + 1] : null;

  return (
    <PageShell>
      <SectionPanel>
        <div className="flex flex-col items-center text-center">
          <span className="rsvp-eyebrow">Daily Schedule</span>
          <div className="mt-5 flex flex-col items-center gap-4">
            <DayChip tone="gold">{day.dayLabel}</DayChip>
            <h1 className="font-[var(--font-bebas-neue)] text-[3rem] leading-[0.9] tracking-[0.04em] text-[var(--rsvp-gold)] sm:text-[4rem]">
              {day.dayName}
            </h1>
          </div>
          <span className="mt-5 rsvp-divider" aria-hidden="true" />
          <h2 className="mt-6 font-[var(--font-playfair-display)] text-2xl text-[var(--rsvp-pink-soft)] sm:text-3xl">
            {day.headline}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--rsvp-ink)] sm:text-base">
            {day.intro}
          </p>
        </div>

        {/* Schedule table */}
        <div className="mt-10 grid gap-3">
          {day.rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[auto_1fr] items-start gap-4 rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.5)] px-4 py-4 sm:grid-cols-[8rem_1fr]"
            >
              <span className="font-[var(--font-bebas-neue)] text-lg tracking-[0.18em] text-[var(--rsvp-teal)]">
                {row.time}
              </span>
              <div>
                <p className="text-base font-semibold text-[var(--rsvp-ink)]">
                  {row.title}
                </p>
                {row.note ? (
                  <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[var(--rsvp-gold)]">
                    {row.note}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {/* Tip / dress code */}
        <div className="mt-10 rounded-[1.4rem] border border-[var(--rsvp-pink)]/30 bg-[rgba(255,61,154,0.08)] px-6 py-6">
          <p className="font-[var(--font-bebas-neue)] text-lg tracking-[0.22em] text-[var(--rsvp-pink-soft)]">
            {day.tipTitle}
          </p>
          <p className="mt-3 text-sm leading-7 text-[var(--rsvp-ink)]">
            {day.tipBody}
          </p>
        </div>

        {/* Hero image */}
        {day.heroImageUrl ? (
          <div className="mt-10 overflow-hidden rounded-[1.6rem] border border-[var(--rsvp-border-soft)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={day.heroImageUrl}
              alt={day.heroImageAlt ?? day.dayName}
              className="h-64 w-full object-cover sm:h-80"
              loading="lazy"
            />
          </div>
        ) : null}
      </SectionPanel>

      {dressBoard ? <DressBoardView board={dressBoard} /> : null}

      {/* Prev / next */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {prev ? (
          <Link
            href={`/rsvp/day/${prev.id}`}
            className="rsvp-btn rsvp-btn-ghost"
          >
            ← {prev.dayLabel} · {prev.dayName}
          </Link>
        ) : (
          <Link href="/rsvp/overview" className="rsvp-btn rsvp-btn-ghost">
            ← Back to overview
          </Link>
        )}
        {next ? (
          <Link
            href={`/rsvp/day/${next.id}`}
            className="rsvp-btn rsvp-btn-neon"
          >
            {next.dayLabel} · {next.dayName} →
          </Link>
        ) : (
          <Link href="/rsvp/rsvp" className="rsvp-btn rsvp-btn-primary">
            Fill out the RSVP →
          </Link>
        )}
      </div>
    </PageShell>
  );
}
