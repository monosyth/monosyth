"use client";

import { useEventStore } from "@/components/rsvp/event-store";

export function DepositStatusToggle({
  activityId,
  label = "Deposit sent",
}: Readonly<{ activityId: string; label?: string }>) {
  const { deposits, setDepositStatus } = useEventStore();
  const sent = Boolean(deposits[activityId]);

  return (
    <button
      type="button"
      onClick={() => setDepositStatus(activityId, !sent)}
      aria-pressed={sent}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] transition ${
        sent
          ? "border-[var(--rsvp-gold)]/70 bg-[rgba(244,201,93,0.12)] text-[var(--rsvp-gold)] shadow-[0_0_10px_rgba(244,201,93,0.4)]"
          : "border-white/20 bg-transparent text-[var(--rsvp-ink-dim)] hover:border-[var(--rsvp-gold)]/40 hover:text-[var(--rsvp-gold)]"
      }`}
    >
      <span aria-hidden="true">{sent ? "✓" : "○"}</span>
      {sent ? `${label} ✓` : label}
    </button>
  );
}
