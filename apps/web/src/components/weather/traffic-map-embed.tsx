"use client";

import { useState } from "react";

export function TrafficMapEmbed({ title, src }: { title: string; src: string }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);

  if (!isLoaded) {
    return (
      <div className="flex h-[320px] items-center justify-center bg-stone-100 px-6 text-center md:h-[430px]">
        <div>
          <p className="text-sm leading-6 text-stone-600">
            The live traveler map is deferred so its third-party scripts do not slow the camera photos.
          </p>
          <button
            type="button"
            className="mt-4 min-h-11 border border-stone-300 bg-white px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-stone-700 hover:border-teal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
            onClick={() => {
              setIsLoaded(true);
            }}
          >
            Load traffic map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative h-[320px] md:h-[430px]"
      onPointerLeave={() => {
        setIsInteractive(false);
      }}
    >
      {!isInteractive ? (
        <button
          type="button"
          className="absolute inset-0 z-10 flex items-center justify-center bg-stone-950/6 backdrop-blur-[1px] transition hover:bg-stone-950/10"
          onClick={() => {
            setIsInteractive(true);
          }}
          aria-label={`Enable ${title} interaction`}
        >
          <span className="rounded-full border border-white/80 bg-white/92 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-stone-700 shadow-sm">
            Click to interact
          </span>
        </button>
      ) : (
        <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-full bg-stone-950/72 px-3 py-1.5 text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-white shadow-sm">
          Move off the map to resume page scrolling
        </div>
      )}

      <iframe title={title} src={src} loading="lazy" className="h-full w-full" />
    </div>
  );
}
