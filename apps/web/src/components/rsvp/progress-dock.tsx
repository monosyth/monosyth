"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, useState } from "react";

import { useEventStore } from "@/components/rsvp/event-store";

const HIDE_KEY = "rsvp:progressDock:hidden:v1";

function subscribeToStorage(cb: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

function readHiddenFlag() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(HIDE_KEY) === "1";
}

/**
 * Persistent bottom-right dock showing RSVP progress across all the
 * inline chips scattered on other pages. Hidden on the wizard route itself
 * (where progress is part of the main UI) and the admin route.
 */
export function ProgressDock() {
  const { progress, ready, event } = useEventStore();
  const pathname = usePathname() ?? "";
  // Syncs with localStorage across tabs + on client hydration.
  const storedHidden = useSyncExternalStore(
    subscribeToStorage,
    readHiddenFlag,
    () => false,
  );
  const [localHidden, setLocalHidden] = useState(false);
  const hidden = storedHidden || localHidden;

  // Don't show on the wizard, admin, or before hydration
  const suppress =
    !ready ||
    progress.total === 0 ||
    pathname.startsWith("/rsvp/rsvp") ||
    pathname.startsWith("/rsvp/admin");

  if (suppress || hidden) return null;

  const dismiss = () => {
    setLocalHidden(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(HIDE_KEY, "1");
      // Trigger storage listeners so any other tab updates too.
      window.dispatchEvent(new StorageEvent("storage", { key: HIDE_KEY }));
    }
  };

  const done = progress.answered >= progress.total && progress.total > 0;

  return (
    <div
      className="fixed bottom-4 left-1/2 z-40 w-[min(28rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-2xl border border-[var(--rsvp-pink)]/40 bg-[rgba(7,4,10,0.92)] px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.65)] backdrop-blur-md"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-[var(--rsvp-teal)]">
              {event.title}
            </span>
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-[var(--rsvp-ink-dim)]">
              {progress.answered}/{progress.total} · {progress.percent}%
            </span>
          </div>
          <div className="rsvp-progress mt-2">
            <span
              className="rsvp-progress-fill"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
        <Link
          href="/rsvp/rsvp"
          className={`rsvp-btn ${
            done ? "rsvp-btn-primary rsvp-sign-pulse" : "rsvp-btn-neon"
          } px-3 py-2 text-xs`}
        >
          {done ? "Submit all →" : "Open wizard"}
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss progress dock"
          className="shrink-0 rounded-full border border-white/15 p-1.5 text-[var(--rsvp-ink-dim)] transition hover:border-white/30 hover:text-[var(--rsvp-ink)]"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12" />
            <path d="M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
