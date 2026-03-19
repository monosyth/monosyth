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
    signInWithGoogle,
    signOut,
    status,
  } = useAuth();

  return (
    <div className="flex min-h-[18rem] w-full max-w-3xl flex-col justify-between rounded-[2rem] bg-stone-950 px-6 py-6 text-stone-50 shadow-[0_30px_80px_rgba(0,0,0,0.22)] sm:px-8 sm:py-7">
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

      <div className="flex flex-wrap items-center gap-3">
        {status === "signed_in" ? (
          <>
            <Link
              href="/app"
              className="rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-medium text-stone-950 transition hover:bg-[#ffd774]"
            >
              enter
            </Link>
            <ActionButton onClick={() => void signOut()} disabled={isWorking}>
              {isWorking ? "working..." : "sign out"}
            </ActionButton>
          </>
        ) : (
          <ActionButton
            onClick={() => void signInWithGoogle()}
            primary
            disabled={!isConfigured || isWorking}
          >
            {isWorking ? "working..." : "sign in"}
          </ActionButton>
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
