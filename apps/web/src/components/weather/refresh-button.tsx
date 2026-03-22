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
      className="border border-white/30 px-4 py-2 text-sm font-medium uppercase tracking-[0.16em] text-white transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-70"
    >
      {isPending ? "Refreshing..." : "Refresh"}
    </button>
  );
}
