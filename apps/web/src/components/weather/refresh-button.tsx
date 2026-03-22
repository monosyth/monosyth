"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        startTransition(() => {
          router.refresh();
        });
      }}
      disabled={isPending}
      className="rounded-full border border-white/35 bg-white/12 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/22 disabled:cursor-wait disabled:opacity-70"
    >
      {isPending ? "Refreshing..." : "Refresh"}
    </button>
  );
}
