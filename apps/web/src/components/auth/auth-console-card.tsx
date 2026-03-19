"use client";

import Link from "next/link";

import { useAuth } from "./auth-provider";

function ActionButton({
  children,
  onClick,
  primary = false,
  disabled = false,
}: Readonly<{
  children: React.ReactNode;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        primary
          ? "bg-[var(--gold)] text-stone-950 hover:bg-[#ffd774]"
          : "border border-white/15 bg-white/8 text-stone-50 hover:bg-white/14"
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {children}
    </button>
  );
}

export function AuthConsoleCard() {
  const {
    error,
    isConfigured,
    isWorking,
    profile,
    profileStatus,
    signInWithGoogle,
    signOut,
    status,
    user,
  } = useAuth();

  return (
    <div className="flex flex-col gap-4 rounded-[1.75rem] bg-stone-950 px-5 py-5 text-stone-50 sm:px-6">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-stone-400">
          Private access
        </p>
        <div
          className={`h-3 w-3 rounded-full ${
            status === "signed_in"
              ? "bg-[var(--gold)] shadow-[0_0_24px_rgba(244,201,93,0.65)]"
              : "bg-white/30"
          }`}
        />
      </div>

      <div className="space-y-3">
        <p className="text-2xl font-semibold tracking-[-0.04em]">
          {status === "signed_in" ? "Studio access is open" : "A private layer lives underneath this site"}
        </p>
        <p className="text-sm leading-7 text-stone-300">
          {status === "unconfigured"
            ? "The private workspace is not connected yet."
            : status === "signed_in"
              ? "You are signed in and the Monosyth studio is ready for profiles, tools, and whatever gets built next."
              : "Sign in to step into the working side of Monosyth."}
        </p>
      </div>

      <div className="grid gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-stone-200">
          Access:{" "}
          <span className="font-medium text-stone-50">
            {status.replace("_", " ")}
          </span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-stone-200">
          Identity:{" "}
          <span className="font-medium text-stone-50">
            {user?.email ?? "Not signed in"}
          </span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-stone-200">
          Platform:{" "}
          <span className="font-medium text-stone-50">
            {isConfigured ? "Connected" : "Offline"}
          </span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-stone-200">
          Profile:{" "}
          <span className="font-medium text-stone-50">
            {status !== "signed_in"
              ? "Waiting"
              : profileStatus === "ready"
                ? `Synced for ${profile?.email ?? "current user"}`
                : profileStatus}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {status === "signed_in" ? (
          <>
            <ActionButton onClick={() => void signOut()} disabled={isWorking}>
              {isWorking ? "Working..." : "Sign out"}
            </ActionButton>
            <Link
              href="/app"
              className="rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-medium text-stone-950 transition hover:bg-[#ffd774]"
            >
              Open studio
            </Link>
          </>
        ) : (
          <>
            <ActionButton
              onClick={() => void signInWithGoogle()}
              primary
              disabled={!isConfigured || isWorking}
            >
              {isWorking ? "Working..." : "Sign in with Google"}
            </ActionButton>
            <Link
              href="/app"
              className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-white/14"
            >
              Preview studio
            </Link>
          </>
        )}
      </div>

      {error ? (
        <p className="rounded-2xl border border-[#d46d31]/30 bg-[#d46d31]/10 px-4 py-3 text-sm text-[#ffd7c0]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
