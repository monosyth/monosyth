"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useEventStore } from "@/components/rsvp/event-store";
import type { RSVPOption } from "@/lib/rsvp/form-data";

type Intent = "attending" | "maybe" | "decline";

/**
 * For single_select questions, map each question option to one of three
 * intents so we can render Yes/Maybe/No pills regardless of the specific
 * string values (attending / might-attend / cant-make-it / yes / no / maybe).
 */
function classifyOption(opt: RSVPOption): Intent | null {
  const v = opt.value.toLowerCase();
  if (["attending", "yes", "going"].includes(v)) return "attending";
  if (["might-attend", "maybe"].includes(v)) return "maybe";
  if (["cant-make-it", "no", "decline"].includes(v)) return "decline";
  // Secondary: match labels
  const l = opt.label.toLowerCase();
  if (l.includes("attending") || l.startsWith("yes")) return "attending";
  if (l.includes("might") || l.includes("maybe")) return "maybe";
  if (l.includes("can't") || l.includes("cant") || l.startsWith("no")) return "decline";
  return null;
}

function intentLabel(intent: Intent): string {
  switch (intent) {
    case "attending":
      return "Yes, attending";
    case "maybe":
      return "Maybe";
    case "decline":
      return "Can't make it";
  }
}

export function QuickRSVP({
  slug,
  layout = "stack",
  showOpenWizard = true,
  wizardLabel = "Full form",
}: Readonly<{
  slug: string;
  /** "stack" = vertical pills; "row" = inline. */
  layout?: "stack" | "row";
  /** Show a "Full form" link next to the chips. */
  showOpenWizard?: boolean;
  wizardLabel?: string;
}>) {
  const { getQuestionBySlug, getAnswerBySlug, setAnswerBySlug, ready } =
    useEventStore();
  const q = getQuestionBySlug(slug);
  const current = getAnswerBySlug(slug);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!justSaved) return;
    const t = window.setTimeout(() => setJustSaved(false), 1400);
    return () => window.clearTimeout(t);
  }, [justSaved]);

  // If we haven't loaded the question yet, show a lightweight placeholder.
  if (!ready || !q) {
    return (
      <div
        className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[var(--rsvp-ink-dim)]"
        aria-hidden="true"
      >
        <span className="inline-block h-6 w-16 animate-pulse rounded-full bg-white/5" />
        <span className="inline-block h-6 w-16 animate-pulse rounded-full bg-white/5" />
      </div>
    );
  }

  // For anything not a single_select, just link to the wizard for that question.
  if (q.type !== "single_select") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/rsvp/rsvp?q=${slug}`}
          className="rsvp-btn rsvp-btn-neon px-3 py-1.5 text-xs"
        >
          Answer in wizard →
        </Link>
      </div>
    );
  }

  // Build the three-intent pill set from the question's options.
  const mapped: Array<{ intent: Intent; opt: RSVPOption }> = [];
  for (const intent of ["attending", "maybe", "decline"] as Intent[]) {
    const match = q.options?.find((o) => classifyOption(o) === intent);
    if (match) mapped.push({ intent, opt: match });
  }

  // If we couldn't classify any option (custom options), fall back to showing all.
  const optionsToShow =
    mapped.length === 0
      ? (q.options ?? []).map((o) => ({
          intent: null as Intent | null,
          opt: o,
        }))
      : mapped;

  const handleClick = (value: string) => {
    setAnswerBySlug(slug, value);
    setJustSaved(true);
  };

  return (
    <div
      className={
        layout === "stack"
          ? "flex flex-col items-start gap-2"
          : "flex flex-wrap items-center gap-2"
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        {optionsToShow.map(({ intent, opt }) => {
          const active = current === opt.value;
          const toneClass =
            intent === "attending"
              ? active
                ? "bg-gradient-to-r from-[var(--rsvp-teal)] to-[#3bbfd9] text-[#041219] border-[var(--rsvp-teal)] shadow-[0_0_14px_rgba(77,225,255,0.45)]"
                : "text-[var(--rsvp-teal)] border-[var(--rsvp-teal)]/45 hover:bg-[rgba(77,225,255,0.08)]"
              : intent === "maybe"
              ? active
                ? "bg-gradient-to-r from-[var(--rsvp-gold)] to-[#e0ac3f] text-[#0a0610] border-[var(--rsvp-gold)] shadow-[0_0_14px_rgba(244,201,93,0.45)]"
                : "text-[var(--rsvp-gold)] border-[var(--rsvp-gold)]/45 hover:bg-[rgba(244,201,93,0.08)]"
              : intent === "decline"
              ? active
                ? "bg-white/15 text-[var(--rsvp-ink)] border-white/40"
                : "text-[var(--rsvp-ink-dim)] border-white/20 hover:bg-white/5 hover:text-[var(--rsvp-ink)]"
              : active
              ? "bg-gradient-to-r from-[var(--rsvp-pink)] to-[#d3278b] text-white border-[var(--rsvp-pink)] shadow-[0_0_14px_rgba(255,61,154,0.45)]"
              : "text-[var(--rsvp-pink-soft)] border-[var(--rsvp-pink)]/45 hover:bg-[rgba(255,61,154,0.08)]";
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleClick(opt.value)}
              aria-pressed={active}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition ${toneClass}`}
            >
              {intent ? (
                <span aria-hidden="true">
                  {intent === "attending" ? "✓" : intent === "maybe" ? "?" : "×"}
                </span>
              ) : null}
              {intent ? intentLabel(intent) : opt.label}
            </button>
          );
        })}
        {showOpenWizard ? (
          <Link
            href={`/rsvp/rsvp?q=${slug}`}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.18em] text-[var(--rsvp-ink-dim)] transition hover:border-white/30 hover:text-[var(--rsvp-ink)]"
          >
            {wizardLabel} →
          </Link>
        ) : null}
      </div>
      {justSaved ? (
        <span
          role="status"
          className="inline-flex items-center gap-1 text-[0.65rem] font-mono uppercase tracking-[0.25em] text-[var(--rsvp-teal)]"
          aria-live="polite"
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--rsvp-teal)]"
            style={{ boxShadow: "0 0 6px rgba(77,225,255,0.8)" }}
          />
          Saved
        </span>
      ) : null}
    </div>
  );
}
