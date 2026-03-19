import { User } from "firebase/auth";
import { Timestamp, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { getFirebaseDb } from "./client";

export type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerIds: string[];
  createdAt: string | null;
  lastLoginAt: string | null;
};

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
    createdAt: toIsoString(value?.createdAt),
    lastLoginAt: toIsoString(value?.lastLoginAt),
  };
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const db = getFirebaseDb();

  if (!db) {
    throw new Error("Firebase is not configured for Firestore.");
  }

  const ref = doc(db, "users", user.uid);
  const existingSnapshot = await getDoc(ref);

  const payload = {
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    providerIds: user.providerData
      .map((entry) => entry.providerId)
      .filter(Boolean),
    lastLoginAt: serverTimestamp(),
    ...(existingSnapshot.exists() ? {} : { createdAt: serverTimestamp() }),
  };

  await setDoc(ref, payload, { merge: true });

  const nextSnapshot = await getDoc(ref);

  if (!nextSnapshot.exists()) {
    return serializeProfile(undefined, user);
  }

  return serializeProfile(nextSnapshot.data(), user);
}
