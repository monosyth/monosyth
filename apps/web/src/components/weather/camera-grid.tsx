"use client";

import { useState } from "react";

import type { WeatherCamera } from "@/lib/weather/cameras";

export function WeatherCameraGrid({
  items,
}: {
  items: ReadonlyArray<WeatherCamera>;
}) {
  const [failedIds, setFailedIds] = useState<Record<string, boolean>>({});

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => {
        const hasFailed = failedIds[item.id] ?? false;

        return (
          <a
            key={item.href}
            href={item.href}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden border border-stone-200 bg-white transition hover:border-stone-400"
          >
            {!hasFailed ? (
              <div className="aspect-[16/10] overflow-hidden bg-stone-100">
                {/* Live traffic snapshots come from external camera feeds, so a plain img avoids optimizer rewrites. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/weather/camera?id=${encodeURIComponent(item.id)}`}
                  alt={`${item.label} current traffic camera view`}
                  loading="lazy"
                  className="h-full w-full object-cover"
                  onError={() =>
                    setFailedIds((current) => ({
                      ...current,
                      [item.id]: true,
                    }))
                  }
                />
              </div>
            ) : (
              <div className="flex min-h-[7.5rem] items-center justify-between gap-4 border-b border-stone-200 bg-stone-50 px-4 py-4">
                <div>
                  <p className="text-[0.68rem] uppercase tracking-[0.16em] text-stone-500">
                    Live preview unavailable
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    Open the camera page for the current image.
                  </p>
                </div>
                <span className="shrink-0 border border-stone-300 bg-white px-3 py-1.5 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-stone-700">
                  Open camera
                </span>
              </div>
            )}
            <div className="px-3 py-2.5">
              <p className="text-sm font-medium text-stone-800">{item.label}</p>
              <p className="mt-1 text-xs leading-5 text-stone-500">{item.note}</p>
            </div>
          </a>
        );
      })}
    </div>
  );
}
