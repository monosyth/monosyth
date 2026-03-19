import { AuthConsoleCard } from "@/components/auth/auth-console-card";

export default function Home() {
  return (
    <main className="grid-lines min-h-screen px-5 py-6 text-stone-950 sm:px-8 lg:px-12">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-4xl items-center justify-center">
        <AuthConsoleCard />
      </div>
    </main>
  );
}
