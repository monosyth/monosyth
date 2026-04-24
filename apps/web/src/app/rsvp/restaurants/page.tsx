"use client";

import { EditableImage, EditableText } from "@/components/rsvp/editable";
import { useEventStore } from "@/components/rsvp/event-store";
import { QuickRSVP } from "@/components/rsvp/quick-rsvp";
import { TocPager } from "@/components/rsvp/toc";
import { PageShell, SectionPanel } from "@/components/rsvp/ui";
import type { RestaurantItem } from "@/lib/rsvp/event-content";

function RestaurantCard({
  item,
  basePath,
}: Readonly<{ item: RestaurantItem; basePath: string }>) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.55)]">
      {item.imageUrl ? (
        <div className="relative isolate">
          <EditableImage
            urlPath={`${basePath}.imageUrl`}
            altPath={`${basePath}.imageAlt`}
            url={item.imageUrl}
            alt={item.imageAlt ?? item.name}
            className="h-36 w-full object-cover sm:h-40"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(7,4,10,0.0) 30%, rgba(7,4,10,0.92) 100%)",
            }}
          />
          <div className="pointer-events-auto absolute left-4 right-4 top-4">
            <span className="rsvp-tag rsvp-tag-answered backdrop-blur-sm">
              <EditableText
                path={`${basePath}.dayLabel`}
                value={item.dayLabel}
              />
            </span>
          </div>
          <div className="pointer-events-auto absolute inset-x-0 bottom-0 px-5 pb-4">
            <h3
              className="font-[var(--font-playfair-display)] text-2xl text-white"
              style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
            >
              <EditableText path={`${basePath}.name`} value={item.name} />
            </h3>
            <p className="mt-1 text-xs text-[var(--rsvp-ink-dim)]">
              <EditableText path={`${basePath}.venue`} value={item.venue} />
              {" · "}
              <EditableText path={`${basePath}.time`} value={item.time} />
            </p>
          </div>
        </div>
      ) : (
        <header className="px-5 pt-5">
          <EditableText
            path={`${basePath}.dayLabel`}
            value={item.dayLabel}
            as="p"
            className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-[var(--rsvp-teal)]"
          />
          <EditableText
            path={`${basePath}.name`}
            value={item.name}
            as="h3"
            className="mt-1 font-[var(--font-playfair-display)] text-2xl"
          />
          <p className="mt-1 text-sm text-[var(--rsvp-ink-dim)]">
            <EditableText path={`${basePath}.venue`} value={item.venue} />
            {" · "}
            <EditableText path={`${basePath}.time`} value={item.time} />
          </p>
        </header>
      )}

      <div className="flex flex-1 flex-col gap-3 px-5 pb-5 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rsvp-tag rsvp-tag-gold">
            <EditableText
              path={`${basePath}.priceRange`}
              value={item.priceRange}
            />
          </span>
          {item.theme ? (
            <span className="rsvp-tag rsvp-tag-hot">
              <EditableText
                path={`${basePath}.theme`}
                value={item.theme}
              />
            </span>
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
        <div className="flex flex-col items-center gap-5 text-center">
          <EditableText
            path="restaurants.eyebrow"
            value={restaurants.eyebrow}
            className="rsvp-eyebrow"
          />
          <h1 className="rsvp-neon rsvp-neon--teal text-4xl leading-[0.95] sm:text-5xl">
            Brunches & Dinners
          </h1>
          <EditableText
            path="restaurants.intro"
            value={restaurants.intro}
            as="p"
            multiline
            className="max-w-2xl text-sm leading-7 text-[var(--rsvp-ink-dim)] sm:text-base"
          />
          <span className="rsvp-divider" aria-hidden="true" />
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="rsvp-script text-[2.4rem] text-[var(--rsvp-teal)]">Brunch</h2>
            <div className="mt-4 grid gap-3">
              {restaurants.brunch.map((item, i) => (
                <RestaurantCard
                  key={item.id}
                  item={item}
                  basePath={`restaurants.brunch[${i}]`}
                />
              ))}
            </div>
          </div>
          <div>
            <h2 className="rsvp-script text-[2.4rem] text-[var(--rsvp-pink-soft)]">Dinner</h2>
            <div className="mt-4 grid gap-3">
              {restaurants.dinner.map((item, i) => (
                <RestaurantCard
                  key={item.id}
                  item={item}
                  basePath={`restaurants.dinner[${i}]`}
                />
              ))}
            </div>
          </div>
        </div>

        <EditableText
          path="restaurants.note"
          value={restaurants.note}
          as="p"
          multiline
          className="mt-8 block rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.45)] px-5 py-5 text-center text-sm leading-7 text-[var(--rsvp-ink-dim)]"
        />
      </SectionPanel>
      <TocPager />
    </PageShell>
  );
}
