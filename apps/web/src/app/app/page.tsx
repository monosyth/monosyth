import { AppShell } from "@/components/app/app-shell";

export default function AppPage() {
  return (
    <main className="grid-lines min-h-screen px-5 py-6 text-stone-950 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <AppShell />
      </div>
    </main>
  );
}
