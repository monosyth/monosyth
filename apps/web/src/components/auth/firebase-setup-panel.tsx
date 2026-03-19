import Link from "next/link";

export function FirebaseSetupPanel() {
  return (
    <section className="glass-panel rounded-[2rem] px-6 py-8 sm:px-8 lg:px-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--teal)]">
            Firebase setup
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Turn the placeholder into a real signed-in platform.
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-7 text-stone-600">
          The app is ready for Firebase Auth. It just needs the public web app
          config and a provider enabled in the console.
        </p>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <article className="rounded-[1.75rem] bg-white/80 px-5 py-6">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-stone-500">
            01
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
            Add keys
          </h3>
          <p className="mt-3 text-sm leading-7 text-stone-700">
            Copy your Firebase web app config into `apps/web/.env.local` using
            the template in `.env.example`.
          </p>
        </article>
        <article className="rounded-[1.75rem] bg-stone-950 px-5 py-6 text-stone-50">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-stone-400">
            02
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
            Enable Google Auth
          </h3>
          <p className="mt-3 text-sm leading-7 text-stone-300">
            In Firebase Auth, enable the Google provider so sign-in works in the
            app immediately.
          </p>
        </article>
        <article className="rounded-[1.75rem] bg-[var(--pine)] px-5 py-6 text-stone-50">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-stone-300">
            03
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
            Visit the app shell
          </h3>
          <p className="mt-3 text-sm leading-7 text-stone-100/90">
            Once the keys are in place, the new `/app` route becomes the first
            private space for future tools.
          </p>
        </article>
      </div>

      <div className="mt-6">
        <Link
          href="/app"
          className="inline-flex rounded-full border border-stone-900/10 bg-white px-5 py-3 text-sm font-medium text-stone-900 transition hover:bg-stone-50"
        >
          Explore the app shell
        </Link>
      </div>
    </section>
  );
}
