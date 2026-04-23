import Link from "next/link";
import type { Metadata } from "next";

import { PageShell, SectionHeading, SectionPanel } from "@/components/rsvp/ui";
import {
  DALLAS_EVENT_CONTENT,
  type RestaurantItem,
} from "@/lib/rsvp/event-content";

export const metadata: Metadata = {
  title: "Restaurants",
};

function RestaurantCard({ item, kind }: Readonly<{ item: RestaurantItem; kind: "brunch" | "dinner" }>) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.55)] px-5 py-5">
      <header>
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
      <div className="flex flex-wrap items-center gap-2">
        <span className="rsvp-tag rsvp-tag-gold">{item.priceRange}</span>
        {item.theme ? (
          <span className="rsvp-tag rsvp-tag-hot">{item.theme}</span>
        ) : null}
      </div>
      <div className="mt-auto flex flex-wrap gap-2">
        <Link
          href={`/rsvp/rsvp${item.rsvpQuestionSlug ? `?q=${item.rsvpQuestionSlug}` : ""}`}
          className={`rsvp-btn ${kind === "dinner" ? "rsvp-btn-primary" : "rsvp-btn-neon"} px-3 py-1.5 text-xs`}
        >
          RSVP for this {kind === "dinner" ? "dinner" : "brunch"}
        </Link>
      </div>
    </article>
  );
}

export default function RestaurantsPage() {
  const { restaurants } = DALLAS_EVENT_CONTENT;

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
                <RestaurantCard key={item.id} item={item} kind="brunch" />
              ))}
            </div>
          </div>
          <div>
            <h2 className="rsvp-script text-[2.4rem] text-[var(--rsvp-pink-soft)]">Dinner</h2>
            <div className="mt-4 grid gap-3">
              {restaurants.dinner.map((item) => (
                <RestaurantCard key={item.id} item={item} kind="dinner" />
              ))}
            </div>
          </div>
        </div>

        <p className="mt-8 rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.45)] px-5 py-5 text-center text-sm leading-7 text-[var(--rsvp-ink-dim)]">
          {restaurants.note}
        </p>
      </SectionPanel>
    </PageShell>
  );
}
