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

import { useAuth } from "@/components/auth/auth-provider";
import { isMonosythAdminEmail } from "@/lib/auth/admin";
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
import {
  readRsvpStudioFromClient,
  writeRsvpStudioFromClient,
} from "@/lib/rsvp/client";

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
  /**
   * True when the current user is signed in as a Monosyth admin and can
   * edit the guidebook content in place. Guests get `false`.
   */
  canEditContent: boolean;
  /**
   * Patch a field in the rich EventContent tree and persist to Firestore.
   * `path` is a dot/bracket notation string (e.g. `overview.title`,
   * `schedule.days[2].heroImageUrl`, `activities.items[0].priceLabel`).
   * Writes are debounced — the UI updates synchronously; the server call
   * happens ~400ms after the last edit settles.
   */
  setContentAtPath: (path: string, value: unknown) => void;
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
  canEditContent: false,
  setContentAtPath: noop,
});

function storageKey(eventId: string, bucket: "answers" | "deposits") {
  return `rsvp:${eventId}:${bucket}:v1`;
}

/**
 * Immutably set a value inside a nested object / array tree using a
 * dotted-and-bracketed path like `schedule.days[2].heroImageUrl` or
 * `activities.items[0].priceLabel`. Array indices are preserved, objects
 * are shallow-cloned along the path so React sees new references.
 */
type PathToken = { kind: "key"; key: string } | { kind: "index"; index: number };

function parsePath(path: string): PathToken[] {
  const tokens: PathToken[] = [];
  const re = /([^.[\]]+)|\[(\d+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(path)) !== null) {
    if (match[1] !== undefined) {
      tokens.push({ kind: "key", key: match[1] });
    } else if (match[2] !== undefined) {
      tokens.push({ kind: "index", index: Number(match[2]) });
    }
  }
  return tokens;
}

function setAtPath<T>(root: T, path: string, value: unknown): T {
  const tokens = parsePath(path);
  if (tokens.length === 0) return root;

  function recurse(node: unknown, depth: number): unknown {
    const token = tokens[depth];
    const last = depth === tokens.length - 1;
    if (token.kind === "index") {
      const arr = Array.isArray(node) ? [...node] : [];
      arr[token.index] = last
        ? value
        : recurse(arr[token.index] ?? {}, depth + 1);
      return arr;
    }
    const obj =
      node && typeof node === "object" && !Array.isArray(node)
        ? { ...(node as Record<string, unknown>) }
        : {};
    (obj as Record<string, unknown>)[token.key] = last
      ? value
      : recurse((obj as Record<string, unknown>)[token.key], depth + 1);
    return obj;
  }

  return recurse(root, 0) as T;
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

  /* ----- Admin content editing ----- */
  const auth = useAuth();
  const canEditContent =
    auth.status === "signed_in" &&
    isMonosythAdminEmail(auth.user?.email);

  // Debounced server write so rapid blur events (e.g. admin is tab-hopping
  // across fields) batch into one PUT.
  const writeTimerRef = useRef<number | null>(null);
  const latestStudioRef = useRef<RSVPStudio>(studio);
  latestStudioRef.current = studio;

  const scheduleServerWrite = useCallback(() => {
    if (!canEditContent) return;
    if (writeTimerRef.current !== null) {
      window.clearTimeout(writeTimerRef.current);
    }
    writeTimerRef.current = window.setTimeout(async () => {
      writeTimerRef.current = null;
      const currentUser = auth.user;
      if (!currentUser) return;
      const snapshot = latestStudioRef.current;
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch("/api/rsvp/studio", {
          method: "PUT",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ studio: snapshot }),
        });
        if (!res.ok) throw new Error("api failed");
      } catch {
        // Fallback to direct Firestore write for local dev.
        try {
          await writeRsvpStudioFromClient(snapshot, {
            email: currentUser.email ?? "",
            uid: currentUser.uid,
          });
        } catch (err) {
          console.error("Inline edit write failed", err);
        }
      }
    }, 450);
  }, [auth.user, canEditContent]);

  const setContentAtPath = useCallback(
    (path: string, nextValue: unknown) => {
      if (!canEditContent) return;
      setStudio((current) => {
        const events = current.events.map((e, idx) => {
          if (idx !== 0) return e;
          const currentContent: EventContent =
            e.content ?? DALLAS_EVENT_CONTENT;
          const updatedContent = setAtPath(currentContent, path, nextValue);
          return { ...e, content: updatedContent };
        });
        return { ...current, events };
      });
      scheduleServerWrite();
    },
    [canEditContent, scheduleServerWrite],
  );

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
      canEditContent,
      setContentAtPath,
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
      canEditContent,
      setContentAtPath,
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
