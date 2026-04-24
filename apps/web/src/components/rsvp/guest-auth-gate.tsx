"use client";

import type React from "react";
import { useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { useIdentity } from "@/components/rsvp/identity";

/**
 * Hard gate shown above the wizard. Guests sign in one of two ways:
 *
 *   1) Google — preferred, ties the RSVP to a verified Google uid.
 *   2) Name + email — lightweight session for guests who don't have or
 *      don't want to use a Google account. No password; the email is the
 *      identity, and revisiting with the same email re-opens the account.
 *
 * Either option lets them into the wizard and persists across visits.
 */
export function GuestAuthGate({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const auth = useAuth();
  const identity = useIdentity();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (identity.status === "loading") {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center justify-center px-6 py-24 text-center">
        <p className="font-mono text-[0.78rem] uppercase tracking-[0.3em] text-[var(--rsvp-ink-dim)]">
          Warming up the strip…
        </p>
      </div>
    );
  }

  if (identity.status === "signed_in") {
    return <>{children}</>;
  }

  const submitEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await identity.signInAsGuest({ name, email });
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Couldn't sign in. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-6 py-12 text-center sm:py-16">
      <span className="rsvp-eyebrow rsvp-eyebrow--pink">Sign in to RSVP</span>
      <h1 className="rsvp-neon rsvp-neon--pink text-4xl sm:text-5xl">
        Let us know it&rsquo;s you
      </h1>
      <p className="max-w-md text-sm leading-7 text-[var(--rsvp-ink-dim)]">
        So Dallas can tie your answers to your name. Sign in with Google for
        the easiest path, or just drop your name and email.
      </p>

      <button
        type="button"
        onClick={() => void auth.signInWithGoogle()}
        disabled={!auth.isConfigured || auth.isWorking}
        className="rsvp-btn rsvp-btn-primary w-full max-w-xs"
      >
        {auth.isWorking ? "Signing in…" : "Sign in with Google"}
      </button>

      <div className="flex w-full max-w-xs items-center gap-3 text-[0.68rem] uppercase tracking-[0.3em] text-[var(--rsvp-ink-dim)]">
        <span className="h-px flex-1 bg-[var(--rsvp-border-soft)]" />
        or
        <span className="h-px flex-1 bg-[var(--rsvp-border-soft)]" />
      </div>

      <form
        onSubmit={submitEmail}
        className="w-full max-w-sm rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.55)] p-5 text-left"
      >
        <p className="mb-4 font-[var(--font-bebas-neue)] text-sm tracking-[0.22em] text-[var(--rsvp-teal)]">
          Continue with name + email
        </p>
        <label className="mb-3 flex flex-col gap-1.5">
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[var(--rsvp-ink-dim)]">
            Full name
          </span>
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="rsvp-input"
            placeholder="Scott Waite"
          />
        </label>
        <label className="mb-4 flex flex-col gap-1.5">
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[var(--rsvp-ink-dim)]">
            Email
          </span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rsvp-input"
            placeholder="you@example.com"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="rsvp-btn rsvp-btn-neon w-full"
        >
          {submitting ? "Continuing…" : "Continue"}
        </button>
        {formError ? (
          <p className="mt-3 rounded-xl border border-[var(--rsvp-pink)]/30 bg-[var(--rsvp-pink)]/10 px-3 py-2 text-xs text-[var(--rsvp-pink-soft)]">
            {formError}
          </p>
        ) : null}
        <p className="mt-3 text-[0.68rem] leading-5 text-[var(--rsvp-ink-dim)]">
          Same email next time and we&rsquo;ll pick up where you left off. No
          password, no emails sent.
        </p>
      </form>

      {auth.error ? (
        <p className="rounded-2xl border border-[var(--rsvp-pink)]/30 bg-[var(--rsvp-pink)]/10 px-4 py-3 text-sm text-[var(--rsvp-pink-soft)]">
          {auth.error}
        </p>
      ) : null}
    </div>
  );
}
