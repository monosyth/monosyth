"use client";

import Link from "next/link";

import { useAuth } from "@/components/auth/auth-provider";

export function AppShell() {
  const { error, isConfigured, isWorking, signInWithGoogle, signOut, status, user } =
    useAuth();

  if (status !== "signed_in") {
    return (
      <div className="glass-panel rounded-[2rem] px-6 py-8 sm:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--ember)]">
          Private area
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">
          The Monosyth app shell is ready for sign-in.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-stone-700">
          This route is the first private area for the platform. Once you sign
          in, it becomes the place to grow product ideas, dashboards, and
          agent-assisted workflows.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            disabled={!isConfigured || isWorking}
            className="rounded-full bg-[var(--pine)] px-5 py-3 text-sm font-medium text-stone-50 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isWorking ? "Working..." : "Sign in with Google"}
          </button>
          <Link
            href="/"
            className="rounded-full border border-stone-900/10 bg-white px-5 py-3 text-sm font-medium text-stone-900 transition hover:bg-stone-50"
          >
            Back home
          </Link>
        </div>

        {!isConfigured ? (
          <p className="mt-4 rounded-2xl border border-stone-900/10 bg-white/65 px-4 py-3 text-sm text-stone-700">
            Firebase keys are still missing. Add them in `apps/web/.env.local`
            and enable Google sign-in in Firebase Auth.
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-2xl border border-[#d46d31]/25 bg-[#d46d31]/10 px-4 py-3 text-sm text-[#8b3f18]">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="glass-panel rounded-[2rem] px-6 py-8 sm:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--teal)]">
          Signed in
        </p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-[-0.05em]">
              Welcome to the Monosyth app shell.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-stone-700">
              This is the first protected route in the project. From here, we
              can grow dashboards, tools, admin panels, and client-facing
              products without rebuilding the foundation.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={isWorking}
            className="rounded-full border border-stone-900/10 bg-white px-5 py-3 text-sm font-medium text-stone-900 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isWorking ? "Working..." : "Sign out"}
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="glass-panel rounded-[1.75rem] px-5 py-6">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-stone-500">
            Identity
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
            Signed in as {user?.displayName ?? user?.email ?? "Monosyth"}
          </h2>
          <p className="mt-3 text-sm leading-7 text-stone-700">
            Use this identity layer for private notes, admin controls, and
            internal tools.
          </p>
        </article>
        <article className="glass-panel rounded-[1.75rem] px-5 py-6">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-stone-500">
            Foundation
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
            Auth is working
          </h2>
          <p className="mt-3 text-sm leading-7 text-stone-700">
            The route is auth-aware and ready for Firestore-backed features,
            role checks, and future server-side session work.
          </p>
        </article>
        <article className="glass-panel rounded-[1.75rem] px-5 py-6">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-stone-500">
            Next
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
            First real app
          </h2>
          <p className="mt-3 text-sm leading-7 text-stone-700">
            The next coding move can be a dashboard, a profile editor, or a
            lightweight product idea powered by Firebase data.
          </p>
        </article>
      </section>
    </div>
  );
}
