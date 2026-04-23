import Link from "next/link";
import type { Metadata } from "next";

import { PageShell, SectionHeading, SectionPanel, Tag } from "@/components/rsvp/ui";
import { DALLAS_EVENT_CONTENT } from "@/lib/rsvp/event-content";

export const metadata: Metadata = {
  title: "Activities & Shows",
};

export default function ActivitiesPage() {
  const { activities } = DALLAS_EVENT_CONTENT;

  return (
    <PageShell>
      <SectionPanel>
        <SectionHeading
          eyebrow={activities.eyebrow}
          title="The Big Ticket"
          subtitle={activities.intro}
          tone="pink"
        />

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          {activities.items.map((a) => (
            <article
              key={a.id}
              className="flex flex-col gap-4 rounded-[1.6rem] border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.55)] p-6 transition hover:border-[var(--rsvp-teal)]/40"
            >
              <header className="flex items-start justify-between gap-4">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[var(--rsvp-teal)]/40 bg-[rgba(77,225,255,0.08)] text-2xl"
                  aria-hidden="true"
                >
                  {a.icon}
                </div>
                <div className="flex-1">
                  <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-[var(--rsvp-teal)]">
                    {a.dayLabel} · {a.dayDate}
                  </p>
                  <h3 className="mt-1 font-[var(--font-playfair-display)] text-2xl">
                    {a.name}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--rsvp-ink-dim)]">
                    {a.venue} · {a.time}
                  </p>
                </div>
                <Tag tone="gold">{a.priceLabel}</Tag>
              </header>

              <p className="text-sm leading-7 text-[var(--rsvp-ink)]">
                {a.description}
              </p>

              {a.options ? (
                <ul className="grid gap-2 sm:grid-cols-3">
                  {a.options.map((opt) => (
                    <li
                      key={opt}
                      className="rounded-xl border border-[var(--rsvp-pink)]/25 bg-[rgba(255,61,154,0.06)] px-3 py-2 text-[0.78rem] text-[var(--rsvp-pink-soft)]"
                    >
                      {opt}
                    </li>
                  ))}
                </ul>
              ) : null}

              <footer className="mt-2 flex flex-wrap items-center gap-2">
                {a.depositsDueBy ? (
                  <Tag tone="hot">Deposit due {a.depositsDueBy}</Tag>
                ) : null}
                <Link
                  href={`/rsvp/rsvp${a.rsvpQuestionSlug ? `?q=${a.rsvpQuestionSlug}` : ""}`}
                  className="rsvp-btn rsvp-btn-primary px-4 py-2 text-xs"
                >
                  RSVP
                </Link>
                <Link
                  href="/rsvp/deposits"
                  className="rsvp-btn rsvp-btn-neon px-4 py-2 text-xs"
                >
                  Pay deposit
                </Link>
              </footer>
            </article>
          ))}
        </div>

        <p className="mt-8 rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.45)] px-5 py-5 text-center text-sm leading-7 text-[var(--rsvp-ink-dim)]">
          {activities.closingNote}
        </p>
      </SectionPanel>
    </PageShell>
  );
}
