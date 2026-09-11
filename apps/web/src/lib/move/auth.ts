"use client";
import { getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirebaseConfig } from "@/lib/firebase/config";

export function getMoveAuth() {
  const config = getFirebaseConfig();
  if (!config) return null;
  const app =
    getApps().find((app) => app.name === "movemorrow") ??
    initializeApp(config, "movemorrow");
  return getAuth(app);
}
export function moveGoogleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}
