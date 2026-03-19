import Link from "next/link";

import { AuthConsoleCard } from "@/components/auth/auth-console-card";

export default function Home() {
  const pillars = [
    {
      title: "Identity",
      description:
        "A long-held name with history behind it, finally getting a proper home on the web.",
    },
    {
      title: "Work",
      description:
        "A platform for client projects, internal tools, and practical systems that need to be built with care.",
    },
    {
      title: "Experiments",
      description:
        "A place to test product ideas, AI agents, strange utilities, and whatever earns a future here.",
    },
  ];

  const currents = [
    "Private app workspace",
    "Profile and identity system",
    "Tools for people and businesses",
    "AI-assisted product experiments",
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
                  Identity site. Studio root. Digital base.
                </p>
                <h1 className="max-w-4xl text-5xl font-semibold leading-none tracking-[-0.05em] text-balance sm:text-6xl lg:text-7xl">
                  Monosyth is Scott Waite&apos;s long-running online identity,
                  now becoming the home base for what gets built next.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-stone-700 sm:text-xl">
                  I&apos;ve used Monosyth since 1997. This site is where that
                  name starts to gather more weight: personal history, client
                  work, product ideas, and a private app layer for the tools
                  that grow out of it.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <a
                  href="#about"
                  className="rounded-full bg-[var(--pine)] px-6 py-3 text-center text-sm font-medium text-stone-50 transition-transform duration-200 hover:-translate-y-0.5"
                >
                  Read the origin
                </a>
                <Link
                  href="/app"
                  className="rounded-full border border-stone-900/10 bg-white/65 px-6 py-3 text-center text-sm font-medium text-stone-900 transition-colors duration-200 hover:bg-white"
                >
                  Enter the studio
                </Link>
              </div>
            </div>

            <AuthConsoleCard />
          </div>
        </section>

        <section
          id="about"
          className="grid gap-5 lg:grid-cols-[1.05fr_1fr]"
        >
          <div className="glass-panel rounded-[2rem] px-6 py-8 sm:px-8">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--teal)]">
              About
            </p>
            <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              This is not a rebrand. It&apos;s the same name, built out with
              more intention.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-stone-700">
              Monosyth has followed me across decades of usernames, logins,
              forums, projects, and conversations. Now it gets to be something
              more permanent: a site with a point of view, a place to publish,
              and a root domain for tools, products, and client work that live
              under the same banner.
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
                <p className="mt-3 text-sm leading-7 text-stone-700">
                  {pillar.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="current"
          className="glass-panel rounded-[2rem] px-6 py-8 sm:px-8 lg:px-10"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--ember)]">
                Current direction
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                A quieter front page, with real infrastructure underneath it.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-stone-600">
              The visible site can stay simple. Under it, Monosyth can keep
              growing into a private workspace, a public identity surface, and a
              launch point for useful things.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {currents.map((track) => (
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
                Public side
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
                The front door
              </h3>
              <p className="mt-3 text-sm leading-7 text-stone-700">
                A clean home for the name itself, with enough shape and voice to
                feel like a real place instead of a temporary landing page.
              </p>
            </article>
            <article className="rounded-[1.75rem] bg-stone-950 px-5 py-6 text-stone-50">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-stone-400">
                Private side
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
                The working layer
              </h3>
              <p className="mt-3 text-sm leading-7 text-stone-300">
                A signed-in studio for profiles, internal tools, experiments,
                and future applications that deserve their own lanes.
              </p>
            </article>
            <article className="rounded-[1.75rem] bg-[var(--pine)] px-5 py-6 text-stone-50">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-stone-300">
                Long game
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
                Built to last
              </h3>
              <p className="mt-3 text-sm leading-7 text-stone-100/90">
                The goal is a durable platform that can absorb new projects,
                products, and experiments without losing the identity at the
                center of it.
              </p>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
