import { AuthConsoleCard } from "@/components/auth/auth-console-card";

export default function Home() {
  return (
    <main className="grid-lines min-h-screen px-5 py-6 text-stone-950 sm:px-8 lg:px-12">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl items-center justify-center">
        <section className="glass-panel w-full overflow-hidden rounded-[2rem] bg-white/85">
          <div className="grid gap-10 px-8 py-10 sm:px-12 sm:py-12 lg:grid-cols-[1.35fr_0.95fr] lg:items-center lg:px-16 lg:py-16">
            <div className="flex flex-col gap-8">
              <h1 className="text-6xl font-semibold leading-none tracking-[-0.08em] text-balance sm:text-7xl lg:text-8xl">
                monosyth
              </h1>

              <div className="max-w-xl space-y-4">
                <p className="text-base leading-7 text-stone-700 sm:text-lg">
                  Monosyth is a simple home for events, tools, and services
                  that are reached through direct links and sign-in.
                </p>
                <p className="text-sm leading-7 text-stone-500 sm:text-base">
                  The public page stays intentionally minimal. Use your direct
                  link or sign in to continue.
                </p>
              </div>
            </div>

            <AuthConsoleCard />
          </div>
        </section>
      </div>
    </main>
  );
}
