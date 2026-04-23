"use client";

import { useEffect, useState } from "react";

import {
  eventQuestions,
  rsvpNotes,
  speedVegasInterests,
  welcomeMessage,
  weekendOptions,
  weekendPrompt,
  type EventChoice,
  type EventQuestion,
  type WeekendChoice,
} from "@/lib/rsvp/form-data";

const STORAGE_KEY = "monosyth-rsvp-draft-v1";

type DraftState = {
  guestName: string;
  email: string;
  partySize: number;
  notes: string;
  weekendStatus: WeekendChoice | null;
  events: Record<string, EventChoice | undefined>;
  speedVegasInterests: string[];
};

function createEmptyDraft(): DraftState {
  return {
    guestName: "",
    email: "",
    partySize: 1,
    notes: "",
    weekendStatus: null,
    events: Object.fromEntries(
      eventQuestions.map((question) => [question.slug, undefined]),
    ),
    speedVegasInterests: [],
  };
}

function isWeekendChoice(value: unknown): value is WeekendChoice {
  return value === "attending" || value === "cant-make-it";
}

function isEventChoice(value: unknown): value is EventChoice {
  return (
    value === "attending" ||
    value === "might-attend" ||
    value === "cant-make-it"
  );
}

function normalizeDraft(value: unknown): DraftState {
  const emptyDraft = createEmptyDraft();

  if (!value || typeof value !== "object") {
    return emptyDraft;
  }

  const candidate = value as Partial<DraftState>;
  const nextEvents = { ...emptyDraft.events };

  if (candidate.events && typeof candidate.events === "object") {
    for (const question of eventQuestions) {
      const rawValue = candidate.events[question.slug];

      if (isEventChoice(rawValue)) {
        nextEvents[question.slug] = rawValue;
      }
    }
  }

  const nextInterests = Array.isArray(candidate.speedVegasInterests)
    ? candidate.speedVegasInterests.filter((value): value is string =>
        speedVegasInterests.some((option) => option.slug === value),
      )
    : [];

  return {
    guestName:
      typeof candidate.guestName === "string" ? candidate.guestName : "",
    email: typeof candidate.email === "string" ? candidate.email : "",
    partySize:
      typeof candidate.partySize === "number" &&
      Number.isFinite(candidate.partySize) &&
      candidate.partySize >= 1
        ? Math.min(12, Math.floor(candidate.partySize))
        : 1,
    notes: typeof candidate.notes === "string" ? candidate.notes : "",
    weekendStatus: isWeekendChoice(candidate.weekendStatus)
      ? candidate.weekendStatus
      : null,
    events: nextEvents,
    speedVegasInterests: nextInterests,
  };
}

function formatStatusLabel(
  status: WeekendChoice | EventChoice | undefined | null,
): string {
  switch (status) {
    case "attending":
      return "Attending";
    case "might-attend":
      return "Might attend";
    case "cant-make-it":
      return "Can't make it";
    default:
      return "Pending";
  }
}

function statusTone(status: WeekendChoice | EventChoice | undefined | null) {
  switch (status) {
    case "attending":
      return "border-emerald-300 bg-emerald-100/80 text-emerald-950";
    case "might-attend":
      return "border-amber-300 bg-amber-100/80 text-amber-950";
    case "cant-make-it":
      return "border-rose-300 bg-rose-100/80 text-rose-950";
    default:
      return "border-stone-200 bg-white/75 text-stone-600";
  }
}

function buildSummary(draft: DraftState) {
  const confirmed = eventQuestions.filter(
    (question) => draft.events[question.slug] === "attending",
  );
  const maybe = eventQuestions.filter(
    (question) => draft.events[question.slug] === "might-attend",
  );

  const interestLabels = speedVegasInterests
    .filter((option) => draft.speedVegasInterests.includes(option.slug))
    .map((option) => option.label);

  const lines = [
    `Guest: ${draft.guestName || "Pending name"}`,
    `Email: ${draft.email || "Pending email"}`,
    `Party size: ${draft.partySize}`,
    `Weekend status: ${formatStatusLabel(draft.weekendStatus)}`,
  ];

  if (draft.weekendStatus === "cant-make-it") {
    lines.push("", "I can't make the trip this time.");
  } else {
    lines.push("");
    lines.push("Attending:");
    lines.push(
      ...(confirmed.length
        ? confirmed.map((question) => `- ${question.title}`)
        : ["- Nothing locked in yet"]),
    );
    lines.push("");
    lines.push("Maybe:");
    lines.push(
      ...(maybe.length
        ? maybe.map((question) => `- ${question.title}`)
        : ["- No maybes right now"]),
    );
  }

  if (interestLabels.length) {
    lines.push("");
    lines.push("Speed Vegas interests:");
    lines.push(...interestLabels.map((label) => `- ${label}`));
  }

  if (draft.notes.trim()) {
    lines.push("", "Notes:", draft.notes.trim());
  }

  return lines.join("\n");
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await Promise.race([
        navigator.clipboard.writeText(text),
        new Promise((_, reject) =>
          window.setTimeout(() => reject(new Error("Clipboard timeout")), 1200),
        ),
      ]);

      return true;
    } catch {
      // Fall back to a manual copy path below.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  textarea.style.inset = "0";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}

function Panel({
  children,
  className = "",
  revealIndex = 0,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
  revealIndex?: number;
}>) {
  return (
    <section
      className={`rsvp-panel rsvp-reveal rounded-[2rem] ${className}`.trim()}
      style={{ animationDelay: `${revealIndex * 60}ms` }}
    >
      {children}
    </section>
  );
}

function RadioOption({
  checked,
  description,
  disabled = false,
  label,
  name,
  value,
  onChange,
}: Readonly<{
  checked: boolean;
  description?: string;
  disabled?: boolean;
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
}>) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-4 rounded-[1.4rem] border px-4 py-4 transition ${
        checked
          ? "border-[var(--rsvp-ink)] bg-[var(--rsvp-mint)]/70 shadow-[0_18px_38px_rgba(26,49,44,0.08)]"
          : "border-[var(--rsvp-border)] bg-white/80 hover:border-[var(--rsvp-ink)]/35 hover:bg-white"
      } ${disabled ? "cursor-not-allowed opacity-55" : ""}`.trim()}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          checked
            ? "border-[var(--rsvp-ink)] bg-[var(--rsvp-ink)]"
            : "border-[var(--rsvp-ink)]/25 bg-white"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full bg-white transition ${
            checked ? "opacity-100" : "opacity-0"
          }`}
        />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-base font-semibold tracking-[-0.03em] text-[var(--rsvp-ink)]">
          {label}
        </span>
        {description ? (
          <span className="text-sm leading-6 text-stone-600">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

function CheckboxOption({
  checked,
  description,
  disabled = false,
  label,
  onToggle,
}: Readonly<{
  checked: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  onToggle: () => void;
}>) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-4 rounded-[1.4rem] border px-4 py-4 transition ${
        checked
          ? "border-[var(--rsvp-ink)] bg-[var(--rsvp-blush)]/70 shadow-[0_18px_38px_rgba(80,34,26,0.08)]"
          : "border-[var(--rsvp-border)] bg-white/80 hover:border-[var(--rsvp-ink)]/35 hover:bg-white"
      } ${disabled ? "cursor-not-allowed opacity-55" : ""}`.trim()}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-[0.4rem] border ${
          checked
            ? "border-[var(--rsvp-accent)] bg-[var(--rsvp-accent)]"
            : "border-[var(--rsvp-ink)]/25 bg-white"
        }`}
      >
        <span
          className={`h-2.5 w-2.5 rounded-[0.2rem] bg-white transition ${
            checked ? "opacity-100" : "opacity-0"
          }`}
        />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-base font-semibold tracking-[-0.03em] text-[var(--rsvp-ink)]">
          {label}
        </span>
        <span className="text-sm leading-6 text-stone-600">{description}</span>
      </span>
    </label>
  );
}

function EventCard({
  disabled = false,
  index,
  onChange,
  question,
  value,
}: Readonly<{
  disabled?: boolean;
  index: number;
  onChange: (value: EventChoice) => void;
  question: EventQuestion;
  value?: EventChoice;
}>) {
  return (
    <Panel
      revealIndex={index}
      className={`px-6 py-6 sm:px-7 ${disabled ? "opacity-70" : ""}`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="rsvp-eyebrow">{question.eyebrow}</span>
            <h2
              id={question.slug}
              className="mt-4 max-w-3xl text-2xl font-semibold tracking-[-0.05em] text-[var(--rsvp-ink)] sm:text-[2rem]"
            >
              {question.title}
            </h2>
          </div>
          <span
            className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium ${statusTone(value)}`}
          >
            {formatStatusLabel(value)}
          </span>
        </div>

        <p className="max-w-3xl text-sm leading-7 text-stone-600 sm:text-[0.97rem]">
          {question.description}
        </p>

        <fieldset className="grid gap-3 lg:grid-cols-3">
          <legend className="sr-only">{question.title}</legend>
          {question.options.map((option) => (
            <RadioOption
              key={option.value}
              name={question.slug}
              value={option.value}
              checked={value === option.value}
              disabled={disabled}
              label={option.label}
              description={option.description}
              onChange={(nextValue) => onChange(nextValue as EventChoice)}
            />
          ))}
        </fieldset>
      </div>
    </Panel>
  );
}

export function RSVPApp() {
  const [draft, setDraft] = useState<DraftState>(() => createEmptyDraft());
  const [isHydrated, setIsHydrated] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );

  useEffect(() => {
    try {
      const rawValue = window.localStorage.getItem(STORAGE_KEY);

      if (rawValue) {
        setDraft(normalizeDraft(JSON.parse(rawValue)));
      }
    } catch {
      // Ignore invalid or unavailable local storage and continue with a fresh draft.
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft, isHydrated]);

  useEffect(() => {
    if (copyState === "idle") {
      return;
    }

    const timeoutId = window.setTimeout(() => setCopyState("idle"), 2200);

    return () => window.clearTimeout(timeoutId);
  }, [copyState]);

  const hasWeekendDeclined = draft.weekendStatus === "cant-make-it";
  const speedVegasStatus = draft.events["speed-vegas"];
  const showSpeedVegasDetails =
    !hasWeekendDeclined &&
    (speedVegasStatus === "attending" || speedVegasStatus === "might-attend");

  const answeredEventCount = hasWeekendDeclined
    ? eventQuestions.length
    : eventQuestions.filter((question) => draft.events[question.slug]).length;
  const progressTotal = hasWeekendDeclined
    ? 1
    : 1 + eventQuestions.length + (showSpeedVegasDetails ? 1 : 0);
  const progressComplete =
    (draft.weekendStatus ? 1 : 0) +
    (hasWeekendDeclined ? 0 : answeredEventCount) +
    (showSpeedVegasDetails && draft.speedVegasInterests.length > 0 ? 1 : 0);
  const progressPercent =
    progressTotal === 0 ? 0 : Math.round((progressComplete / progressTotal) * 100);

  const confirmedEvents = eventQuestions.filter(
    (question) => draft.events[question.slug] === "attending",
  );
  const maybeEvents = eventQuestions.filter(
    (question) => draft.events[question.slug] === "might-attend",
  );
  const skippedEvents = eventQuestions.filter(
    (question) => draft.events[question.slug] === "cant-make-it",
  );
  const pendingEvents = hasWeekendDeclined
    ? []
    : eventQuestions.filter((question) => !draft.events[question.slug]);
  const summaryText = buildSummary(draft);

  const handleWeekendStatusChange = (value: WeekendChoice) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      weekendStatus: value,
    }));
  };

  const handleEventStatusChange = (slug: string, value: EventChoice) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      events: {
        ...currentDraft.events,
        [slug]: value,
      },
      speedVegasInterests:
        slug === "speed-vegas" && value === "cant-make-it"
          ? []
          : currentDraft.speedVegasInterests,
    }));
  };

  const handleInterestToggle = (slug: string) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      speedVegasInterests: currentDraft.speedVegasInterests.includes(slug)
        ? currentDraft.speedVegasInterests.filter((value) => value !== slug)
        : [...currentDraft.speedVegasInterests, slug],
    }));
  };

  const handleCopySummary = async () => {
    try {
      const didCopy = await copyTextToClipboard(summaryText);

      if (!didCopy) {
        throw new Error("Clipboard unavailable");
      }

      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  };

  const handleReset = () => {
    if (!window.confirm("Clear your saved RSVP draft on this browser?")) {
      return;
    }

    const emptyDraft = createEmptyDraft();
    setDraft(emptyDraft);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(emptyDraft));
  };

  return (
    <main className="rsvp-shell min-h-screen px-4 py-4 text-stone-950 sm:px-6 sm:py-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-6">
        <Panel revealIndex={0} className="overflow-hidden px-6 py-7 sm:px-8 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[1.25fr_0.85fr] lg:items-end">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rsvp-brand-mark">Monosyth RSVP Studio</span>
                <span className="rounded-full border border-white/65 bg-white/55 px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.3em] text-stone-600">
                  Personal event app
                </span>
              </div>

              <div className="space-y-4">
                <p className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--rsvp-accent)]">
                  July 30 - August 3
                </p>
                <h1 className="max-w-4xl text-4xl font-semibold leading-[0.95] tracking-[-0.07em] text-[var(--rsvp-ink)] sm:text-6xl lg:text-7xl">
                  {welcomeMessage}
                </h1>
                <p className="max-w-3xl text-base leading-8 text-stone-600 sm:text-lg">
                  A Monosyth-built RSVP experience inspired by RSVPify, rebuilt
                  as a personal app with local draft saving, live response
                  summaries, and the exact event questions from the reference
                  form.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[1.7rem] border border-white/70 bg-white/70 p-5 shadow-[0_18px_48px_rgba(33,41,37,0.08)]">
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-stone-500">
                  Progress
                </p>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-4xl font-semibold tracking-[-0.06em] text-[var(--rsvp-ink)]">
                      {progressPercent}%
                    </p>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      {progressComplete} of {progressTotal} response sections
                      answered
                    </p>
                  </div>
                  <div className="h-16 w-16 rounded-full border border-[var(--rsvp-border)] bg-[linear-gradient(180deg,rgba(214,243,227,0.9),rgba(255,255,255,0.75))] p-2">
                    <div className="flex h-full items-center justify-center rounded-full border border-white bg-white/85 text-sm font-semibold text-[var(--rsvp-ink)]">
                      {progressComplete}/{progressTotal}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.7rem] border border-white/70 bg-[linear-gradient(180deg,rgba(18,41,38,0.96),rgba(22,55,50,0.92))] p-5 text-white shadow-[0_22px_56px_rgba(20,32,29,0.18)]">
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/55">
                  Response at a glance
                </p>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-semibold tracking-[-0.05em]">
                      {confirmedEvents.length}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/60">
                      Yes
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold tracking-[-0.05em]">
                      {maybeEvents.length}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/60">
                      Maybe
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold tracking-[-0.05em]">
                      {skippedEvents.length}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/60">
                      No
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Panel>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid gap-6">
            <Panel revealIndex={1} className="px-6 py-6 sm:px-7">
              <div className="grid gap-6 lg:grid-cols-[1fr_0.92fr]">
                <div>
                  <span className="rsvp-eyebrow">Lead guest</span>
                  <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[var(--rsvp-ink)]">
                    Start with the essentials.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">
                    This version keeps everything local to your browser so you
                    can shape the response experience before wiring in a backend
                    or host notifications.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 sm:col-span-2">
                    <span className="text-sm font-medium text-stone-700">
                      Guest name
                    </span>
                    <input
                      type="text"
                      value={draft.guestName}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          guestName: event.target.value,
                        }))
                      }
                      placeholder="Dallas Guest"
                      className="rounded-[1rem] border border-[var(--rsvp-border)] bg-white/80 px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[var(--rsvp-accent)] focus:bg-white"
                    />
                  </label>

                  <label className="flex flex-col gap-2 sm:col-span-2">
                    <span className="text-sm font-medium text-stone-700">
                      Email
                    </span>
                    <input
                      type="email"
                      value={draft.email}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          email: event.target.value,
                        }))
                      }
                      placeholder="guest@example.com"
                      className="rounded-[1rem] border border-[var(--rsvp-border)] bg-white/80 px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[var(--rsvp-accent)] focus:bg-white"
                    />
                  </label>

                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-stone-700">
                      Party size
                    </span>
                    <div className="flex items-center gap-2 rounded-[1rem] border border-[var(--rsvp-border)] bg-white/80 p-2">
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((currentDraft) => ({
                            ...currentDraft,
                            partySize: Math.max(1, currentDraft.partySize - 1),
                          }))
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--rsvp-border)] bg-white text-lg text-[var(--rsvp-ink)] transition hover:border-[var(--rsvp-accent)]"
                      >
                        -
                      </button>
                      <div className="min-w-0 flex-1 text-center">
                        <p className="text-xl font-semibold tracking-[-0.04em] text-[var(--rsvp-ink)]">
                          {draft.partySize}
                        </p>
                        <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
                          Guests
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((currentDraft) => ({
                            ...currentDraft,
                            partySize: Math.min(12, currentDraft.partySize + 1),
                          }))
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--rsvp-border)] bg-white text-lg text-[var(--rsvp-ink)] transition hover:border-[var(--rsvp-accent)]"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-stone-700">
                      Draft status
                    </span>
                    <div className="flex h-full items-center rounded-[1rem] border border-[var(--rsvp-border)] bg-white/80 px-4 py-3 text-sm text-stone-600">
                      {isHydrated ? "Saved locally on this device." : "Loading draft..."}
                    </div>
                  </label>
                </div>
              </div>
            </Panel>

            <Panel revealIndex={2} className="px-6 py-6 sm:px-7">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <span className="rsvp-eyebrow">Weekend commitment</span>
                    <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[var(--rsvp-ink)]">
                      Will Dallas see you there?
                    </h2>
                  </div>
                  <span
                    className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium ${statusTone(draft.weekendStatus)}`}
                  >
                    {formatStatusLabel(draft.weekendStatus)}
                  </span>
                </div>

                <p className="max-w-3xl text-sm leading-7 text-stone-600 sm:text-base">
                  {weekendPrompt}
                </p>

                <fieldset className="grid gap-3 lg:grid-cols-2">
                  <legend className="sr-only">Weekend RSVP</legend>
                  {weekendOptions.map((option) => (
                    <RadioOption
                      key={option.value}
                      name="weekend-status"
                      value={option.value}
                      checked={draft.weekendStatus === option.value}
                      label={option.label}
                      description={option.description}
                      onChange={(nextValue) =>
                        handleWeekendStatusChange(nextValue as WeekendChoice)
                      }
                    />
                  ))}
                </fieldset>

                {hasWeekendDeclined ? (
                  <div className="rounded-[1.4rem] border border-rose-200 bg-rose-50/85 px-4 py-4 text-sm leading-7 text-rose-950">
                    Marked as not attending. The event cards stay visible below
                    for reference, but they are not required unless you switch
                    back to attending.
                  </div>
                ) : null}
              </div>
            </Panel>

            <Panel revealIndex={3} className="px-6 py-6 sm:px-7">
              <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div>
                  <span className="rsvp-eyebrow">RSVP details</span>
                  <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[var(--rsvp-ink)]">
                    The group-planning rules, cleaned up into a simple brief.
                  </h2>
                </div>
                <div className="grid gap-3">
                  {rsvpNotes.map((note) => (
                    <div
                      key={note}
                      className="rounded-[1.25rem] border border-[var(--rsvp-border)] bg-white/75 px-4 py-4 text-sm leading-7 text-stone-600"
                    >
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            </Panel>

            {eventQuestions.map((question, index) => (
              <div key={question.slug} id={`section-${question.slug}`}>
                <EventCard
                  index={index + 4}
                  question={question}
                  value={draft.events[question.slug]}
                  disabled={hasWeekendDeclined}
                  onChange={(value) => handleEventStatusChange(question.slug, value)}
                />
              </div>
            ))}

            {showSpeedVegasDetails ? (
              <Panel revealIndex={eventQuestions.length + 5} className="px-6 py-6 sm:px-7">
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <span className="rsvp-eyebrow">Activity details</span>
                      <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[var(--rsvp-ink)]">
                        Which Speed Vegas activity interests you?
                      </h2>
                    </div>
                    <span className="inline-flex w-fit rounded-full border border-stone-200 bg-white/80 px-3 py-1 text-xs font-medium text-stone-600">
                      {draft.speedVegasInterests.length} selected
                    </span>
                  </div>

                  <p className="max-w-3xl text-sm leading-7 text-stone-600 sm:text-base">
                    Exotic car racing starts at $299 for 5 laps, passenger
                    drifting is $99, and go-karts start at $35.
                  </p>

                  <fieldset className="grid gap-3 lg:grid-cols-3">
                    <legend className="sr-only">Speed Vegas interests</legend>
                    {speedVegasInterests.map((option) => (
                      <CheckboxOption
                        key={option.slug}
                        checked={draft.speedVegasInterests.includes(option.slug)}
                        label={option.label}
                        description={option.description}
                        onToggle={() => handleInterestToggle(option.slug)}
                      />
                    ))}
                  </fieldset>
                </div>
              </Panel>
            ) : null}

            <Panel revealIndex={eventQuestions.length + 6} className="px-6 py-6 sm:px-7">
              <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
                <div>
                  <span className="rsvp-eyebrow">Host notes</span>
                  <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[var(--rsvp-ink)]">
                    Leave context for the planner.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-stone-600 sm:text-base">
                    Dietary notes, arrival timing, ticket caveats, or anything
                    else you would want next to the RSVP before it gets sent.
                  </p>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-stone-700">
                    Additional notes
                  </span>
                  <textarea
                    value={draft.notes}
                    onChange={(event) =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        notes: event.target.value,
                      }))
                    }
                    rows={8}
                    placeholder="Flying in late, only joining dinners, bringing an extra guest..."
                    className="min-h-[13rem] rounded-[1.3rem] border border-[var(--rsvp-border)] bg-white/80 px-4 py-4 text-sm leading-7 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[var(--rsvp-accent)] focus:bg-white"
                  />
                </label>
              </div>
            </Panel>
          </div>

          <aside className="xl:sticky xl:top-6 xl:h-fit">
            <div className="grid gap-6">
              <Panel revealIndex={2} className="px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.3em] text-stone-500">
                      Live summary
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[var(--rsvp-ink)]">
                      Your weekend snapshot
                    </h2>
                  </div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusTone(draft.weekendStatus)}`}
                  >
                    {formatStatusLabel(draft.weekendStatus)}
                  </span>
                </div>

                <div className="mt-5 grid gap-3">
                  <div className="rounded-[1.2rem] border border-[var(--rsvp-border)] bg-white/75 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
                      Confirmed events
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[var(--rsvp-ink)]">
                      {confirmedEvents.length}
                    </p>
                  </div>
                  <div className="rounded-[1.2rem] border border-[var(--rsvp-border)] bg-white/75 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
                      Pending answers
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[var(--rsvp-ink)]">
                      {pendingEvents.length}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => void handleCopySummary()}
                    className="rounded-full bg-[var(--rsvp-ink)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--rsvp-ink)]/90"
                  >
                    {copyState === "copied"
                      ? "Copied summary"
                      : copyState === "error"
                        ? "Clipboard unavailable"
                        : "Copy RSVP summary"}
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-full border border-[var(--rsvp-border)] bg-white/80 px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-white"
                  >
                    Reset local draft
                  </button>
                </div>
              </Panel>

              <Panel revealIndex={3} className="px-5 py-5">
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-stone-500">
                  Event rail
                </p>
                <div className="mt-4 grid gap-2">
                  {eventQuestions.map((question) => (
                    <a
                      key={question.slug}
                      href={`#section-${question.slug}`}
                      className="flex items-center justify-between gap-3 rounded-[1rem] border border-[var(--rsvp-border)] bg-white/75 px-3 py-3 text-sm transition hover:border-[var(--rsvp-accent)] hover:bg-white"
                    >
                      <span className="min-w-0 truncate text-stone-700">
                        {question.title}
                      </span>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-1 text-[0.68rem] font-medium ${statusTone(draft.events[question.slug])}`}
                      >
                        {formatStatusLabel(draft.events[question.slug])}
                      </span>
                    </a>
                  ))}
                </div>
              </Panel>

              <Panel revealIndex={4} className="px-5 py-5">
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-stone-500">
                  Preview response
                </p>
                <pre className="mt-4 max-h-[28rem] overflow-auto rounded-[1.3rem] border border-[var(--rsvp-border)] bg-[rgba(255,255,255,0.78)] px-4 py-4 font-mono text-xs leading-6 text-stone-700 whitespace-pre-wrap">
                  {summaryText}
                </pre>
              </Panel>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
