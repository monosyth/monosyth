"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { isMonosythAdminEmail } from "@/lib/auth/admin";
import {
  createBlankEvent,
  createBlankQuestion,
  createSeededStudio,
  duplicateEventTemplate,
  duplicateQuestionTemplate,
  formatSlug,
  normalizeStudio,
  questionTypeOptions,
  RSVP_IMAGE_LIBRARY,
  type RSVPAnswer,
  type RSVPConditionalRule,
  type RSVPEvent,
  type RSVPOption,
  type RSVPQuestion,
  type RSVPQuestionType,
  type RSVPStudio,
} from "@/lib/rsvp/form-data";
import {
  listRsvpResponsesFromClient,
  readRsvpStudioFromClient,
  submitRsvpResponseFromClient,
  writeRsvpStudioFromClient,
  type RSVPClientResponseRecord,
} from "@/lib/rsvp/client";

/* ------------------------------------------------------------------ */
/* Types & helpers                                                     */
/* ------------------------------------------------------------------ */

type EventDraft = {
  currentStep: number;
  answers: Record<string, RSVPAnswer | undefined>;
};

type RSVPDrafts = Record<string, EventDraft>;
type AdminTab = "details" | "questions" | "responses" | "publish";
type StudioLoadState = "loading" | "ready" | "error";
type SaveState = "idle" | "saving" | "saved" | "error";

type SubmitState =
  | { status: "idle"; message: null }
  | { status: "submitting"; message: null }
  | {
      status: "submitted";
      message: string;
      responseId: string;
      submittedAt: string | null;
    }
  | { status: "error"; message: string };

type GuestView = "poster" | "wizard" | "submitted";

const seededStudio = createSeededStudio();

function studiosEqual(a: RSVPStudio, b: RSVPStudio) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function createDefaultAnswer(question: RSVPQuestion): RSVPAnswer | undefined {
  if (question.type === "multi_select") {
    return [];
  }
  return undefined;
}

function createDraftForEvent(event: RSVPEvent): EventDraft {
  return {
    currentStep: 0,
    answers: Object.fromEntries(
      event.questions.map((question) => [
        question.id,
        createDefaultAnswer(question),
      ]),
    ),
  };
}

function createDraftsForStudio(studio: RSVPStudio): RSVPDrafts {
  return Object.fromEntries(
    studio.events.map((event) => [event.id, createDraftForEvent(event)]),
  );
}

function isQuestionVisible(
  question: RSVPQuestion,
  answers: Record<string, RSVPAnswer | undefined>,
) {
  if (!question.showWhen) {
    return true;
  }
  const sourceAnswer = answers[question.showWhen.questionId];
  if (typeof sourceAnswer === "string") {
    return question.showWhen.equalsAny.includes(sourceAnswer);
  }
  if (Array.isArray(sourceAnswer)) {
    return sourceAnswer.some((value) =>
      question.showWhen?.equalsAny.includes(value),
    );
  }
  return false;
}

function getVisibleQuestions(
  event: RSVPEvent,
  answers: Record<string, RSVPAnswer | undefined>,
) {
  return event.questions.filter((question) =>
    isQuestionVisible(question, answers),
  );
}

function normalizeAnswer(
  question: RSVPQuestion,
  rawValue: unknown,
): RSVPAnswer | undefined {
  if (question.type === "multi_select") {
    if (!Array.isArray(rawValue)) return [];
    const validValues = new Set(
      (question.options ?? []).map((option) => option.value),
    );
    return rawValue.filter(
      (v): v is string => typeof v === "string" && validValues.has(v),
    );
  }
  if (typeof rawValue !== "string") {
    return createDefaultAnswer(question);
  }
  if (
    question.type === "single_select" &&
    !question.options?.some((option) => option.value === rawValue)
  ) {
    return undefined;
  }
  return rawValue;
}

function normalizeDrafts(input: unknown, studio: RSVPStudio): RSVPDrafts {
  const fallback = createDraftsForStudio(studio);
  if (!input || typeof input !== "object") return fallback;
  const candidate = input as Record<string, Partial<EventDraft>>;

  return Object.fromEntries(
    studio.events.map((event) => {
      const rawDraft = candidate[event.id];
      const nextAnswers: Record<string, RSVPAnswer | undefined> = {};
      for (const question of event.questions) {
        nextAnswers[question.id] = normalizeAnswer(
          question,
          rawDraft?.answers &&
            typeof rawDraft.answers === "object" &&
            !Array.isArray(rawDraft.answers)
            ? (rawDraft.answers as Record<string, unknown>)[question.id]
            : undefined,
        );
      }
      const visibleQuestions = getVisibleQuestions(event, nextAnswers);
      const maxStep = visibleQuestions.length;
      const nextStep =
        typeof rawDraft?.currentStep === "number" &&
        Number.isFinite(rawDraft.currentStep)
          ? Math.max(0, Math.min(maxStep, Math.floor(rawDraft.currentStep)))
          : 0;
      return [
        event.id,
        { currentStep: nextStep, answers: nextAnswers },
      ];
    }),
  );
}

function answersEqual(a: RSVPAnswer | undefined, b: RSVPAnswer | undefined) {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  return a === b;
}

function draftsEqual(a: RSVPDrafts, b: RSVPDrafts) {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const eventId of keysA) {
    const draftA = a[eventId];
    const draftB = b[eventId];
    if (!draftA || !draftB) return false;
    if (draftA.currentStep !== draftB.currentStep) return false;
    const ak = Object.keys(draftA.answers);
    const bk = Object.keys(draftB.answers);
    if (ak.length !== bk.length) return false;
    for (const key of ak) {
      if (!answersEqual(draftA.answers[key], draftB.answers[key])) return false;
    }
  }
  return true;
}

function getQuestionValidationMessage(
  question: RSVPQuestion,
  answer: RSVPAnswer | undefined,
) {
  if (!question.required) return null;
  if (question.type === "multi_select") {
    if (!Array.isArray(answer) || answer.length === 0) {
      return "Select at least one option to continue.";
    }
    return null;
  }
  if (typeof answer !== "string") {
    return "Answer this question to continue.";
  }
  const trimmed = answer.trim();
  if (!trimmed) return "Answer this question to continue.";
  if (question.type === "email") {
    return /\S+@\S+\.\S+/.test(trimmed)
      ? null
      : "Enter a valid email address to continue.";
  }
  if (question.type === "number") {
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return "Enter a valid number to continue.";
    if (typeof question.min === "number" && n < question.min) {
      return `The number must be at least ${question.min}.`;
    }
    if (typeof question.max === "number" && n > question.max) {
      return `The number must be ${question.max} or lower.`;
    }
  }
  return null;
}

function isQuestionAnswered(
  question: RSVPQuestion,
  answer: RSVPAnswer | undefined,
) {
  return getQuestionValidationMessage(question, answer) === null;
}

function formatAnswerValue(
  question: RSVPQuestion,
  answer: RSVPAnswer | undefined,
) {
  if (question.type === "multi_select") {
    if (!Array.isArray(answer) || answer.length === 0) return "Pending";
    return answer
      .map(
        (v) =>
          question.options?.find((o) => o.value === v)?.label ?? v,
      )
      .join(", ");
  }
  if (typeof answer !== "string" || !answer.trim()) return "Pending";
  if (question.type === "single_select") {
    return (
      question.options?.find((o) => o.value === answer)?.label ?? answer
    );
  }
  return answer.trim();
}

function buildSummaryText(
  event: RSVPEvent,
  answers: Record<string, RSVPAnswer | undefined>,
) {
  const visible = getVisibleQuestions(event, answers);
  const answered = visible.filter((q) =>
    isQuestionAnswered(q, answers[q.id]),
  );
  const lines = [
    event.title,
    `${event.timeframe} / ${event.location}`,
    "",
    answered.length ? "Responses:" : "Responses: nothing locked in yet.",
  ];
  if (answered.length) {
    for (const q of answered) {
      lines.push(`- ${q.title}: ${formatAnswerValue(q, answers[q.id])}`);
    }
  }
  return lines.join("\n");
}

function findTextAnswerBySlug(
  event: RSVPEvent,
  answers: Record<string, RSVPAnswer | undefined>,
  slug: string,
) {
  const q = event.questions.find((e) => e.slug === slug);
  const a = q ? answers[q.id] : undefined;
  return typeof a === "string" ? a.trim() : "";
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
      // fall through
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

async function getJsonPayload(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  if (!response.ok) {
    throw new Error(
      typeof payload?.error === "string"
        ? payload.error
        : "The RSVP request could not be completed.",
    );
  }
  return payload;
}

function formatTimestamp(value: string | null) {
  if (!value) return "Just now";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/* ------------------------------------------------------------------ */
/* Small reusable field components                                     */
/* ------------------------------------------------------------------ */

function RadioOption({
  checked,
  description,
  label,
  name,
  onChange,
  value,
}: Readonly<{
  checked: boolean;
  description?: string;
  label: string;
  name: string;
  onChange: (value: string) => void;
  value: string;
}>) {
  return (
    <label className="rsvp-option-card" data-checked={checked}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          checked
            ? "border-[var(--rsvp-pink)] bg-[var(--rsvp-pink)]"
            : "border-white/30 bg-black/40"
        }`}
        style={{
          boxShadow: checked ? "0 0 12px rgba(255,61,154,0.7)" : undefined,
        }}
      >
        <span
          className={`h-2 w-2 rounded-full bg-white transition ${
            checked ? "opacity-100" : "opacity-0"
          }`}
        />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-base font-semibold text-[var(--rsvp-ink)]">
          {label}
        </span>
        {description ? (
          <span className="text-sm leading-6 text-[var(--rsvp-ink-dim)]">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}

function CheckboxOption({
  checked,
  description,
  label,
  onToggle,
}: Readonly<{
  checked: boolean;
  description?: string;
  label: string;
  onToggle: () => void;
}>) {
  return (
    <label className="rsvp-option-card" data-checked={checked}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
          checked
            ? "border-[var(--rsvp-teal)] bg-[var(--rsvp-teal)]"
            : "border-white/30 bg-black/40"
        }`}
        style={{
          boxShadow: checked ? "0 0 12px rgba(77,225,255,0.6)" : undefined,
        }}
      >
        <span
          className={`h-2.5 w-2.5 rounded-sm bg-[#0a0610] transition ${
            checked ? "opacity-100" : "opacity-0"
          }`}
        />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-base font-semibold text-[var(--rsvp-ink)]">
          {label}
        </span>
        {description ? (
          <span className="text-sm leading-6 text-[var(--rsvp-ink-dim)]">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}

function FieldLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <span className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-[var(--rsvp-ink-dim)]">
      {children}
    </span>
  );
}

function BaseInput({
  className = "",
  ...props
}: Readonly<
  React.InputHTMLAttributes<HTMLInputElement> & { className?: string }
>) {
  return <input {...props} className={`rsvp-input ${className}`.trim()} />;
}

function BaseTextarea({
  className = "",
  ...props
}: Readonly<
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }
>) {
  return (
    <textarea {...props} className={`rsvp-textarea ${className}`.trim()} />
  );
}

function QuestionResponseField({
  answer,
  onChange,
  question,
}: Readonly<{
  answer: RSVPAnswer | undefined;
  onChange: (value: RSVPAnswer | undefined) => void;
  question: RSVPQuestion;
}>) {
  if (question.type === "short_text" || question.type === "email") {
    return (
      <BaseInput
        type={question.type === "email" ? "email" : "text"}
        value={typeof answer === "string" ? answer : ""}
        placeholder={question.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (question.type === "number") {
    return (
      <BaseInput
        type="number"
        inputMode="numeric"
        min={question.min}
        max={question.max}
        value={typeof answer === "string" ? answer : ""}
        placeholder={question.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (question.type === "long_text") {
    return (
      <BaseTextarea
        rows={6}
        value={typeof answer === "string" ? answer : ""}
        placeholder={question.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (question.type === "multi_select") {
    const current = Array.isArray(answer) ? answer : [];
    return (
      <div className="grid gap-3">
        {question.options?.map((o) => (
          <CheckboxOption
            key={o.id}
            checked={current.includes(o.value)}
            label={o.label}
            description={o.description}
            onToggle={() =>
              onChange(
                current.includes(o.value)
                  ? current.filter((v) => v !== o.value)
                  : [...current, o.value],
              )
            }
          />
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-3">
      {question.options?.map((o) => (
        <RadioOption
          key={o.id}
          name={question.id}
          value={o.value}
          checked={answer === o.value}
          label={o.label}
          description={o.description}
          onChange={(v) => onChange(v)}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Static Dallas trip content (mirrors the invite screenshots)         */
/* ------------------------------------------------------------------ */

const TRIP_DAYS = [
  {
    day: "Day 1",
    date: "Thursday · July 30",
    title: "Early Dirty Birds!",
    copy: "For those that want to kick it off early, you are welcome (& brave) to join the birthday queen on his birthday for an upscale sushi dinner at Zuma, located in the Cosmopolitan. Afterward — because he turns 34 — meet him on the casino floor!",
  },
  {
    day: "Day 2",
    date: "Friday · July 31",
    title: "Poolside Cabana, Sinner's Dinner & Luck!",
    copy: "As some of you may be arriving, we invite you to join us poolside 9–5. There will be a cabana with misters, beverage & food service, and glistening pools. Our first dinner: Welcome to Sin at Bavette's, and then a night of luck!",
  },
  {
    day: "Day 3",
    date: "Saturday · Aug 1",
    title: "Brunch, Hell's Kitchen, & Kelly!",
    copy: "If you're recovered and able, we invite you to a glorious brunch at Toca Madera. After brunch we will head out on some adventures. Be ready to rock — Kelly Clarkson starts at 8:00pm at Caesar's Colosseum, with dinner at Hell's Kitchen beforehand.",
  },
] as const;

const SHOWS_AND_ACTIVITIES = [
  {
    date: "Thursday",
    dateDetail: "July 30th",
    title: "Absinthe Show",
    time: "9:00 PM",
    price: "$154 per person",
    note: "Caesars' Fairy Tent",
    icon: "🎩",
  },
  {
    date: "Friday",
    dateDetail: "July 31st",
    title: "Poolside Cabana",
    time: "9:00 AM – 5:00 PM",
    price: "$70 per person",
    note: "Check-in by 11 AM · 6-person capacity · Food & beverage service",
    icon: "🏊",
  },
  {
    date: "Saturday",
    dateDetail: "August 1st",
    title: "Kelly Clarkson",
    time: "8:00 PM",
    price: "$256 per person",
    note: "Caesar's Colosseum",
    icon: "🎤",
  },
  {
    date: "Sunday",
    dateDetail: "August 2nd",
    title: "Speed Vegas",
    time: "1:30 PM",
    price: "Choose your activity",
    note: "Go-karts · Exotic car racing · Passenger drifting",
    icon: "🏎",
  },
] as const;

const BRUNCHES = [
  { date: "Saturday, Aug 2", venue: "Toca Madera · Aria", time: "11:00 AM" },
  { date: "Sunday, Aug 3", venue: "Sadelle's · Bellagio", time: "11:00 AM" },
  { date: "Monday, Aug 4", venue: "Salt & Ivy · Aria", time: "11:30 AM" },
] as const;

const DINNERS = [
  {
    date: "Thursday, Jul 30",
    venue: "Zuma · The Cosmopolitan",
    time: "6:30 PM",
    note: null,
  },
  {
    date: "Friday, Jul 31",
    venue: "Bavette's · Park MGM",
    time: "7:30 PM",
    note: "Themed: CEO of Sin",
  },
  {
    date: "Saturday, Aug 1",
    venue: "Hell's Kitchen · Caesar's",
    time: "5:30 PM",
    note: "Before Kelly Clarkson",
  },
  {
    date: "Sunday, Aug 2",
    venue: "LAGO · Bellagio",
    time: "7:30 PM",
    note: "Themed: The Last Supper — Redemption",
  },
  {
    date: "Monday, Aug 3",
    venue: "Gymkhana · Aria",
    time: "7:30 PM",
    note: null,
  },
] as const;

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export function RSVPApp() {
  const {
    error: authError,
    isConfigured,
    isWorking,
    signInWithGoogle,
    signOut,
    status,
    user,
  } = useAuth();
  const canEdit = status === "signed_in" && isMonosythAdminEmail(user?.email);

  const [studio, setStudio] = useState<RSVPStudio>(seededStudio);
  const [savedStudio, setSavedStudio] = useState<RSVPStudio>(seededStudio);
  const [drafts, setDrafts] = useState<RSVPDrafts>(() =>
    createDraftsForStudio(seededStudio),
  );
  const [selectedEventId, setSelectedEventId] = useState(
    seededStudio.events[0]?.id ?? "",
  );
  const [selectedQuestionId, setSelectedQuestionId] = useState(
    seededStudio.events[0]?.questions[0]?.id ?? "",
  );
  const [adminTab, setAdminTab] = useState<AdminTab>("details");
  const [adminOpen, setAdminOpen] = useState(false);
  const [guestView, setGuestView] = useState<GuestView>("poster");

  const [studioLoadState, setStudioLoadState] =
    useState<StudioLoadState>("loading");
  const [studioLoadError, setStudioLoadError] = useState<string | null>(null);
  const [studioUpdatedAt, setStudioUpdatedAt] = useState<string | null>(null);
  const [studioUpdatedByEmail, setStudioUpdatedByEmail] = useState<
    string | null
  >(null);

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [responseListState, setResponseListState] =
    useState<StudioLoadState>("ready");
  const [responseListError, setResponseListError] = useState<string | null>(
    null,
  );
  const [recentResponses, setRecentResponses] = useState<
    RSVPClientResponseRecord[]
  >([]);
  const [responseRefreshKey, setResponseRefreshKey] = useState(0);

  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
    message: null,
  });
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );

  const isDirty = useMemo(
    () => !studiosEqual(studio, savedStudio),
    [studio, savedStudio],
  );

  /* --------- Studio load --------- */
  useEffect(() => {
    let cancelled = false;
    async function loadStudio() {
      setStudioLoadState("loading");
      setStudioLoadError(null);
      try {
        let payload: Record<string, unknown> | null;
        try {
          const response = await fetch("/api/rsvp/studio", {
            cache: "no-store",
          });
          payload = await getJsonPayload(response);
        } catch {
          payload = await readRsvpStudioFromClient();
        }
        const nextStudio = normalizeStudio(payload?.studio);
        if (cancelled) return;
        setStudio(nextStudio);
        setSavedStudio(nextStudio);
        setDrafts((c) => normalizeDrafts(c, nextStudio));
        setSelectedEventId((id) =>
          nextStudio.events.some((e) => e.id === id)
            ? id
            : (nextStudio.events[0]?.id ?? ""),
        );
        setSelectedQuestionId(nextStudio.events[0]?.questions[0]?.id ?? "");
        setStudioUpdatedAt(
          typeof payload?.updatedAt === "string" ? payload.updatedAt : null,
        );
        setStudioUpdatedByEmail(
          typeof payload?.updatedByEmail === "string"
            ? payload.updatedByEmail
            : null,
        );
        setSaveState("idle");
        setSaveMessage(null);
        setStudioLoadState("ready");
      } catch (error) {
        if (cancelled) return;
        setStudioLoadState("error");
        setStudioLoadError(
          error instanceof Error
            ? error.message
            : "The RSVP studio could not be loaded.",
        );
      }
    }
    void loadStudio();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setDrafts((current) => {
      const normalized = normalizeDrafts(current, studio);
      return draftsEqual(current, normalized) ? current : normalized;
    });
  }, [studio]);

  useEffect(() => {
    if (!studio.events.some((e) => e.id === selectedEventId)) {
      setSelectedEventId(studio.events[0]?.id ?? "");
    }
  }, [selectedEventId, studio.events]);

  const currentEvent = useMemo(
    () =>
      studio.events.find((e) => e.id === selectedEventId) ?? studio.events[0],
    [selectedEventId, studio.events],
  );

  useEffect(() => {
    if (
      !currentEvent?.questions.some((q) => q.id === selectedQuestionId)
    ) {
      setSelectedQuestionId(currentEvent?.questions[0]?.id ?? "");
    }
  }, [currentEvent, selectedQuestionId]);

  useEffect(() => {
    if (copyState === "idle") return;
    const t = window.setTimeout(() => setCopyState("idle"), 2200);
    return () => window.clearTimeout(t);
  }, [copyState]);

  useEffect(() => {
    if (saveState === "saved" && isDirty) {
      setSaveState("idle");
      setSaveMessage(null);
    }
  }, [isDirty, saveState]);

  useEffect(() => {
    setSubmitState({ status: "idle", message: null });
  }, [selectedEventId]);

  useEffect(() => {
    if (!canEdit || !user || !selectedEventId) {
      setRecentResponses([]);
      setResponseListError(null);
      setResponseListState("ready");
      return;
    }
    let cancelled = false;
    const currentUser = user;
    async function loadRecentResponses() {
      setResponseListState("loading");
      setResponseListError(null);
      try {
        const token = await currentUser.getIdToken();
        let responses: RSVPClientResponseRecord[];
        try {
          const response = await fetch(
            `/api/rsvp/responses?eventId=${encodeURIComponent(selectedEventId)}`,
            {
              cache: "no-store",
              headers: { authorization: `Bearer ${token}` },
            },
          );
          const payload = await getJsonPayload(response);
          responses = Array.isArray(payload?.responses)
            ? (payload.responses as RSVPClientResponseRecord[])
            : [];
        } catch {
          responses = await listRsvpResponsesFromClient(selectedEventId);
        }
        if (cancelled) return;
        setRecentResponses(responses);
        setResponseListState("ready");
      } catch (error) {
        if (cancelled) return;
        setResponseListState("error");
        setResponseListError(
          error instanceof Error
            ? error.message
            : "Recent RSVP responses could not be loaded.",
        );
      }
    }
    void loadRecentResponses();
    return () => {
      cancelled = true;
    };
  }, [canEdit, responseRefreshKey, selectedEventId, user]);

  /* --------- Loading & error states --------- */
  if (studioLoadState === "loading") {
    return (
      <main className="rsvp-shell flex min-h-screen items-center justify-center px-6 py-10">
        <div className="rsvp-panel rounded-[2rem] px-10 py-12 text-center">
          <span className="rsvp-eyebrow">Loading</span>
          <h1 className="mt-6 rsvp-neon rsvp-neon--pink text-4xl">
            Warming up the strip...
          </h1>
          <p className="mt-4 text-sm text-[var(--rsvp-ink-dim)]">
            Bringing in the latest RSVP details.
          </p>
        </div>
      </main>
    );
  }

  if (studioLoadState === "error" || !currentEvent) {
    return (
      <main className="rsvp-shell flex min-h-screen items-center justify-center px-6 py-10">
        <div className="rsvp-panel rounded-[2rem] px-10 py-12 text-center">
          <span className="rsvp-eyebrow rsvp-eyebrow--pink">Offline</span>
          <h1 className="mt-6 rsvp-neon rsvp-neon--pink text-4xl">
            The neon&rsquo;s flickering.
          </h1>
          <p className="mt-4 max-w-md text-sm text-[var(--rsvp-ink-dim)]">
            {studioLoadError ?? "Event details could not be loaded — please try again in a moment."}
          </p>
        </div>
      </main>
    );
  }

  /* --------- Derived state --------- */
  const currentDraft =
    drafts[currentEvent.id] ?? createDraftForEvent(currentEvent);
  const visibleQuestions = getVisibleQuestions(currentEvent, currentDraft.answers);
  const totalQuestions = visibleQuestions.length;
  const currentStep = Math.min(currentDraft.currentStep, totalQuestions);
  const activeQuestion = visibleQuestions[currentStep] ?? null;
  const selectedQuestion =
    currentEvent.questions.find((q) => q.id === selectedQuestionId) ??
    currentEvent.questions[0];
  const answeredCount = visibleQuestions.filter((q) =>
    isQuestionAnswered(q, currentDraft.answers[q.id]),
  ).length;
  const completionPercent =
    totalQuestions === 0
      ? 100
      : Math.round((answeredCount / totalQuestions) * 100);
  const pendingCount = Math.max(totalQuestions - answeredCount, 0);
  const summaryText = buildSummaryText(currentEvent, currentDraft.answers);
  const validationMessage = activeQuestion
    ? getQuestionValidationMessage(
        activeQuestion,
        currentDraft.answers[activeQuestion.id],
      )
    : null;

  /* --------- Mutations --------- */
  const setCurrentEventDraft = (updater: (d: EventDraft) => EventDraft) => {
    setDrafts((cur) => ({
      ...cur,
      [currentEvent.id]: updater(
        cur[currentEvent.id] ?? createDraftForEvent(currentEvent),
      ),
    }));
  };

  const updateStudio = (updater: (s: RSVPStudio) => RSVPStudio) => {
    if (!canEdit) return;
    setStudio((c) => updater(c));
  };

  const updateCurrentEvent = (updater: (e: RSVPEvent) => RSVPEvent) => {
    updateStudio((s) => ({
      ...s,
      events: s.events.map((e) => (e.id === currentEvent.id ? updater(e) : e)),
    }));
  };

  const updateCurrentQuestion = (updater: (q: RSVPQuestion) => RSVPQuestion) => {
    if (!selectedQuestion) return;
    updateCurrentEvent((e) => ({
      ...e,
      questions: e.questions.map((q) =>
        q.id === selectedQuestion.id ? updater(q) : q,
      ),
    }));
  };

  const handleAnswerChange = (
    question: RSVPQuestion,
    value: RSVPAnswer | undefined,
  ) => {
    if (submitState.status !== "idle") {
      setSubmitState({ status: "idle", message: null });
    }
    setCurrentEventDraft((d) => ({
      ...d,
      answers: { ...d.answers, [question.id]: value },
    }));
  };

  const handleNext = () => {
    if (activeQuestion && validationMessage) return;
    setCurrentEventDraft((d) => ({
      ...d,
      currentStep: Math.min(currentStep + 1, totalQuestions),
    }));
  };

  const handleBack = () => {
    setCurrentEventDraft((d) => ({
      ...d,
      currentStep: Math.max(currentStep - 1, 0),
    }));
  };

  const handleJumpToStep = (index: number) => {
    setCurrentEventDraft((d) => ({
      ...d,
      currentStep: Math.max(0, Math.min(index, totalQuestions)),
    }));
  };

  const handleCopySummary = async () => {
    try {
      const ok = await copyTextToClipboard(summaryText);
      if (!ok) throw new Error("Clipboard unavailable");
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  };

  const handleResetResponses = () => {
    if (!window.confirm(`Reset the RSVP draft for ${currentEvent.title}?`)) return;
    setDrafts((c) => ({
      ...c,
      [currentEvent.id]: createDraftForEvent(currentEvent),
    }));
    setSubmitState({ status: "idle", message: null });
    setGuestView("poster");
  };

  const handleDiscardChanges = () => {
    if (!canEdit || !isDirty) return;
    setStudio(savedStudio);
    setDrafts((c) => normalizeDrafts(c, savedStudio));
    setSaveState("idle");
    setSaveMessage(null);
  };

  const handleSaveStudio = async () => {
    if (!canEdit || !user) return;
    const currentUser = user;
    setSaveState("saving");
    setSaveMessage(null);
    try {
      const token = await currentUser.getIdToken();
      let payload: Record<string, unknown> | null;
      try {
        const response = await fetch("/api/rsvp/studio", {
          body: JSON.stringify({ studio }),
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
          },
          method: "PUT",
        });
        payload = await getJsonPayload(response);
      } catch {
        payload = await writeRsvpStudioFromClient(studio, {
          email: currentUser.email ?? "",
          uid: currentUser.uid,
        });
      }
      const nextStudio = normalizeStudio(payload?.studio);
      setStudio(nextStudio);
      setSavedStudio(nextStudio);
      setDrafts((c) => normalizeDrafts(c, nextStudio));
      setStudioUpdatedAt(
        typeof payload?.updatedAt === "string" ? payload.updatedAt : null,
      );
      setStudioUpdatedByEmail(
        typeof payload?.updatedByEmail === "string"
          ? payload.updatedByEmail
          : null,
      );
      setSaveState("saved");
      setSaveMessage("Changes published to the live RSVP page.");
    } catch (error) {
      setSaveState("error");
      setSaveMessage(
        error instanceof Error
          ? error.message
          : "The RSVP studio could not be saved.",
      );
    }
  };

  const handleSubmitResponse = async () => {
    const invalid = visibleQuestions.find((q) =>
      Boolean(getQuestionValidationMessage(q, currentDraft.answers[q.id])),
    );
    if (invalid) {
      const idx = visibleQuestions.findIndex((q) => q.id === invalid.id);
      const msg = getQuestionValidationMessage(
        invalid,
        currentDraft.answers[invalid.id],
      );
      handleJumpToStep(idx);
      setSubmitState({
        status: "error",
        message: msg ?? "Answer the remaining questions before submitting.",
      });
      return;
    }
    setSubmitState({ status: "submitting", message: null });
    try {
      const guestName = findTextAnswerBySlug(
        currentEvent,
        currentDraft.answers,
        "guest-name",
      );
      const guestEmail = findTextAnswerBySlug(
        currentEvent,
        currentDraft.answers,
        "guest-email",
      );
      const submissionAnswers = visibleQuestions.map((q) => ({
        formattedValue: formatAnswerValue(q, currentDraft.answers[q.id]),
        questionId: q.id,
        slug: q.slug,
        title: q.title,
        type: q.type,
        value: currentDraft.answers[q.id] ?? null,
      }));
      let submission: Record<string, unknown> | null;
      try {
        const response = await fetch("/api/rsvp/responses", {
          body: JSON.stringify({
            answers: currentDraft.answers,
            eventId: currentEvent.id,
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
        const payload = await getJsonPayload(response);
        submission =
          payload?.response && typeof payload.response === "object"
            ? (payload.response as Record<string, unknown>)
            : null;
      } catch {
        submission = await submitRsvpResponseFromClient({
          answers: submissionAnswers,
          eventId: currentEvent.id,
          eventSlug: currentEvent.slug,
          eventTitle: currentEvent.title,
          guestEmail,
          guestName,
          summaryText,
        });
      }
      setSubmitState({
        status: "submitted",
        message: `RSVP submitted for ${currentEvent.title}.`,
        responseId:
          typeof submission?.id === "string" ? submission.id : "response-saved",
        submittedAt:
          typeof submission?.createdAt === "string"
            ? submission.createdAt
            : null,
      });
      setGuestView("submitted");
      setResponseRefreshKey((v) => v + 1);
    } catch (error) {
      setSubmitState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Your RSVP could not be submitted.",
      });
    }
  };

  const handleStartAnotherResponse = () => {
    setDrafts((c) => ({
      ...c,
      [currentEvent.id]: createDraftForEvent(currentEvent),
    }));
    setSubmitState({ status: "idle", message: null });
    setGuestView("wizard");
  };

  const handleCreateEvent = () => {
    if (!canEdit) return;
    const newEvent = createBlankEvent(studio.events.length + 1);
    updateStudio((s) => ({ ...s, events: [...s.events, newEvent] }));
    setDrafts((c) => ({ ...c, [newEvent.id]: createDraftForEvent(newEvent) }));
    setSelectedEventId(newEvent.id);
    setSelectedQuestionId(newEvent.questions[0]?.id ?? "");
    setAdminTab("details");
  };

  const handleDuplicateEvent = () => {
    if (!canEdit) return;
    const dup = duplicateEventTemplate(currentEvent);
    updateStudio((s) => ({ ...s, events: [...s.events, dup] }));
    setDrafts((c) => ({ ...c, [dup.id]: createDraftForEvent(dup) }));
    setSelectedEventId(dup.id);
    setSelectedQuestionId(dup.questions[0]?.id ?? "");
  };

  const handleDeleteEvent = () => {
    if (!canEdit || studio.events.length === 1) return;
    if (!window.confirm(`Delete ${currentEvent.title}?`)) return;
    const remaining = studio.events.filter((e) => e.id !== currentEvent.id);
    updateStudio(() => ({ events: remaining }));
    setDrafts((c) =>
      Object.fromEntries(
        Object.entries(c).filter(([id]) => id !== currentEvent.id),
      ),
    );
    setSelectedEventId(remaining[0]?.id ?? "");
    setSelectedQuestionId(remaining[0]?.questions[0]?.id ?? "");
  };

  const handleAddQuestion = () => {
    if (!canEdit) return;
    const q = createBlankQuestion(currentEvent.questions.length + 1);
    updateCurrentEvent((e) => ({ ...e, questions: [...e.questions, q] }));
    setSelectedQuestionId(q.id);
    setAdminTab("questions");
  };

  const handleDuplicateQuestion = () => {
    if (!selectedQuestion) return;
    const dup = duplicateQuestionTemplate(selectedQuestion);
    updateCurrentEvent((e) => {
      const idx = e.questions.findIndex((q) => q.id === selectedQuestion.id);
      return {
        ...e,
        questions: [
          ...e.questions.slice(0, idx + 1),
          dup,
          ...e.questions.slice(idx + 1),
        ],
      };
    });
    setSelectedQuestionId(dup.id);
  };

  const handleDeleteQuestion = () => {
    if (!selectedQuestion || currentEvent.questions.length === 1) return;
    if (!window.confirm(`Delete the question "${selectedQuestion.title}"?`))
      return;
    const remaining = currentEvent.questions.filter(
      (q) => q.id !== selectedQuestion.id,
    );
    updateCurrentEvent((e) => ({ ...e, questions: remaining }));
    setSelectedQuestionId(remaining[0]?.id ?? "");
  };

  const handleMoveQuestion = (direction: -1 | 1) => {
    if (!selectedQuestion) return;
    const idx = currentEvent.questions.findIndex(
      (q) => q.id === selectedQuestion.id,
    );
    const next = idx + direction;
    if (next < 0 || next >= currentEvent.questions.length) return;
    updateCurrentEvent((e) => {
      const qs = [...e.questions];
      const [m] = qs.splice(idx, 1);
      qs.splice(next, 0, m);
      return { ...e, questions: qs };
    });
  };

  const handleQuestionTypeChange = (nextType: RSVPQuestionType) => {
    updateCurrentQuestion((q) => {
      const nq: RSVPQuestion = { ...q, type: nextType };
      if (nextType === "single_select" || nextType === "multi_select") {
        nq.options =
          q.options && q.options.length
            ? q.options
            : [
                { id: `option-${q.id}-yes`, value: "yes", label: "Yes" },
                { id: `option-${q.id}-no`, value: "no", label: "No" },
              ];
      } else {
        delete nq.options;
      }
      if (nextType !== "number") {
        delete nq.min;
        delete nq.max;
      }
      return nq;
    });
  };

  const handleConditionalSourceChange = (questionId: string) => {
    updateCurrentQuestion((q) => {
      if (!questionId) {
        const nq = { ...q };
        delete nq.showWhen;
        return nq;
      }
      const showWhen: RSVPConditionalRule = {
        questionId,
        equalsAny: q.showWhen?.equalsAny.length ? q.showWhen.equalsAny : ["yes"],
      };
      return { ...q, showWhen };
    });
  };

  const updateSelectedQuestionOption = (
    optionId: string,
    updater: (o: RSVPOption) => RSVPOption,
  ) => {
    updateCurrentQuestion((q) => ({
      ...q,
      options: (q.options ?? []).map((o) =>
        o.id === optionId ? updater(o) : o,
      ),
    }));
  };

  const addOptionToSelectedQuestion = () => {
    updateCurrentQuestion((q) => ({
      ...q,
      options: [
        ...(q.options ?? []),
        {
          id: `option-${q.id}-${(q.options?.length ?? 0) + 1}`,
          value: `option-${(q.options?.length ?? 0) + 1}`,
          label: `Option ${(q.options?.length ?? 0) + 1}`,
        },
      ],
    }));
  };

  const removeOptionFromSelectedQuestion = (optionId: string) => {
    updateCurrentQuestion((q) => ({
      ...q,
      options: (q.options ?? []).filter((o) => o.id !== optionId),
    }));
  };

  /* --------- Admin studio rendering --------- */
  const adminStudio = adminOpen && canEdit ? (
    <AdminStudio
      studio={studio}
      currentEvent={currentEvent}
      selectedEventId={selectedEventId}
      onSelectEvent={(id) => {
        setSelectedEventId(id);
        setSelectedQuestionId(
          studio.events.find((e) => e.id === id)?.questions[0]?.id ?? "",
        );
      }}
      onCreateEvent={handleCreateEvent}
      onDuplicateEvent={handleDuplicateEvent}
      onDeleteEvent={handleDeleteEvent}
      adminTab={adminTab}
      setAdminTab={setAdminTab}
      isDirty={isDirty}
      saveState={saveState}
      saveMessage={saveMessage}
      studioUpdatedAt={studioUpdatedAt}
      studioUpdatedByEmail={studioUpdatedByEmail}
      onPublish={() => void handleSaveStudio()}
      onDiscard={handleDiscardChanges}
      onClose={() => setAdminOpen(false)}
      onSignOut={() => void signOut()}
      authWorking={isWorking}
      updateCurrentEvent={updateCurrentEvent}
      updateCurrentQuestion={updateCurrentQuestion}
      selectedQuestion={selectedQuestion}
      setSelectedQuestionId={setSelectedQuestionId}
      onAddQuestion={handleAddQuestion}
      onDuplicateQuestion={handleDuplicateQuestion}
      onDeleteQuestion={handleDeleteQuestion}
      onMoveQuestion={handleMoveQuestion}
      onQuestionTypeChange={handleQuestionTypeChange}
      onConditionalSourceChange={handleConditionalSourceChange}
      updateSelectedQuestionOption={updateSelectedQuestionOption}
      addOptionToSelectedQuestion={addOptionToSelectedQuestion}
      removeOptionFromSelectedQuestion={removeOptionFromSelectedQuestion}
      recentResponses={recentResponses}
      responseListState={responseListState}
      responseListError={responseListError}
      totalVisibleQuestions={totalQuestions}
      answeredCount={answeredCount}
    />
  ) : null;

  /* --------- Guest views --------- */
  return (
    <main className="rsvp-shell min-h-screen px-4 pb-24 pt-6 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-[78rem] flex-col gap-10">
        {/* Header bar */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <span className="rsvp-brand-mark">Monosyth Events</span>
          <div className="flex flex-wrap items-center gap-3">
            {canEdit ? (
              <>
                <button
                  type="button"
                  className="rsvp-btn rsvp-btn-neon"
                  onClick={() => setAdminOpen((v) => !v)}
                >
                  {adminOpen ? "Close admin" : "Open admin studio"}
                </button>
                <button
                  type="button"
                  className="rsvp-btn rsvp-btn-ghost"
                  onClick={() => void signOut()}
                  disabled={isWorking}
                >
                  {isWorking ? "Working…" : "Sign out"}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="rsvp-btn rsvp-btn-ghost"
                onClick={() => void signInWithGoogle()}
                disabled={!isConfigured || isWorking}
              >
                {isWorking ? "Working…" : "Admin sign in"}
              </button>
            )}
          </div>
        </header>

        {adminStudio}

        {/* POSTER VIEW */}
        {guestView === "poster" ? (
          <PosterView
            event={currentEvent}
            completionPercent={completionPercent}
            answeredCount={answeredCount}
            totalQuestions={totalQuestions}
            pendingCount={pendingCount}
            onRSVP={() => setGuestView("wizard")}
            authError={authError}
          />
        ) : null}

        {/* WIZARD VIEW */}
        {guestView === "wizard" && activeQuestion ? (
          <WizardView
            event={currentEvent}
            step={currentStep}
            total={totalQuestions}
            activeQuestion={activeQuestion}
            answers={currentDraft.answers}
            completionPercent={completionPercent}
            validationMessage={validationMessage}
            onAnswerChange={handleAnswerChange}
            onBack={currentStep === 0 ? () => setGuestView("poster") : handleBack}
            onNext={handleNext}
            isLastStep={currentStep === totalQuestions - 1}
            onReview={() => setGuestView("wizard")}
            visibleQuestions={visibleQuestions}
            onJumpToStep={handleJumpToStep}
          />
        ) : null}

        {/* REVIEW / SUBMIT */}
        {guestView === "wizard" && !activeQuestion ? (
          <ReviewView
            event={currentEvent}
            summaryText={summaryText}
            submitState={submitState}
            copyState={copyState}
            completionPercent={completionPercent}
            onBack={handleBack}
            onSubmit={handleSubmitResponse}
            onCopySummary={() => void handleCopySummary()}
            onReset={handleResetResponses}
          />
        ) : null}

        {/* SUBMITTED */}
        {guestView === "submitted" ? (
          <SubmittedView
            event={currentEvent}
            submitState={submitState}
            copyState={copyState}
            onCopySummary={() => void handleCopySummary()}
            onStartAnother={handleStartAnotherResponse}
            onBackToPoster={() => setGuestView("poster")}
          />
        ) : null}
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Poster (guest landing) view                                         */
/* ------------------------------------------------------------------ */

function PosterView({
  event,
  completionPercent,
  answeredCount,
  totalQuestions,
  pendingCount,
  onRSVP,
  authError,
}: Readonly<{
  event: RSVPEvent;
  completionPercent: number;
  answeredCount: number;
  totalQuestions: number;
  pendingCount: number;
  onRSVP: () => void;
  authError: string | null;
}>) {
  return (
    <>
      {/* HERO */}
      <section className="rsvp-panel rsvp-panel--hot rounded-[2.2rem] px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="rsvp-eyebrow rsvp-eyebrow--gold">
              {event.eventLabel}
            </span>
            <p className="mt-6 rsvp-script text-2xl sm:text-3xl">
              We&rsquo;re off to
            </p>
            <h1 className="mt-1 rsvp-neon rsvp-neon--pink rsvp-flicker text-[3.6rem] leading-[0.85] sm:text-[5.4rem] lg:text-[6.8rem]">
              Las Vegas
              <span className="rsvp-script ml-3 text-[2.6rem] sm:text-[3.8rem] lg:text-[4.6rem]">
                baby!
              </span>
            </h1>

            <div className="mt-8 flex items-center gap-4">
              <span className="rsvp-divider" aria-hidden="true" />
              <span className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--rsvp-ink-dim)]">
                {event.timeframe} · {event.location}
              </span>
            </div>

            <h2 className="mt-8 rsvp-display text-3xl leading-tight sm:text-[2.6rem]">
              <span className="text-white">{event.title.split(" ")[0]}</span>
              <span className="ml-2 rsvp-neon rsvp-neon--teal">
                {event.title.split(" ").slice(1).join(" ")}
              </span>
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-[var(--rsvp-ink-dim)] sm:text-lg">
              {event.intro}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="rsvp-btn rsvp-btn-primary rsvp-sign-pulse"
                onClick={onRSVP}
              >
                RSVP & send my deposit
                <span aria-hidden="true" className="-mr-1">→</span>
              </button>
              {completionPercent > 0 && completionPercent < 100 ? (
                <span className="rsvp-tag rsvp-tag-gold">
                  {completionPercent}% complete — resume
                </span>
              ) : completionPercent === 100 ? (
                <span className="rsvp-tag rsvp-tag-answered">
                  All {totalQuestions} questions answered
                </span>
              ) : null}
            </div>

            {authError ? (
              <p className="mt-6 rounded-2xl border border-[var(--rsvp-pink)]/30 bg-[var(--rsvp-pink)]/10 px-4 py-3 text-sm text-[var(--rsvp-pink-soft)]">
                {authError}
              </p>
            ) : null}
          </div>

          {/* Sign/photo slot */}
          <div className="relative">
            <div
              className="relative mx-auto aspect-square w-full max-w-[24rem] overflow-hidden rounded-full border-2 border-[var(--rsvp-gold)]/70 shadow-[0_0_50px_rgba(244,201,93,0.3)]"
              style={{
                backgroundImage: `
                  linear-gradient(180deg, rgba(7,4,10,0.25) 0%, rgba(7,4,10,0.65) 100%),
                  url('/rsvp-images/dallas-hero.webp')`,
                backgroundSize: "cover",
                backgroundPosition: "center 20%",
              }}
            >
              {/* Stylized playing cards */}
              <svg
                viewBox="0 0 200 200"
                className="absolute -left-6 -top-3 h-32 w-32 opacity-90"
                aria-hidden="true"
              >
                <g
                  fill="none"
                  stroke="var(--rsvp-gold)"
                  strokeWidth="2"
                  transform="translate(40 40)"
                >
                  <rect x="-20" y="-10" width="60" height="90" rx="6" transform="rotate(-18)" fill="#0a0610" fillOpacity="0.85" />
                  <rect x="0" y="-10" width="60" height="90" rx="6" transform="rotate(-4)" fill="#0a0610" fillOpacity="0.85" />
                  <rect x="20" y="-10" width="60" height="90" rx="6" transform="rotate(10)" fill="#0a0610" fillOpacity="0.85" />
                  <text x="5" y="30" fontSize="22" fontWeight="700" fill="var(--rsvp-gold)" fontFamily="serif">A</text>
                  <text x="28" y="28" fontSize="22" fontWeight="700" fill="var(--rsvp-gold)" fontFamily="serif">A</text>
                  <text x="48" y="26" fontSize="22" fontWeight="700" fill="var(--rsvp-gold)" fontFamily="serif">A</text>
                </g>
              </svg>
              <div className="flex h-full flex-col items-center justify-end px-6 pb-10 text-center">
                <span className="rsvp-script text-2xl">the one &amp; only</span>
                <h3 className="mt-1 rsvp-neon rsvp-neon--pink text-[3rem] leading-none">
                  Dallas
                </h3>
                <p className="mt-2 font-mono text-[0.7rem] uppercase tracking-[0.35em] text-[var(--rsvp-gold)]">
                  Turns 34
                </p>
              </div>
            </div>

            {/* Vegas-sign badge */}
            <div
              className="mx-auto mt-6 w-fit rounded-[1rem] border-2 border-[var(--rsvp-gold)] bg-[#0e0815] px-5 py-3 text-center"
              style={{
                boxShadow: "0 0 24px rgba(244,201,93,0.25), inset 0 0 0 4px rgba(0,0,0,0.35)",
              }}
            >
              <p className="rsvp-script text-[1.4rem] leading-none text-[var(--rsvp-teal)]">
                {event.timeframe.split("–")[0].trim()}
                <span className="mx-2 text-[var(--rsvp-ink)]">–</span>
                {event.timeframe.split("–").slice(1).join("–").trim()}
              </p>
              <p className="mt-1 font-mono text-[0.68rem] uppercase tracking-[0.4em] text-[var(--rsvp-pink)]">
                Las Vegas, NV
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TRIP OVERVIEW */}
      <section className="rsvp-panel rounded-[2rem] px-6 py-10 sm:px-10">
        <div className="flex flex-col items-center text-center">
          <span className="rsvp-eyebrow">Itinerary</span>
          <h2 className="mt-5 rsvp-neon rsvp-neon--teal text-4xl sm:text-5xl">
            Trip Overview
          </h2>
          <span className="mt-5 rsvp-divider" aria-hidden="true" />
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {TRIP_DAYS.map((day, i) => (
            <article
              key={day.day}
              className="relative flex flex-col rounded-[1.4rem] border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.55)] p-6 transition hover:border-[var(--rsvp-pink)]/40"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="rsvp-day-chip">{day.day}</span>
                <span className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-[var(--rsvp-ink-dim)]">
                  {day.date}
                </span>
              </div>
              <h3 className="mt-6 rsvp-display text-2xl text-[var(--rsvp-pink-soft)]">
                {day.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--rsvp-ink-dim)]">
                {day.copy}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* SHOWS & ACTIVITIES */}
      <section className="rsvp-panel rounded-[2rem] px-6 py-10 sm:px-10">
        <div className="flex flex-col items-center text-center">
          <span className="rsvp-eyebrow rsvp-eyebrow--pink">Shows &amp; Activities</span>
          <h2 className="mt-5 rsvp-neon rsvp-neon--pink text-4xl sm:text-5xl">
            The Big Ticket
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--rsvp-ink-dim)]">
            Deposits secure your group seat for these headliners. RSVP and send deposits to Scott or Dallas by <strong className="text-[var(--rsvp-gold)]">June 10th</strong>.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {SHOWS_AND_ACTIVITIES.map((s) => (
            <article
              key={s.title}
              className="flex items-start gap-5 rounded-[1.4rem] border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.55)] px-5 py-5 transition hover:border-[var(--rsvp-teal)]/40"
            >
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[var(--rsvp-teal)]/40 bg-[rgba(77,225,255,0.08)] text-2xl"
                aria-hidden="true"
              >
                {s.icon}
              </div>
              <div className="flex-1">
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-[var(--rsvp-teal)]">
                  {s.date} · {s.dateDetail}
                </p>
                <h3 className="mt-2 rsvp-display text-xl">{s.title}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--rsvp-ink-dim)]">
                  <span>{s.time}</span>
                  <span className="text-[var(--rsvp-border-soft)]">·</span>
                  <span className="rsvp-tag rsvp-tag-gold">{s.price}</span>
                </div>
                <p className="mt-2 text-xs leading-6 text-[var(--rsvp-ink-dim)]">
                  {s.note}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* BRUNCHES / DINNERS */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rsvp-panel rounded-[2rem] px-6 py-8 sm:px-8">
          <span className="rsvp-eyebrow rsvp-eyebrow--gold">Brunches 🍳</span>
          <h2 className="mt-5 rsvp-display text-3xl">Slow mornings.</h2>
          <div className="mt-6 grid gap-3">
            {BRUNCHES.map((b) => (
              <div
                key={b.venue}
                className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.5)] px-4 py-3"
              >
                <div>
                  <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-[var(--rsvp-teal)]">
                    {b.date}
                  </p>
                  <p className="mt-1 text-base font-semibold text-[var(--rsvp-ink)]">
                    {b.venue}
                  </p>
                </div>
                <span className="font-mono text-sm text-[var(--rsvp-pink-soft)]">
                  {b.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rsvp-panel rounded-[2rem] px-6 py-8 sm:px-8">
          <span className="rsvp-eyebrow rsvp-eyebrow--pink">Dinners 🍷</span>
          <h2 className="mt-5 rsvp-display text-3xl">Loud nights.</h2>
          <div className="mt-6 grid gap-3">
            {DINNERS.map((d) => (
              <div
                key={d.venue}
                className="flex items-start justify-between gap-4 rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.5)] px-4 py-3"
              >
                <div>
                  <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-[var(--rsvp-teal)]">
                    {d.date}
                  </p>
                  <p className="mt-1 text-base font-semibold text-[var(--rsvp-ink)]">
                    {d.venue}
                  </p>
                  {d.note ? (
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--rsvp-gold)]">
                      {d.note}
                    </p>
                  ) : null}
                </div>
                <span className="font-mono text-sm text-[var(--rsvp-pink-soft)]">
                  {d.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOST NOTES */}
      <section className="rsvp-panel rounded-[2rem] px-6 py-8 sm:px-10">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <span className="rsvp-eyebrow">RSVPs &amp; Deposits</span>
            <h2 className="mt-5 rsvp-neon rsvp-neon--pink text-4xl">
              Due June 10th
            </h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-[var(--rsvp-ink-dim)]">
              We need a headcount for all reservations. Your deposit secures group seating at shows; your RSVP secures your chair at the table.
            </p>
            <button
              type="button"
              onClick={onRSVP}
              className="rsvp-btn rsvp-btn-primary mt-6"
            >
              Fill out my RSVP
              <span aria-hidden="true" className="-mr-1">→</span>
            </button>
            {totalQuestions ? (
              <p className="mt-4 font-mono text-[0.7rem] uppercase tracking-[0.3em] text-[var(--rsvp-ink-dim)]">
                {answeredCount} / {totalQuestions} answered · {pendingCount} pending
              </p>
            ) : null}
          </div>
          <ul className="grid gap-3">
            {event.notes.map((note) => (
              <li
                key={note}
                className="flex gap-3 rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.5)] px-4 py-3 text-sm leading-7 text-[var(--rsvp-ink-dim)]"
              >
                <span
                  aria-hidden="true"
                  className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--rsvp-pink)]"
                  style={{ boxShadow: "0 0 8px rgba(255,61,154,0.7)" }}
                />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Wizard & Review views                                               */
/* ------------------------------------------------------------------ */

function WizardView({
  event,
  step,
  total,
  activeQuestion,
  answers,
  completionPercent,
  validationMessage,
  onAnswerChange,
  onBack,
  onNext,
  isLastStep,
  visibleQuestions,
  onJumpToStep,
}: Readonly<{
  event: RSVPEvent;
  step: number;
  total: number;
  activeQuestion: RSVPQuestion;
  answers: Record<string, RSVPAnswer | undefined>;
  completionPercent: number;
  validationMessage: string | null;
  onAnswerChange: (q: RSVPQuestion, v: RSVPAnswer | undefined) => void;
  onBack: () => void;
  onNext: () => void;
  isLastStep: boolean;
  onReview: () => void;
  visibleQuestions: RSVPQuestion[];
  onJumpToStep: (index: number) => void;
}>) {
  return (
    <section className="rsvp-panel rsvp-panel--hot rounded-[2rem] px-6 py-8 sm:px-10 sm:py-10">
      {/* Header & progress */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="rsvp-eyebrow rsvp-eyebrow--pink">
            {event.eventLabel}
          </span>
          <p className="mt-4 font-mono text-[0.7rem] uppercase tracking-[0.3em] text-[var(--rsvp-ink-dim)]">
            Step {step + 1} of {total}
          </p>
          <h1 className="mt-2 rsvp-display text-3xl sm:text-4xl">
            {activeQuestion.title}
          </h1>
        </div>
        <div className="sm:w-[20rem]">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-[0.3em] text-[var(--rsvp-ink-dim)]">
            <span>{completionPercent}% done</span>
            <span className="text-[var(--rsvp-teal)]">
              {total - step - 1} to go
            </span>
          </div>
          <div className="rsvp-progress mt-2">
            <span
              className="rsvp-progress-fill"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="mt-8 grid gap-7 lg:grid-cols-[1.1fr_0.75fr]">
        <div>
          {activeQuestion.imageUrl ? (
            <div className="relative mb-6 overflow-hidden rounded-[1.4rem] border border-[var(--rsvp-border-soft)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeQuestion.imageUrl}
                alt={activeQuestion.imageAlt ?? activeQuestion.title}
                className="h-56 w-full object-cover sm:h-64"
                loading="lazy"
              />
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, transparent 50%, rgba(7,4,10,0.85) 100%)",
                }}
              />
              <span className="absolute bottom-3 left-4 rsvp-tag rsvp-tag-hot">
                {activeQuestion.eyebrow}
              </span>
            </div>
          ) : (
            <span className="rsvp-tag rsvp-tag-pending">
              {activeQuestion.eyebrow}
            </span>
          )}
          <p className="mt-4 text-sm leading-7 text-[var(--rsvp-ink-dim)] sm:text-base">
            {activeQuestion.description}
          </p>
          <div className="mt-6">
            <QuestionResponseField
              question={activeQuestion}
              answer={answers[activeQuestion.id]}
              onChange={(v) => onAnswerChange(activeQuestion, v)}
            />
          </div>

          {validationMessage ? (
            <p className="mt-4 rounded-2xl border border-[var(--rsvp-pink)]/40 bg-[var(--rsvp-pink)]/10 px-4 py-3 text-sm text-[var(--rsvp-pink-soft)]">
              {validationMessage}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              className="rsvp-btn rsvp-btn-ghost"
              onClick={onBack}
            >
              ← Back
            </button>
            <button
              type="button"
              className="rsvp-btn rsvp-btn-primary"
              onClick={onNext}
              disabled={Boolean(validationMessage)}
            >
              {isLastStep ? "Review RSVP" : "Next question"}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        {/* Rail */}
        <aside className="rounded-[1.4rem] border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.5)] p-4">
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-[var(--rsvp-teal)]">
            Questions
          </p>
          <div className="mt-3 grid max-h-[24rem] gap-2 overflow-auto pr-1">
            {visibleQuestions.map((q, i) => {
              const answered = isQuestionAnswered(q, answers[q.id]);
              const isActive = i === step;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => onJumpToStep(i)}
                  className={`flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                    isActive
                      ? "border-[var(--rsvp-pink)] bg-[var(--rsvp-pink)]/10"
                      : answered
                      ? "border-[var(--rsvp-teal)]/40 bg-[rgba(77,225,255,0.05)] hover:bg-[rgba(77,225,255,0.1)]"
                      : "border-[var(--rsvp-border-soft)] bg-black/20 hover:border-[var(--rsvp-border)]"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isActive
                        ? "bg-[var(--rsvp-pink)] text-white"
                        : answered
                        ? "bg-[var(--rsvp-teal)] text-[#0a0610]"
                        : "bg-white/10 text-[var(--rsvp-ink-dim)]"
                    }`}
                  >
                    {answered && !isActive ? "✓" : i + 1}
                  </span>
                  <span className="flex-1">
                    <span className="block text-xs font-mono uppercase tracking-[0.22em] text-[var(--rsvp-ink-dim)]">
                      {q.eyebrow}
                    </span>
                    <span className="mt-1 block text-sm font-semibold text-[var(--rsvp-ink)]">
                      {q.title}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </section>
  );
}

function ReviewView({
  event,
  summaryText,
  submitState,
  copyState,
  completionPercent,
  onBack,
  onSubmit,
  onCopySummary,
  onReset,
}: Readonly<{
  event: RSVPEvent;
  summaryText: string;
  submitState: SubmitState;
  copyState: "idle" | "copied" | "error";
  completionPercent: number;
  onBack: () => void;
  onSubmit: () => void;
  onCopySummary: () => void;
  onReset: () => void;
}>) {
  return (
    <section className="rsvp-panel rsvp-panel--hot rounded-[2rem] px-6 py-10 sm:px-10">
      <div className="flex flex-col gap-4">
        <span className="rsvp-eyebrow rsvp-eyebrow--gold">Review</span>
        <h1 className="rsvp-neon rsvp-neon--teal text-4xl">
          Ready to lock it in?
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-[var(--rsvp-ink-dim)] sm:text-base">
          You&rsquo;ve answered {completionPercent}% of {event.title}. Review your summary below and submit when you&rsquo;re ready &mdash; we&rsquo;ll reach out to collect any deposits.
        </p>
      </div>

      <pre className="mt-8 max-h-[28rem] overflow-auto rounded-2xl border border-[var(--rsvp-border-soft)] bg-black/45 px-5 py-5 font-mono text-xs leading-6 text-[var(--rsvp-ink)] whitespace-pre-wrap">
        {summaryText}
      </pre>

      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" className="rsvp-btn rsvp-btn-ghost" onClick={onBack}>
          ← Edit answers
        </button>
        <button
          type="button"
          className="rsvp-btn rsvp-btn-primary"
          onClick={onSubmit}
          disabled={submitState.status === "submitting"}
        >
          {submitState.status === "submitting"
            ? "Submitting..."
            : "Submit my RSVP"}
          <span aria-hidden="true">→</span>
        </button>
        <button
          type="button"
          className="rsvp-btn rsvp-btn-neon"
          onClick={onCopySummary}
        >
          {copyState === "copied"
            ? "Copied!"
            : copyState === "error"
            ? "Clipboard unavailable"
            : "Copy summary"}
        </button>
        <button
          type="button"
          className="rsvp-btn rsvp-btn-danger"
          onClick={onReset}
        >
          Reset draft
        </button>
      </div>

      {submitState.status === "error" ? (
        <p className="mt-4 rounded-2xl border border-[var(--rsvp-pink)]/40 bg-[var(--rsvp-pink)]/10 px-4 py-3 text-sm text-[var(--rsvp-pink-soft)]">
          {submitState.message}
        </p>
      ) : null}
    </section>
  );
}

function SubmittedView({
  event,
  submitState,
  copyState,
  onCopySummary,
  onStartAnother,
  onBackToPoster,
}: Readonly<{
  event: RSVPEvent;
  submitState: SubmitState;
  copyState: "idle" | "copied" | "error";
  onCopySummary: () => void;
  onStartAnother: () => void;
  onBackToPoster: () => void;
}>) {
  const responseId =
    submitState.status === "submitted" ? submitState.responseId : null;
  const submittedAt =
    submitState.status === "submitted" ? submitState.submittedAt : null;

  return (
    <section className="rsvp-panel rsvp-panel--hot rounded-[2rem] px-6 py-12 text-center sm:px-10">
      <span className="rsvp-eyebrow rsvp-eyebrow--pink">Confirmed</span>
      <h1 className="mt-6 rsvp-neon rsvp-neon--pink text-5xl sm:text-6xl">
        See you in Vegas!
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-[var(--rsvp-ink-dim)]">
        Your RSVP for {event.title} is on the list. Watch your inbox for payment details on paid events — send deposits to Scott or Dallas by June 10th.
      </p>
      {responseId ? (
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.3em] text-[var(--rsvp-teal)]">
          Response ID · {responseId} · {formatTimestamp(submittedAt)}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          className="rsvp-btn rsvp-btn-primary"
          onClick={onBackToPoster}
        >
          Back to the invite
        </button>
        <button
          type="button"
          className="rsvp-btn rsvp-btn-neon"
          onClick={onCopySummary}
        >
          {copyState === "copied" ? "Copied!" : "Copy my summary"}
        </button>
        <button
          type="button"
          className="rsvp-btn rsvp-btn-ghost"
          onClick={onStartAnother}
        >
          RSVP for another guest
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Admin Studio                                                        */
/* ------------------------------------------------------------------ */

function AdminStudio(props: Readonly<{
  studio: RSVPStudio;
  currentEvent: RSVPEvent;
  selectedEventId: string;
  onSelectEvent: (id: string) => void;
  onCreateEvent: () => void;
  onDuplicateEvent: () => void;
  onDeleteEvent: () => void;
  adminTab: AdminTab;
  setAdminTab: (t: AdminTab) => void;
  isDirty: boolean;
  saveState: SaveState;
  saveMessage: string | null;
  studioUpdatedAt: string | null;
  studioUpdatedByEmail: string | null;
  onPublish: () => void;
  onDiscard: () => void;
  onClose: () => void;
  onSignOut: () => void;
  authWorking: boolean;
  updateCurrentEvent: (u: (e: RSVPEvent) => RSVPEvent) => void;
  updateCurrentQuestion: (u: (q: RSVPQuestion) => RSVPQuestion) => void;
  selectedQuestion: RSVPQuestion | undefined;
  setSelectedQuestionId: (id: string) => void;
  onAddQuestion: () => void;
  onDuplicateQuestion: () => void;
  onDeleteQuestion: () => void;
  onMoveQuestion: (dir: -1 | 1) => void;
  onQuestionTypeChange: (t: RSVPQuestionType) => void;
  onConditionalSourceChange: (id: string) => void;
  updateSelectedQuestionOption: (id: string, u: (o: RSVPOption) => RSVPOption) => void;
  addOptionToSelectedQuestion: () => void;
  removeOptionFromSelectedQuestion: (id: string) => void;
  recentResponses: RSVPClientResponseRecord[];
  responseListState: StudioLoadState;
  responseListError: string | null;
  totalVisibleQuestions: number;
  answeredCount: number;
}>) {
  const {
    studio,
    currentEvent,
    selectedEventId,
    onSelectEvent,
    onCreateEvent,
    onDuplicateEvent,
    onDeleteEvent,
    adminTab,
    setAdminTab,
    isDirty,
    saveState,
    saveMessage,
    studioUpdatedAt,
    studioUpdatedByEmail,
    onPublish,
    onDiscard,
    onClose,
    updateCurrentEvent,
    updateCurrentQuestion,
    selectedQuestion,
    setSelectedQuestionId,
    onAddQuestion,
    onDuplicateQuestion,
    onDeleteQuestion,
    onMoveQuestion,
    onQuestionTypeChange,
    onConditionalSourceChange,
    updateSelectedQuestionOption,
    addOptionToSelectedQuestion,
    removeOptionFromSelectedQuestion,
    recentResponses,
    responseListState,
    responseListError,
  } = props;

  return (
    <section className="rsvp-panel rounded-[2rem] px-0 py-0 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--rsvp-border-soft)] bg-[rgba(0,0,0,0.35)] px-6 py-4 sm:px-8">
        <div className="flex items-center gap-4">
          <span className="rsvp-eyebrow rsvp-eyebrow--gold">Admin Studio</span>
          <span
            className={`rsvp-tag ${
              isDirty ? "rsvp-tag-hot" : "rsvp-tag-answered"
            }`}
          >
            {isDirty ? "Unpublished changes" : "Published"}
          </span>
          {studioUpdatedAt ? (
            <span className="hidden font-mono text-[0.65rem] uppercase tracking-[0.25em] text-[var(--rsvp-ink-dim)] sm:inline">
              Updated {formatTimestamp(studioUpdatedAt)}
              {studioUpdatedByEmail ? ` · ${studioUpdatedByEmail}` : ""}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rsvp-btn rsvp-btn-ghost"
            onClick={onDiscard}
            disabled={!isDirty || saveState === "saving"}
          >
            Discard
          </button>
          <button
            type="button"
            className="rsvp-btn rsvp-btn-primary"
            onClick={onPublish}
            disabled={!isDirty || saveState === "saving"}
          >
            {saveState === "saving" ? "Publishing..." : "Publish changes"}
          </button>
          <button
            type="button"
            aria-label="Close admin studio"
            className="rsvp-btn rsvp-btn-ghost px-3"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
      </div>

      {saveMessage ? (
        <p
          className={`mx-6 mt-4 rounded-2xl border px-4 py-3 text-sm sm:mx-8 ${
            saveState === "error"
              ? "border-[var(--rsvp-pink)]/40 bg-[var(--rsvp-pink)]/10 text-[var(--rsvp-pink-soft)]"
              : "border-[var(--rsvp-teal)]/40 bg-[var(--rsvp-teal)]/10 text-[var(--rsvp-teal-soft)]"
          }`}
        >
          {saveMessage}
        </p>
      ) : null}

      <div className="grid gap-0 lg:grid-cols-[18rem_1fr]">
        {/* Sidebar */}
        <aside className="border-b border-[var(--rsvp-border-soft)] bg-[rgba(0,0,0,0.25)] px-5 py-5 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-[var(--rsvp-ink-dim)]">
              Events
            </p>
            <button
              type="button"
              className="rsvp-btn rsvp-btn-neon px-3 py-1.5 text-xs"
              onClick={onCreateEvent}
            >
              + New
            </button>
          </div>

          <div className="mt-4 grid gap-2">
            {studio.events.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => onSelectEvent(e.id)}
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  e.id === selectedEventId
                    ? "border-[var(--rsvp-pink)] bg-[var(--rsvp-pink)]/10"
                    : "border-[var(--rsvp-border-soft)] bg-black/30 hover:border-[var(--rsvp-border)]"
                }`}
              >
                <p className="font-mono text-[0.65rem] uppercase tracking-[0.26em] text-[var(--rsvp-teal)]">
                  {e.eventLabel}
                </p>
                <p className="mt-1.5 text-sm font-semibold text-[var(--rsvp-ink)]">
                  {e.title}
                </p>
                <p className="mt-1 text-[0.7rem] text-[var(--rsvp-ink-dim)]">
                  {e.questions.length} question
                  {e.questions.length === 1 ? "" : "s"} · {e.timeframe}
                </p>
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={onDuplicateEvent}
              className="rsvp-btn rsvp-btn-ghost w-full py-2 text-xs"
            >
              Duplicate current event
            </button>
            <button
              type="button"
              onClick={onDeleteEvent}
              disabled={studio.events.length === 1}
              className="rsvp-btn rsvp-btn-danger w-full py-2 text-xs"
            >
              Delete current event
            </button>
          </div>
        </aside>

        {/* Main editor */}
        <div className="px-5 py-5 sm:px-7">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 rounded-full border border-[var(--rsvp-border-soft)] bg-black/30 p-1">
            {(
              [
                ["details", "Event details"],
                ["questions", "Questions"],
                ["responses", "Responses"],
                ["publish", "Publish"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setAdminTab(k)}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                  adminTab === k
                    ? "bg-gradient-to-r from-[var(--rsvp-pink)] to-[#d3278b] text-white shadow-[0_0_18px_rgba(255,61,154,0.5)]"
                    : "text-[var(--rsvp-ink-dim)] hover:text-[var(--rsvp-ink)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {adminTab === "details" ? (
            <EventDetailsTab
              event={currentEvent}
              updateCurrentEvent={updateCurrentEvent}
            />
          ) : null}

          {adminTab === "questions" ? (
            <QuestionsTab
              event={currentEvent}
              selectedQuestion={selectedQuestion}
              setSelectedQuestionId={setSelectedQuestionId}
              onAddQuestion={onAddQuestion}
              onDuplicateQuestion={onDuplicateQuestion}
              onDeleteQuestion={onDeleteQuestion}
              onMoveQuestion={onMoveQuestion}
              onQuestionTypeChange={onQuestionTypeChange}
              onConditionalSourceChange={onConditionalSourceChange}
              updateCurrentQuestion={updateCurrentQuestion}
              updateSelectedQuestionOption={updateSelectedQuestionOption}
              addOptionToSelectedQuestion={addOptionToSelectedQuestion}
              removeOptionFromSelectedQuestion={removeOptionFromSelectedQuestion}
            />
          ) : null}

          {adminTab === "responses" ? (
            <ResponsesTab
              responses={recentResponses}
              state={responseListState}
              error={responseListError}
            />
          ) : null}

          {adminTab === "publish" ? (
            <PublishTab
              event={currentEvent}
              isDirty={isDirty}
              saveState={saveState}
              studioUpdatedAt={studioUpdatedAt}
              studioUpdatedByEmail={studioUpdatedByEmail}
              onPublish={onPublish}
              onDiscard={onDiscard}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Admin sub-tabs                                                       */
/* ------------------------------------------------------------------ */

function EventDetailsTab({
  event,
  updateCurrentEvent,
}: Readonly<{
  event: RSVPEvent;
  updateCurrentEvent: (u: (e: RSVPEvent) => RSVPEvent) => void;
}>) {
  return (
    <div className="mt-6 grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <FieldLabel>Event label</FieldLabel>
          <BaseInput
            value={event.eventLabel}
            onChange={(e) =>
              updateCurrentEvent((cur) => ({
                ...cur,
                eventLabel: e.target.value,
              }))
            }
          />
        </label>
        <label className="flex flex-col gap-2">
          <FieldLabel>Slug</FieldLabel>
          <BaseInput
            value={event.slug}
            onChange={(e) =>
              updateCurrentEvent((cur) => ({
                ...cur,
                slug: formatSlug(e.target.value),
              }))
            }
          />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <FieldLabel>Title</FieldLabel>
        <BaseInput
          value={event.title}
          onChange={(e) =>
            updateCurrentEvent((cur) => ({ ...cur, title: e.target.value }))
          }
        />
      </label>

      <label className="flex flex-col gap-2">
        <FieldLabel>Welcome / hero title</FieldLabel>
        <BaseTextarea
          rows={3}
          value={event.welcomeTitle}
          onChange={(e) =>
            updateCurrentEvent((cur) => ({
              ...cur,
              welcomeTitle: e.target.value,
            }))
          }
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <FieldLabel>Timeframe</FieldLabel>
          <BaseInput
            value={event.timeframe}
            onChange={(e) =>
              updateCurrentEvent((cur) => ({
                ...cur,
                timeframe: e.target.value,
              }))
            }
          />
        </label>
        <label className="flex flex-col gap-2">
          <FieldLabel>Location</FieldLabel>
          <BaseInput
            value={event.location}
            onChange={(e) =>
              updateCurrentEvent((cur) => ({
                ...cur,
                location: e.target.value,
              }))
            }
          />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <FieldLabel>Summary</FieldLabel>
        <BaseTextarea
          rows={3}
          value={event.summary}
          onChange={(e) =>
            updateCurrentEvent((cur) => ({
              ...cur,
              summary: e.target.value,
            }))
          }
        />
      </label>

      <label className="flex flex-col gap-2">
        <FieldLabel>Intro copy</FieldLabel>
        <BaseTextarea
          rows={5}
          value={event.intro}
          onChange={(e) =>
            updateCurrentEvent((cur) => ({ ...cur, intro: e.target.value }))
          }
        />
      </label>

      <label className="flex flex-col gap-2">
        <FieldLabel>RSVP notes (one per line)</FieldLabel>
        <BaseTextarea
          rows={6}
          value={event.notes.join("\n")}
          onChange={(e) =>
            updateCurrentEvent((cur) => ({
              ...cur,
              notes: e.target.value
                .split("\n")
                .map((n) => n.trim())
                .filter(Boolean),
            }))
          }
        />
      </label>
    </div>
  );
}

function QuestionsTab({
  event,
  selectedQuestion,
  setSelectedQuestionId,
  onAddQuestion,
  onDuplicateQuestion,
  onDeleteQuestion,
  onMoveQuestion,
  onQuestionTypeChange,
  onConditionalSourceChange,
  updateCurrentQuestion,
  updateSelectedQuestionOption,
  addOptionToSelectedQuestion,
  removeOptionFromSelectedQuestion,
}: Readonly<{
  event: RSVPEvent;
  selectedQuestion: RSVPQuestion | undefined;
  setSelectedQuestionId: (id: string) => void;
  onAddQuestion: () => void;
  onDuplicateQuestion: () => void;
  onDeleteQuestion: () => void;
  onMoveQuestion: (d: -1 | 1) => void;
  onQuestionTypeChange: (t: RSVPQuestionType) => void;
  onConditionalSourceChange: (id: string) => void;
  updateCurrentQuestion: (u: (q: RSVPQuestion) => RSVPQuestion) => void;
  updateSelectedQuestionOption: (
    id: string,
    u: (o: RSVPOption) => RSVPOption,
  ) => void;
  addOptionToSelectedQuestion: () => void;
  removeOptionFromSelectedQuestion: (id: string) => void;
}>) {
  const selectedIndex = selectedQuestion
    ? event.questions.findIndex((q) => q.id === selectedQuestion.id)
    : -1;
  const isFirst = selectedIndex <= 0;
  const isLast =
    selectedIndex === -1 || selectedIndex === event.questions.length - 1;

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_1fr]">
      {/* Question list */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-[var(--rsvp-ink-dim)]">
            Flow ({event.questions.length})
          </p>
          <button
            type="button"
            onClick={onAddQuestion}
            className="rsvp-btn rsvp-btn-neon px-3 py-1.5 text-xs"
          >
            + Add
          </button>
        </div>
        <div className="mt-3 grid max-h-[28rem] gap-1.5 overflow-auto pr-1">
          {event.questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setSelectedQuestionId(q.id)}
              className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                q.id === selectedQuestion?.id
                  ? "border-[var(--rsvp-pink)] bg-[var(--rsvp-pink)]/10"
                  : "border-[var(--rsvp-border-soft)] bg-black/25 hover:border-[var(--rsvp-border)]"
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold ${
                  q.id === selectedQuestion?.id
                    ? "bg-[var(--rsvp-pink)] text-white"
                    : "bg-white/10 text-[var(--rsvp-ink-dim)]"
                }`}
              >
                {i + 1}
              </span>
              <span className="flex-1">
                <span className="block text-xs font-mono uppercase tracking-[0.22em] text-[var(--rsvp-ink-dim)]">
                  {q.eyebrow}
                </span>
                <span className="mt-0.5 block text-sm font-semibold text-[var(--rsvp-ink)]">
                  {q.title}
                </span>
              </span>
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="rsvp-btn rsvp-btn-ghost px-2 py-2 text-xs"
            onClick={() => onMoveQuestion(-1)}
            disabled={isFirst}
          >
            ↑ Move up
          </button>
          <button
            type="button"
            className="rsvp-btn rsvp-btn-ghost px-2 py-2 text-xs"
            onClick={() => onMoveQuestion(1)}
            disabled={isLast}
          >
            ↓ Move down
          </button>
          <button
            type="button"
            className="rsvp-btn rsvp-btn-ghost px-2 py-2 text-xs"
            onClick={onDuplicateQuestion}
            disabled={!selectedQuestion}
          >
            Duplicate
          </button>
          <button
            type="button"
            className="rsvp-btn rsvp-btn-danger px-2 py-2 text-xs"
            onClick={onDeleteQuestion}
            disabled={event.questions.length === 1}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Question editor */}
      {selectedQuestion ? (
        <div className="grid gap-5 rounded-2xl border border-[var(--rsvp-border-soft)] bg-black/25 p-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <FieldLabel>Eyebrow</FieldLabel>
              <BaseInput
                value={selectedQuestion.eyebrow}
                onChange={(e) =>
                  updateCurrentQuestion((q) => ({
                    ...q,
                    eyebrow: e.target.value,
                  }))
                }
              />
            </label>
            <label className="flex flex-col gap-2">
              <FieldLabel>Slug</FieldLabel>
              <BaseInput
                value={selectedQuestion.slug}
                onChange={(e) =>
                  updateCurrentQuestion((q) => ({
                    ...q,
                    slug: formatSlug(e.target.value),
                  }))
                }
              />
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <FieldLabel>Question title</FieldLabel>
            <BaseTextarea
              rows={2}
              value={selectedQuestion.title}
              onChange={(e) =>
                updateCurrentQuestion((q) => ({ ...q, title: e.target.value }))
              }
            />
          </label>

          <label className="flex flex-col gap-2">
            <FieldLabel>Description</FieldLabel>
            <BaseTextarea
              rows={4}
              value={selectedQuestion.description}
              onChange={(e) =>
                updateCurrentQuestion((q) => ({
                  ...q,
                  description: e.target.value,
                }))
              }
            />
          </label>

          {/* Image picker */}
          <div className="rounded-2xl border border-[var(--rsvp-border-soft)] bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <FieldLabel>Question image</FieldLabel>
              {selectedQuestion.imageUrl ? (
                <button
                  type="button"
                  className="rsvp-btn rsvp-btn-danger px-3 py-1.5 text-xs"
                  onClick={() =>
                    updateCurrentQuestion((q) => ({
                      ...q,
                      imageUrl: undefined,
                      imageAlt: undefined,
                    }))
                  }
                >
                  Remove image
                </button>
              ) : null}
            </div>
            {selectedQuestion.imageUrl ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-[var(--rsvp-border-soft)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedQuestion.imageUrl}
                  alt={selectedQuestion.imageAlt ?? ""}
                  className="h-40 w-full object-cover"
                />
              </div>
            ) : null}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() =>
                  updateCurrentQuestion((q) => ({
                    ...q,
                    imageUrl: undefined,
                    imageAlt: undefined,
                  }))
                }
                className={`rounded-xl border px-2 py-3 text-xs font-semibold uppercase tracking-[0.15em] transition ${
                  !selectedQuestion.imageUrl
                    ? "border-[var(--rsvp-pink)] bg-[var(--rsvp-pink)]/10 text-[var(--rsvp-pink-soft)]"
                    : "border-[var(--rsvp-border-soft)] bg-black/30 text-[var(--rsvp-ink-dim)] hover:border-[var(--rsvp-border)]"
                }`}
              >
                None
              </button>
              {RSVP_IMAGE_LIBRARY.map((asset) => {
                const isSelected = selectedQuestion.imageUrl === asset.url;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() =>
                      updateCurrentQuestion((q) => ({
                        ...q,
                        imageUrl: asset.url,
                        imageAlt: q.imageAlt || asset.label,
                      }))
                    }
                    className={`group flex flex-col overflow-hidden rounded-xl border text-left transition ${
                      isSelected
                        ? "border-[var(--rsvp-pink)] shadow-[0_0_18px_rgba(255,61,154,0.35)]"
                        : "border-[var(--rsvp-border-soft)] hover:border-[var(--rsvp-teal)]/60"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.url}
                      alt={asset.label}
                      className="h-20 w-full object-cover"
                    />
                    <span className="px-2 py-1.5 text-[0.65rem] font-mono uppercase tracking-[0.15em] text-[var(--rsvp-ink-dim)] group-hover:text-[var(--rsvp-ink)]">
                      {asset.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {selectedQuestion.imageUrl ? (
              <label className="mt-4 flex flex-col gap-2">
                <FieldLabel>Alt text (for screen readers)</FieldLabel>
                <BaseInput
                  value={selectedQuestion.imageAlt ?? ""}
                  onChange={(e) =>
                    updateCurrentQuestion((q) => ({
                      ...q,
                      imageAlt: e.target.value,
                    }))
                  }
                />
              </label>
            ) : null}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <FieldLabel>Type</FieldLabel>
              <select
                className="rsvp-select"
                value={selectedQuestion.type}
                onChange={(e) =>
                  onQuestionTypeChange(e.target.value as RSVPQuestionType)
                }
              >
                {questionTypeOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <FieldLabel>Placeholder</FieldLabel>
              <BaseInput
                value={selectedQuestion.placeholder ?? ""}
                onChange={(e) =>
                  updateCurrentQuestion((q) => ({
                    ...q,
                    placeholder: e.target.value,
                  }))
                }
              />
            </label>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-[var(--rsvp-border-soft)] bg-black/30 px-4 py-3">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--rsvp-pink)]"
              checked={selectedQuestion.required}
              onChange={(e) =>
                updateCurrentQuestion((q) => ({
                  ...q,
                  required: e.target.checked,
                }))
              }
            />
            <span className="text-sm font-medium text-[var(--rsvp-ink)]">
              Required question
            </span>
          </label>

          {selectedQuestion.type === "number" ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <FieldLabel>Minimum</FieldLabel>
                <BaseInput
                  type="number"
                  value={selectedQuestion.min ?? ""}
                  onChange={(e) =>
                    updateCurrentQuestion((q) => ({
                      ...q,
                      min: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col gap-2">
                <FieldLabel>Maximum</FieldLabel>
                <BaseInput
                  type="number"
                  value={selectedQuestion.max ?? ""}
                  onChange={(e) =>
                    updateCurrentQuestion((q) => ({
                      ...q,
                      max: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
              </label>
            </div>
          ) : null}

          <div className="grid gap-3 rounded-xl border border-[var(--rsvp-border-soft)] bg-black/20 p-4">
            <FieldLabel>Conditional logic</FieldLabel>
            <select
              className="rsvp-select"
              value={selectedQuestion.showWhen?.questionId ?? ""}
              onChange={(e) => onConditionalSourceChange(e.target.value)}
            >
              <option value="">Always show</option>
              {event.questions
                .filter((q) => q.id !== selectedQuestion.id)
                .map((q) => (
                  <option key={q.id} value={q.id}>
                    Show after: {q.title}
                  </option>
                ))}
            </select>
            {selectedQuestion.showWhen ? (
              <label className="flex flex-col gap-2">
                <FieldLabel>Show when values include (comma-separated)</FieldLabel>
                <BaseInput
                  value={selectedQuestion.showWhen.equalsAny.join(", ")}
                  onChange={(e) =>
                    updateCurrentQuestion((q) => ({
                      ...q,
                      showWhen: q.showWhen
                        ? {
                            ...q.showWhen,
                            equalsAny: e.target.value
                              .split(",")
                              .map((v) => v.trim())
                              .filter(Boolean),
                          }
                        : undefined,
                    }))
                  }
                  placeholder="attending, yes"
                />
              </label>
            ) : null}
          </div>

          {selectedQuestion.type === "single_select" ||
          selectedQuestion.type === "multi_select" ? (
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <FieldLabel>Answer options</FieldLabel>
                <button
                  type="button"
                  className="rsvp-btn rsvp-btn-neon px-3 py-1.5 text-xs"
                  onClick={addOptionToSelectedQuestion}
                >
                  + Add option
                </button>
              </div>
              {(selectedQuestion.options ?? []).map((o) => (
                <div
                  key={o.id}
                  className="grid gap-3 rounded-xl border border-[var(--rsvp-border-soft)] bg-black/25 p-3"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-2">
                      <FieldLabel>Label</FieldLabel>
                      <BaseInput
                        value={o.label}
                        onChange={(e) =>
                          updateSelectedQuestionOption(o.id, (cur) => ({
                            ...cur,
                            label: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <FieldLabel>Value</FieldLabel>
                      <BaseInput
                        value={o.value}
                        onChange={(e) =>
                          updateSelectedQuestionOption(o.id, (cur) => ({
                            ...cur,
                            value: formatSlug(e.target.value) || cur.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                  <label className="flex flex-col gap-2">
                    <FieldLabel>Description</FieldLabel>
                    <BaseInput
                      value={o.description ?? ""}
                      onChange={(e) =>
                        updateSelectedQuestionOption(o.id, (cur) => ({
                          ...cur,
                          description: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeOptionFromSelectedQuestion(o.id)}
                    className="rsvp-btn rsvp-btn-danger self-end px-3 py-1.5 text-xs"
                  >
                    Remove option
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="rounded-2xl border border-[var(--rsvp-border-soft)] bg-black/25 p-6 text-sm text-[var(--rsvp-ink-dim)]">
          Select a question from the list to edit it.
        </p>
      )}
    </div>
  );
}

function ResponsesTab({
  responses,
  state,
  error,
}: Readonly<{
  responses: RSVPClientResponseRecord[];
  state: StudioLoadState;
  error: string | null;
}>) {
  if (state === "loading") {
    return (
      <p className="mt-6 rounded-2xl border border-[var(--rsvp-border-soft)] bg-black/30 p-5 text-sm text-[var(--rsvp-ink-dim)]">
        Loading recent RSVPs from Firestore...
      </p>
    );
  }
  if (state === "error") {
    return (
      <p className="mt-6 rounded-2xl border border-[var(--rsvp-pink)]/40 bg-[var(--rsvp-pink)]/10 p-5 text-sm text-[var(--rsvp-pink-soft)]">
        {error}
      </p>
    );
  }
  if (!responses.length) {
    return (
      <p className="mt-6 rounded-2xl border border-[var(--rsvp-border-soft)] bg-black/30 p-5 text-sm text-[var(--rsvp-ink-dim)]">
        No online responses have been submitted for this event yet.
      </p>
    );
  }
  return (
    <div className="mt-6 grid gap-3">
      {responses.map((r) => (
        <article
          key={r.id}
          className="rounded-2xl border border-[var(--rsvp-border-soft)] bg-black/30 px-5 py-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-[var(--rsvp-ink)]">
                {r.guestName}
              </p>
              <p className="mt-1 text-sm text-[var(--rsvp-ink-dim)]">
                {r.guestEmail}
              </p>
            </div>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-[var(--rsvp-teal)]">
              {formatTimestamp(r.createdAt)}
            </p>
          </div>
          <p className="mt-3 font-mono text-[0.65rem] uppercase tracking-[0.24em] text-[var(--rsvp-ink-dim)]">
            {r.answersCount} answers captured
          </p>
          <pre className="mt-3 max-h-48 overflow-auto rounded-xl border border-[var(--rsvp-border-soft)] bg-black/50 px-3 py-3 font-mono text-[0.7rem] leading-5 text-[var(--rsvp-ink)] whitespace-pre-wrap">
            {r.summaryText}
          </pre>
        </article>
      ))}
    </div>
  );
}

function PublishTab({
  event,
  isDirty,
  saveState,
  studioUpdatedAt,
  studioUpdatedByEmail,
  onPublish,
  onDiscard,
}: Readonly<{
  event: RSVPEvent;
  isDirty: boolean;
  saveState: SaveState;
  studioUpdatedAt: string | null;
  studioUpdatedByEmail: string | null;
  onPublish: () => void;
  onDiscard: () => void;
}>) {
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-[var(--rsvp-border-soft)] bg-black/30 p-5">
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-[var(--rsvp-ink-dim)]">
          Current event
        </p>
        <h3 className="mt-3 rsvp-display text-2xl">{event.title}</h3>
        <p className="mt-1 text-sm text-[var(--rsvp-ink-dim)]">
          {event.timeframe} · {event.location}
        </p>
        <p className="mt-4 text-sm leading-7 text-[var(--rsvp-ink-dim)]">
          {event.summary}
        </p>
        <p className="mt-4 font-mono text-[0.7rem] uppercase tracking-[0.3em] text-[var(--rsvp-teal)]">
          {event.questions.length} questions in flow
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--rsvp-border-soft)] bg-black/30 p-5">
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-[var(--rsvp-ink-dim)]">
          Publishing status
        </p>
        <p className="mt-3 flex items-center gap-2">
          <span
            className={`rsvp-tag ${
              isDirty ? "rsvp-tag-hot" : "rsvp-tag-answered"
            }`}
          >
            {isDirty ? "Unpublished changes" : "Live"}
          </span>
        </p>
        <p className="mt-4 text-sm leading-7 text-[var(--rsvp-ink-dim)]">
          {studioUpdatedAt
            ? `Last publish ${formatTimestamp(studioUpdatedAt)}${
                studioUpdatedByEmail ? ` by ${studioUpdatedByEmail}` : ""
              }.`
            : "Never published."}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            className="rsvp-btn rsvp-btn-primary"
            onClick={onPublish}
            disabled={!isDirty || saveState === "saving"}
          >
            {saveState === "saving" ? "Publishing..." : "Publish changes"}
          </button>
          <button
            type="button"
            className="rsvp-btn rsvp-btn-ghost"
            onClick={onDiscard}
            disabled={!isDirty || saveState === "saving"}
          >
            Discard edits
          </button>
        </div>
      </div>
    </div>
  );
}
