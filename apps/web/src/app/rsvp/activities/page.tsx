"use client";

import Link from "next/link";

import { DepositStatusToggle } from "@/components/rsvp/deposit-status";
import { EditableImage, EditableText } from "@/components/rsvp/editable";
import { useEventStore } from "@/components/rsvp/event-store";
import { QuickRSVP } from "@/components/rsvp/quick-rsvp";
import { TocPager } from "@/components/rsvp/toc";
import { PageShell, SectionPanel, Tag } from "@/components/rsvp/ui";

export default function ActivitiesPage() {
  const { content } = useEventStore();
  const { activities } = content;

  return (
    <PageShell>
      <SectionPanel>
        <div className="flex flex-col items-center gap-5 text-center">
          <EditableText
            path="activities.eyebrow"
            value={activities.eyebrow}
            className="rsvp-eyebrow rsvp-eyebrow--pink"
          />
          <h1 className="rsvp-neon rsvp-neon--pink text-4xl leading-[0.95] sm:text-5xl">
            The Big Ticket
          </h1>
          <EditableText
            path="activities.intro"
            value={activities.intro}
            as="p"
            multiline
            className="max-w-2xl text-sm leading-7 text-[var(--rsvp-ink-dim)] sm:text-base"
          />
          <span className="rsvp-divider" aria-hidden="true" />
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          {activities.items.map((a, i) => {
            const basePath = `activities.items[${i}]`;
            return (
              <article
                key={a.id}
                className="flex flex-col overflow-hidden rounded-[1.6rem] border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.55)] transition hover:border-[var(--rsvp-teal)]/40"
              >
                {a.imageUrl ? (
                  <div className="relative isolate">
                    <EditableImage
                      urlPath={`${basePath}.imageUrl`}
                      altPath={`${basePath}.imageAlt`}
                      url={a.imageUrl}
                      alt={a.imageAlt ?? a.name}
                      className="h-44 w-full object-cover sm:h-56"
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(7,4,10,0.0) 30%, rgba(7,4,10,0.92) 100%)",
                      }}
                    />
                    <div className="pointer-events-none absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
                      <span className="pointer-events-auto rsvp-tag rsvp-tag-answered backdrop-blur-sm">
                        <EditableText
                          path={`${basePath}.dayLabel`}
                          value={a.dayLabel}
                        />{" · "}
                        <EditableText
                          path={`${basePath}.dayDate`}
                          value={a.dayDate}
                        />
                      </span>
                      <span className="pointer-events-auto">
                        <Tag tone="gold">
                          <EditableText
                            path={`${basePath}.priceLabel`}
                            value={a.priceLabel}
                          />
                        </Tag>
                      </span>
                    </div>
                    <div className="pointer-events-auto absolute inset-x-0 bottom-0 px-5 pb-4 text-white">
                      <h3
                        className="font-[var(--font-playfair-display)] text-2xl"
                        style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
                      >
                        <EditableText
                          path={`${basePath}.name`}
                          value={a.name}
                        />
                      </h3>
                      <p className="mt-1 text-xs text-[var(--rsvp-ink-dim)]">
                        <EditableText
                          path={`${basePath}.venue`}
                          value={a.venue}
                        />{" · "}
                        <EditableText
                          path={`${basePath}.time`}
                          value={a.time}
                        />
                      </p>
                    </div>
                  </div>
                ) : (
                  <header className="flex items-start justify-between gap-4 p-6 pb-0">
                    <div className="flex-1">
                      <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-[var(--rsvp-teal)]">
                        <EditableText
                          path={`${basePath}.dayLabel`}
                          value={a.dayLabel}
                        />{" · "}
                        <EditableText
                          path={`${basePath}.dayDate`}
                          value={a.dayDate}
                        />
                      </p>
                      <EditableText
                        path={`${basePath}.name`}
                        value={a.name}
                        as="h3"
                        className="mt-1 font-[var(--font-playfair-display)] text-2xl"
                      />
                      <p className="mt-1 text-sm text-[var(--rsvp-ink-dim)]">
                        <EditableText
                          path={`${basePath}.venue`}
                          value={a.venue}
                        />{" · "}
                        <EditableText
                          path={`${basePath}.time`}
                          value={a.time}
                        />
                      </p>
                    </div>
                    <Tag tone="gold">
                      <EditableText
                        path={`${basePath}.priceLabel`}
                        value={a.priceLabel}
                      />
                    </Tag>
                  </header>
                )}

                <div className="flex flex-1 flex-col gap-4 p-6 pt-5">
                  <EditableText
                    path={`${basePath}.description`}
                    value={a.description}
                    as="p"
                    multiline
                    className="text-sm leading-7 text-[var(--rsvp-ink)]"
                  />

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

                  <footer className="mt-auto flex flex-col gap-3 border-t border-[var(--rsvp-border-soft)] pt-4">
                    {a.rsvpQuestionSlug ? (
                      <div>
                        <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.3em] text-[var(--rsvp-ink-dim)]">
                          RSVP
                        </p>
                        <QuickRSVP slug={a.rsvpQuestionSlug} />
                      </div>
                    ) : null}
                    {(a.pricePerPerson ?? 0) > 0 ? (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {a.depositsDueBy ? (
                            <Tag tone="hot">Due {a.depositsDueBy}</Tag>
                          ) : null}
                          <DepositStatusToggle activityId={a.id} />
                        </div>
                        <Link
                          href="/rsvp/deposits"
                          className="rsvp-btn rsvp-btn-neon px-4 py-2 text-xs"
                        >
                          Pay deposit
                        </Link>
                      </div>
                    ) : null}
                  </footer>
                </div>
              </article>
            );
          })}
        </div>

        <EditableText
          path="activities.closingNote"
          value={activities.closingNote}
          as="p"
          multiline
          className="mt-8 block rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.45)] px-5 py-5 text-center text-sm leading-7 text-[var(--rsvp-ink-dim)]"
        />
      </SectionPanel>
      <TocPager />
    </PageShell>
  );
}
