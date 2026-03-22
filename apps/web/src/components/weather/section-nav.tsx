"use client";

import { useEffect, useState } from "react";

type WeatherSectionTab = {
  label: string;
  href: string;
};

export function WeatherSectionNav({ tabs }: { tabs: readonly WeatherSectionTab[] }) {
  const [activeHref, setActiveHref] = useState<string>(tabs[0]?.href ?? "");

  useEffect(() => {
    const updateFromHash = () => {
      if (window.location.hash) {
        setActiveHref(window.location.hash);
      }
    };

    updateFromHash();
    window.addEventListener("hashchange", updateFromHash);

    return () => {
      window.removeEventListener("hashchange", updateFromHash);
    };
  }, []);

  return (
    <div className="flex min-w-max items-center gap-3 text-white/92">
      {tabs.map((tab) => (
        <button
          key={tab.href}
          type="button"
          className={`border-b-[3px] px-0.5 py-1 text-[0.72rem] font-medium uppercase tracking-[0.18em] transition hover:border-[#f4d24f] hover:text-white ${activeHref === tab.href ? "border-[#f4d24f] text-white" : "border-transparent text-white/84"}`}
          onClick={() => {
            const id = tab.href.replace(/^#/, "");
            const target = document.getElementById(id);

            if (!target) {
              return;
            }

            setActiveHref(tab.href);
            target.scrollIntoView({ behavior: "auto", block: "start" });
            window.history.replaceState(null, "", tab.href);
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
