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

type EventDraft = {
  currentStep: number;
  answers: Record<string, RSVPAnswer | undefined>;
};

type RSVPDrafts = Record<string, EventDraft>;

type EditorTab = "event" | "question";

type StudioLoadState = "loading" | "ready" | "error";
type SaveState = "idle" | "saving" | "saved" | "error";

type SubmitState =
  | {
      status: "idle";
      message: null;
    }
  | {
      status: "submitting";
      message: null;
    }
  | {
      status: "submitted";
      message: string;
      responseId: string;
      submittedAt: string | null;
    }
  | {
      status: "error";
      message: string;
    };

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
  return event.questions.filter((question) => isQuestionVisible(question, answers));
}

function normalizeAnswer(
  question: RSVPQuestion,
  rawValue: unknown,
): RSVPAnswer | undefined {
  if (question.type === "multi_select") {
    if (!Array.isArray(rawValue)) {
      return [];
    }

    const validValues = new Set(
      (question.options ?? []).map((option) => option.value),
    );

    return rawValue.filter(
      (value): value is string =>
        typeof value === "string" && validValues.has(value),
    );
  }

  if (typeof rawValue !== "string") {
    return createDefaultAnswer(question);
  }

  if (
    question.type === "single_select" &&
    question.options?.some((option) => option.value === rawValue)
  ) {
    return rawValue;
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

  if (!input || typeof input !== "object") {
    return fallback;
  }

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
        {
          currentStep: nextStep,
          answers: nextAnswers,
        },
      ];
    }),
  );
}

function answersEqual(a: RSVPAnswer | undefined, b: RSVPAnswer | undefined) {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((value, index) => value === b[index]);
  }

  return a === b;
}

function draftsEqual(a: RSVPDrafts, b: RSVPDrafts) {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (const eventId of keysA) {
    const draftA = a[eventId];
    const draftB = b[eventId];

    if (!draftA || !draftB) {
      return false;
    }

    if (draftA.currentStep !== draftB.currentStep) {
      return false;
    }

    const answerKeysA = Object.keys(draftA.answers);
    const answerKeysB = Object.keys(draftB.answers);

    if (answerKeysA.length !== answerKeysB.length) {
      return false;
    }

    for (const answerKey of answerKeysA) {
      if (!answersEqual(draftA.answers[answerKey], draftB.answers[answerKey])) {
        return false;
      }
    }
  }

  return true;
}

function getQuestionValidationMessage(
  question: RSVPQuestion,
  answer: RSVPAnswer | undefined,
) {
  if (!question.required) {
    return null;
  }

  if (question.type === "multi_select") {
    if (!Array.isArray(answer) || answer.length === 0) {
      return "Select at least one option to continue.";
    }

    return null;
  }

  if (typeof answer !== "string") {
    return "Answer this question to continue.";
  }

  const trimmedAnswer = answer.trim();

  if (!trimmedAnswer) {
    return "Answer this question to continue.";
  }

  if (question.type === "email") {
    return /\S+@\S+\.\S+/.test(trimmedAnswer)
      ? null
      : "Enter a valid email address to continue.";
  }

  if (question.type === "number") {
    const numericValue = Number(trimmedAnswer);

    if (!Number.isFinite(numericValue)) {
      return "Enter a valid number to continue.";
    }

    if (typeof question.min === "number" && numericValue < question.min) {
      return `The number must be at least ${question.min}.`;
    }

    if (typeof question.max === "number" && numericValue > question.max) {
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

function formatAnswerValue(question: RSVPQuestion, answer: RSVPAnswer | undefined) {
  if (question.type === "multi_select") {
    if (!Array.isArray(answer) || answer.length === 0) {
      return "Pending";
    }

    return answer
      .map(
        (value) =>
          question.options?.find((option) => option.value === value)?.label ??
          value,
      )
      .join(", ");
  }

  if (typeof answer !== "string" || !answer.trim()) {
    return "Pending";
  }

  if (question.type === "single_select") {
    return (
      question.options?.find((option) => option.value === answer)?.label ??
      answer
    );
  }

  return answer.trim();
}

function buildSummaryText(
  event: RSVPEvent,
  answers: Record<string, RSVPAnswer | undefined>,
) {
  const visibleQuestions = getVisibleQuestions(event, answers);
  const answeredQuestions = visibleQuestions.filter((question) =>
    isQuestionAnswered(question, answers[question.id]),
  );

  const lines = [
    event.title,
    `${event.timeframe} / ${event.location}`,
    "",
    answeredQuestions.length
      ? "Responses:"
      : "Responses: nothing locked in yet.",
  ];

  if (answeredQuestions.length) {
    for (const question of answeredQuestions) {
      lines.push(
        `- ${question.title}: ${formatAnswerValue(question, answers[question.id])}`,
      );
    }
  }

  return lines.join("\n");
}

function findTextAnswerBySlug(
  event: RSVPEvent,
  answers: Record<string, RSVPAnswer | undefined>,
  slug: string,
) {
  const question = event.questions.find((entry) => entry.slug === slug);
  const answer = question ? answers[question.id] : undefined;

  return typeof answer === "string" ? answer.trim() : "";
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
      // Fall back to the manual copy path below.
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
    <label
      className={`flex cursor-pointer items-start gap-4 rounded-[1.4rem] border px-4 py-4 transition ${
        checked
          ? "border-[var(--rsvp-ink)] bg-[var(--rsvp-mint)]/70 shadow-[0_18px_38px_rgba(26,49,44,0.08)]"
          : "border-[var(--rsvp-border)] bg-white/80 hover:border-[var(--rsvp-ink)]/35 hover:bg-white"
      }`}
    >
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
  label,
  onToggle,
}: Readonly<{
  checked: boolean;
  description?: string;
  label: string;
  onToggle: () => void;
}>) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-4 rounded-[1.4rem] border px-4 py-4 transition ${
        checked
          ? "border-[var(--rsvp-ink)] bg-[var(--rsvp-blush)]/70 shadow-[0_18px_38px_rgba(80,34,26,0.08)]"
          : "border-[var(--rsvp-border)] bg-white/80 hover:border-[var(--rsvp-ink)]/35 hover:bg-white"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
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
        {description ? (
          <span className="text-sm leading-6 text-stone-600">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

function statusTone(percent: number) {
  if (percent >= 100) {
    return "border-emerald-300 bg-emerald-100/80 text-emerald-950";
  }

  if (percent >= 50) {
    return "border-amber-300 bg-amber-100/80 text-amber-950";
  }

  return "border-stone-200 bg-white/75 text-stone-600";
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function FieldLabel({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <span className="text-sm font-medium text-stone-700">{children}</span>
  );
}

function BaseInput({
  className = "",
  ...props
}: Readonly<React.InputHTMLAttributes<HTMLInputElement> & { className?: string }>) {
  return (
    <input
      {...props}
      className={`rounded-[1rem] border border-[var(--rsvp-border)] bg-white/80 px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[var(--rsvp-accent)] focus:bg-white ${className}`.trim()}
    />
  );
}

function BaseTextarea({
  className = "",
  ...props
}: Readonly<
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }
>) {
  return (
    <textarea
      {...props}
      className={`rounded-[1.2rem] border border-[var(--rsvp-border)] bg-white/80 px-4 py-3 text-sm leading-7 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[var(--rsvp-accent)] focus:bg-white ${className}`.trim()}
    />
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
        onChange={(event) => onChange(event.target.value)}
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
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (question.type === "long_text") {
    return (
      <BaseTextarea
        rows={7}
        value={typeof answer === "string" ? answer : ""}
        placeholder={question.placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (question.type === "multi_select") {
    const currentAnswer = Array.isArray(answer) ? answer : [];

    return (
      <div className="grid gap-3">
        {question.options?.map((option) => (
          <CheckboxOption
            key={option.id}
            checked={currentAnswer.includes(option.value)}
            label={option.label}
            description={option.description}
            onToggle={() =>
              onChange(
                currentAnswer.includes(option.value)
                  ? currentAnswer.filter((value) => value !== option.value)
                  : [...currentAnswer, option.value],
              )
            }
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {question.options?.map((option) => (
        <RadioOption
          key={option.id}
          name={question.id}
          value={option.value}
          checked={answer === option.value}
          label={option.label}
          description={option.description}
          onChange={(nextValue) => onChange(nextValue)}
        />
      ))}
    </div>
  );
}

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
  const [editorTab, setEditorTab] = useState<EditorTab>("event");
  const [showEditor, setShowEditor] = useState(true);
  const [studioLoadState, setStudioLoadState] = useState<StudioLoadState>("loading");
  const [studioLoadError, setStudioLoadError] = useState<string | null>(null);
  const [studioUpdatedAt, setStudioUpdatedAt] = useState<string | null>(null);
  const [studioUpdatedByEmail, setStudioUpdatedByEmail] = useState<string | null>(
    null,
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [responseListState, setResponseListState] =
    useState<StudioLoadState>("ready");
  const [responseListError, setResponseListError] = useState<string | null>(null);
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
  const isDirty = useMemo(() => !studiosEqual(studio, savedStudio), [studio, savedStudio]);

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

        if (cancelled) {
          return;
        }

        setStudio(nextStudio);
        setSavedStudio(nextStudio);
        setDrafts((currentDrafts) => normalizeDrafts(currentDrafts, nextStudio));
        setSelectedEventId((currentId) =>
          nextStudio.events.some((event) => event.id === currentId)
            ? currentId
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
        if (cancelled) {
          return;
        }

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
    setDrafts((currentDrafts) => {
      const normalizedDrafts = normalizeDrafts(currentDrafts, studio);
      return draftsEqual(currentDrafts, normalizedDrafts)
        ? currentDrafts
        : normalizedDrafts;
    });
  }, [studio]);

  useEffect(() => {
    if (!studio.events.some((event) => event.id === selectedEventId)) {
      setSelectedEventId(studio.events[0]?.id ?? "");
    }
  }, [selectedEventId, studio.events]);

  const currentEvent = useMemo(
    () =>
      studio.events.find((event) => event.id === selectedEventId) ??
      studio.events[0],
    [selectedEventId, studio.events],
  );

  useEffect(() => {
    if (!currentEvent?.questions.some((question) => question.id === selectedQuestionId)) {
      setSelectedQuestionId(currentEvent?.questions[0]?.id ?? "");
    }
  }, [currentEvent, selectedQuestionId]);

  useEffect(() => {
    if (copyState === "idle") {
      return;
    }

    const timeoutId = window.setTimeout(() => setCopyState("idle"), 2200);

    return () => window.clearTimeout(timeoutId);
  }, [copyState]);

  useEffect(() => {
    if (saveState === "saved" && isDirty) {
      setSaveState("idle");
      setSaveMessage(null);
    }
  }, [isDirty, saveState]);

  useEffect(() => {
    setSubmitState({
      status: "idle",
      message: null,
    });
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
              headers: {
                authorization: `Bearer ${token}`,
              },
            },
          );
          const payload = await getJsonPayload(response);

          responses = Array.isArray(payload?.responses)
            ? (payload.responses as RSVPClientResponseRecord[])
            : [];
        } catch {
          responses = await listRsvpResponsesFromClient(selectedEventId);
        }

        if (cancelled) {
          return;
        }

        setRecentResponses(responses);
        setResponseListState("ready");
      } catch (error) {
        if (cancelled) {
          return;
        }

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

  if (!currentEvent) {
    return null;
  }

  const currentDraft = drafts[currentEvent.id] ?? createDraftForEvent(currentEvent);
  const visibleQuestions = getVisibleQuestions(currentEvent, currentDraft.answers);
  const totalQuestions = visibleQuestions.length;
  const currentStep = Math.min(currentDraft.currentStep, totalQuestions);
  const activeQuestion = visibleQuestions[currentStep] ?? null;
  const selectedQuestion =
    currentEvent.questions.find((question) => question.id === selectedQuestionId) ??
    currentEvent.questions[0];
  const answeredCount = visibleQuestions.filter((question) =>
    isQuestionAnswered(question, currentDraft.answers[question.id]),
  ).length;
  const visibleQuestionIds = new Set(visibleQuestions.map((question) => question.id));
  const orderedVisibleQuestions = currentEvent.questions.filter((question) =>
    visibleQuestionIds.has(question.id),
  );
  const hiddenQuestions = currentEvent.questions.filter(
    (question) => !visibleQuestionIds.has(question.id),
  );
  const completionPercent =
    totalQuestions === 0 ? 100 : Math.round((answeredCount / totalQuestions) * 100);
  const pendingCount = Math.max(totalQuestions - answeredCount, 0);
  const summaryText = buildSummaryText(currentEvent, currentDraft.answers);
  const validationMessage = activeQuestion
    ? getQuestionValidationMessage(
        activeQuestion,
        currentDraft.answers[activeQuestion.id],
      )
    : null;

  const setCurrentEventDraft = (
    updater: (draft: EventDraft) => EventDraft,
  ) => {
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [currentEvent.id]: updater(
        currentDrafts[currentEvent.id] ?? createDraftForEvent(currentEvent),
      ),
    }));
  };

  const updateStudio = (updater: (currentStudio: RSVPStudio) => RSVPStudio) => {
    if (!canEdit) {
      return;
    }

    setStudio((currentStudio) => updater(currentStudio));
  };

  const updateCurrentEvent = (updater: (event: RSVPEvent) => RSVPEvent) => {
    updateStudio((currentStudio) => ({
      ...currentStudio,
      events: currentStudio.events.map((event) =>
        event.id === currentEvent.id ? updater(event) : event,
      ),
    }));
  };

  const updateCurrentQuestion = (
    updater: (question: RSVPQuestion) => RSVPQuestion,
  ) => {
    if (!selectedQuestion) {
      return;
    }

    updateCurrentEvent((event) => ({
      ...event,
      questions: event.questions.map((question) =>
        question.id === selectedQuestion.id ? updater(question) : question,
      ),
    }));
  };

  const handleAnswerChange = (question: RSVPQuestion, value: RSVPAnswer | undefined) => {
    if (submitState.status !== "idle") {
      setSubmitState({
        status: "idle",
        message: null,
      });
    }

    setCurrentEventDraft((draft) => ({
      ...draft,
      answers: {
        ...draft.answers,
        [question.id]: value,
      },
    }));
  };

  const handleNext = () => {
    if (activeQuestion && validationMessage) {
      return;
    }

    setCurrentEventDraft((draft) => ({
      ...draft,
      currentStep: Math.min(currentStep + 1, totalQuestions),
    }));
  };

  const handleBack = () => {
    setCurrentEventDraft((draft) => ({
      ...draft,
      currentStep: Math.max(currentStep - 1, 0),
    }));
  };

  const handleJumpToStep = (index: number) => {
    setCurrentEventDraft((draft) => ({
      ...draft,
      currentStep: Math.max(0, Math.min(index, totalQuestions)),
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

  const handleResetResponses = () => {
    if (!window.confirm(`Reset the RSVP draft for ${currentEvent.title}?`)) {
      return;
    }

    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [currentEvent.id]: createDraftForEvent(currentEvent),
    }));
    setSubmitState({
      status: "idle",
      message: null,
    });
  };

  const handleDiscardChanges = () => {
    if (!canEdit || !isDirty) {
      return;
    }

    setStudio(savedStudio);
    setDrafts((currentDrafts) => normalizeDrafts(currentDrafts, savedStudio));
    setSaveState("idle");
    setSaveMessage(null);
  };

  const handleSaveStudio = async () => {
    if (!canEdit || !user) {
      return;
    }

    const currentUser = user;
    setSaveState("saving");
    setSaveMessage(null);

    try {
      const token = await currentUser.getIdToken();
      let payload: Record<string, unknown> | null;

      try {
        const response = await fetch("/api/rsvp/studio", {
          body: JSON.stringify({
            studio,
          }),
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
      setDrafts((currentDrafts) => normalizeDrafts(currentDrafts, nextStudio));
      setStudioUpdatedAt(
        typeof payload?.updatedAt === "string" ? payload.updatedAt : null,
      );
      setStudioUpdatedByEmail(
        typeof payload?.updatedByEmail === "string"
          ? payload.updatedByEmail
          : null,
      );
      setSaveState("saved");
      setSaveMessage("Changes published to the online RSVP studio.");
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
    const invalidQuestion = visibleQuestions.find((question) =>
      Boolean(
        getQuestionValidationMessage(question, currentDraft.answers[question.id]),
      ),
    );

    if (invalidQuestion) {
      const invalidQuestionIndex = visibleQuestions.findIndex(
        (question) => question.id === invalidQuestion.id,
      );
      const nextMessage = getQuestionValidationMessage(
        invalidQuestion,
        currentDraft.answers[invalidQuestion.id],
      );

      handleJumpToStep(invalidQuestionIndex);
      setSubmitState({
        status: "error",
        message: nextMessage ?? "Answer the remaining questions before submitting.",
      });
      return;
    }

    setSubmitState({
      status: "submitting",
      message: null,
    });

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
      const submissionAnswers = visibleQuestions.map((question) => ({
        formattedValue: formatAnswerValue(question, currentDraft.answers[question.id]),
        questionId: question.id,
        slug: question.slug,
        title: question.title,
        type: question.type,
        value: currentDraft.answers[question.id] ?? null,
      }));
      let submission: Record<string, unknown> | null;

      try {
        const response = await fetch("/api/rsvp/responses", {
          body: JSON.stringify({
            answers: currentDraft.answers,
            eventId: currentEvent.id,
          }),
          headers: {
            "content-type": "application/json",
          },
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
          typeof submission?.createdAt === "string" ? submission.createdAt : null,
      });
      setResponseRefreshKey((value) => value + 1);
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
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [currentEvent.id]: createDraftForEvent(currentEvent),
    }));
    setSubmitState({
      status: "idle",
      message: null,
    });
  };

  const handleCreateEvent = () => {
    if (!canEdit) {
      return;
    }

    const newEvent = createBlankEvent(studio.events.length + 1);

    updateStudio((currentStudio) => ({
      ...currentStudio,
      events: [...currentStudio.events, newEvent],
    }));

    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [newEvent.id]: createDraftForEvent(newEvent),
    }));
    setSelectedEventId(newEvent.id);
    setSelectedQuestionId(newEvent.questions[0]?.id ?? "");
    setEditorTab("event");
  };

  const handleDuplicateEvent = () => {
    if (!canEdit) {
      return;
    }

    const duplicatedEvent = duplicateEventTemplate(currentEvent);

    updateStudio((currentStudio) => ({
      ...currentStudio,
      events: [...currentStudio.events, duplicatedEvent],
    }));

    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [duplicatedEvent.id]: createDraftForEvent(duplicatedEvent),
    }));
    setSelectedEventId(duplicatedEvent.id);
    setSelectedQuestionId(duplicatedEvent.questions[0]?.id ?? "");
  };

  const handleDeleteEvent = () => {
    if (!canEdit) {
      return;
    }

    if (studio.events.length === 1) {
      return;
    }

    if (!window.confirm(`Delete ${currentEvent.title}?`)) {
      return;
    }

    const remainingEvents = studio.events.filter(
      (event) => event.id !== currentEvent.id,
    );

    updateStudio(() => ({
      events: remainingEvents,
    }));

    setDrafts((currentDrafts) =>
      Object.fromEntries(
        Object.entries(currentDrafts).filter(([eventId]) => eventId !== currentEvent.id),
      ),
    );

    setSelectedEventId(remainingEvents[0]?.id ?? "");
    setSelectedQuestionId(remainingEvents[0]?.questions[0]?.id ?? "");
  };

  const handleAddQuestion = () => {
    if (!canEdit) {
      return;
    }

    const newQuestion = createBlankQuestion(currentEvent.questions.length + 1);

    updateCurrentEvent((event) => ({
      ...event,
      questions: [...event.questions, newQuestion],
    }));

    setSelectedQuestionId(newQuestion.id);
    setEditorTab("question");
  };

  const handleDuplicateQuestion = () => {
    if (!selectedQuestion) {
      return;
    }

    const duplicatedQuestion = duplicateQuestionTemplate(selectedQuestion);

    updateCurrentEvent((event) => {
      const selectedIndex = event.questions.findIndex(
        (question) => question.id === selectedQuestion.id,
      );

      return {
        ...event,
        questions: [
          ...event.questions.slice(0, selectedIndex + 1),
          duplicatedQuestion,
          ...event.questions.slice(selectedIndex + 1),
        ],
      };
    });

    setSelectedQuestionId(duplicatedQuestion.id);
    setEditorTab("question");
  };

  const handleDeleteQuestion = () => {
    if (!selectedQuestion || currentEvent.questions.length === 1) {
      return;
    }

    if (!window.confirm(`Delete the question "${selectedQuestion.title}"?`)) {
      return;
    }

    const remainingQuestions = currentEvent.questions.filter(
      (question) => question.id !== selectedQuestion.id,
    );

    updateCurrentEvent((event) => ({
      ...event,
      questions: remainingQuestions,
    }));

    setSelectedQuestionId(remainingQuestions[0]?.id ?? "");
  };

  const handleMoveQuestion = (direction: -1 | 1) => {
    if (!selectedQuestion) {
      return;
    }

    const currentIndex = currentEvent.questions.findIndex(
      (question) => question.id === selectedQuestion.id,
    );
    const nextIndex = currentIndex + direction;

    if (nextIndex < 0 || nextIndex >= currentEvent.questions.length) {
      return;
    }

    updateCurrentEvent((event) => {
      const nextQuestions = [...event.questions];
      const [movingQuestion] = nextQuestions.splice(currentIndex, 1);
      nextQuestions.splice(nextIndex, 0, movingQuestion);

      return {
        ...event,
        questions: nextQuestions,
      };
    });
  };

  const handleQuestionTypeChange = (nextType: RSVPQuestionType) => {
    updateCurrentQuestion((question) => {
      const nextQuestion: RSVPQuestion = {
        ...question,
        type: nextType,
      };

      if (nextType === "single_select" || nextType === "multi_select") {
        nextQuestion.options =
          question.options && question.options.length
            ? question.options
            : [
                {
                  id: `option-${question.id}-yes`,
                  value: "yes",
                  label: "Yes",
                },
                {
                  id: `option-${question.id}-no`,
                  value: "no",
                  label: "No",
                },
              ];
      } else {
        delete nextQuestion.options;
      }

      if (nextType !== "number") {
        delete nextQuestion.min;
        delete nextQuestion.max;
      }

      return nextQuestion;
    });
  };

  const handleConditionalSourceChange = (questionId: string) => {
    updateCurrentQuestion((question) => {
      if (!questionId) {
        const nextQuestion = { ...question };
        delete nextQuestion.showWhen;
        return nextQuestion;
      }

      const nextShowWhen: RSVPConditionalRule = {
        questionId,
        equalsAny: question.showWhen?.equalsAny.length
          ? question.showWhen.equalsAny
          : ["yes"],
      };

      return {
        ...question,
        showWhen: nextShowWhen,
      };
    });
  };

  const updateSelectedQuestionOption = (
    optionId: string,
    updater: (option: RSVPOption) => RSVPOption,
  ) => {
    updateCurrentQuestion((question) => ({
      ...question,
      options: (question.options ?? []).map((option) =>
        option.id === optionId ? updater(option) : option,
      ),
    }));
  };

  const addOptionToSelectedQuestion = () => {
    updateCurrentQuestion((question) => ({
      ...question,
      options: [
        ...(question.options ?? []),
        {
          id: `option-${question.id}-${(question.options?.length ?? 0) + 1}`,
          value: `option-${(question.options?.length ?? 0) + 1}`,
          label: `Option ${(question.options?.length ?? 0) + 1}`,
        },
      ],
    }));
  };

  const removeOptionFromSelectedQuestion = (optionId: string) => {
    updateCurrentQuestion((question) => ({
      ...question,
      options: (question.options ?? []).filter((option) => option.id !== optionId),
    }));
  };

  const allEventProgress = studio.events.map((event) => {
    const eventDraft = drafts[event.id] ?? createDraftForEvent(event);
    const eventVisibleQuestions = getVisibleQuestions(event, eventDraft.answers);
    const eventAnsweredCount = eventVisibleQuestions.filter((question) =>
      isQuestionAnswered(question, eventDraft.answers[question.id]),
    ).length;

    return {
      event,
      answeredCount: eventAnsweredCount,
      totalQuestions: eventVisibleQuestions.length,
      percent:
        eventVisibleQuestions.length === 0
          ? 100
          : Math.round((eventAnsweredCount / eventVisibleQuestions.length) * 100),
    };
  });

  if (studioLoadState === "loading") {
    return (
      <main className="rsvp-shell min-h-screen px-4 py-4 text-stone-950 sm:px-6 sm:py-6 lg:px-10">
        <div className="mx-auto flex w-full max-w-[72rem] flex-col gap-6">
          <Panel revealIndex={0} className="px-6 py-10 sm:px-8">
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--rsvp-accent)]">
              Events
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-[var(--rsvp-ink)]">
              Loading events...
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-stone-600">
              Bringing in the latest event details and RSVP flow.
            </p>
          </Panel>
        </div>
      </main>
    );
  }

  if (studioLoadState === "error") {
    return (
      <main className="rsvp-shell min-h-screen px-4 py-4 text-stone-950 sm:px-6 sm:py-6 lg:px-10">
        <div className="mx-auto flex w-full max-w-[72rem] flex-col gap-6">
          <Panel revealIndex={0} className="px-6 py-10 sm:px-8">
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--rsvp-accent)]">
              Events
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-[var(--rsvp-ink)]">
              Events could not be loaded.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-stone-600">
              {studioLoadError ??
                "Please try again in a moment."}
            </p>
          </Panel>
        </div>
      </main>
    );
  }

  return (
    <main className="rsvp-shell min-h-screen px-4 py-4 text-stone-950 sm:px-6 sm:py-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-[110rem] flex-col gap-6">
        <Panel revealIndex={0} className="overflow-hidden px-6 py-7 sm:px-8 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.88fr] lg:items-end">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rsvp-brand-mark">Monosyth Events</span>
              </div>

              <div className="space-y-4">
                <p className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--rsvp-accent)]">
                  RSVP
                </p>
                <h1 className="max-w-4xl text-4xl font-semibold leading-[0.95] tracking-[-0.07em] text-[var(--rsvp-ink)] sm:text-6xl lg:text-7xl">
                  Choose your event and send your response.
                </h1>
                <p className="max-w-3xl text-base leading-8 text-stone-600 sm:text-lg">
                  Browse upcoming events, answer each question in order, and
                  review everything before you submit.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[1.7rem] border border-white/70 bg-white/70 p-5 shadow-[0_18px_48px_rgba(33,41,37,0.08)]">
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-stone-500">
                  Active event
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--rsvp-ink)]">
                  {currentEvent.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {currentEvent.timeframe} / {currentEvent.location}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {canEdit ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowEditor((value) => !value)}
                        className="rounded-full bg-[var(--rsvp-ink)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--rsvp-ink)]/90"
                      >
                        {showEditor ? "Hide admin tools" : "Show admin tools"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void signOut()}
                        disabled={isWorking}
                        className="rounded-full border border-[var(--rsvp-border)] bg-white/80 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isWorking ? "Working..." : "Sign out admin"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void signInWithGoogle()}
                      disabled={!isConfigured || isWorking}
                      className="rounded-full bg-[var(--rsvp-ink)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--rsvp-ink)]/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isWorking ? "Working..." : "Admin sign in"}
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-[1.7rem] border border-white/70 bg-[linear-gradient(180deg,rgba(18,41,38,0.96),rgba(22,55,50,0.92))] p-5 text-white shadow-[0_22px_56px_rgba(20,32,29,0.18)]">
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/55">
                  Overview
                </p>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-semibold tracking-[-0.05em]">
                      {studio.events.length}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/60">
                      Events
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold tracking-[-0.05em]">
                      {currentEvent.questions.length}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/60">
                      Questions
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold tracking-[-0.05em]">
                      {canEdit ? "Admin" : "Public"}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/60">
                      Access
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-white/70">
                  {studioUpdatedAt
                    ? `Updated ${formatTimestamp(studioUpdatedAt)}${
                        studioUpdatedByEmail ? ` by ${studioUpdatedByEmail}` : ""
                      }.`
                    : "Event details are ready."}
                </p>
              </div>
            </div>
          </div>
        </Panel>

        <Panel revealIndex={1} className="px-6 py-6 sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="rsvp-eyebrow">Event library</span>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[var(--rsvp-ink)]">
                {canEdit
                  ? "Choose the event you want to RSVP for or edit."
                  : "Choose the event you want to RSVP for."}
              </h2>
            </div>
            {canEdit ? (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleCreateEvent}
                  className="rounded-full bg-[var(--rsvp-ink)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--rsvp-ink)]/90"
                >
                  Create event
                </button>
                <button
                  type="button"
                  onClick={handleDuplicateEvent}
                  className="rounded-full border border-[var(--rsvp-border)] bg-white/80 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-white"
                >
                  Duplicate event
                </button>
              </div>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {allEventProgress.map(({ answeredCount, event, percent, totalQuestions }) => (
              <button
                key={event.id}
                type="button"
                onClick={() => {
                  setSelectedEventId(event.id);
                  setSelectedQuestionId(event.questions[0]?.id ?? "");
                }}
                className={`rounded-[1.6rem] border px-5 py-5 text-left transition ${
                  event.id === currentEvent.id
                    ? "border-[var(--rsvp-ink)] bg-[var(--rsvp-mint)]/65 shadow-[0_18px_48px_rgba(29,48,44,0.08)]"
                    : "border-[var(--rsvp-border)] bg-white/78 hover:border-[var(--rsvp-ink)]/30 hover:bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-stone-500">
                      {event.eventLabel}
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[var(--rsvp-ink)]">
                      {event.title}
                    </h3>
                  </div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusTone(percent)}`}
                  >
                    {percent}%
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-stone-600">
                  {event.timeframe} / {event.location}
                </p>
                <p className="mt-3 text-sm leading-7 text-stone-600">
                  {event.summary}
                </p>
                <p className="mt-4 text-xs uppercase tracking-[0.22em] text-stone-500">
                  {answeredCount} of {totalQuestions} questions answered
                </p>
              </button>
            ))}
          </div>
        </Panel>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_24rem]">
          <div className="grid gap-6">
            <Panel revealIndex={2} className="px-6 py-6 sm:px-7">
              <div className="grid gap-6 lg:grid-cols-[1.04fr_0.96fr] lg:items-end">
                <div>
                  <span className="rsvp-eyebrow">{currentEvent.eventLabel}</span>
                  <p className="mt-4 font-mono text-xs uppercase tracking-[0.35em] text-[var(--rsvp-accent)]">
                    {currentEvent.timeframe}
                  </p>
                  <h2 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-[var(--rsvp-ink)]">
                    {currentEvent.welcomeTitle}
                  </h2>
                  <p className="mt-4 max-w-3xl text-base leading-8 text-stone-600">
                    {currentEvent.intro}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-[var(--rsvp-border)] bg-white/78 px-5 py-5">
                    <p className="font-mono text-xs uppercase tracking-[0.28em] text-stone-500">
                      Progress
                    </p>
                    <p className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[var(--rsvp-ink)]">
                      {completionPercent}%
                    </p>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      {answeredCount} answered / {pendingCount} pending
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-[var(--rsvp-border)] bg-white/78 px-5 py-5">
                    <p className="font-mono text-xs uppercase tracking-[0.28em] text-stone-500">
                      Flow state
                    </p>
                    <p className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[var(--rsvp-ink)]">
                      {activeQuestion ? currentStep + 1 : "Review"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      {activeQuestion
                        ? `Question ${currentStep + 1} of ${totalQuestions}`
                        : "All visible questions are complete enough to review."}
                    </p>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel revealIndex={3} className="px-6 py-6 sm:px-7">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <span className="rsvp-eyebrow">Step-by-step RSVP</span>
                    <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[var(--rsvp-ink)]">
                      {activeQuestion
                        ? activeQuestion.title
                        : `Review your ${currentEvent.title} response`}
                    </h2>
                  </div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusTone(completionPercent)}`}
                  >
                    {activeQuestion
                      ? `Step ${currentStep + 1} of ${totalQuestions}`
                      : "Ready to review"}
                  </span>
                </div>

                {activeQuestion ? (
                  <div className="grid gap-6">
                    <p className="text-sm leading-7 text-stone-600 sm:text-base">
                      {activeQuestion.description}
                    </p>

                    <QuestionResponseField
                      question={activeQuestion}
                      answer={currentDraft.answers[activeQuestion.id]}
                      onChange={(value) => handleAnswerChange(activeQuestion, value)}
                    />

                    {validationMessage ? (
                      <p className="rounded-[1.2rem] border border-[#d46d31]/20 bg-[#d46d31]/8 px-4 py-3 text-sm text-[#8b3f18]">
                        {validationMessage}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleBack}
                        disabled={currentStep === 0}
                        className="rounded-full border border-[var(--rsvp-border)] bg-white/80 px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={handleNext}
                        disabled={Boolean(validationMessage)}
                        className="rounded-full bg-[var(--rsvp-ink)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--rsvp-ink)]/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {currentStep === totalQuestions - 1
                          ? "Review RSVP"
                          : "Save and next"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                    <div>
                      {submitState.status === "submitted" ? (
                        <div className="grid gap-5">
                          <p className="text-sm leading-7 text-stone-600 sm:text-base">
                            {submitState.message} Your answers are now saved in the
                            live RSVP app.
                          </p>
                          <div className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50/80 px-5 py-5 text-sm leading-7 text-emerald-950">
                            Response ID: {submitState.responseId}
                            <br />
                            Submitted: {formatTimestamp(submitState.submittedAt)}
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={handleStartAnotherResponse}
                              className="rounded-full bg-[var(--rsvp-ink)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--rsvp-ink)]/90"
                            >
                              Start another RSVP
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleCopySummary()}
                              className="rounded-full border border-[var(--rsvp-border)] bg-white/80 px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-white"
                            >
                              {copyState === "copied"
                                ? "Copied summary"
                                : copyState === "error"
                                  ? "Clipboard unavailable"
                                  : "Copy RSVP summary"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm leading-7 text-stone-600 sm:text-base">
                            You have reached the review step for {currentEvent.title}.
                            Submit the response to the live app, copy the summary, or
                            jump back to any question before sending it.
                          </p>
                          <div className="mt-6 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={handleBack}
                              className="rounded-full border border-[var(--rsvp-border)] bg-white/80 px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-white"
                            >
                              Back to questions
                            </button>
                            <button
                              type="button"
                              onClick={handleSubmitResponse}
                              disabled={submitState.status === "submitting"}
                              className="rounded-full bg-[var(--rsvp-ink)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--rsvp-ink)]/90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {submitState.status === "submitting"
                                ? "Submitting RSVP..."
                                : "Submit RSVP"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleCopySummary()}
                              className="rounded-full border border-[var(--rsvp-border)] bg-white/80 px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-white"
                            >
                              {copyState === "copied"
                                ? "Copied summary"
                                : copyState === "error"
                                  ? "Clipboard unavailable"
                                  : "Copy RSVP summary"}
                            </button>
                            <button
                              type="button"
                              onClick={handleResetResponses}
                              className="rounded-full border border-[var(--rsvp-border)] bg-white/80 px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-white"
                            >
                              Reset this RSVP
                            </button>
                          </div>
                        </>
                      )}

                      {submitState.status === "error" ? (
                        <p className="mt-4 rounded-[1.2rem] border border-[#d46d31]/20 bg-[#d46d31]/8 px-4 py-3 text-sm text-[#8b3f18]">
                          {submitState.message}
                        </p>
                      ) : null}
                    </div>

                    <pre className="max-h-[26rem] overflow-auto rounded-[1.4rem] border border-[var(--rsvp-border)] bg-[rgba(255,255,255,0.78)] px-5 py-5 font-mono text-xs leading-6 text-stone-700 whitespace-pre-wrap">
                      {summaryText}
                    </pre>
                  </div>
                )}
              </div>
            </Panel>

            <Panel revealIndex={4} className="px-6 py-6 sm:px-7">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <span className="rsvp-eyebrow">Question rail</span>
                    <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[var(--rsvp-ink)]">
                      The RSVP now advances one prompt at a time.
                    </h2>
                  </div>
                  <p className="max-w-md text-sm leading-7 text-stone-600">
                    Use the rail to see what is complete, what is hidden by
                    logic, and where the current step sits in the full event.
                  </p>
                </div>

                <div className="grid gap-3">
                  {orderedVisibleQuestions.map((question) => {
                    const visibleIndex = visibleQuestions.findIndex(
                      (visibleQuestion) => visibleQuestion.id === question.id,
                    );
                    const isComplete = isQuestionAnswered(
                      question,
                      currentDraft.answers[question.id],
                    );

                    return (
                      <button
                        key={question.id}
                        type="button"
                        onClick={() =>
                          visibleIndex >= 0 ? handleJumpToStep(visibleIndex) : undefined
                        }
                        className={`flex flex-col gap-2 rounded-[1.2rem] border px-4 py-4 text-left transition ${
                          activeQuestion?.id === question.id
                            ? "border-[var(--rsvp-ink)] bg-[var(--rsvp-mint)]/55"
                            : "border-[var(--rsvp-border)] bg-white/80 hover:border-[var(--rsvp-ink)]/30 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-stone-500">
                            {question.eyebrow}
                          </span>
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-[0.68rem] font-medium ${
                              isComplete
                                ? "border-emerald-300 bg-emerald-100/80 text-emerald-950"
                                : "border-stone-200 bg-white/75 text-stone-600"
                            }`}
                          >
                            {isComplete ? "Answered" : "Pending"}
                          </span>
                        </div>
                        <span className="text-base font-semibold tracking-[-0.03em] text-[var(--rsvp-ink)]">
                          {question.title}
                        </span>
                        <span className="text-sm leading-6 text-stone-600">
                          {formatAnswerValue(question, currentDraft.answers[question.id])}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {hiddenQuestions.length ? (
                  <details className="rounded-[1.2rem] border border-dashed border-[var(--rsvp-border)] bg-white/60 px-4 py-4">
                    <summary className="cursor-pointer list-none text-sm font-medium text-stone-700">
                      {hiddenQuestions.length} more questions unlock later
                    </summary>
                    <div className="mt-4 grid gap-3">
                      {hiddenQuestions.map((question) => (
                        <div
                          key={question.id}
                          className="flex flex-col gap-2 rounded-[1.1rem] border border-dashed border-stone-200 bg-white/55 px-4 py-4 text-left text-stone-400"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-mono text-[0.68rem] uppercase tracking-[0.28em]">
                              {question.eyebrow}
                            </span>
                            <span className="inline-flex rounded-full border border-stone-200 bg-white/60 px-3 py-1 text-[0.68rem] font-medium">
                              Hidden
                            </span>
                          </div>
                          <span className="text-base font-semibold tracking-[-0.03em] text-stone-500">
                            {question.title}
                          </span>
                          <span className="text-sm leading-6">
                            Shown later when its condition is met.
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
            </Panel>
          </div>

          <aside className="grid gap-6 xl:sticky xl:top-6 xl:h-fit">
            {showEditor ? canEdit ? (
              <Panel revealIndex={5} className="px-5 py-5">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs uppercase tracking-[0.3em] text-stone-500">
                        Admin studio
                      </p>
                      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[var(--rsvp-ink)]">
                        Edit the active event and every question.
                      </h2>
                    </div>
                    <div className="flex rounded-full border border-[var(--rsvp-border)] bg-white/70 p-1">
                      <button
                        type="button"
                        onClick={() => setEditorTab("event")}
                        className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                          editorTab === "event"
                            ? "bg-[var(--rsvp-ink)] text-white"
                            : "text-stone-600"
                        }`}
                      >
                        Event
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorTab("question")}
                        className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                          editorTab === "question"
                            ? "bg-[var(--rsvp-ink)] text-white"
                            : "text-stone-600"
                        }`}
                      >
                        Questions
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                        isDirty
                          ? "border-amber-300 bg-amber-100/80 text-amber-950"
                          : "border-emerald-300 bg-emerald-100/80 text-emerald-950"
                      }`}
                    >
                      {isDirty ? "Unpublished changes" : "Published"}
                    </span>
                    <button
                      type="button"
                      onClick={handleDiscardChanges}
                      disabled={!isDirty || saveState === "saving"}
                      className="rounded-full border border-[var(--rsvp-border)] bg-white/80 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Discard edits
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveStudio()}
                      disabled={!isDirty || saveState === "saving"}
                      className="rounded-full bg-[var(--rsvp-ink)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--rsvp-ink)]/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saveState === "saving" ? "Publishing..." : "Publish changes"}
                    </button>
                  </div>
                </div>

                {saveMessage ? (
                  <p
                    className={`mt-4 rounded-[1.2rem] border px-4 py-3 text-sm ${
                      saveState === "error"
                        ? "border-[#d46d31]/20 bg-[#d46d31]/8 text-[#8b3f18]"
                        : "border-emerald-200 bg-emerald-50/80 text-emerald-950"
                    }`}
                  >
                    {saveMessage}
                  </p>
                ) : null}

                {editorTab === "event" ? (
                  <div className="mt-5 grid gap-4">
                    <label className="flex flex-col gap-2">
                      <FieldLabel>Event label</FieldLabel>
                      <BaseInput
                        value={currentEvent.eventLabel}
                        onChange={(event) =>
                          updateCurrentEvent((current) => ({
                            ...current,
                            eventLabel: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="flex flex-col gap-2">
                      <FieldLabel>Title</FieldLabel>
                      <BaseInput
                        value={currentEvent.title}
                        onChange={(event) =>
                          updateCurrentEvent((current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="flex flex-col gap-2">
                      <FieldLabel>Slug</FieldLabel>
                      <BaseInput
                        value={currentEvent.slug}
                        onChange={(event) =>
                          updateCurrentEvent((current) => ({
                            ...current,
                            slug: formatSlug(event.target.value),
                          }))
                        }
                      />
                    </label>

                    <label className="flex flex-col gap-2">
                      <FieldLabel>Welcome title</FieldLabel>
                      <BaseTextarea
                        rows={4}
                        value={currentEvent.welcomeTitle}
                        onChange={(event) =>
                          updateCurrentEvent((current) => ({
                            ...current,
                            welcomeTitle: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="flex flex-col gap-2">
                      <FieldLabel>Timeframe</FieldLabel>
                      <BaseInput
                        value={currentEvent.timeframe}
                        onChange={(event) =>
                          updateCurrentEvent((current) => ({
                            ...current,
                            timeframe: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="flex flex-col gap-2">
                      <FieldLabel>Location</FieldLabel>
                      <BaseInput
                        value={currentEvent.location}
                        onChange={(event) =>
                          updateCurrentEvent((current) => ({
                            ...current,
                            location: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="flex flex-col gap-2">
                      <FieldLabel>Summary</FieldLabel>
                      <BaseTextarea
                        rows={4}
                        value={currentEvent.summary}
                        onChange={(event) =>
                          updateCurrentEvent((current) => ({
                            ...current,
                            summary: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="flex flex-col gap-2">
                      <FieldLabel>Intro copy</FieldLabel>
                      <BaseTextarea
                        rows={5}
                        value={currentEvent.intro}
                        onChange={(event) =>
                          updateCurrentEvent((current) => ({
                            ...current,
                            intro: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="flex flex-col gap-2">
                      <FieldLabel>Event notes</FieldLabel>
                      <BaseTextarea
                        rows={6}
                        value={currentEvent.notes.join("\n")}
                        onChange={(event) =>
                          updateCurrentEvent((current) => ({
                            ...current,
                            notes: event.target.value
                              .split("\n")
                              .map((note) => note.trim())
                              .filter(Boolean),
                          }))
                        }
                      />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={handleDuplicateEvent}
                        className="rounded-full border border-[var(--rsvp-border)] bg-white/80 px-4 py-3 text-sm font-medium text-stone-700 transition hover:bg-white"
                      >
                        Duplicate this event
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteEvent}
                        disabled={studio.events.length === 1}
                        className="rounded-full border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm font-medium text-rose-900 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Delete this event
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 grid gap-5">
                    <div className="grid gap-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleAddQuestion}
                          className="rounded-full bg-[var(--rsvp-ink)] px-3 py-2 text-xs font-medium text-white transition hover:bg-[var(--rsvp-ink)]/90"
                        >
                          Add question
                        </button>
                        <button
                          type="button"
                          onClick={handleDuplicateQuestion}
                          disabled={!selectedQuestion}
                          className="rounded-full border border-[var(--rsvp-border)] bg-white/80 px-3 py-2 text-xs font-medium text-stone-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveQuestion(-1)}
                          disabled={
                            !selectedQuestion ||
                            currentEvent.questions[0]?.id === selectedQuestion.id
                          }
                          className="rounded-full border border-[var(--rsvp-border)] bg-white/80 px-3 py-2 text-xs font-medium text-stone-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Move up
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveQuestion(1)}
                          disabled={
                            !selectedQuestion ||
                            currentEvent.questions[currentEvent.questions.length - 1]?.id ===
                              selectedQuestion.id
                          }
                          className="rounded-full border border-[var(--rsvp-border)] bg-white/80 px-3 py-2 text-xs font-medium text-stone-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Move down
                        </button>
                      </div>

                      <div className="max-h-52 overflow-auto rounded-[1.4rem] border border-[var(--rsvp-border)] bg-white/70 p-2">
                        <div className="grid gap-2">
                          {currentEvent.questions.map((question, index) => (
                            <button
                              key={question.id}
                              type="button"
                              onClick={() => setSelectedQuestionId(question.id)}
                              className={`rounded-[1rem] px-3 py-3 text-left transition ${
                                question.id === selectedQuestion?.id
                                  ? "bg-[var(--rsvp-mint)]/75"
                                  : "bg-white/70 hover:bg-white"
                              }`}
                            >
                              <p className="font-mono text-[0.68rem] uppercase tracking-[0.26em] text-stone-500">
                                Step {index + 1}
                              </p>
                              <p className="mt-2 text-sm font-semibold text-[var(--rsvp-ink)]">
                                {question.title}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {selectedQuestion ? (
                      <div className="grid gap-4">
                        <label className="flex flex-col gap-2">
                          <FieldLabel>Slug</FieldLabel>
                          <BaseInput
                            value={selectedQuestion.slug}
                            onChange={(event) =>
                              updateCurrentQuestion((question) => ({
                                ...question,
                                slug: formatSlug(event.target.value),
                              }))
                            }
                          />
                        </label>

                        <label className="flex flex-col gap-2">
                          <FieldLabel>Eyebrow</FieldLabel>
                          <BaseInput
                            value={selectedQuestion.eyebrow}
                            onChange={(event) =>
                              updateCurrentQuestion((question) => ({
                                ...question,
                                eyebrow: event.target.value,
                              }))
                            }
                          />
                        </label>

                        <label className="flex flex-col gap-2">
                          <FieldLabel>Question title</FieldLabel>
                          <BaseTextarea
                            rows={3}
                            value={selectedQuestion.title}
                            onChange={(event) =>
                              updateCurrentQuestion((question) => ({
                                ...question,
                                title: event.target.value,
                              }))
                            }
                          />
                        </label>

                        <label className="flex flex-col gap-2">
                          <FieldLabel>Description</FieldLabel>
                          <BaseTextarea
                            rows={5}
                            value={selectedQuestion.description}
                            onChange={(event) =>
                              updateCurrentQuestion((question) => ({
                                ...question,
                                description: event.target.value,
                              }))
                            }
                          />
                        </label>

                        <label className="flex flex-col gap-2">
                          <FieldLabel>Question type</FieldLabel>
                          <select
                            value={selectedQuestion.type}
                            onChange={(event) =>
                              handleQuestionTypeChange(
                                event.target.value as RSVPQuestionType,
                              )
                            }
                            className="rounded-[1rem] border border-[var(--rsvp-border)] bg-white/80 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-[var(--rsvp-accent)] focus:bg-white"
                          >
                            {questionTypeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="flex items-center gap-3 rounded-[1rem] border border-[var(--rsvp-border)] bg-white/75 px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedQuestion.required}
                            onChange={(event) =>
                              updateCurrentQuestion((question) => ({
                                ...question,
                                required: event.target.checked,
                              }))
                            }
                          />
                          <span className="text-sm font-medium text-stone-700">
                            Required question
                          </span>
                        </label>

                        <label className="flex flex-col gap-2">
                          <FieldLabel>Placeholder</FieldLabel>
                          <BaseInput
                            value={selectedQuestion.placeholder ?? ""}
                            onChange={(event) =>
                              updateCurrentQuestion((question) => ({
                                ...question,
                                placeholder: event.target.value,
                              }))
                            }
                          />
                        </label>

                        {selectedQuestion.type === "number" ? (
                          <div className="grid gap-4 sm:grid-cols-2">
                            <label className="flex flex-col gap-2">
                              <FieldLabel>Minimum</FieldLabel>
                              <BaseInput
                                type="number"
                                value={selectedQuestion.min ?? ""}
                                onChange={(event) =>
                                  updateCurrentQuestion((question) => ({
                                    ...question,
                                    min: event.target.value
                                      ? Number(event.target.value)
                                      : undefined,
                                  }))
                                }
                              />
                            </label>
                            <label className="flex flex-col gap-2">
                              <FieldLabel>Maximum</FieldLabel>
                              <BaseInput
                                type="number"
                                value={selectedQuestion.max ?? ""}
                                onChange={(event) =>
                                  updateCurrentQuestion((question) => ({
                                    ...question,
                                    max: event.target.value
                                      ? Number(event.target.value)
                                      : undefined,
                                  }))
                                }
                              />
                            </label>
                          </div>
                        ) : null}

                        <label className="flex flex-col gap-2">
                          <FieldLabel>Show this question after</FieldLabel>
                          <select
                            value={selectedQuestion.showWhen?.questionId ?? ""}
                            onChange={(event) =>
                              handleConditionalSourceChange(event.target.value)
                            }
                            className="rounded-[1rem] border border-[var(--rsvp-border)] bg-white/80 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-[var(--rsvp-accent)] focus:bg-white"
                          >
                            <option value="">Always show</option>
                            {currentEvent.questions
                              .filter((question) => question.id !== selectedQuestion.id)
                              .map((question) => (
                                <option key={question.id} value={question.id}>
                                  {question.title}
                                </option>
                              ))}
                          </select>
                        </label>

                        {selectedQuestion.showWhen ? (
                          <label className="flex flex-col gap-2">
                            <FieldLabel>
                              Show when any of these values are selected
                            </FieldLabel>
                            <BaseInput
                              value={selectedQuestion.showWhen.equalsAny.join(", ")}
                              onChange={(event) =>
                                updateCurrentQuestion((question) => ({
                                  ...question,
                                  showWhen: question.showWhen
                                    ? {
                                        ...question.showWhen,
                                        equalsAny: event.target.value
                                          .split(",")
                                          .map((value) => value.trim())
                                          .filter(Boolean),
                                      }
                                    : undefined,
                                }))
                              }
                              placeholder="attending, yes"
                            />
                          </label>
                        ) : null}

                        {selectedQuestion.type === "single_select" ||
                        selectedQuestion.type === "multi_select" ? (
                          <div className="grid gap-3">
                            <div className="flex items-center justify-between gap-3">
                              <FieldLabel>Answer options</FieldLabel>
                              <button
                                type="button"
                                onClick={addOptionToSelectedQuestion}
                                className="rounded-full border border-[var(--rsvp-border)] bg-white/80 px-3 py-2 text-xs font-medium text-stone-700 transition hover:bg-white"
                              >
                                Add option
                              </button>
                            </div>

                            {(selectedQuestion.options ?? []).map((option) => (
                              <div
                                key={option.id}
                                className="grid gap-3 rounded-[1rem] border border-[var(--rsvp-border)] bg-white/75 p-3"
                              >
                                <label className="flex flex-col gap-2">
                                  <FieldLabel>Label</FieldLabel>
                                  <BaseInput
                                    value={option.label}
                                    onChange={(event) =>
                                      updateSelectedQuestionOption(option.id, (current) => ({
                                        ...current,
                                        label: event.target.value,
                                      }))
                                    }
                                  />
                                </label>
                                <label className="flex flex-col gap-2">
                                  <FieldLabel>Value</FieldLabel>
                                  <BaseInput
                                    value={option.value}
                                    onChange={(event) =>
                                      updateSelectedQuestionOption(option.id, (current) => ({
                                        ...current,
                                        value: formatSlug(event.target.value) || current.value,
                                      }))
                                    }
                                  />
                                </label>
                                <label className="flex flex-col gap-2">
                                  <FieldLabel>Description</FieldLabel>
                                  <BaseInput
                                    value={option.description ?? ""}
                                    onChange={(event) =>
                                      updateSelectedQuestionOption(option.id, (current) => ({
                                        ...current,
                                        description: event.target.value,
                                      }))
                                    }
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => removeOptionFromSelectedQuestion(option.id)}
                                  className="rounded-full border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs font-medium text-rose-900 transition hover:bg-rose-100"
                                >
                                  Remove option
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={handleDeleteQuestion}
                          disabled={currentEvent.questions.length === 1}
                          className="rounded-full border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm font-medium text-rose-900 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Delete question
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </Panel>
            ) : (
              <Panel revealIndex={5} className="px-5 py-5">
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-stone-500">
                  Manage events
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[var(--rsvp-ink)]">
                  Sign in to manage event details and responses.
                </h2>
                <p className="mt-4 text-sm leading-7 text-stone-600">
                  Event editing and response review are limited to approved
                  accounts.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void signInWithGoogle()}
                    disabled={!isConfigured || isWorking}
                    className="rounded-full bg-[var(--rsvp-ink)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--rsvp-ink)]/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isWorking ? "Working..." : "Admin sign in"}
                  </button>
                </div>

                {authError ? (
                  <p className="mt-4 rounded-[1.2rem] border border-[#d46d31]/20 bg-[#d46d31]/8 px-4 py-3 text-sm text-[#8b3f18]">
                    {authError}
                  </p>
                ) : null}
              </Panel>
            ) : null}

            <Panel revealIndex={6} className="px-5 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.3em] text-stone-500">
                    Live summary
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[var(--rsvp-ink)]">
                    Current response snapshot
                  </h2>
                </div>
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusTone(completionPercent)}`}
                >
                  {completionPercent}% complete
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {currentEvent.notes.map((note) => (
                  <div
                    key={note}
                    className="rounded-[1.2rem] border border-[var(--rsvp-border)] bg-white/75 px-4 py-4 text-sm leading-7 text-stone-600"
                  >
                    {note}
                  </div>
                ))}
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
                  onClick={handleResetResponses}
                  className="rounded-full border border-[var(--rsvp-border)] bg-white/80 px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-white"
                >
                  Reset this event&apos;s draft
                </button>
              </div>

              <pre className="mt-5 max-h-[24rem] overflow-auto rounded-[1.3rem] border border-[var(--rsvp-border)] bg-[rgba(255,255,255,0.78)] px-4 py-4 font-mono text-xs leading-6 text-stone-700 whitespace-pre-wrap">
                {summaryText}
              </pre>
            </Panel>

            {canEdit ? (
              <Panel revealIndex={7} className="px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.3em] text-stone-500">
                      Response inbox
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[var(--rsvp-ink)]">
                      Recent online submissions
                    </h2>
                  </div>
                  <span className="inline-flex rounded-full border border-[var(--rsvp-border)] bg-white/80 px-3 py-1 text-xs font-medium text-stone-700">
                    {recentResponses.length} shown
                  </span>
                </div>

                {responseListState === "loading" ? (
                  <p className="mt-5 rounded-[1.2rem] border border-[var(--rsvp-border)] bg-white/75 px-4 py-4 text-sm leading-7 text-stone-600">
                    Loading recent RSVPs from Firestore...
                  </p>
                ) : responseListState === "error" ? (
                  <p className="mt-5 rounded-[1.2rem] border border-[#d46d31]/20 bg-[#d46d31]/8 px-4 py-4 text-sm leading-7 text-[#8b3f18]">
                    {responseListError}
                  </p>
                ) : recentResponses.length ? (
                  <div className="mt-5 grid gap-3">
                    {recentResponses.map((response) => (
                      <article
                        key={response.id}
                        className="rounded-[1.2rem] border border-[var(--rsvp-border)] bg-white/78 px-4 py-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold tracking-[-0.03em] text-[var(--rsvp-ink)]">
                              {response.guestName}
                            </p>
                            <p className="mt-1 text-sm text-stone-600">
                              {response.guestEmail}
                            </p>
                          </div>
                          <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
                            {formatTimestamp(response.createdAt)}
                          </p>
                        </div>
                        <p className="mt-3 text-xs uppercase tracking-[0.24em] text-stone-500">
                          {response.answersCount} answers captured
                        </p>
                        <pre className="mt-3 max-h-48 overflow-auto rounded-[1rem] border border-[var(--rsvp-border)] bg-[rgba(255,255,255,0.78)] px-3 py-3 font-mono text-[0.68rem] leading-5 text-stone-700 whitespace-pre-wrap">
                          {response.summaryText}
                        </pre>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 rounded-[1.2rem] border border-[var(--rsvp-border)] bg-white/75 px-4 py-4 text-sm leading-7 text-stone-600">
                    No online responses have been submitted for this event yet.
                  </p>
                )}
              </Panel>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
