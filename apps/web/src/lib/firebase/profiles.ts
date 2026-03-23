import { User } from "firebase/auth";
import { Timestamp, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { getFirebaseDb } from "./client";

export const STUDIO_THEMES = [
  {
    value: "ember",
    label: "Ember",
    description: "Warm clay, brass light, dark pine controls.",
  },
  {
    value: "forest",
    label: "Forest",
    description: "Moss glass, cedar accents, softer contrast.",
  },
  {
    value: "stone",
    label: "Stone",
    description: "Quiet mineral neutrals with cool gray edges.",
  },
  {
    value: "tide",
    label: "Tide",
    description: "Salt blue gradients with deep harbor accents.",
  },
  {
    value: "signal",
    label: "Signal",
    description: "Cream paper with bold red-orange markers.",
  },
  {
    value: "night",
    label: "Night",
    description: "Ink panels, pale text, copper highlights.",
  },
] as const;

export type StudioTheme = (typeof STUDIO_THEMES)[number]["value"];

export type EditableUserProfile = {
  bio: string;
  handle: string;
  links: string[];
  theme: StudioTheme;
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
      (value?.theme as StudioTheme | undefined) ??
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
  const isNewProfile = !existingSnapshot.exists();

  const payload = {
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    providerIds: user.providerData
      .map((entry) => entry.providerId)
      .filter(Boolean),
    lastLoginAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...(isNewProfile
      ? {
          bio: defaults.bio,
          handle: defaults.handle,
          links: defaults.links,
          theme: defaults.theme,
          createdAt: serverTimestamp(),
        }
      : {}),
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
