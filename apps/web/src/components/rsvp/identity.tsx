"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/components/auth/auth-provider";
import type { GuestSession } from "@/lib/rsvp/guest-session";

export type Identity = {
  uid: string;
  name: string;
  email: string;
  photoUrl: string | null;
  /** Where the identity came from. */
  source: "google" | "guest";
};

type State =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "signed_in"; identity: Identity };

type Context = State & {
  /** Sign in as a guest (name + email). Returns the created session. */
  signInAsGuest: (input: {
    name: string;
    email: string;
  }) => Promise<GuestSession>;
  /** Sign out the current identity regardless of source. */
  signOutIdentity: () => Promise<void>;
};

const IdentityContext = createContext<Context>({
  status: "loading",
  signInAsGuest: async () => {
    throw new Error("IdentityProvider not mounted");
  },
  signOutIdentity: async () => undefined,
});

export function IdentityProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const auth = useAuth();
  const [guest, setGuest] = useState<GuestSession | null>(null);
  const [guestLoaded, setGuestLoaded] = useState(false);

  // Load existing guest-cookie session once on mount.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/rsvp/guest-session", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as { session: GuestSession | null };
        if (cancelled) return;
        setGuest(data.session ?? null);
      } catch {
        if (!cancelled) setGuest(null);
      } finally {
        if (!cancelled) setGuestLoaded(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const signInAsGuest = useCallback(
    async ({ name, email }: { name: string; email: string }) => {
      const res = await fetch("/api/rsvp/guest-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const payload = (await res.json()) as
        | { session: GuestSession; error?: undefined }
        | { session?: undefined; error: string };
      if (!res.ok || !payload.session) {
        throw new Error(payload.error ?? "Could not sign in.");
      }
      setGuest(payload.session);
      return payload.session;
    },
    [],
  );

  const signOutIdentity = useCallback(async () => {
    // Clear guest cookie (if any).
    try {
      await fetch("/api/rsvp/guest-session", { method: "DELETE" });
    } catch {
      // ignore
    }
    setGuest(null);
    // And Firebase if signed in.
    if (auth.status === "signed_in") {
      try {
        await auth.signOut();
      } catch {
        // ignore
      }
    }
  }, [auth]);

  const value = useMemo<Context>(() => {
    // Google identity wins if both are present.
    if (auth.status === "signed_in" && auth.user) {
      const identity: Identity = {
        uid: auth.user.uid,
        name:
          auth.user.displayName ??
          auth.user.email ??
          "Guest",
        email: (auth.user.email ?? "").toLowerCase(),
        photoUrl: auth.user.photoURL ?? null,
        source: "google",
      };
      return {
        status: "signed_in",
        identity,
        signInAsGuest,
        signOutIdentity,
      };
    }

    if (auth.status === "loading" || !guestLoaded) {
      return { status: "loading", signInAsGuest, signOutIdentity };
    }

    if (guest) {
      const identity: Identity = {
        uid: guest.uid,
        name: guest.name,
        email: guest.email,
        photoUrl: null,
        source: "guest",
      };
      return {
        status: "signed_in",
        identity,
        signInAsGuest,
        signOutIdentity,
      };
    }

    return { status: "anonymous", signInAsGuest, signOutIdentity };
  }, [auth.status, auth.user, guest, guestLoaded, signInAsGuest, signOutIdentity]);

  return (
    <IdentityContext.Provider value={value}>
      {children}
    </IdentityContext.Provider>
  );
}

export function useIdentity() {
  return useContext(IdentityContext);
}
