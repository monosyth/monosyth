"use client";

import { useEventStore } from "@/components/rsvp/event-store";
import { QuickRSVP } from "@/components/rsvp/quick-rsvp";
import { TocPager } from "@/components/rsvp/toc";
import { PageShell, SectionHeading, SectionPanel } from "@/components/rsvp/ui";
import type { RestaurantItem } from "@/lib/rsvp/event-content";

function RestaurantCard({ item }: Readonly<{ item: RestaurantItem }>) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.55)]">
      {item.imageUrl ? (
        <div className="relative isolate">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt={item.imageAlt ?? item.name}
            className="h-36 w-full object-cover sm:h-40"
            loading="lazy"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(7,4,10,0.0) 30%, rgba(7,4,10,0.92) 100%)",
            }}
          />
          <div className="absolute left-4 right-4 top-4">
            <span className="rsvp-tag rsvp-tag-answered backdrop-blur-sm">
              {item.dayLabel}
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 px-5 pb-4">
            <h3
              className="font-[var(--font-playfair-display)] text-2xl text-white"
              style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
            >
              {item.name}
            </h3>
            <p className="mt-1 text-xs text-[var(--rsvp-ink-dim)]">
              {item.venue} · {item.time}
            </p>
          </div>
        </div>
      ) : (
        <header className="px-5 pt-5">
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-[var(--rsvp-teal)]">
            {item.dayLabel}
          </p>
          <h3 className="mt-1 font-[var(--font-playfair-display)] text-2xl">
            {item.name}
          </h3>
          <p className="mt-1 text-sm text-[var(--rsvp-ink-dim)]">
            {item.venue} · {item.time}
          </p>
        </header>
      )}

      <div className="flex flex-1 flex-col gap-3 px-5 pb-5 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rsvp-tag rsvp-tag-gold">{item.priceRange}</span>
          {item.theme ? (
            <span className="rsvp-tag rsvp-tag-hot">{item.theme}</span>
          ) : null}
        </div>
        {item.rsvpQuestionSlug ? (
          <div className="mt-2 border-t border-[var(--rsvp-border-soft)] pt-3">
            <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.3em] text-[var(--rsvp-ink-dim)]">
              RSVP
            </p>
            <QuickRSVP slug={item.rsvpQuestionSlug} />
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function RestaurantsPage() {
  const { content } = useEventStore();
  const { restaurants } = content;

  return (
    <PageShell>
      <SectionPanel>
        <SectionHeading
          eyebrow={restaurants.eyebrow}
          title="Brunches & Dinners"
          subtitle={restaurants.intro}
          tone="teal"
        />

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="rsvp-script text-[2.4rem] text-[var(--rsvp-teal)]">Brunch</h2>
            <div className="mt-4 grid gap-3">
              {restaurants.brunch.map((item) => (
                <RestaurantCard key={item.id} item={item} />
              ))}
            </div>
          </div>
          <div>
            <h2 className="rsvp-script text-[2.4rem] text-[var(--rsvp-pink-soft)]">Dinner</h2>
            <div className="mt-4 grid gap-3">
              {restaurants.dinner.map((item) => (
                <RestaurantCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </div>

        <p className="mt-8 rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.45)] px-5 py-5 text-center text-sm leading-7 text-[var(--rsvp-ink-dim)]">
          {restaurants.note}
        </p>
      </SectionPanel>
      <TocPager />
    </PageShell>
  );
}
