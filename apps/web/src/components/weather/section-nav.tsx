"use client";

type WeatherSectionTab = {
  label: string;
  href: string;
};

export function WeatherSectionNav({ tabs }: { tabs: readonly WeatherSectionTab[] }) {
  return (
    <div className="flex min-w-max items-center gap-5 text-white/92">
      {tabs.map((tab) => (
        <button
          key={tab.href}
          type="button"
          className="border-b-4 border-transparent pb-3 text-lg font-light transition hover:border-[#f4d24f] hover:text-white"
          onClick={() => {
            const id = tab.href.replace(/^#/, "");
            const target = document.getElementById(id);

            if (!target) {
              return;
            }

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
