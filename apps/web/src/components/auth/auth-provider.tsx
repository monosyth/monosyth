"use client";

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useEffectEvent,
  useState,
} from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";

import { getFirebaseAuth, getGoogleProvider } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  EditableUserProfile,
  UserProfile,
  ensureUserProfile,
  saveUserProfile,
} from "@/lib/firebase/profiles";

type AuthStatus = "loading" | "signed_out" | "signed_in" | "unconfigured";
type ProfileStatus =
  | "idle"
  | "loading"
  | "ready"
  | "saving"
  | "error"
  | "unconfigured";

type AuthContextValue = {
  error: string | null;
  isConfigured: boolean;
  isWorking: boolean;
  profile: UserProfile | null;
  profileError: string | null;
  profileSaveMessage: string | null;
  profileSaveState: "idle" | "saving" | "saved" | "error";
  profileStatus: ProfileStatus;
  saveProfile: (input: EditableUserProfile) => Promise<void>;
  status: AuthStatus;
  user: User | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(
    isFirebaseConfigured() ? "loading" : "unconfigured",
  );
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaveMessage, setProfileSaveMessage] = useState<string | null>(null);
  const [profileSaveState, setProfileSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>(
    isFirebaseConfigured() ? "idle" : "unconfigured",
  );

  const applyUser = useEffectEvent((nextUser: User | null) => {
    startTransition(() => {
      setUser(nextUser);
      setStatus(nextUser ? "signed_in" : "signed_out");
      setError(null);

      if (!nextUser) {
        setProfile(null);
        setProfileError(null);
        setProfileSaveMessage(null);
        setProfileSaveState("idle");
        setProfileStatus(isFirebaseConfigured() ? "idle" : "unconfigured");
      }
    });
  });

  const applyProfile = useEffectEvent((nextProfile: UserProfile | null) => {
    startTransition(() => {
      setProfile(nextProfile);
      setProfileStatus(nextProfile ? "ready" : "idle");
      setProfileError(null);
    });
  });

  useEffect(() => {
    const auth = getFirebaseAuth();

    if (!auth) {
      return;
    }

    let active = true;
    let checkVersion = 0;
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      const version = ++checkVersion;
      if (!nextUser) {
        applyUser(null);
        return;
      }

      startTransition(() => {
        setUser(null);
        setStatus("loading");
        setError(null);
      });

      // Only server-approved users reach signed_in; all UI gates share that state.
      // The server keeps the existing administrator allowlist private.
      void (async () => {
        try {
          const token = await nextUser.getIdToken();
          const response = await fetch("/api/auth/admin", {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          if (!active || version !== checkVersion) return;
          if (response.status === 401 || response.status === 403) {
            await firebaseSignOut(auth);
            if (active) setError("This Google account is not approved for Monosyth admin access.");
            return;
          }
          if (!response.ok) throw new Error("Administrator access could not be checked. Please try again.");
          const result = await response.json();
          if (!active || version !== checkVersion) return;
          if (result.isAdmin !== true) throw new Error("Administrator access could not be checked. Please try again.");
          applyUser(nextUser);
        } catch (nextError) {
          if (!active || version !== checkVersion) return;
          applyUser(null);
          setError(nextError instanceof Error ? nextError.message : "Administrator access could not be checked.");
        }
      })();
    });
    return () => {
      active = false;
      checkVersion++;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      startTransition(() => {
        setProfile(null);
        setProfileError(null);
        setProfileSaveMessage(null);
        setProfileSaveState("idle");
        setProfileStatus("unconfigured");
      });
      return;
    }

    if (!user) {
      startTransition(() => {
        setProfile(null);
        setProfileError(null);
        setProfileSaveMessage(null);
        setProfileSaveState("idle");
        setProfileStatus("idle");
      });
      return;
    }

    let cancelled = false;

    startTransition(() => {
      setProfileStatus("loading");
      setProfileError(null);
      setProfileSaveMessage(null);
    });

    void ensureUserProfile(user)
      .then((nextProfile) => {
        if (cancelled) {
          return;
        }

        applyProfile(nextProfile);
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        const message =
          nextError instanceof Error
            ? nextError.message
            : "Firestore studio sync failed.";

        startTransition(() => {
          setProfileStatus("error");
          setProfileError(message);
          setProfileSaveState("error");
        });
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  async function signInWithGoogle() {
    const auth = getFirebaseAuth();

    if (!auth) {
      setError("Add your Firebase web app keys before signing in.");
      return;
    }

    setIsWorking(true);
    setError(null);

    try {
      await signInWithPopup(auth, getGoogleProvider());
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : "Google sign-in could not be completed.";
      setError(message);
    } finally {
      setIsWorking(false);
    }
  }

  async function signOut() {
    const auth = getFirebaseAuth();

    if (!auth) {
      return;
    }

    setIsWorking(true);
    setError(null);

    try {
      const listenResponse = await fetch("/api/weather/listen/session", {
        method: "DELETE",
        cache: "no-store",
      });
      if (!listenResponse.ok) {
        throw new Error("Could not close the private bird-listening session. Please try signing out again.");
      }
      await firebaseSignOut(auth);
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : "Sign-out could not be completed.";
      setError(message);
    } finally {
      setIsWorking(false);
    }
  }

  async function saveProfile(input: EditableUserProfile) {
    if (!user) {
      setProfileSaveState("error");
      setProfileSaveMessage("Sign in first to save your settings.");
      return;
    }

    setProfileSaveState("saving");
    setProfileSaveMessage(null);
    setProfileError(null);
    setProfileStatus("saving");

    try {
      const nextProfile = await saveUserProfile(user, input);

      startTransition(() => {
        setProfile(nextProfile);
        setProfileStatus("ready");
        setProfileSaveState("saved");
        setProfileSaveMessage("Settings saved.");
      });
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : "Settings save failed.";

      startTransition(() => {
        setProfileStatus("error");
        setProfileError(message);
        setProfileSaveState("error");
        setProfileSaveMessage("Settings could not be saved.");
      });
    }
  }

  return (
    <AuthContext.Provider
      value={{
        error,
        isConfigured: isFirebaseConfigured(),
        isWorking,
        profile,
        profileError,
        profileSaveMessage,
        profileSaveState,
        profileStatus,
        saveProfile,
        status,
        user,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return value;
}
