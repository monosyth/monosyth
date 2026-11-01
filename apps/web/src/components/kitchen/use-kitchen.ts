"use client";

import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { useCallback, useEffect, useRef, useState } from "react";

import { getFirebaseAuth, getGoogleProvider } from "@/lib/firebase/client";
import { emptyKitchen, type KitchenState } from "@/lib/kitchen/types";

const CACHE_KEY = "dallas-kitchen-household-v1";
const REFRESH_MS = 30_000;

export type SaveStatus = "idle" | "saving" | "saved" | "error";
export type Access = "loading" | "signed-out" | "checking" | "allowed" | "denied" | "error";

function readCache(): KitchenState | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? { ...emptyKitchen(), ...(JSON.parse(raw) as KitchenState) } : null;
  } catch {
    return null;
  }
}

export function useKitchen() {
  const [state, setState] = useState<KitchenState>(emptyKitchen);
  const [user, setUser] = useState<User | null>(null);
  const [access, setAccess] = useState<Access>("loading");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const stateRef = useRef(state);
  const userRef = useRef<User | null>(null);
  const dirty = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const authFetch = useCallback(async (url: string, init: RequestInit = {}) => {
    const current = userRef.current;
    const token = current ? await current.getIdToken() : "";
    return fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
  }, []);

  const applyCloud = useCallback((next: KitchenState) => {
    stateRef.current = next;
    setState(next);
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(next));
  }, []);

  /** Pull the shared kitchen, unless this device has changes that haven't been saved yet. */
  const refresh = useCallback(async () => {
    if (!userRef.current || dirty.current) return;
    const res = await authFetch("/api/kitchen/state");
    if (res.status === 403) {
      setAccess("denied");
      return;
    }
    if (!res.ok) throw new Error(String(res.status));
    const { state: cloud } = (await res.json()) as { state: KitchenState | null };
    if (dirty.current) return;
    if (cloud && cloud.updatedAt !== stateRef.current.updatedAt) {
      applyCloud({ ...emptyKitchen(), ...cloud });
    }
    setAccess("allowed");
  }, [authFetch, applyCloud]);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setAccess("error");
      return;
    }
    return onAuthStateChanged(auth, async nextUser => {
      userRef.current = nextUser;
      setUser(nextUser);
      if (!nextUser) {
        setAccess("signed-out");
        return;
      }
      const cached = readCache();
      if (cached) {
        stateRef.current = cached;
        setState(cached);
      }
      setAccess("checking");
      try {
        await refresh();
      } catch {
        setAccess(cached ? "allowed" : "error");
        setStatus("error");
      }
    });
  }, [refresh]);

  // Keep both phones in step: re-check when the app comes back to the screen, and every so often.
  useEffect(() => {
    if (access !== "allowed") return;
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(onVisible, REFRESH_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [access, refresh]);

  const save = useCallback(async () => {
    setStatus("saving");
    const snapshot = stateRef.current;
    try {
      const res = await authFetch("/api/kitchen/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: snapshot }),
      });
      if (!res.ok) throw new Error(String(res.status));
      // Only clear the flag if nothing changed while saving.
      if (stateRef.current === snapshot) dirty.current = false;
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }, [authFetch]);

  const update = useCallback(
    (change: (draft: KitchenState) => KitchenState) => {
      const next = { ...change(stateRef.current), updatedAt: Date.now() };
      stateRef.current = next;
      setState(next);
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(next));
      dirty.current = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setStatus("saving");
      saveTimer.current = setTimeout(save, 700);
    },
    [save],
  );

  const signIn = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    await signInWithPopup(auth, getGoogleProvider());
  }, []);

  const signOutUser = useCallback(async () => {
    const auth = getFirebaseAuth();
    window.localStorage.removeItem(CACHE_KEY);
    stateRef.current = emptyKitchen();
    setState(emptyKitchen());
    if (auth) await signOut(auth);
  }, []);

  return { state, update, user, access, status, signIn, signOut: signOutUser, authFetch };
}

export type Kitchen = ReturnType<typeof useKitchen>;
