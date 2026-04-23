"use client";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebase/client";

import {
  createSeededStudio,
  normalizeStudio,
  type RSVPAnswer,
  type RSVPQuestionType,
  type RSVPStudio,
} from "./form-data";

const STUDIO_COLLECTION = "rsvp";
const STUDIO_DOC_ID = "studio";
const RESPONSE_PARENT_COLLECTION = "rsvpEvents";

export type RSVPClientStudioSnapshot = {
  studio: RSVPStudio;
  createdAt: string | null;
  updatedAt: string | null;
  updatedByEmail: string | null;
  updatedByUid: string | null;
  version: number;
};

export type RSVPClientResponseRecord = {
  id: string;
  guestName: string;
  guestEmail: string;
  summaryText: string;
  createdAt: string | null;
  answersCount: number;
};

export type RSVPClientSubmissionInput = {
  answers: Array<{
    formattedValue: string;
    questionId: string;
    slug: string;
    title: string;
    type: RSVPQuestionType;
    value: RSVPAnswer | null;
  }>;
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  guestEmail: string;
  guestName: string;
  summaryText: string;
};

function toIsoString(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as Timestamp).toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return null;
}

function getClientDb() {
  const db = getFirebaseDb();

  if (!db) {
    throw new Error("Firebase is not configured for Firestore.");
  }

  return db;
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

export async function readRsvpStudioFromClient(): Promise<RSVPClientStudioSnapshot> {
  const db = getClientDb();
  const ref = doc(db, STUDIO_COLLECTION, STUDIO_DOC_ID);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return {
      studio: createSeededStudio(),
      createdAt: null,
      updatedAt: null,
      updatedByEmail: null,
      updatedByUid: null,
      version: 0,
    };
  }

  const value = snapshot.data();

  return {
    studio: normalizeStoredStudio(value),
    createdAt: toIsoString(value.createdAt),
    updatedAt: toIsoString(value.updatedAt),
    updatedByEmail:
      typeof value.updatedByEmail === "string" ? value.updatedByEmail : null,
    updatedByUid:
      typeof value.updatedByUid === "string" ? value.updatedByUid : null,
    version:
      typeof value.version === "number" && Number.isFinite(value.version)
        ? value.version
        : 1,
  };
}

export async function writeRsvpStudioFromClient(
  studio: RSVPStudio,
  actor: {
    email: string;
    uid: string;
  },
) {
  const db = getClientDb();
  const ref = doc(db, STUDIO_COLLECTION, STUDIO_DOC_ID);
  const existingSnapshot = await getDoc(ref);
  const nextStudio = normalizeStudio(studio);
  const currentVersion =
    existingSnapshot.exists() &&
    typeof existingSnapshot.data().version === "number" &&
    Number.isFinite(existingSnapshot.data().version)
      ? (existingSnapshot.data().version as number)
      : 0;

  await setDoc(
    ref,
    {
      studio: serializeStudioForFirestore(nextStudio),
      updatedAt: serverTimestamp(),
      updatedByEmail: actor.email,
      updatedByUid: actor.uid,
      version: currentVersion + 1,
      ...(existingSnapshot.exists()
        ? {}
        : {
            createdAt: serverTimestamp(),
          }),
    },
    { merge: true },
  );

  return readRsvpStudioFromClient();
}

export async function submitRsvpResponseFromClient(
  input: RSVPClientSubmissionInput,
) {
  const db = getClientDb();
  const responseRef = await addDoc(
    collection(db, RESPONSE_PARENT_COLLECTION, input.eventId, "responses"),
    {
      answers: input.answers,
      createdAt: serverTimestamp(),
      eventId: input.eventId,
      eventSlug: input.eventSlug,
      eventTitle: input.eventTitle,
      guestEmail: input.guestEmail,
      guestName: input.guestName,
      summaryText: input.summaryText,
    },
  );
  const storedResponse = await getDoc(responseRef);

  return {
    id: responseRef.id,
    createdAt: storedResponse.exists()
      ? toIsoString(storedResponse.data().createdAt)
      : null,
  };
}

export async function listRsvpResponsesFromClient(eventId: string) {
  const db = getClientDb();
  const snapshot = await getDocs(
    query(
      collection(db, RESPONSE_PARENT_COLLECTION, eventId, "responses"),
      orderBy("createdAt", "desc"),
      limit(12),
    ),
  );

  return snapshot.docs.map((document) => {
    const value = document.data();

    return {
      id: document.id,
      guestName:
        typeof value.guestName === "string" && value.guestName.trim()
          ? value.guestName
          : "Unnamed guest",
      guestEmail:
        typeof value.guestEmail === "string" && value.guestEmail.trim()
          ? value.guestEmail
          : "No email captured",
      summaryText:
        typeof value.summaryText === "string" ? value.summaryText : "No summary saved.",
      createdAt: toIsoString(value.createdAt),
      answersCount: Array.isArray(value.answers) ? value.answers.length : 0,
    } satisfies RSVPClientResponseRecord;
  });
}
