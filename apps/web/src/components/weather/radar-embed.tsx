"use client";

import { useState } from "react";

type RadarEmbedProps = {
  src: string;
  title: string;
};

export function RadarEmbed({ src, title }: RadarEmbedProps) {
  const [isInteractive, setIsInteractive] = useState(false);

  return (
    <div
      className="relative overflow-hidden border border-stone-200 bg-white"
      onPointerLeave={() => {
        setIsInteractive(false);
      }}
    >
      {isInteractive ? (
        <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-full bg-stone-950/72 px-3 py-1.5 text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-white shadow-sm">
          Move off the map to resume page scrolling
        </div>
      ) : (
        <button
          type="button"
          className="absolute inset-0 z-10 flex items-center justify-center bg-stone-950/6 backdrop-blur-[1px] transition hover:bg-stone-950/10"
          onClick={() => {
            setIsInteractive(true);
          }}
          aria-label="Enable radar map interaction"
        >
          <span className="rounded-full border border-white/80 bg-white/92 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-stone-700 shadow-sm">
            Click to interact with radar
          </span>
        </button>
      )}

      <iframe title={title} src={src} className="h-[640px] w-full" loading="lazy" />
    </div>
  );
}
