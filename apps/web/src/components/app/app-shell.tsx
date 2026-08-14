"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { ProfileEditor } from "@/components/app/profile-editor";

type ProjectAccent = "amber" | "cyan" | "magenta" | "red";
type ProjectGlyphKind = "neon" | "possum" | "sewing" | "weather";

type StudioProject = {
  name: string;
  href: string;
  label: string;
  details: string;
  meta: string;
  accent: ProjectAccent;
  glyph: ProjectGlyphKind;
};

const studioProjects: readonly StudioProject[] = [
  {
    name: "Boxy bag builder",
    href: "/app/boxy-bag",
    label: "Open calculator",
    details: "Finished-size sewing calculator + cutting plan",
    meta: "Sewing studio / Pattern math",
    accent: "amber" as const,
    glyph: "sewing" as const,
  },
  {
    name: "Weather",
    href: "/weather",
    label: "Open dashboard",
    details: "Ambient station + climate archive",
    meta: "Next.js / Firestore",
    accent: "cyan" as const,
    glyph: "weather" as const,
  },
  {
    name: "RSVP",
    href: "/rsvp",
    label: "Open guest portal",
    details: "Vegas-themed event hub",
    meta: "Firestore / Google Auth",
    accent: "magenta" as const,
    glyph: "neon" as const,
  },
  {
    name: "Possum Payday",
    href: "/app/possum-payday",
    label: "Play game",
    details: "Family fortune reels + Goat Rodeo bonus",
    meta: "Original game / 6×5 reels",
    accent: "red",
    glyph: "possum",
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

// Tiny live clock so the studio header has a heartbeat. Updates every
// second on the client only; on first SSR paint we render a placeholder
// to avoid hydration mismatches.
function useStudioClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Schedule the first paint via the same interval to satisfy the
    // react-hooks/set-state-in-effect lint without losing the second-by-
    // second tick.
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return now;
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
  const clock = useStudioClock();

  if (status !== "signed_in") {
    return <SignInScreen
      isConfigured={isConfigured}
      isWorking={isWorking}
      error={error}
      onSignIn={signInWithGoogle}
    />;
  }

  return (
    <div data-studio-theme={studioTheme} className="studio-shell">
      <StudioBackdrop />

      <header className="studio-header">
        <div className="studio-header-left">
          <span className="studio-logomark" aria-hidden="true">
            <span className="studio-logomark-pulse" />
            MS
          </span>
          <div>
            <p className="studio-header-eyebrow">Monosyth Studio</p>
            <h1 className="studio-header-title">
              <span className="studio-header-greeting">Hey,</span>{" "}
              {profile?.displayName?.split(" ")[0] ??
                user?.displayName?.split(" ")[0] ??
                "studio"}
              <span className="studio-header-cursor" aria-hidden="true">
                _
              </span>
            </h1>
            <p className="studio-header-meta">
              <StatusDot tone="online" /> {profile?.email ?? user?.email}
              <span className="studio-header-divider" aria-hidden="true">
                •
              </span>
              {clock
                ? clock.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "—"}
            </p>
          </div>
        </div>
        <div className="studio-header-actions">
          <Link href="/" className="studio-chip-link">
            ← Back to site
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={isWorking}
            className="studio-chip-link studio-chip-link-danger"
          >
            {isWorking ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>

      <section className="studio-stat-row">
        <StatTile
          accent="cyan"
          label="Session"
          value={profile?.displayName ?? user?.displayName ?? "—"}
          note="Studio operator"
        />
        <StatTile
          accent="magenta"
          label="Last sync"
          value={formatTimestamp(profile?.lastLoginAt ?? null)}
          note={profileStatus === "ready" ? "Firestore connected" : profileStatus}
        />
        <StatTile
          accent="amber"
          label="Theme"
          value={studioTheme}
          note="Active studio palette"
        />
        <StatTile
          accent="lime"
          label="Projects"
          value={String(studioProjects.length)}
          note="Live workspaces"
        />
      </section>

      <section className="studio-section">
        <header className="studio-section-head">
          <div>
            <p className="studio-section-eyebrow">Workspaces</p>
            <h2 className="studio-section-title">Live builds</h2>
          </div>
          <p className="studio-section-meta">
            Tap a workspace to drop into the live experience.
          </p>
        </header>
        <div className="studio-projects-grid">
          {studioProjects.map((project) => (
            <ProjectTile key={project.name} project={project} />
          ))}
        </div>
      </section>

      <section className="studio-section">
        <header className="studio-section-head">
          <div>
            <p className="studio-section-eyebrow">Tools</p>
            <h2 className="studio-section-title">Operations console</h2>
          </div>
          <p className="studio-section-meta">
            Quick admin actions wired to the running site. Run with care.
          </p>
        </header>
        <div className="studio-tools-grid">
          <WeatherBackfillTool />
        </div>
      </section>

      <div className="studio-profile-wrap">
        <ProfileEditor
          key={`${user?.uid ?? "guest"}:${profile?.updatedAt ?? profile?.createdAt ?? "new"}`}
        />
      </div>

      <section className="studio-section studio-section--compact">
        <header className="studio-section-head">
          <div>
            <p className="studio-section-eyebrow">Account</p>
            <h2 className="studio-section-title">Studio record</h2>
          </div>
        </header>
        <div className="studio-account-grid">
          <AccountField label="Email" value={profile?.email ?? user?.email ?? "Unknown"} />
          <AccountField label="UID" value={profile?.uid ?? user?.uid ?? "Unknown"} mono />
          <AccountField label="Created" value={formatTimestamp(profile?.createdAt ?? null)} />
          <AccountField
            label="Providers"
            value={profile?.providerIds.join(", ") || "Pending sync"}
          />
        </div>

        {profileError ? (
          <p className="studio-error-banner">
            {profileError}. If this is your first time using Firestore in this
            project, create the database in Firebase Console first.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function SignInScreen({
  isConfigured,
  isWorking,
  error,
  onSignIn,
}: {
  isConfigured: boolean;
  isWorking: boolean;
  error: string | null;
  onSignIn: () => void | Promise<void>;
}) {
  return (
    <div className="studio-shell studio-shell--gate">
      <StudioBackdrop />
      <div className="studio-gate">
        <p className="studio-gate-eyebrow">
          <StatusDot tone="standby" /> Private studio
        </p>
        <h1 className="studio-gate-title">
          The Monosyth studio is{" "}
          <span className="studio-gate-title-accent">ready for sign-in</span>
        </h1>
        <p className="studio-gate-body">
          Sign in to manage Monosyth settings, event details, and the parts of
          the site that require account access. Only approved Google accounts
          are allowed past this point.
        </p>

        <div className="studio-gate-actions">
          <button
            type="button"
            onClick={() => void onSignIn()}
            disabled={!isConfigured || isWorking}
            className="studio-cta studio-cta--primary"
          >
            {isWorking ? "Working…" : "Sign in with Google"}
          </button>
          <Link href="/" className="studio-cta studio-cta--ghost">
            Back home
          </Link>
        </div>

        {!isConfigured ? (
          <p className="studio-gate-note">
            Firebase keys are still missing. Add them in{" "}
            <code>apps/web/.env.local</code> and enable Google sign-in in
            Firebase Auth.
          </p>
        ) : null}

        {error ? <p className="studio-gate-error">{error}</p> : null}
      </div>
    </div>
  );
}

function StudioBackdrop() {
  return (
    <div className="studio-backdrop" aria-hidden="true">
      <div className="studio-backdrop-aurora studio-backdrop-aurora--one" />
      <div className="studio-backdrop-aurora studio-backdrop-aurora--two" />
      <div className="studio-backdrop-aurora studio-backdrop-aurora--three" />
      <div className="studio-backdrop-grid" />
      <div className="studio-backdrop-noise" />
    </div>
  );
}

function StatusDot({ tone }: { tone: "online" | "standby" | "warn" }) {
  return <span className={`studio-status-dot studio-status-dot--${tone}`} />;
}

function StatTile({
  accent,
  label,
  value,
  note,
}: {
  accent: "cyan" | "magenta" | "amber" | "lime";
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className={`studio-stat-tile studio-stat-tile--${accent}`}>
      <p className="studio-stat-tile-label">{label}</p>
      <p className="studio-stat-tile-value">{value}</p>
      <p className="studio-stat-tile-note">{note}</p>
    </div>
  );
}

function AccountField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="studio-account-field">
      <span className="studio-account-field-label">{label}</span>
      <span
        className={`studio-account-field-value ${mono ? "studio-account-field-value--mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function ProjectTile({
  project,
}: {
  project: StudioProject;
}) {
  const className = `studio-project-tile studio-project-tile--${project.accent}`;
  const content = (
    <>
      <div className="studio-project-tile-glow" aria-hidden="true" />
      <div className="studio-project-tile-glyph">
        <ProjectGlyph kind={project.glyph} />
      </div>
      <div className="studio-project-tile-body">
        <p className="studio-project-tile-meta">{project.meta}</p>
        <h3 className="studio-project-tile-name">{project.name}</h3>
        <p className="studio-project-tile-detail">{project.details}</p>
      </div>
      <div className="studio-project-tile-cta">
        <span>{project.label}</span>
        <span aria-hidden="true">↗</span>
      </div>
    </>
  );

  return (
    <Link href={project.href} className={className}>
      {content}
    </Link>
  );
}

function ProjectGlyph({ kind }: { kind: ProjectGlyphKind }) {
  if (kind === "possum") {
    return (
      <Image
        src="/possum-payday.png"
        width={64}
        height={64}
        className="studio-project-tile-glyph-image"
        alt=""
      />
    );
  }

  if (kind === "weather") {
    return (
      <svg viewBox="0 0 64 64" width="40" height="40" aria-hidden="true">
        <defs>
          <radialGradient id="proj-sun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#f97316" />
          </radialGradient>
        </defs>
        <circle cx="22" cy="22" r="11" fill="url(#proj-sun)" />
        <path
          d="M50 38c0-5.5-4.5-10-10-10-3.6 0-6.7 1.9-8.5 4.7-1-.5-2.2-.7-3.5-.7-4.4 0-8 3.6-8 8 0 4.4 3.6 8 8 8h22c3.9 0 7-3.1 7-7 0-1.6-.5-3-1.5-4.1-1.6-1.7-3.6-2.6-5.5-2.9z"
          fill="#fff"
          opacity="0.92"
        />
      </svg>
    );
  }

  if (kind === "sewing") {
    return (
      <svg viewBox="0 0 64 64" width="40" height="40" aria-hidden="true">
        <defs>
          <linearGradient id="proj-sewing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#fb7185" />
          </linearGradient>
        </defs>
        <path
          d="M17 21h30l5 9-6 18H18l-6-18 5-9Z"
          fill="none"
          stroke="url(#proj-sewing)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M17 21 32 10l15 11M17 21l8 8h14l8-8M32 10v19"
          fill="none"
          stroke="url(#proj-sewing)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="32" cy="36" r="2.5" fill="#fef3c7" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" width="40" height="40" aria-hidden="true">
      <defs>
        <linearGradient id="proj-neon" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff3d9a" />
          <stop offset="100%" stopColor="#4de1ff" />
        </linearGradient>
      </defs>
      <path
        d="M14 10h4v44h-4zM26 10h4l8 18V10h4v44h-4l-8-18v18h-4z"
        fill="url(#proj-neon)"
      />
    </svg>
  );
}

type BackfillState =
  | { kind: "idle" }
  | { kind: "running" }
  | {
      kind: "success";
      observationCount: number;
      dailyRollupCount: number;
      latestObservationAt: string | null;
      source: string;
    }
  | { kind: "error"; message: string };

function WeatherBackfillTool() {
  const { user } = useAuth();
  const [state, setState] = useState<BackfillState>({ kind: "idle" });

  const isRunning = state.kind === "running";

  const summary = useMemo(() => {
    if (state.kind !== "success") return null;
    const stamp = state.latestObservationAt
      ? new Date(state.latestObservationAt).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "—";
    return {
      observationCount: state.observationCount.toLocaleString(),
      dailyRollupCount: state.dailyRollupCount.toLocaleString(),
      latestObservationAt: stamp,
      source: state.source,
    };
  }, [state]);

  async function runBackfill() {
    if (!user) {
      setState({
        kind: "error",
        message: "Sign in first — the backfill needs an admin Firebase token.",
      });
      return;
    }

    setState({ kind: "running" });

    try {
      const token = await user.getIdToken();
      // force=1 makes the server walk every stored observation (instead of
      // taking the rollup-only fast path), so manual backfills always
      // rewrite each day's rollup doc — even days that already have one.
      const response = await fetch("/api/weather/backfill?force=1", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
      });

      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        observationCount?: number;
        dailyRollupCount?: number;
        latestObservationAt?: string | null;
        source?: string;
      };

      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? `Backfill failed (${response.status}).`);
      }

      setState({
        kind: "success",
        observationCount: body.observationCount ?? 0,
        dailyRollupCount: body.dailyRollupCount ?? 0,
        latestObservationAt: body.latestObservationAt ?? null,
        source: body.source ?? "rebuild",
      });
    } catch (error) {
      setState({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "The backfill request did not complete.",
      });
    }
  }

  return (
    <article className="studio-tool-tile">
      <div className="studio-tool-tile-head">
        <div className="studio-tool-tile-icon" aria-hidden="true">
          <svg viewBox="0 0 32 32" width="22" height="22">
            <path
              d="M5 9h22M5 16h22M5 23h12"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <circle cx="22" cy="23" r="3.5" fill="currentColor" />
          </svg>
        </div>
        <div>
          <p className="studio-tool-tile-eyebrow">Weather archive</p>
          <h3 className="studio-tool-tile-title">Backfill summaries</h3>
        </div>
      </div>
      <p className="studio-tool-tile-body">
        Walks every stored observation, writes per-day rollup docs, and rebuilds
        the persisted summary archive used by{" "}
        <Link href="/weather?tab=summaries" className="studio-tool-link">
          /weather?tab=summaries
        </Link>
        . Run this once after a deploy or anytime the historical records look
        stale.
      </p>
      <div className="studio-tool-tile-actions">
        <button
          type="button"
          onClick={() => void runBackfill()}
          disabled={isRunning}
          className="studio-cta studio-cta--primary studio-cta--compact"
        >
          {isRunning ? (
            <>
              <span className="studio-cta-spinner" aria-hidden="true" />
              Backfilling…
            </>
          ) : (
            <>Run weather backfill ↻</>
          )}
        </button>
        {state.kind === "success" ? (
          <span className="studio-tool-status studio-tool-status--success">
            <StatusDot tone="online" /> Done
          </span>
        ) : null}
        {state.kind === "error" ? (
          <span className="studio-tool-status studio-tool-status--error">
            <StatusDot tone="warn" /> Failed
          </span>
        ) : null}
      </div>
      {summary ? (
        <dl className="studio-tool-tile-stats">
          <div>
            <dt>Observations</dt>
            <dd>{summary.observationCount}</dd>
          </div>
          <div>
            <dt>Daily rollups</dt>
            <dd>{summary.dailyRollupCount}</dd>
          </div>
          <div>
            <dt>Latest reading</dt>
            <dd>{summary.latestObservationAt}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{summary.source}</dd>
          </div>
        </dl>
      ) : null}
      {state.kind === "error" ? (
        <p className="studio-tool-error">{state.message}</p>
      ) : null}
    </article>
  );
}
