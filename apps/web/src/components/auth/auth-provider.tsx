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
import { UserProfile, ensureUserProfile } from "@/lib/firebase/profiles";

type AuthStatus = "loading" | "signed_out" | "signed_in" | "unconfigured";
type ProfileStatus = "idle" | "loading" | "ready" | "error" | "unconfigured";

type AuthContextValue = {
  error: string | null;
  isConfigured: boolean;
  isWorking: boolean;
  profile: UserProfile | null;
  profileError: string | null;
  profileStatus: ProfileStatus;
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

    return onAuthStateChanged(auth, (nextUser) => {
      applyUser(nextUser);
    });
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      startTransition(() => {
        setProfile(null);
        setProfileError(null);
        setProfileStatus("unconfigured");
      });
      return;
    }

    if (!user) {
      startTransition(() => {
        setProfile(null);
        setProfileError(null);
        setProfileStatus("idle");
      });
      return;
    }

    let cancelled = false;

    startTransition(() => {
      setProfileStatus("loading");
      setProfileError(null);
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
            : "Firestore profile sync failed.";

        startTransition(() => {
          setProfileStatus("error");
          setProfileError(message);
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

  return (
    <AuthContext.Provider
      value={{
        error,
        isConfigured: isFirebaseConfigured(),
        isWorking,
        profile,
        profileError,
        profileStatus,
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
