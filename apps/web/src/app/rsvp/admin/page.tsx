"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { isMonosythAdminEmail } from "@/lib/auth/admin";
import {
  ActivitiesEditor,
  DepositsEditor,
  DressBoardsEditor,
  HotelEditor,
  NextStepsEditor,
  OverviewEditor,
  RestaurantsEditor,
  ScheduleEditor,
  TravelTipsEditor,
} from "@/components/rsvp/admin/section-editors";
import { useEventStore } from "@/components/rsvp/event-store";
import {
  DALLAS_EVENT_CONTENT,
  type EventContent,
} from "@/lib/rsvp/event-content";
import {
  normalizeStudio,
  type RSVPStudio,
} from "@/lib/rsvp/form-data";
import { writeRsvpStudioFromClient } from "@/lib/rsvp/client";

type TabId =
  | "overview"
  | "hotel"
  | "tips"
  | "schedule"
  | "dress"
  | "activities"
  | "restaurants"
  | "deposits"
  | "next";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "hotel", label: "Hotel" },
  { id: "tips", label: "Travel Tips" },
  { id: "schedule", label: "Daily Schedule" },
  { id: "dress", label: "Dress Boards" },
  { id: "activities", label: "Activities" },
  { id: "restaurants", label: "Restaurants" },
  { id: "deposits", label: "Deposits" },
  { id: "next", label: "Next Steps" },
];

type SaveState = "idle" | "saving" | "saved" | "error";

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export default function AdminPage() {
  const {
    isConfigured,
    isWorking,
    signInWithGoogle,
    status,
    user,
    error: authError,
  } = useAuth();
  const { event, content: liveContent, ready } = useEventStore();
  const canEdit = status === "signed_in" && isMonosythAdminEmail(user?.email);

  const [draft, setDraft] = useState<EventContent | null>(null);
  const [tab, setTab] = useState<TabId>("overview");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Seed the draft from whatever the store currently has, once we're ready.
  useEffect(() => {
    if (!ready) return;
    if (draft) return;
    setDraft(deepClone(liveContent ?? DALLAS_EVENT_CONTENT));
  }, [ready, liveContent, draft]);

  const isDirty = useMemo(() => {
    if (!draft) return false;
    return JSON.stringify(draft) !== JSON.stringify(liveContent);
  }, [draft, liveContent]);

  const handleDiscard = () => {
    setDraft(deepClone(liveContent ?? DALLAS_EVENT_CONTENT));
    setSaveState("idle");
    setSaveMessage(null);
  };

  const handlePublish = async () => {
    if (!draft || !user) return;
    setSaveState("saving");
    setSaveMessage(null);

    // Build the next studio by merging our draft content into the active event.
    const nextStudio: RSVPStudio = normalizeStudio({
      events: [{ ...event, content: draft }],
    });

    try {
      // Try server API first; fall back to direct Firestore from the client.
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/rsvp/studio", {
          method: "PUT",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ studio: nextStudio }),
        });
        if (!res.ok) throw new Error("API publish failed");
      } catch {
        await writeRsvpStudioFromClient(nextStudio, {
          email: user.email ?? "",
          uid: user.uid,
        });
      }
      setSaveState("saved");
      setSaveMessage("Published. Guest pages will pick this up on next load.");
    } catch (err) {
      setSaveState("error");
      setSaveMessage(
        err instanceof Error ? err.message : "Could not publish. Try again.",
      );
    }
  };

  if (!canEdit) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-16 text-center">
        <span className="rsvp-eyebrow rsvp-eyebrow--pink">Admin only</span>
        <h1 className="mt-6 rsvp-neon rsvp-neon--pink text-4xl">Sign in to continue</h1>
        <p className="mt-4 text-sm text-[var(--rsvp-ink-dim)]">
          Event editing is limited to approved Monosyth accounts.
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

  if (!draft) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-16 text-center">
        <p className="font-mono text-[0.78rem] uppercase tracking-[0.3em] text-[var(--rsvp-ink-dim)]">
          Loading the guidebook…
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-6 px-4 py-8 sm:px-8 lg:px-12">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(7,4,10,0.7)] px-5 py-4">
        <div className="flex items-center gap-4">
          <span className="rsvp-eyebrow rsvp-eyebrow--gold">Admin Studio</span>
          <span className="text-sm text-[var(--rsvp-ink)]">{event.title}</span>
          <span
            className={`rsvp-tag ${
              isDirty ? "rsvp-tag-hot" : "rsvp-tag-answered"
            }`}
          >
            {isDirty ? "Unpublished changes" : "Live"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/rsvp/admin/rsvps"
            className="rsvp-btn rsvp-btn-neon px-3 py-1.5 text-xs"
          >
            My RSVPs
          </Link>
          <Link
            href="/rsvp"
            className="rsvp-btn rsvp-btn-ghost px-3 py-1.5 text-xs"
          >
            View live site
          </Link>
          <Link
            href="/rsvp/rsvp"
            className="rsvp-btn rsvp-btn-ghost px-3 py-1.5 text-xs"
          >
            Edit questions
          </Link>
          <button
            type="button"
            onClick={handleDiscard}
            disabled={!isDirty || saveState === "saving"}
            className="rsvp-btn rsvp-btn-ghost px-3 py-1.5 text-xs"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={() => void handlePublish()}
            disabled={!isDirty || saveState === "saving"}
            className="rsvp-btn rsvp-btn-primary px-3 py-1.5 text-xs"
          >
            {saveState === "saving" ? "Publishing…" : "Publish"}
          </button>
        </div>
      </header>

      {saveMessage ? (
        <p
          className={`rounded-2xl border px-4 py-3 text-sm ${
            saveState === "error"
              ? "border-[var(--rsvp-pink)]/40 bg-[var(--rsvp-pink)]/10 text-[var(--rsvp-pink-soft)]"
              : "border-[var(--rsvp-teal)]/40 bg-[var(--rsvp-teal)]/10 text-[var(--rsvp-teal-soft)]"
          }`}
        >
          {saveMessage}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
        {/* Sidebar */}
        <aside className="rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(7,4,10,0.55)] p-3">
          <p className="mb-2 px-2 font-mono text-[0.62rem] uppercase tracking-[0.3em] text-[var(--rsvp-ink-dim)]">
            Sections
          </p>
          <nav className="grid gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-xl px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.16em] transition ${
                  tab === t.id
                    ? "bg-gradient-to-r from-[var(--rsvp-pink)] to-[#d3278b] text-white shadow-[0_0_14px_rgba(255,61,154,0.45)]"
                    : "text-[var(--rsvp-ink-dim)] hover:bg-white/5 hover:text-[var(--rsvp-ink)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Editor pane */}
        <div className="rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(7,4,10,0.55)] p-5 sm:p-7">
          {tab === "overview" ? (
            <OverviewEditor
              value={draft.overview}
              onChange={(overview) => setDraft({ ...draft, overview })}
            />
          ) : null}
          {tab === "hotel" ? (
            <HotelEditor
              value={draft.hotel}
              onChange={(hotel) => setDraft({ ...draft, hotel })}
            />
          ) : null}
          {tab === "tips" ? (
            <TravelTipsEditor
              value={draft.travelTips}
              onChange={(travelTips) => setDraft({ ...draft, travelTips })}
            />
          ) : null}
          {tab === "schedule" ? (
            <ScheduleEditor
              value={draft.schedule}
              dressBoards={draft.dressBoards}
              onChange={(schedule) => setDraft({ ...draft, schedule })}
            />
          ) : null}
          {tab === "dress" ? (
            <DressBoardsEditor
              value={draft.dressBoards}
              onChange={(dressBoards) => setDraft({ ...draft, dressBoards })}
            />
          ) : null}
          {tab === "activities" ? (
            <ActivitiesEditor
              value={draft.activities}
              onChange={(activities) => setDraft({ ...draft, activities })}
            />
          ) : null}
          {tab === "restaurants" ? (
            <RestaurantsEditor
              value={draft.restaurants}
              onChange={(restaurants) => setDraft({ ...draft, restaurants })}
            />
          ) : null}
          {tab === "deposits" ? (
            <DepositsEditor
              value={draft.deposits}
              onChange={(deposits) => setDraft({ ...draft, deposits })}
            />
          ) : null}
          {tab === "next" ? (
            <NextStepsEditor
              value={draft.nextSteps}
              onChange={(nextSteps) => setDraft({ ...draft, nextSteps })}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
