"use client";

import Link from "next/link";

import { DepositStatusToggle } from "@/components/rsvp/deposit-status";
import { EditableText } from "@/components/rsvp/editable";
import { useEventStore } from "@/components/rsvp/event-store";
import { QuickRSVP } from "@/components/rsvp/quick-rsvp";
import { TocPager } from "@/components/rsvp/toc";
import { PageShell, SectionPanel } from "@/components/rsvp/ui";

export default function DepositsPage() {
  const { content } = useEventStore();
  const { deposits, activities, restaurants } = content;
  const paidActivities = activities.items.filter((a) => (a.pricePerPerson ?? 0) > 0);

  return (
    <PageShell>
      <SectionPanel hot>
        <div className="flex flex-col items-center text-center">
          <div className="flex flex-wrap items-baseline justify-center gap-3">
            <h1 className="rsvp-neon rsvp-neon--pink text-4xl sm:text-6xl">RSVPs</h1>
            <span className="font-[var(--font-bebas-neue)] text-3xl tracking-[0.2em] text-[var(--rsvp-ink)] sm:text-5xl">
              &amp;
            </span>
            <h1 className="rsvp-neon rsvp-neon--teal text-4xl sm:text-6xl">Deposits</h1>
          </div>
          <span className="mt-6 rsvp-divider" aria-hidden="true" />
          <p className="mt-6 max-w-2xl text-sm leading-7 text-[var(--rsvp-ink)]">
            To secure your spot for all shows, activities, restaurants, brunches and dinners — please
            RSVP and submit your deposit by
          </p>
          <EditableText
            path="deposits.dueDate"
            value={deposits.dueDate}
            as="p"
            className="mt-4 rsvp-neon rsvp-neon--pink rsvp-flicker text-[3.4rem] leading-[0.9] sm:text-[5rem]"
          />
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.4rem] border border-[var(--rsvp-teal)]/40 bg-[rgba(77,225,255,0.08)] px-5 py-5">
            <EditableText
              path="deposits.whyTitle"
              value={deposits.whyTitle}
              as="p"
              className="font-[var(--font-bebas-neue)] text-lg tracking-[0.22em] text-[var(--rsvp-teal)]"
            />
            <EditableText
              path="deposits.whyBody"
              value={deposits.whyBody}
              as="p"
              multiline
              className="mt-3 text-sm leading-7 text-[var(--rsvp-ink)]"
            />
          </div>
          <div className="rounded-[1.4rem] border border-[var(--rsvp-pink)]/40 bg-[rgba(255,61,154,0.08)] px-5 py-5">
            <EditableText
              path="deposits.paymentTitle"
              value={deposits.paymentTitle}
              as="p"
              className="font-[var(--font-bebas-neue)] text-lg tracking-[0.22em] text-[var(--rsvp-pink-soft)]"
            />
            <EditableText
              path="deposits.paymentBody"
              value={deposits.paymentBody}
              as="p"
              multiline
              className="mt-3 text-sm leading-7 text-[var(--rsvp-ink)]"
            />
          </div>
        </div>
      </SectionPanel>

      <SectionPanel>
        <div className="flex flex-col items-center text-center">
          <span className="rsvp-eyebrow rsvp-eyebrow--gold">Send your deposit to</span>
          <h2 className="mt-5 rsvp-neon rsvp-neon--teal text-3xl sm:text-4xl">
            {deposits.payees.map((p) => p.name).join(" or ")}
          </h2>
          <p className="mt-4 max-w-xl text-sm text-[var(--rsvp-ink-dim)]">
            Tap any handle to open the payment app.
          </p>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {deposits.payees.map((payee) => (
            <div
              key={payee.id}
              className="rounded-[1.4rem] border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.55)] px-5 py-5"
            >
              <h3 className="font-[var(--font-playfair-display)] text-2xl">
                Pay <span className="text-[var(--rsvp-pink-soft)]">{payee.name}</span>
              </h3>
              <div className="mt-4 grid gap-2">
                {payee.paymentLinks.map((link, index) => (
                  <a
                    key={`${link.url}-${index}`}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rsvp-btn rsvp-btn-neon justify-between text-sm"
                  >
                    <span>{link.label}</span>
                    <span aria-hidden="true">↗</span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionPanel>

      <SectionPanel>
        <div className="flex flex-col gap-2">
          <span className="rsvp-eyebrow rsvp-eyebrow--pink">Shows &amp; Activities</span>
          <h2 className="mt-2 font-[var(--font-bebas-neue)] text-3xl tracking-[0.18em] text-[var(--rsvp-pink-soft)]">
            What needs a deposit
          </h2>
        </div>
        <div className="mt-6 grid gap-3">
          {paidActivities.map((a) => (
            <div
              key={a.id}
              className="grid items-center gap-3 rounded-2xl border border-[var(--rsvp-pink)]/30 bg-[rgba(255,61,154,0.05)] px-4 py-4 sm:grid-cols-[auto_1fr_auto]"
            >
              {a.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={a.imageUrl}
                  alt={a.imageAlt ?? a.name}
                  className="h-14 w-14 shrink-0 rounded-xl border border-[var(--rsvp-pink)]/40 object-cover"
                  loading="lazy"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="h-14 w-14 shrink-0 rounded-xl border border-[var(--rsvp-pink)]/30 bg-[rgba(255,61,154,0.08)]"
                />
              )}
              <div>
                <p className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-[var(--rsvp-teal)]">
                  {a.dayLabel} · {a.dayDate}
                </p>
                <p className="mt-1 font-[var(--font-playfair-display)] text-xl">{a.name}</p>
                <p className="text-sm text-[var(--rsvp-ink-dim)]">{a.venue} · {a.time}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="rsvp-tag rsvp-tag-gold">{a.priceLabel}</span>
                {a.rsvpQuestionSlug ? (
                  <QuickRSVP slug={a.rsvpQuestionSlug} showOpenWizard={false} />
                ) : null}
                <DepositStatusToggle activityId={a.id} />
              </div>
            </div>
          ))}
        </div>
      </SectionPanel>

      <SectionPanel>
        <div className="flex flex-col gap-2">
          <span className="rsvp-eyebrow">Brunches &amp; Dinners</span>
          <h2 className="mt-2 font-[var(--font-bebas-neue)] text-3xl tracking-[0.18em] text-[var(--rsvp-teal)]">
            RSVP for a chair at the table
          </h2>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {[...restaurants.brunch, ...restaurants.dinner].map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.55)] px-4 py-3"
            >
              <div>
                <p className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-[var(--rsvp-teal)]">
                  {r.dayLabel}
                </p>
                <p className="mt-1 text-base font-semibold text-[var(--rsvp-ink)]">{r.name}</p>
                <p className="text-xs text-[var(--rsvp-ink-dim)]">{r.venue} · {r.time}</p>
              </div>
              {r.rsvpQuestionSlug ? (
                <QuickRSVP slug={r.rsvpQuestionSlug} showOpenWizard={false} />
              ) : null}
            </div>
          ))}
        </div>
      </SectionPanel>

      <SectionPanel>
        <div className="text-center">
          <EditableText
            path="deposits.closingCallout"
            value={deposits.closingCallout}
            as="p"
            multiline
            className="font-[var(--font-playfair-display)] text-xl italic text-[var(--rsvp-pink-soft)]"
          />
          <Link href="/rsvp/rsvp" className="rsvp-btn rsvp-btn-primary mt-6">
            Fill out the RSVP →
          </Link>
        </div>
      </SectionPanel>
      <TocPager />
    </PageShell>
  );
}
