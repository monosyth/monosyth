"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { useEventStore } from "@/components/rsvp/event-store";
import { isMonosythAdminEmail } from "@/lib/auth/admin";
import {
  listRsvpResponsesDetailedFromClient,
  type RSVPClientResponseDetail,
  type RSVPClientStoredAnswer,
} from "@/lib/rsvp/client";

type LoadState = "idle" | "loading" | "ready" | "error";
type Intent = "attending" | "maybe" | "decline" | "unknown";

function classifyIntent(value: string | null): Intent {
  if (!value) return "unknown";
  const v = value.toLowerCase();
  if (["attending", "yes", "going"].includes(v)) return "attending";
  if (["might-attend", "maybe"].includes(v)) return "maybe";
  if (["cant-make-it", "no", "decline"].includes(v)) return "decline";
  return "unknown";
}

function intentTone(intent: Intent) {
  switch (intent) {
    case "attending":
      return "rsvp-tag rsvp-tag-answered";
    case "maybe":
      return "rsvp-tag rsvp-tag-gold";
    case "decline":
      return "rsvp-tag rsvp-tag-pending";
    default:
      return "rsvp-tag rsvp-tag-pending";
  }
}

function intentLabel(intent: Intent) {
  switch (intent) {
    case "attending":
      return "Yes";
    case "maybe":
      return "Maybe";
    case "decline":
      return "No";
    default:
      return "—";
  }
}

function formatTs(value: string | null) {
  if (!value) return "Just now";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function findAnswer(
  answers: RSVPClientStoredAnswer[],
  slug: string,
): RSVPClientStoredAnswer | undefined {
  return answers.find((a) => a.slug === slug);
}

export default function RsvpsAdminPage() {
  const { isConfigured, isWorking, signInWithGoogle, status, user, error: authError } =
    useAuth();
  const { event, content } = useEventStore();
  const canEdit = status === "signed_in" && isMonosythAdminEmail(user?.email);

  const [responses, setResponses] = useState<RSVPClientResponseDetail[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    if (!canEdit || !user || !event.id) {
      setResponses([]);
      setLoadState("idle");
      return;
    }
    let cancelled = false;
    const currentUser = user;
    const eventId = event.id;

    async function load() {
      setLoadState("loading");
      setLoadError(null);
      try {
        let detail: RSVPClientResponseDetail[];
        try {
          const token = await currentUser.getIdToken();
          const res = await fetch(
            `/api/rsvp/responses?eventId=${encodeURIComponent(eventId)}&detailed=1&limit=500`,
            {
              cache: "no-store",
              headers: { authorization: `Bearer ${token}` },
            },
          );
          if (!res.ok) throw new Error("API unavailable");
          const payload = (await res.json()) as {
            responses?: RSVPClientResponseDetail[];
          };
          detail = Array.isArray(payload?.responses) ? payload.responses : [];
        } catch {
          detail = await listRsvpResponsesDetailedFromClient(eventId, {
            limit: 500,
          });
        }
        if (cancelled) return;
        setResponses(detail);
        setLoadState("ready");
      } catch (err) {
        if (cancelled) return;
        setLoadState("error");
        setLoadError(
          err instanceof Error ? err.message : "Could not load RSVPs.",
        );
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [canEdit, user, event.id, refreshKey]);

  useEffect(() => {
    if (copyState === "idle") return;
    const t = window.setTimeout(() => setCopyState("idle"), 1600);
    return () => window.clearTimeout(t);
  }, [copyState]);

  // Auto-select first guest
  useEffect(() => {
    if (responses.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !responses.some((r) => r.id === selectedId)) {
      setSelectedId(responses[0].id);
    }
  }, [responses, selectedId]);

  /* ---- filtering ---- */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return responses;
    return responses.filter(
      (r) =>
        r.guestName.toLowerCase().includes(q) ||
        r.guestEmail.toLowerCase().includes(q),
    );
  }, [responses, search]);

  const selected = responses.find((r) => r.id === selectedId) ?? null;

  /* ---- aggregate totals per activity + restaurant ---- */
  type Row = { id: string; name: string; dayLabel: string; slug: string; price?: number };
  const activities: Row[] = content.activities.items
    .filter((a) => a.rsvpQuestionSlug)
    .map((a) => ({
      id: a.id,
      name: a.name,
      dayLabel: a.dayLabel,
      slug: a.rsvpQuestionSlug!,
      price: a.pricePerPerson,
    }));
  const restaurants: Row[] = [...content.restaurants.brunch, ...content.restaurants.dinner]
    .filter((r) => r.rsvpQuestionSlug)
    .map((r) => ({ id: r.id, name: r.name, dayLabel: r.dayLabel, slug: r.rsvpQuestionSlug! }));

  type Tally = { attending: number; maybe: number; decline: number; unknown: number };
  function tallyForSlug(slug: string): Tally {
    const out: Tally = { attending: 0, maybe: 0, decline: 0, unknown: 0 };
    for (const r of responses) {
      const a = findAnswer(r.answers, slug);
      const intent =
        a && typeof a.value === "string" ? classifyIntent(a.value) : "unknown";
      out[intent] += 1;
    }
    return out;
  }

  const activityTallies = activities.map((a) => ({ row: a, tally: tallyForSlug(a.slug) }));
  const restaurantTallies = restaurants.map((r) => ({ row: r, tally: tallyForSlug(r.slug) }));

  /* ---- selected guest derived ---- */
  const selectedActivityRows = selected
    ? activities.map((a) => ({
        row: a,
        answer: findAnswer(selected.answers, a.slug),
      }))
    : [];
  const selectedRestaurantRows = selected
    ? restaurants.map((r) => ({
        row: r,
        answer: findAnswer(selected.answers, r.slug),
      }))
    : [];

  const selectedEstimate = selected
    ? selectedActivityRows.reduce((acc, { row, answer }) => {
        if (!row.price) return acc;
        const intent =
          answer && typeof answer.value === "string"
            ? classifyIntent(answer.value)
            : "unknown";
        if (intent === "attending") return acc + row.price;
        return acc;
      }, 0)
    : 0;

  /* ---- exports ---- */
  const copySelectedSummary = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard?.writeText(selected.summaryText);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  };

  const exportCsv = () => {
    if (responses.length === 0) return;
    // Build a union of all question slugs used across responses, in stable order:
    // overview questions first (event.questions), then any extras.
    const baseSlugs = event.questions.map((q) => q.slug);
    const extraSlugs = new Set<string>();
    for (const r of responses) {
      for (const a of r.answers) {
        if (!baseSlugs.includes(a.slug)) extraSlugs.add(a.slug);
      }
    }
    const columns = ["guestName", "guestEmail", "submittedAt", ...baseSlugs, ...Array.from(extraSlugs)];
    const esc = (s: string) => {
      const trimmed = s ?? "";
      if (/[",\n]/.test(trimmed)) {
        return `"${trimmed.replace(/"/g, '""')}"`;
      }
      return trimmed;
    };
    const header = columns.join(",");
    const rows = responses.map((r) => {
      const cells = columns.map((col) => {
        if (col === "guestName") return esc(r.guestName);
        if (col === "guestEmail") return esc(r.guestEmail);
        if (col === "submittedAt") return esc(formatTs(r.createdAt));
        const ans = findAnswer(r.answers, col);
        return esc(ans?.formattedValue ?? "");
      });
      return cells.join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.slug || "rsvps"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /* ---- rendering ---- */
  if (!canEdit) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-16 text-center">
        <span className="rsvp-eyebrow rsvp-eyebrow--pink">Admin only</span>
        <h1 className="mt-6 rsvp-neon rsvp-neon--pink text-4xl">Sign in to continue</h1>
        <p className="mt-4 text-sm text-[var(--rsvp-ink-dim)]">
          The RSVP inbox is limited to approved Monosyth accounts.
        </p>
        <button
          type="button"
          onClick={() => void signInWithGoogle()}
          disabled={!isConfigured || isWorking}
          className="rsvp-btn rsvp-btn-primary mt-8"
        >
          {isWorking ? "Working…" : "Admin sign in"}
        </button>
        {authError ? (
          <p className="mt-4 rounded-2xl border border-[var(--rsvp-pink)]/30 bg-[var(--rsvp-pink)]/10 px-4 py-3 text-sm text-[var(--rsvp-pink-soft)]">
            {authError}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-6 px-4 py-8 sm:px-8 lg:px-12">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(7,4,10,0.7)] px-5 py-4">
        <div className="flex items-center gap-4">
          <span className="rsvp-eyebrow rsvp-eyebrow--gold">My RSVPs</span>
          <span className="text-sm text-[var(--rsvp-ink)]">{event.title}</span>
          <span className="rsvp-tag rsvp-tag-answered">{responses.length} submitted</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/rsvp/admin" className="rsvp-btn rsvp-btn-ghost px-3 py-1.5 text-xs">
            Content editor
          </Link>
          <Link href="/rsvp" className="rsvp-btn rsvp-btn-ghost px-3 py-1.5 text-xs">
            View live site
          </Link>
          <button
            type="button"
            onClick={() => setRefreshKey((v) => v + 1)}
            className="rsvp-btn rsvp-btn-ghost px-3 py-1.5 text-xs"
          >
            ↻ Refresh
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={responses.length === 0}
            className="rsvp-btn rsvp-btn-neon px-3 py-1.5 text-xs"
          >
            Export CSV
          </button>
        </div>
      </header>

      {loadError ? (
        <p className="rounded-2xl border border-[var(--rsvp-pink)]/40 bg-[var(--rsvp-pink)]/10 px-4 py-3 text-sm text-[var(--rsvp-pink-soft)]">
          {loadError}
        </p>
      ) : null}

      {/* Aggregate totals */}
      <section className="rsvp-panel rounded-[1.6rem] px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-[var(--font-bebas-neue)] text-xl tracking-[0.22em] text-[var(--rsvp-teal)]">
            Headcount snapshot
          </h2>
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-[var(--rsvp-ink-dim)]">
            Across {responses.length} {responses.length === 1 ? "guest" : "guests"}
          </span>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[var(--rsvp-pink-soft)]">
              Activities & shows
            </p>
            <TallyTable rows={activityTallies} />
          </div>
          <div>
            <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[var(--rsvp-teal)]">
              Restaurants
            </p>
            <TallyTable rows={restaurantTallies} />
          </div>
        </div>
      </section>

      {/* Main layout: guest list + detail */}
      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        {/* Guest list */}
        <aside className="rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(7,4,10,0.55)] p-3">
          <div className="mb-3 px-1">
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-[var(--rsvp-ink-dim)]">
                Search guests
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or email"
                className="rsvp-input text-sm"
              />
            </label>
          </div>

          {loadState === "loading" ? (
            <p className="px-3 py-6 text-center text-xs uppercase tracking-[0.28em] text-[var(--rsvp-ink-dim)]">
              Loading…
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-[var(--rsvp-ink-dim)]">
              {responses.length === 0 ? "No RSVPs yet." : "No matches."}
            </p>
          ) : (
            <ul className="grid gap-1">
              {filtered.map((r) => {
                const active = r.id === selectedId;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(r.id)}
                      className={`w-full rounded-xl px-3 py-3 text-left transition ${
                        active
                          ? "bg-gradient-to-r from-[var(--rsvp-pink)] to-[#d3278b] text-white shadow-[0_0_14px_rgba(255,61,154,0.45)]"
                          : "text-[var(--rsvp-ink)] hover:bg-white/5"
                      }`}
                    >
                      <p className="text-sm font-semibold">{r.guestName}</p>
                      <p
                        className={`mt-1 text-xs ${
                          active ? "text-white/80" : "text-[var(--rsvp-ink-dim)]"
                        }`}
                      >
                        {r.guestEmail}
                      </p>
                      <p
                        className={`mt-1 font-mono text-[0.6rem] uppercase tracking-[0.22em] ${
                          active ? "text-white/70" : "text-[var(--rsvp-ink-dim)]"
                        }`}
                      >
                        {formatTs(r.createdAt)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Guest detail */}
        <div className="rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(7,4,10,0.55)] p-5 sm:p-7">
          {!selected ? (
            <p className="text-sm text-[var(--rsvp-ink-dim)]">
              Pick a guest on the left to see their answers.
            </p>
          ) : (
            <div className="grid gap-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--rsvp-border-soft)] pb-4">
                <div>
                  <h2 className="font-[var(--font-playfair-display)] text-3xl">
                    {selected.guestName}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--rsvp-ink-dim)]">
                    {selected.guestEmail}
                  </p>
                  <p className="mt-2 font-mono text-[0.6rem] uppercase tracking-[0.3em] text-[var(--rsvp-teal)]">
                    Submitted {formatTs(selected.createdAt)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="rsvp-tag rsvp-tag-gold">
                    {selectedEstimate > 0
                      ? `Est. deposit $${selectedEstimate}`
                      : "No paid items"}
                  </span>
                  <button
                    type="button"
                    onClick={() => void copySelectedSummary()}
                    className="rsvp-btn rsvp-btn-neon px-3 py-1.5 text-xs"
                  >
                    {copyState === "copied"
                      ? "Copied!"
                      : copyState === "error"
                      ? "Clipboard off"
                      : "Copy summary"}
                  </button>
                </div>
              </div>

              {/* Activities */}
              <section>
                <h3 className="mb-3 font-[var(--font-bebas-neue)] text-lg tracking-[0.22em] text-[var(--rsvp-pink-soft)]">
                  Activities & Shows
                </h3>
                <ul className="grid gap-2">
                  {selectedActivityRows.map(({ row, answer }) => {
                    const intent =
                      answer && typeof answer.value === "string"
                        ? classifyIntent(answer.value)
                        : "unknown";
                    return (
                      <li
                        key={row.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.45)] px-4 py-3"
                      >
                        <div>
                          <p className="font-mono text-[0.6rem] uppercase tracking-[0.3em] text-[var(--rsvp-teal)]">
                            {row.dayLabel}
                          </p>
                          <p className="mt-0.5 text-sm font-semibold">{row.name}</p>
                          {row.price ? (
                            <p className="mt-0.5 text-[0.7rem] text-[var(--rsvp-gold)]">
                              ${row.price} per person
                            </p>
                          ) : null}
                        </div>
                        <span className={intentTone(intent)}>{intentLabel(intent)}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>

              {/* Restaurants */}
              <section>
                <h3 className="mb-3 font-[var(--font-bebas-neue)] text-lg tracking-[0.22em] text-[var(--rsvp-teal)]">
                  Restaurants
                </h3>
                <ul className="grid gap-2">
                  {selectedRestaurantRows.map(({ row, answer }) => {
                    const intent =
                      answer && typeof answer.value === "string"
                        ? classifyIntent(answer.value)
                        : "unknown";
                    return (
                      <li
                        key={row.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.45)] px-4 py-3"
                      >
                        <div>
                          <p className="font-mono text-[0.6rem] uppercase tracking-[0.3em] text-[var(--rsvp-teal)]">
                            {row.dayLabel}
                          </p>
                          <p className="mt-0.5 text-sm font-semibold">{row.name}</p>
                        </div>
                        <span className={intentTone(intent)}>{intentLabel(intent)}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>

              {/* Full answer dump */}
              <section>
                <h3 className="mb-3 font-[var(--font-bebas-neue)] text-lg tracking-[0.22em] text-[var(--rsvp-ink-dim)]">
                  All answers
                </h3>
                <ul className="grid gap-2">
                  {selected.answers.map((a) => (
                    <li
                      key={a.questionId}
                      className="rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.45)] px-4 py-3"
                    >
                      <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--rsvp-ink-dim)]">
                        {a.slug}
                      </p>
                      <p className="mt-1 text-sm font-semibold">{a.title}</p>
                      <p className="mt-1 text-sm text-[var(--rsvp-ink)]">
                        {a.formattedValue || "—"}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TallyTable({
  rows,
}: Readonly<{
  rows: Array<{
    row: { id: string; name: string; dayLabel: string; slug: string; price?: number };
    tally: { attending: number; maybe: number; decline: number; unknown: number };
  }>;
}>) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--rsvp-border-soft)] bg-black/20 px-3 py-3 text-center text-xs text-[var(--rsvp-ink-dim)]">
        Nothing configured.
      </p>
    );
  }
  return (
    <ul className="grid gap-2">
      {rows.map(({ row, tally }) => (
        <li
          key={row.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.45)] px-3 py-2.5"
        >
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.3em] text-[var(--rsvp-ink-dim)]">
              {row.dayLabel}
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold">{row.name}</p>
          </div>
          <div className="flex shrink-0 gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.18em]">
            <span className="rsvp-tag rsvp-tag-answered" aria-label="Attending">
              ✓ {tally.attending}
            </span>
            <span className="rsvp-tag rsvp-tag-gold" aria-label="Maybe">
              ? {tally.maybe}
            </span>
            <span className="rsvp-tag rsvp-tag-pending" aria-label="Decline">
              × {tally.decline}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
