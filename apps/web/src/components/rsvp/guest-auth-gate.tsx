"use client";

import type React from "react";

import { useAuth } from "@/components/auth/auth-provider";

/**
 * Hard gate shown above the wizard. Guests must sign in with Google before
 * they can fill out their RSVP — that way every submission is tied to a
 * verified Google identity so admins can dedupe and track who came back.
 *
 * Renders children when the user is signed in; otherwise shows a centered
 * sign-in card.
 */
export function GuestAuthGate({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const {
    status,
    isConfigured,
    isWorking,
    signInWithGoogle,
    error,
    user,
  } = useAuth();

  if (status === "loading") {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center justify-center px-6 py-24 text-center">
        <p className="font-mono text-[0.78rem] uppercase tracking-[0.3em] text-[var(--rsvp-ink-dim)]">
          Warming up the strip…
        </p>
      </div>
    );
  }

  if (status !== "signed_in" || !user) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-6 py-16 text-center">
        <span className="rsvp-eyebrow rsvp-eyebrow--pink">Sign in to RSVP</span>
        <h1 className="rsvp-neon rsvp-neon--pink text-4xl sm:text-5xl">
          Let us know it&rsquo;s you
        </h1>
        <p className="max-w-md text-sm leading-7 text-[var(--rsvp-ink-dim)]">
          Sign in with Google so we can tie your RSVP to your name &mdash; no
          duplicate guests, and Dallas can ping you when your reservation is
          confirmed. We only use your name and email.
        </p>
        <button
          type="button"
          onClick={() => void signInWithGoogle()}
          disabled={!isConfigured || isWorking}
          className="rsvp-btn rsvp-btn-primary"
        >
          {isWorking ? "Signing in…" : "Sign in with Google"}
        </button>
        {!isConfigured ? (
          <p className="rounded-2xl border border-[var(--rsvp-pink)]/30 bg-[var(--rsvp-pink)]/10 px-4 py-3 text-sm text-[var(--rsvp-pink-soft)]">
            Google sign-in hasn&rsquo;t been set up for this environment yet.
          </p>
        ) : null}
        {error ? (
          <p className="rounded-2xl border border-[var(--rsvp-pink)]/30 bg-[var(--rsvp-pink)]/10 px-4 py-3 text-sm text-[var(--rsvp-pink-soft)]">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return <>{children}</>;
}
