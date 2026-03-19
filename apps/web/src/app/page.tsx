import Link from "next/link";

import { AuthConsoleCard } from "@/components/auth/auth-console-card";
import { FirebaseSetupPanel } from "@/components/auth/firebase-setup-panel";

export default function Home() {
  const pillars = [
    {
      title: "Identity",
      description:
        "A central home for the Monosyth story, links, writing, and whatever becomes essential over time.",
    },
    {
      title: "Apps",
      description:
        "A launch surface for experiments, client work, product ideas, and niche utilities that deserve their own space.",
    },
    {
      title: "Agents",
      description:
        "An AI-forward workspace built to explore automation, assistants, and practical systems on Google infrastructure.",
    },
  ];

  const tracks = [
    "Brand home and narrative",
    "Product studio and experiments",
    "Client and business prototypes",
    "Firebase-backed auth and data",
  ];

  return (
    <main className="grid-lines min-h-screen px-5 py-6 text-stone-950 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="glass-panel overflow-hidden rounded-[2rem]">
          <div className="flex flex-col gap-12 px-6 py-8 sm:px-10 sm:py-10 lg:grid lg:grid-cols-[1.35fr_0.9fr] lg:gap-10 lg:px-12 lg:py-12">
            <div className="flex flex-col gap-8">
              <div className="flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-[0.28em] text-stone-600">
                <span className="rounded-full border border-stone-900/10 bg-white/70 px-3 py-1">
                  Monosyth since 1997
                </span>
                <span>Scott Waite&apos;s platform</span>
              </div>

              <div className="space-y-6">
                <p className="font-mono text-sm uppercase tracking-[0.32em] text-[var(--ember)]">
                  Brand home. Product lab. App platform.
                </p>
                <h1 className="max-w-4xl text-5xl font-semibold leading-none tracking-[-0.05em] text-balance sm:text-6xl lg:text-7xl">
                  A long-lived identity becoming a launch platform for what comes next.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-stone-700 sm:text-xl">
                  Monosyth is the center of gravity for experiments, products,
                  client builds, and AI-assisted systems running on Google
                  infrastructure. One name. One project space. Room for many
                  ideas.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <a
                  href="#platform"
                  className="rounded-full bg-[var(--pine)] px-6 py-3 text-center text-sm font-medium text-stone-50 transition-transform duration-200 hover:-translate-y-0.5"
                >
                  Build the platform
                </a>
                <Link
                  href="/app"
                  className="rounded-full border border-stone-900/10 bg-white/65 px-6 py-3 text-center text-sm font-medium text-stone-900 transition-colors duration-200 hover:bg-white"
                >
                  Enter /app
                </Link>
              </div>
            </div>

            <AuthConsoleCard />
          </div>
        </section>

        <section
          id="platform"
          className="grid gap-5 lg:grid-cols-[1.05fr_1fr]"
        >
          <div className="glass-panel rounded-[2rem] px-6 py-8 sm:px-8">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--teal)]">
              Foundation
            </p>
            <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              One home for identity, apps, experiments, and client work.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-stone-700">
              The goal is not just a brochure site. This is the root system for
              everything that grows under Monosyth: public pages, authenticated
              tools, business prototypes, and AI agent workflows that can share
              a common platform.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {pillars.map((pillar) => (
              <article
                key={pillar.title}
                className="glass-panel rounded-[1.75rem] px-5 py-6"
              >
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-stone-500">
                  {pillar.title}
                </p>
                <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
                  {pillar.title} first, then scale.
                </h3>
                <p className="mt-3 text-sm leading-7 text-stone-700">
                  {pillar.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <FirebaseSetupPanel />

        <section
          id="tracks"
          className="glass-panel rounded-[2rem] px-6 py-8 sm:px-8 lg:px-10"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--ember)]">
                Next tracks
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                What this repo is ready to grow into.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-stone-600">
              The first version should feel calm and intentional, but the
              platform underneath it is meant for movement.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tracks.map((track) => (
              <div
                key={track}
                className="rounded-2xl border border-stone-900/10 bg-white/70 px-4 py-3 text-sm font-medium text-stone-700"
              >
                {track}
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <article className="rounded-[1.75rem] bg-white/80 px-5 py-6">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-stone-500">
                01
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
                Main site
              </h3>
              <p className="mt-3 text-sm leading-7 text-stone-700">
                A polished home for the Monosyth brand, story, links, and
                future product entry points.
              </p>
            </article>
            <article className="rounded-[1.75rem] bg-stone-950 px-5 py-6 text-stone-50">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-stone-400">
                02
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
                Authenticated apps
              </h3>
              <p className="mt-3 text-sm leading-7 text-stone-300">
                Shared Firebase Auth, shared data services, and space for tools
                that support people, businesses, or your own workflows.
              </p>
            </article>
            <article className="rounded-[1.75rem] bg-[var(--pine)] px-5 py-6 text-stone-50">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-stone-300">
                03
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
                Mobile later
              </h3>
              <p className="mt-3 text-sm leading-7 text-stone-100/90">
                When the time comes, the React and Firebase stack makes it much
                easier to expand into React Native without restarting from zero.
              </p>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
