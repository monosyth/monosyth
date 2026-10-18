"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import styles from "./phone-bird-listening-gate.module.css";

export function PhoneBirdListeningGate() {
  const { error: authError, isWorking, signInWithGoogle, status, user } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "signed_in" || !user) return;
    let cancelled = false;

    void (async () => {
      const token = await user.getIdToken();
      const response = await fetch("/api/weather/listen/session", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Could not open private listening. Please try again.");
      if (!cancelled) window.location.replace("/weather/field-listen/index.html");
    })().catch(reason => {
      if (!cancelled) {
        setError(reason instanceof Error ? reason.message : "Could not open private listening.");
      }
    });

    return () => { cancelled = true; };
  }, [attempt, status, user]);

  return <main className={styles.page}>
    <section className={styles.card} aria-labelledby="listen-title">
      <span className={styles.eyebrow}>MONOSYTH WEATHER · PRIVATE FIELD TEST</span>
      <h1 id="listen-title">Listen with this phone</h1>
      <p>This live bird-sound test is available when you sign in to your Monosyth account. The public weather dashboard shows the station’s bird report.</p>
      {status === "loading" ? <p role="status">Checking sign-in…</p> :
        status === "unconfigured" ? <p role="alert">Sign-in is temporarily unavailable.</p> :
        status === "signed_out" ? <button type="button" onClick={() => void signInWithGoogle()} disabled={isWorking}>{isWorking ? "Opening sign-in…" : "Sign in with Google"}</button> :
        error ? <button type="button" onClick={() => { setError(null); setAttempt(value => value + 1); }}>Try opening again</button> :
        <p role="status">Opening your listener…</p>}
      {(error || authError) && <p className={styles.error} role="alert">{error || authError}</p>}
      <a href="/weather">← Back to the weather report</a>
    </section>
  </main>;
}
