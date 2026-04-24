import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/admin";

import {
  createSeededStudio,
  normalizeStudio,
  type RSVPAnswer,
  type RSVPEvent,
  type RSVPQuestion,
  type RSVPStudio,
} from "./form-data";

const STUDIO_COLLECTION = "rsvp";
const STUDIO_DOC_ID = "studio";
const RESPONSE_PARENT_COLLECTION = "rsvpEvents";
const RECENT_RESPONSE_LIMIT = 12;

export type RSVPStudioSnapshot = {
  studio: RSVPStudio;
  createdAt: string | null;
  updatedAt: string | null;
  updatedByEmail: string | null;
  updatedByUid: string | null;
  version: number;
};

export type RSVPResponseRecord = {
  id: string;
  guestName: string;
  guestEmail: string;
  summaryText: string;
  createdAt: string | null;
  answersCount: number;
};

export type RSVPStoredAnswer = {
  questionId: string;
  slug: string;
  title: string;
  type: string;
  value: RSVPAnswer | null;
  formattedValue: string;
};

export type RSVPResponseDetail = RSVPResponseRecord & {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  answers: RSVPStoredAnswer[];
};

function toIsoString(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return null;
}

function normalizeStoredStudio(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "studio" in value
  ) {
    return normalizeStudio((value as { studio?: unknown }).studio);
  }

  return normalizeStudio(value);
}

function serializeStudioForFirestore(studio: RSVPStudio) {
  return JSON.parse(JSON.stringify(studio)) as RSVPStudio;
}

function serializeStudioSnapshot(value: Record<string, unknown> | undefined) {
  return {
    studio: normalizeStoredStudio(value),
    createdAt: toIsoString(value?.createdAt),
    updatedAt: toIsoString(value?.updatedAt),
    updatedByEmail:
      typeof value?.updatedByEmail === "string" ? value.updatedByEmail : null,
    updatedByUid:
      typeof value?.updatedByUid === "string" ? value.updatedByUid : null,
    version:
      typeof value?.version === "number" && Number.isFinite(value.version)
        ? value.version
        : 1,
  } satisfies RSVPStudioSnapshot;
}

function createDefaultAnswer(question: RSVPQuestion): RSVPAnswer | undefined {
  if (question.type === "multi_select") {
    return [];
  }

  return undefined;
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

function formatAnswerValue(
  question: RSVPQuestion,
  answer: RSVPAnswer | undefined,
) {
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

export async function readRsvpStudio(): Promise<RSVPStudioSnapshot> {
  const db = getFirebaseAdminDb();
  const ref = db.collection(STUDIO_COLLECTION).doc(STUDIO_DOC_ID);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    const seededStudio = createSeededStudio();

    await ref.set({
      studio: serializeStudioForFirestore(seededStudio),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      version: 1,
    });

    return {
      studio: seededStudio,
      createdAt: null,
      updatedAt: null,
      updatedByEmail: null,
      updatedByUid: null,
      version: 1,
    };
  }

  return serializeStudioSnapshot(snapshot.data());
}

export async function writeRsvpStudio(
  input: unknown,
  actor: {
    email: string;
    uid: string;
  },
): Promise<RSVPStudioSnapshot> {
  const db = getFirebaseAdminDb();
  const ref = db.collection(STUDIO_COLLECTION).doc(STUDIO_DOC_ID);
  const existingSnapshot = await ref.get();
  const nextStudio = normalizeStudio(input);
  const previousVersion =
    existingSnapshot.exists &&
    typeof existingSnapshot.data()?.version === "number" &&
    Number.isFinite(existingSnapshot.data()?.version)
      ? (existingSnapshot.data()?.version as number)
      : 0;

  await ref.set(
    {
      studio: serializeStudioForFirestore(nextStudio),
      updatedAt: FieldValue.serverTimestamp(),
      updatedByEmail: actor.email,
      updatedByUid: actor.uid,
      version: previousVersion + 1,
      ...(existingSnapshot.exists
        ? {}
        : {
            createdAt: FieldValue.serverTimestamp(),
          }),
    },
    { merge: true },
  );

  return readRsvpStudio();
}

export async function submitRsvpResponse(eventId: string, rawAnswers: unknown) {
  const db = getFirebaseAdminDb();
  const studioSnapshot = await readRsvpStudio();
  const event = studioSnapshot.studio.events.find((entry) => entry.id === eventId);

  if (!event) {
    throw new Error("That event could not be found.");
  }

  const candidateAnswers =
    rawAnswers && typeof rawAnswers === "object" && !Array.isArray(rawAnswers)
      ? (rawAnswers as Record<string, unknown>)
      : {};
  const answers = Object.fromEntries(
    event.questions.map((question) => [
      question.id,
      normalizeAnswer(question, candidateAnswers[question.id]),
    ]),
  ) as Record<string, RSVPAnswer | undefined>;
  const visibleQuestions = getVisibleQuestions(event, answers);

  for (const question of visibleQuestions) {
    const message = getQuestionValidationMessage(question, answers[question.id]);

    if (message) {
      throw new Error(message);
    }
  }

  const summaryText = buildSummaryText(event, answers);
  const guestName = findTextAnswerBySlug(event, answers, "guest-name");
  const guestEmail = findTextAnswerBySlug(event, answers, "guest-email");
  const responseRef = db
    .collection(RESPONSE_PARENT_COLLECTION)
    .doc(event.id)
    .collection("responses")
    .doc();

  await responseRef.set({
    eventId: event.id,
    eventSlug: event.slug,
    eventTitle: event.title,
    guestName,
    guestEmail,
    summaryText,
    answers: visibleQuestions.map((question) => ({
      questionId: question.id,
      slug: question.slug,
      title: question.title,
      type: question.type,
      value: answers[question.id] ?? null,
      formattedValue: formatAnswerValue(question, answers[question.id]),
    })),
    createdAt: FieldValue.serverTimestamp(),
  });

  const storedResponse = await responseRef.get();

  return {
    id: responseRef.id,
    guestName,
    guestEmail,
    summaryText,
    createdAt: toIsoString(storedResponse.data()?.createdAt),
  };
}

export async function listRsvpResponses(eventId: string) {
  const db = getFirebaseAdminDb();
  const snapshot = await db
    .collection(RESPONSE_PARENT_COLLECTION)
    .doc(eventId)
    .collection("responses")
    .orderBy("createdAt", "desc")
    .limit(RECENT_RESPONSE_LIMIT)
    .get();

  return snapshot.docs.map((document) => {
    const data = document.data();

    return {
      id: document.id,
      guestName:
        typeof data.guestName === "string" && data.guestName.trim()
          ? data.guestName
          : "Unnamed guest",
      guestEmail:
        typeof data.guestEmail === "string" && data.guestEmail.trim()
          ? data.guestEmail
          : "No email captured",
      summaryText:
        typeof data.summaryText === "string" ? data.summaryText : "No summary saved.",
      createdAt: toIsoString(data.createdAt),
      answersCount: Array.isArray(data.answers) ? data.answers.length : 0,
    } satisfies RSVPResponseRecord;
  });
}

/**
 * Admin-only detailed listing: returns the full answer array per response,
 * ordered newest-first. Defaults to 200 entries per call.
 */
export async function listRsvpResponsesDetailed(
  eventId: string,
  options: { limit?: number } = {},
): Promise<RSVPResponseDetail[]> {
  const db = getFirebaseAdminDb();
  const limit =
    typeof options.limit === "number" && Number.isFinite(options.limit)
      ? Math.max(1, Math.min(options.limit, 500))
      : 200;
  const snapshot = await db
    .collection(RESPONSE_PARENT_COLLECTION)
    .doc(eventId)
    .collection("responses")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((document) => {
    const data = document.data();
    const rawAnswers = Array.isArray(data.answers) ? data.answers : [];
    const answers: RSVPStoredAnswer[] = rawAnswers
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const record = entry as Record<string, unknown>;
        const questionId =
          typeof record.questionId === "string" ? record.questionId : null;
        const slug = typeof record.slug === "string" ? record.slug : null;
        if (!questionId || !slug) return null;
        return {
          questionId,
          slug,
          title: typeof record.title === "string" ? record.title : "",
          type: typeof record.type === "string" ? record.type : "short_text",
          value:
            typeof record.value === "string" || Array.isArray(record.value)
              ? (record.value as RSVPAnswer)
              : null,
          formattedValue:
            typeof record.formattedValue === "string"
              ? record.formattedValue
              : "",
        } satisfies RSVPStoredAnswer;
      })
      .filter((a): a is RSVPStoredAnswer => a !== null);

    return {
      id: document.id,
      guestName:
        typeof data.guestName === "string" && data.guestName.trim()
          ? data.guestName
          : "Unnamed guest",
      guestEmail:
        typeof data.guestEmail === "string" && data.guestEmail.trim()
          ? data.guestEmail
          : "No email captured",
      summaryText:
        typeof data.summaryText === "string"
          ? data.summaryText
          : "No summary saved.",
      createdAt: toIsoString(data.createdAt),
      answersCount: answers.length,
      eventId:
        typeof data.eventId === "string" ? data.eventId : eventId,
      eventSlug:
        typeof data.eventSlug === "string" ? data.eventSlug : "",
      eventTitle:
        typeof data.eventTitle === "string" ? data.eventTitle : "",
      answers,
    };
  });
}
