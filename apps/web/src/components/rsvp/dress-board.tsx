import type { DressBoard } from "@/lib/rsvp/event-content";

export function DressBoardView({ board }: Readonly<{ board: DressBoard }>) {
  return (
    <section className="rsvp-panel rounded-[2rem] px-6 py-8 sm:px-10">
      <div className="flex flex-col items-center text-center">
        <span className="rsvp-eyebrow">{board.eyebrow}</span>
        <h2 className="mt-5 font-[var(--font-bebas-neue)] text-[3rem] leading-[0.9] tracking-[0.05em] text-[var(--rsvp-gold)] sm:text-[4rem]">
          {board.title}
        </h2>
        <span className="mt-5 rsvp-divider" aria-hidden="true" />
        {board.callout ? (
          <p className="mt-6 max-w-2xl font-[var(--font-playfair-display)] italic text-[var(--rsvp-ink-dim)]">
            {board.callout}
          </p>
        ) : null}
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <h3 className="font-[var(--font-bebas-neue)] text-xl tracking-[0.3em] text-[var(--rsvp-pink)]">
            Think
          </h3>
          <ul className="mt-4 grid gap-2">
            {board.think.map((item) => (
              <li
                key={item}
                className="rounded-xl border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.55)] px-4 py-2 text-sm text-[var(--rsvp-ink)]"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-[var(--font-bebas-neue)] text-xl tracking-[0.3em] text-[var(--rsvp-pink)]">
            Beat the Heat
          </h3>
          <ul className="mt-4 grid gap-2">
            {board.beatTheHeat.map((item) => (
              <li
                key={item}
                className="rounded-xl border border-[var(--rsvp-teal)]/30 bg-[rgba(77,225,255,0.08)] px-4 py-2 text-sm text-[var(--rsvp-teal-soft)]"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
