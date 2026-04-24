"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { useIdentity } from "@/components/rsvp/identity";
import { isMonosythAdminEmail } from "@/lib/auth/admin";

type NavItem = {
  label: string;
  href: string;
  /** Matches the path exactly or prefix (used for Day links). */
  match?: "exact" | "prefix";
  children?: { label: string; href: string }[];
};

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/rsvp", match: "exact" },
  { label: "Overview", href: "/rsvp/overview" },
  { label: "Hotel", href: "/rsvp/hotel" },
  { label: "Tips", href: "/rsvp/travel-tips" },
  {
    label: "Days",
    href: "/rsvp/day/thursday",
    match: "prefix",
    children: [
      { label: "Day 1 · Thursday", href: "/rsvp/day/thursday" },
      { label: "Day 2 · Friday", href: "/rsvp/day/friday" },
      { label: "Day 3 · Saturday", href: "/rsvp/day/saturday" },
      { label: "Day 4 · Sunday", href: "/rsvp/day/sunday" },
      { label: "Day 5 · Monday", href: "/rsvp/day/monday" },
    ],
  },
  { label: "Activities", href: "/rsvp/activities" },
  { label: "Restaurants", href: "/rsvp/restaurants" },
  { label: "RSVP", href: "/rsvp/rsvp" },
  { label: "Deposits", href: "/rsvp/deposits" },
];

function isActive(pathname: string, item: NavItem) {
  if (item.match === "exact") {
    return pathname === item.href;
  }
  if (item.match === "prefix") {
    return pathname.startsWith(item.href.split("/").slice(0, -1).join("/"));
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function RsvpNav() {
  const pathname = usePathname() ?? "/rsvp";
  const { status, user } = useAuth();
  const identity = useIdentity();
  const canEdit =
    status === "signed_in" && isMonosythAdminEmail(user?.email);
  const [daysOpen, setDaysOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Small close delay so a stray mouseleave while moving between the Days
  // button and its panel doesn't immediately collapse the menu.
  const daysCloseTimer = useRef<number | null>(null);
  const openDays = () => {
    if (daysCloseTimer.current !== null) {
      window.clearTimeout(daysCloseTimer.current);
      daysCloseTimer.current = null;
    }
    setDaysOpen(true);
  };
  const scheduleDaysClose = () => {
    if (daysCloseTimer.current !== null) {
      window.clearTimeout(daysCloseTimer.current);
    }
    daysCloseTimer.current = window.setTimeout(() => {
      setDaysOpen(false);
      daysCloseTimer.current = null;
    }, 150);
  };

  return (
    <header className="sticky top-0 z-[100] isolate border-b border-[var(--rsvp-border-soft)] bg-[rgba(7,4,10,0.92)] backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[78rem] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
        {/* Brand — compact on mobile */}
        <Link
          href="/rsvp"
          className="rsvp-brand-mark shrink-0 !px-3 !py-2 !text-[0.72rem] !tracking-[0.2em] sm:!px-4 sm:!py-2.5 sm:!text-[0.85rem] sm:!tracking-[0.28em]"
          aria-label="Back to event home"
        >
          <span className="sm:hidden">Sin City</span>
          <span className="hidden sm:inline">Dallas · Sin City</span>
        </Link>

        {/* Desktop tabs */}
        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item);
            if (item.children) {
              return (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={openDays}
                  onMouseLeave={scheduleDaysClose}
                >
                  <button
                    type="button"
                    onClick={() => setDaysOpen((v) => !v)}
                    aria-expanded={daysOpen}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                      active
                        ? "bg-gradient-to-r from-[var(--rsvp-pink)] to-[#d3278b] text-white shadow-[0_0_14px_rgba(255,61,154,0.45)]"
                        : "text-[var(--rsvp-ink-dim)] hover:text-[var(--rsvp-ink)]"
                    }`}
                  >
                    {item.label} ▾
                  </button>
                  {daysOpen ? (
                    // Outer wrapper includes a transparent top-padding strip
                    // so there's no dead zone between the button and the
                    // panel — hovering into the gap keeps the menu open.
                    <div
                      className="absolute left-1/2 top-full z-[110] -translate-x-1/2 pt-2"
                      onMouseEnter={openDays}
                      onMouseLeave={scheduleDaysClose}
                    >
                      <div className="flex w-60 flex-col gap-0.5 rounded-2xl border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.98)] p-2 shadow-[0_20px_48px_rgba(0,0,0,0.6)] backdrop-blur-md">
                        {item.children.map((c) => (
                          <Link
                            key={c.href}
                            href={c.href}
                            onClick={() => setDaysOpen(false)}
                            className={`block whitespace-nowrap rounded-xl px-3 py-2 text-sm leading-5 transition ${
                              pathname === c.href
                                ? "bg-[var(--rsvp-pink)]/15 text-[var(--rsvp-pink-soft)]"
                                : "text-[var(--rsvp-ink-dim)] hover:bg-white/5 hover:text-[var(--rsvp-ink)]"
                            }`}
                          >
                            {c.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  active
                    ? "bg-gradient-to-r from-[var(--rsvp-pink)] to-[#d3278b] text-white shadow-[0_0_14px_rgba(255,61,154,0.45)]"
                    : "text-[var(--rsvp-ink-dim)] hover:text-[var(--rsvp-ink)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Auth cluster */}
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          {identity.status === "signed_in" ? (
            <>
              {canEdit ? (
                <>
                  <Link
                    href="/rsvp/admin/rsvps"
                    className="rsvp-btn rsvp-btn-neon px-3 py-1.5 text-xs"
                  >
                    RSVPs
                  </Link>
                  <Link
                    href="/rsvp/admin"
                    className="rsvp-btn rsvp-btn-ghost px-3 py-1.5 text-xs"
                  >
                    Admin
                  </Link>
                </>
              ) : null}
              <span className="hidden items-center gap-2 rounded-full border border-[var(--rsvp-border-soft)] bg-[rgba(10,4,18,0.55)] px-3 py-1.5 text-xs text-[var(--rsvp-ink-dim)] md:inline-flex">
                {identity.identity.photoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={identity.identity.photoUrl}
                    alt=""
                    className="h-5 w-5 rounded-full"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--rsvp-pink)] text-[0.6rem] font-bold text-white"
                  >
                    {(identity.identity.name || identity.identity.email || "?")
                      .trim()
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                )}
                <span className="max-w-[9rem] truncate text-[var(--rsvp-ink)]">
                  {(identity.identity.name || identity.identity.email || "Guest").split(" ")[0]}
                </span>
              </span>
              <button
                type="button"
                onClick={() => void identity.signOutIdentity()}
                className="rsvp-btn rsvp-btn-ghost px-3 py-1.5 text-xs"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/rsvp/rsvp"
              className="rsvp-btn rsvp-btn-primary px-3 py-1.5 text-xs"
            >
              Sign in
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 p-0 transition lg:hidden ${
            mobileOpen
              ? "border-[var(--rsvp-pink)] bg-[var(--rsvp-pink)]/15 text-[var(--rsvp-pink)] shadow-[0_0_14px_rgba(255,61,154,0.5)]"
              : "border-[var(--rsvp-teal)] bg-[rgba(77,225,255,0.12)] text-[var(--rsvp-teal)] shadow-[0_0_10px_rgba(77,225,255,0.35)]"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            aria-hidden="true"
          >
            {mobileOpen ? (
              <>
                <path d="M6 6l12 12" />
                <path d="M18 6L6 18" />
              </>
            ) : (
              <>
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile panel */}
      {mobileOpen ? (
        <div className="border-t border-[var(--rsvp-border-soft)] bg-[rgba(7,4,10,0.95)] px-4 py-4 lg:hidden">
          <div className="mx-auto flex w-full max-w-[78rem] flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <div key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block rounded-xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition ${
                    isActive(pathname, item)
                      ? "bg-[var(--rsvp-pink)]/15 text-[var(--rsvp-pink-soft)]"
                      : "text-[var(--rsvp-ink-dim)] hover:bg-white/5 hover:text-[var(--rsvp-ink)]"
                  }`}
                >
                  {item.label}
                </Link>
                {item.children ? (
                  <div className="ml-3 grid gap-1 border-l border-[var(--rsvp-border-soft)] pl-3">
                    {item.children.map((c) => (
                      <Link
                        key={c.href}
                        href={c.href}
                        onClick={() => setMobileOpen(false)}
                        className={`block rounded-lg px-3 py-2 text-sm transition ${
                          pathname === c.href
                            ? "bg-[var(--rsvp-teal)]/10 text-[var(--rsvp-teal)]"
                            : "text-[var(--rsvp-ink-dim)] hover:bg-white/5 hover:text-[var(--rsvp-ink)]"
                        }`}
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            <div className="mt-3 border-t border-[var(--rsvp-border-soft)] pt-3">
              {identity.status === "signed_in" ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm text-[var(--rsvp-ink)]">
                    {identity.identity.photoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={identity.identity.photoUrl}
                        alt=""
                        className="h-6 w-6 rounded-full"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--rsvp-pink)] text-[0.65rem] font-bold text-white"
                      >
                        {(identity.identity.name || identity.identity.email || "?")
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    )}
                    <span className="truncate">
                      {identity.identity.name || identity.identity.email || "Guest"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canEdit ? (
                      <>
                        <Link
                          href="/rsvp/admin/rsvps"
                          onClick={() => setMobileOpen(false)}
                          className="rsvp-btn rsvp-btn-neon px-3 py-1.5 text-xs"
                        >
                          My RSVPs
                        </Link>
                        <Link
                          href="/rsvp/admin"
                          onClick={() => setMobileOpen(false)}
                          className="rsvp-btn rsvp-btn-ghost px-3 py-1.5 text-xs"
                        >
                          Admin studio
                        </Link>
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        void identity.signOutIdentity();
                        setMobileOpen(false);
                      }}
                      className="rsvp-btn rsvp-btn-ghost px-3 py-1.5 text-xs"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  href="/rsvp/rsvp"
                  onClick={() => setMobileOpen(false)}
                  className="rsvp-btn rsvp-btn-primary w-full px-3 py-2 text-xs"
                >
                  Sign in to RSVP
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
