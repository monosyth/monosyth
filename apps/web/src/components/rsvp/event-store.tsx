"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createSeededStudio,
  normalizeStudio,
  type RSVPAnswer,
  type RSVPEvent,
  type RSVPQuestion,
  type RSVPStudio,
} from "@/lib/rsvp/form-data";
import {
  DALLAS_EVENT_CONTENT,
  type EventContent,
} from "@/lib/rsvp/event-content";
import { readRsvpStudioFromClient } from "@/lib/rsvp/client";

type Answers = Record<string, RSVPAnswer | undefined>;
type DepositStatus = Record<string, boolean>; // activityId -> sent?

type EventStore = {
  /** Current event (Dallas). */
  event: RSVPEvent;
  /** Rich guidebook content for the active event. */
  content: EventContent;
  /** Draft answers keyed by questionId. */
  answers: Answers;
  /** Set an answer by question slug (preferred — stable across edits). */
  setAnswerBySlug: (slug: string, value: RSVPAnswer | undefined) => void;
  /** Set an answer by questionId. */
  setAnswerById: (id: string, value: RSVPAnswer | undefined) => void;
  /** Get an answer by slug. */
  getAnswerBySlug: (slug: string) => RSVPAnswer | undefined;
  /** Find the question for a slug. */
  getQuestionBySlug: (slug: string) => RSVPQuestion | undefined;
  /** How many visible questions are answered. */
  progress: { answered: number; total: number; percent: number };
  /** Deposit status per activity id. */
  deposits: DepositStatus;
  setDepositStatus: (activityId: string, sent: boolean) => void;
  /** Reset the entire local draft. */
  reset: () => void;
  /** True once studio has been loaded (hydrated from storage and server). */
  ready: boolean;
};

const noop = () => undefined;

const EventStoreContext = createContext<EventStore>({
  event: createSeededStudio().events[0]!,
  content: DALLAS_EVENT_CONTENT,
  answers: {},
  setAnswerBySlug: noop,
  setAnswerById: noop,
  getAnswerBySlug: () => undefined,
  getQuestionBySlug: () => undefined,
  progress: { answered: 0, total: 0, percent: 0 },
  deposits: {},
  setDepositStatus: noop,
  reset: noop,
  ready: false,
});

function storageKey(eventId: string, bucket: "answers" | "deposits") {
  return `rsvp:${eventId}:${bucket}:v1`;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota / disabled storage — ignore
  }
}

function isQuestionVisible(q: RSVPQuestion, answers: Answers): boolean {
  if (!q.showWhen) return true;
  const src = answers[q.showWhen.questionId];
  if (typeof src === "string") return q.showWhen.equalsAny.includes(src);
  if (Array.isArray(src)) {
    return src.some((v) => q.showWhen!.equalsAny.includes(v));
  }
  return false;
}

function isAnswered(q: RSVPQuestion, value: RSVPAnswer | undefined): boolean {
  if (!q.required) {
    // Treat optional as answered for progress purposes only if something set
    if (q.type === "multi_select") {
      return Array.isArray(value) && value.length > 0;
    }
    return typeof value === "string" && value.trim().length > 0;
  }
  if (q.type === "multi_select") {
    return Array.isArray(value) && value.length > 0;
  }
  if (typeof value !== "string") return false;
  const t = value.trim();
  if (!t) return false;
  if (q.type === "email") return /\S+@\S+\.\S+/.test(t);
  if (q.type === "number") return Number.isFinite(Number(t));
  return true;
}

export function EventStoreProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const seeded = useMemo(() => createSeededStudio(), []);
  const [studio, setStudio] = useState<RSVPStudio>(seeded);
  const [answers, setAnswers] = useState<Answers>({});
  const [deposits, setDeposits] = useState<DepositStatus>({});
  const [ready, setReady] = useState(false);
  const hydratedRef = useRef(false);

  const event = studio.events[0];

  // Load studio from API/Firestore, then hydrate from localStorage.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        let payload: Record<string, unknown> | null = null;
        try {
          const res = await fetch("/api/rsvp/studio", { cache: "no-store" });
          if (res.ok) payload = (await res.json()) as Record<string, unknown>;
        } catch {
          /* swallow */
        }
        if (!payload) {
          try {
            payload = await readRsvpStudioFromClient();
          } catch {
            payload = null;
          }
        }
        if (cancelled) return;
        const next = normalizeStudio(payload?.studio ?? payload);
        setStudio(next);
      } catch {
        // fall back to seeded; already set
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Hydrate answers + deposits from localStorage once the event is known.
  useEffect(() => {
    if (!event || hydratedRef.current) return;
    hydratedRef.current = true;
    const savedAnswers = loadFromStorage<Answers>(
      storageKey(event.id, "answers"),
      {},
    );
    const savedDeposits = loadFromStorage<DepositStatus>(
      storageKey(event.id, "deposits"),
      {},
    );
    setAnswers(savedAnswers);
    setDeposits(savedDeposits);
  }, [event]);

  // Persist on change.
  useEffect(() => {
    if (!event) return;
    saveToStorage(storageKey(event.id, "answers"), answers);
  }, [event, answers]);

  useEffect(() => {
    if (!event) return;
    saveToStorage(storageKey(event.id, "deposits"), deposits);
  }, [event, deposits]);

  const getQuestionBySlug = useCallback(
    (slug: string) => event?.questions.find((q) => q.slug === slug),
    [event],
  );

  const setAnswerById = useCallback(
    (id: string, value: RSVPAnswer | undefined) => {
      setAnswers((prev) => ({ ...prev, [id]: value }));
    },
    [],
  );

  const setAnswerBySlug = useCallback(
    (slug: string, value: RSVPAnswer | undefined) => {
      const q = getQuestionBySlug(slug);
      if (!q) return;
      setAnswerById(q.id, value);
    },
    [getQuestionBySlug, setAnswerById],
  );

  const getAnswerBySlug = useCallback(
    (slug: string): RSVPAnswer | undefined => {
      const q = getQuestionBySlug(slug);
      if (!q) return undefined;
      return answers[q.id];
    },
    [answers, getQuestionBySlug],
  );

  const setDepositStatus = useCallback((activityId: string, sent: boolean) => {
    setDeposits((prev) => ({ ...prev, [activityId]: sent }));
  }, []);

  const reset = useCallback(() => {
    setAnswers({});
    setDeposits({});
    if (event) {
      saveToStorage(storageKey(event.id, "answers"), {});
      saveToStorage(storageKey(event.id, "deposits"), {});
    }
  }, [event]);

  const progress = useMemo(() => {
    if (!event) return { answered: 0, total: 0, percent: 0 };
    const visible = event.questions.filter((q) => isQuestionVisible(q, answers));
    const answered = visible.filter((q) => isAnswered(q, answers[q.id])).length;
    const total = visible.length;
    const percent = total ? Math.round((answered / total) * 100) : 0;
    return { answered, total, percent };
  }, [event, answers]);

  const resolvedEvent = event ?? seeded.events[0]!;
  const content = resolvedEvent.content ?? DALLAS_EVENT_CONTENT;

  const value = useMemo<EventStore>(
    () => ({
      event: resolvedEvent,
      content,
      answers,
      setAnswerBySlug,
      setAnswerById,
      getAnswerBySlug,
      getQuestionBySlug,
      progress,
      deposits,
      setDepositStatus,
      reset,
      ready,
    }),
    [
      resolvedEvent,
      content,
      answers,
      setAnswerBySlug,
      setAnswerById,
      getAnswerBySlug,
      getQuestionBySlug,
      progress,
      deposits,
      setDepositStatus,
      reset,
      ready,
    ],
  );

  return (
    <EventStoreContext.Provider value={value}>
      {children}
    </EventStoreContext.Provider>
  );
}

export function useEventStore() {
  return useContext(EventStoreContext);
}
