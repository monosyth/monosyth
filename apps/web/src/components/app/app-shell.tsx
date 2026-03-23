"use client";

import Link from "next/link";

import { useAuth } from "@/components/auth/auth-provider";
import { ProfileEditor } from "@/components/app/profile-editor";

const studioProjects = [
  {
    name: "Weather",
    href: "/weather",
    label: "Live site",
    details: "Ambient station dashboard",
    meta: "Next.js + Firestore",
  },
];

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Pending sync";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AppShell() {
  const {
    error,
    isConfigured,
    isWorking,
    profile,
    profileError,
    profileStatus,
    signInWithGoogle,
    signOut,
    status,
    user,
  } = useAuth();
  const studioTheme = profile?.theme ?? "ember";

  if (status !== "signed_in") {
    return (
      <div className="glass-panel rounded-[2rem] px-6 py-8 sm:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--ember)]">
          Private area
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">
          The Monosyth studio is ready for sign-in.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-stone-700">
          This route is your private workspace for Monosyth. Once you sign in,
          it becomes the place to shape the site, manage internal tools, and
          build whatever comes next.
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
    <div data-studio-theme={studioTheme} className="studio-theme grid gap-6">
      <section className="glass-panel rounded-[2rem] px-6 py-8 sm:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--teal)]">
          Signed in
        </p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-[-0.05em]">
              Welcome to the Monosyth studio.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-stone-700">
              This is your private admin layer. From here, we can grow
              dashboards, controls, tools, and internal workflows without
              turning the site into a multi-user product.
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
            Access
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
            Signed in as {profile?.displayName ?? user?.displayName ?? user?.email ?? "monosyth"}
          </h2>
          <p className="mt-3 text-sm leading-7 text-stone-700">
            Use this studio layer for admin controls, internal notes, and the
            parts of Monosyth that are only for you.
          </p>
        </article>
        <article className="glass-panel rounded-[1.75rem] px-5 py-6">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-stone-500">
            Foundation
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
            Firestore document
          </h2>
          <p className="mt-3 text-sm leading-7 text-stone-700">
            {profileStatus === "ready"
              ? "Your private studio document is connected and syncing."
              : profileStatus === "loading"
                ? "Signing in worked. Firestore is syncing the studio data now."
                : "The route is ready for Firestore-backed settings, content, and tools."}
          </p>
          <div className="mt-4 rounded-2xl border border-stone-900/10 bg-white/70 px-4 py-3 text-sm text-stone-700">
            Last login: {formatTimestamp(profile?.lastLoginAt ?? null)}
          </div>
        </article>
        <article className="glass-panel rounded-[1.75rem] px-5 py-6">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-stone-500">
            Next
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
            First private tools
          </h2>
          <p className="mt-3 text-sm leading-7 text-stone-700">
            The next coding move can be an admin dashboard, content controls,
            or a lightweight internal tool powered by Firebase data.
          </p>
        </article>
      </section>

      <section className="glass-panel rounded-[1.75rem] px-5 py-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-stone-500">
              Projects
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
              Current Monosyth builds
            </h2>
          </div>
          <p className="text-sm leading-7 text-stone-600">
            A compact list of what is live and worth jumping into.
          </p>
        </div>

        <div className="mt-5 grid gap-3">
          {studioProjects.map((project) => (
            <article
              key={project.name}
              className="rounded-2xl border border-stone-900/10 bg-white/70 px-4 py-4 text-sm text-stone-700"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="text-base font-semibold text-stone-900">
                  {project.name}
                </span>
                <span>{project.details}</span>
                <span className="text-stone-400">/</span>
                <span>{project.meta}</span>
                <span className="text-stone-400">/</span>
                <Link
                  href={project.href}
                  className="font-medium text-[var(--teal)] underline decoration-stone-300 underline-offset-4 transition hover:text-[var(--pine)]"
                >
                  {project.label}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <ProfileEditor
        key={`${user?.uid ?? "guest"}:${profile?.updatedAt ?? profile?.createdAt ?? "new"}`}
      />

      <section className="glass-panel rounded-[1.75rem] px-5 py-6">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-stone-500">
          Studio record
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-stone-900/10 bg-white/70 px-4 py-3 text-sm text-stone-700">
            Email: <span className="font-medium text-stone-900">{profile?.email ?? user?.email ?? "Unknown"}</span>
          </div>
          <div className="rounded-2xl border border-stone-900/10 bg-white/70 px-4 py-3 text-sm text-stone-700">
            UID: <span className="font-medium text-stone-900">{profile?.uid ?? user?.uid ?? "Unknown"}</span>
          </div>
          <div className="rounded-2xl border border-stone-900/10 bg-white/70 px-4 py-3 text-sm text-stone-700">
            Created: <span className="font-medium text-stone-900">{formatTimestamp(profile?.createdAt ?? null)}</span>
          </div>
          <div className="rounded-2xl border border-stone-900/10 bg-white/70 px-4 py-3 text-sm text-stone-700">
            Providers: <span className="font-medium text-stone-900">{profile?.providerIds.join(", ") || "Pending sync"}</span>
          </div>
        </div>

        {profileError ? (
          <p className="mt-4 rounded-2xl border border-[#d46d31]/25 bg-[#d46d31]/10 px-4 py-3 text-sm text-[#8b3f18]">
            {profileError}. If this is your first time using Firestore in this
            project, create the database in Firebase Console first.
          </p>
        ) : null}
      </section>
    </div>
  );
}
