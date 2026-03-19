import { User } from "firebase/auth";
import { Timestamp, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { getFirebaseDb } from "./client";

export type EditableUserProfile = {
  bio: string;
  handle: string;
  links: string[];
  theme: "ember" | "forest" | "stone";
};

export type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerIds: string[];
  bio: string;
  handle: string;
  links: string[];
  theme: EditableUserProfile["theme"];
  createdAt: string | null;
  lastLoginAt: string | null;
  updatedAt: string | null;
};

function normalizeHandle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, 32);
}

function normalizeLinks(value: string[]) {
  return value
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function getDefaultProfileFields(user: User): EditableUserProfile {
  const emailHandle = user.email?.split("@")[0] ?? "";
  const displayHandle = user.displayName ?? emailHandle;

  return {
    bio: "",
    handle: normalizeHandle(displayHandle),
    links: [],
    theme: "ember",
  };
}

function toIsoString(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  return null;
}

function serializeProfile(
  value: Record<string, unknown> | undefined,
  user: User,
): UserProfile {
  const defaults = getDefaultProfileFields(user);

  return {
    uid: user.uid,
    email: (value?.email as string | null | undefined) ?? user.email ?? null,
    displayName:
      (value?.displayName as string | null | undefined) ??
      user.displayName ??
      null,
    photoURL:
      (value?.photoURL as string | null | undefined) ?? user.photoURL ?? null,
    providerIds:
      (value?.providerIds as string[] | undefined) ??
      user.providerData
        .map((entry) => entry.providerId)
        .filter(Boolean),
    bio: (value?.bio as string | undefined) ?? defaults.bio,
    handle: normalizeHandle(
      (value?.handle as string | undefined) ?? defaults.handle,
    ),
    links: normalizeLinks((value?.links as string[] | undefined) ?? defaults.links),
    theme:
      (value?.theme as EditableUserProfile["theme"] | undefined) ??
      defaults.theme,
    createdAt: toIsoString(value?.createdAt),
    lastLoginAt: toIsoString(value?.lastLoginAt),
    updatedAt: toIsoString(value?.updatedAt),
  };
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const db = getFirebaseDb();

  if (!db) {
    throw new Error("Firebase is not configured for Firestore.");
  }

  const ref = doc(db, "users", user.uid);
  const existingSnapshot = await getDoc(ref);
  const defaults = getDefaultProfileFields(user);

  const payload = {
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    bio: existingSnapshot.exists()
      ? undefined
      : defaults.bio,
    handle: existingSnapshot.exists()
      ? undefined
      : defaults.handle,
    links: existingSnapshot.exists()
      ? undefined
      : defaults.links,
    theme: existingSnapshot.exists()
      ? undefined
      : defaults.theme,
    providerIds: user.providerData
      .map((entry) => entry.providerId)
      .filter(Boolean),
    lastLoginAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...(existingSnapshot.exists() ? {} : { createdAt: serverTimestamp() }),
  };

  await setDoc(ref, payload, { merge: true });

  const nextSnapshot = await getDoc(ref);

  if (!nextSnapshot.exists()) {
    return serializeProfile(undefined, user);
  }

  return serializeProfile(nextSnapshot.data(), user);
}

export async function saveUserProfile(
  user: User,
  input: EditableUserProfile,
): Promise<UserProfile> {
  const db = getFirebaseDb();

  if (!db) {
    throw new Error("Firebase is not configured for Firestore.");
  }

  const ref = doc(db, "users", user.uid);

  await setDoc(
    ref,
    {
      bio: input.bio.trim(),
      handle: normalizeHandle(input.handle),
      links: normalizeLinks(input.links),
      theme: input.theme,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  const nextSnapshot = await getDoc(ref);

  if (!nextSnapshot.exists()) {
    return serializeProfile(undefined, user);
  }

  return serializeProfile(nextSnapshot.data(), user);
}
