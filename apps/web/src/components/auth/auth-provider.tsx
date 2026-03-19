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

type AuthStatus = "loading" | "signed_out" | "signed_in" | "unconfigured";

type AuthContextValue = {
  error: string | null;
  isConfigured: boolean;
  isWorking: boolean;
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

  const applyUser = useEffectEvent((nextUser: User | null) => {
    startTransition(() => {
      setUser(nextUser);
      setStatus(nextUser ? "signed_in" : "signed_out");
      setError(null);
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
