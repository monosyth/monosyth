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

    return onAuthStateChanged(auth, (nextUser) => {
      applyUser(nextUser);
    });
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
            : "Firestore profile sync failed.";

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
      setProfileSaveMessage("Sign in first to save your profile.");
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
        setProfileSaveMessage("Profile saved.");
      });
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : "Profile save failed.";

      startTransition(() => {
        setProfileStatus("error");
        setProfileError(message);
        setProfileSaveState("error");
        setProfileSaveMessage("Profile could not be saved.");
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
