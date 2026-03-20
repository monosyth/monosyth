import Link from "next/link";

import { RefreshButton } from "@/components/weather/refresh-button";
import { getWeatherPageData } from "@/lib/weather/ambient";
import { buildWeatherStory } from "@/lib/weather/story";
import type { WeatherSeries } from "@/lib/weather/types";

export const dynamic = "force-dynamic";

const toneClasses = {
  gold: {
    badge: "bg-amber-100 text-amber-950",
    glow: "from-amber-300/60 via-orange-200/45 to-transparent",
    meter: "from-amber-400 to-orange-500",
    panel: "border-amber-200/80 bg-amber-50/70",
    wash: "from-amber-100/90 via-orange-50/70 to-white/70",
  },
  sky: {
    badge: "bg-sky-100 text-sky-950",
    glow: "from-sky-300/55 via-cyan-200/45 to-transparent",
    meter: "from-sky-400 to-cyan-500",
    panel: "border-sky-200/80 bg-sky-50/70",
    wash: "from-sky-100/90 via-cyan-50/70 to-white/70",
  },
  rain: {
    badge: "bg-blue-100 text-blue-950",
    glow: "from-blue-300/55 via-indigo-200/45 to-transparent",
    meter: "from-blue-500 to-indigo-600",
    panel: "border-blue-200/80 bg-blue-50/70",
    wash: "from-blue-100/90 via-indigo-50/70 to-white/70",
  },
  pine: {
    badge: "bg-emerald-100 text-emerald-950",
    glow: "from-emerald-300/50 via-teal-200/40 to-transparent",
    meter: "from-emerald-500 to-teal-600",
    panel: "border-emerald-200/80 bg-emerald-50/70",
    wash: "from-emerald-100/90 via-teal-50/70 to-white/70",
  },
} as const;

export default async function WeatherPage() {
  const result = await getWeatherPageData();

  if (result.state !== "ready") {
    return <WeatherErrorState result={result} />;
  }

  const story = buildWeatherStory(result.data);
  const heroTone = toneClasses[story.mood.tone];

  return (
    <main className="grid-lines relative min-h-screen overflow-hidden px-5 py-6 text-stone-950 sm:px-8 lg:px-12">
      <div className="weather-drift pointer-events-none absolute left-[-8rem] top-8 h-72 w-72 rounded-full bg-amber-300/20 blur-3xl" />
      <div className="weather-float pointer-events-none absolute right-[-5rem] top-24 h-80 w-80 rounded-full bg-sky-300/20 blur-3xl" />
      <div className="weather-drift pointer-events-none absolute bottom-24 left-1/3 h-72 w-72 rounded-full bg-emerald-300/15 blur-3xl" />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="glass-panel relative overflow-hidden rounded-[2rem] bg-white/85 p-7 sm:p-10">
          <div
            className={`weather-glow pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-br ${heroTone.glow}`}
          />
          <div className="weather-drift pointer-events-none absolute right-[-3rem] top-[-3rem] h-40 w-40 rounded-full border border-white/40 bg-white/20" />
          <div className="pointer-events-none absolute left-1/2 top-20 h-px w-48 -translate-x-1/2 bg-white/40" />
          <div className="relative flex flex-col gap-10 lg:grid lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] ${heroTone.badge}`}
                >
                  Outside right now
                </span>
                <span className="text-xs font-medium uppercase tracking-[0.22em] text-stone-500">
                  Updated {story.mood.stamp}
                </span>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium uppercase tracking-[0.22em] text-stone-500">
                  Ambient Weather on Monosyth
                </p>
                <h1 className="max-w-4xl text-5xl font-semibold leading-none tracking-[-0.08em] text-balance sm:text-6xl lg:text-7xl">
                  {story.mood.title}
                </h1>
                <p className="max-w-3xl text-base leading-7 text-stone-600 sm:text-lg">
                  {story.mood.subtitle}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {story.mood.chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-white/80 bg-white/75 px-4 py-2 text-sm font-medium text-stone-700 shadow-sm"
                  >
                    {chip}
                  </span>
                ))}
              </div>

              {result.notice ? (
                <div className="rounded-[1.4rem] border border-amber-200/80 bg-amber-50/85 px-4 py-3 text-sm leading-6 text-amber-950">
                  {result.notice}
                </div>
              ) : null}
            </div>

            <div className="grid gap-4">
              <article
                className={`relative overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br p-6 shadow-sm ${heroTone.wash}`}
              >
                <div className="pointer-events-none absolute inset-x-6 top-6 h-32 rounded-[1.6rem] bg-white/35" />
                <div className="relative grid gap-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                        Current feel
                      </p>
                      <p className="mt-3 text-5xl font-semibold tracking-[-0.08em] text-stone-950">
                        {story.mood.temperatureDisplay}
                      </p>
                    </div>
                    <div
                      className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${heroTone.badge}`}
                    >
                      Live station
                    </div>
                  </div>

                  <WeatherPostcard
                    temperature={story.mood.temperatureDisplay}
                    tone={story.mood.tone}
                    subtitle={buildSummary(
                      result.data.station.location,
                      result.data.observationCount,
                    )}
                  />
                </div>
              </article>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/"
                  className="rounded-full border border-stone-300/80 bg-white/80 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-950 hover:text-stone-950"
                >
                  Back Home
                </Link>
                <RefreshButton />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {story.categories.map((category) => {
            const tone = toneClasses[category.tone];

            return (
              <article
                key={category.id}
                className={`glass-panel group weather-float relative overflow-hidden rounded-[1.9rem] border p-5 transition duration-300 hover:-translate-y-1 ${tone.panel}`}
              >
                <div className="pointer-events-none absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/35 blur-2xl" />
                <div className="pointer-events-none absolute bottom-3 right-4 text-6xl font-semibold tracking-[-0.08em] text-white/35">
                  {category.id.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                      {category.eyebrow}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-stone-950">
                      {category.title}
                    </h2>
                  </div>
                  <div className="relative h-16 w-16 rounded-full border border-white/80 bg-white/60">
                    <div
                      className={`absolute inset-3 rounded-full bg-gradient-to-br transition duration-300 group-hover:scale-110 ${tone.glow}`}
                    />
                  </div>
                </div>

                <p className="mt-4 text-3xl font-semibold tracking-[-0.08em] text-stone-950">
                  {category.value}
                </p>
                <p className="mt-3 min-h-16 text-sm leading-6 text-stone-600">
                  {category.summary}
                </p>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
                    <span>{category.meterLabel}</span>
                    <span>{Math.round(category.meterValue)}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/70">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${tone.meter}`}
                      style={{ width: `${category.meterValue}%` }}
                    />
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  {category.details.map((detail) => (
                    <p
                      key={detail}
                      className="rounded-full border border-white/80 bg-white/70 px-3 py-2 text-sm text-stone-700"
                    >
                      {detail}
                    </p>
                  ))}
                </div>
              </article>
            );
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <article className="glass-panel rounded-[2rem] bg-white/82 p-6 sm:p-7">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
              Out the door
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-stone-950">
              What to wear and what the day suits
            </h2>

            <div className="mt-6 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <article
                className={`relative overflow-hidden rounded-[1.8rem] border p-5 ${toneClasses[story.outfit.tone].panel}`}
              >
                <div className="pointer-events-none absolute -left-10 top-8 h-28 w-28 rounded-full bg-white/30 blur-2xl" />
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                  Wear suggestion
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-stone-950">
                  {story.outfit.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-stone-600">
                  {story.outfit.summary}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {story.outfit.pieces.map((piece) => (
                    <span
                      key={piece}
                      className="rotate-[-1deg] rounded-2xl border border-white/80 bg-white/75 px-4 py-2 text-sm font-medium text-stone-700 shadow-sm odd:rotate-[1.5deg]"
                    >
                      {piece}
                    </span>
                  ))}
                </div>
              </article>

              <div className="grid gap-4">
                {story.activity.map((item) => {
                  const tone = toneClasses[item.tone];

                  return (
                    <article
                      key={item.title}
                      className={`relative overflow-hidden rounded-[1.5rem] border p-4 ${tone.panel}`}
                    >
                      <div className="pointer-events-none absolute -right-6 top-3 h-16 w-16 rounded-full bg-white/30 blur-xl" />
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-lg font-semibold tracking-[-0.04em] text-stone-950">
                          {item.title}
                        </p>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${tone.badge}`}
                        >
                          {item.verdict}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-stone-600">
                        {item.summary}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>
          </article>

          <article className="glass-panel rounded-[2rem] bg-white/82 p-6 sm:p-7">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
              Weather toys
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-stone-950">
              Wind compass and rain jar
            </h2>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <article
                className={`relative overflow-hidden rounded-[1.8rem] border p-5 ${toneClasses[story.visuals.wind.tone].panel}`}
              >
                <div className="pointer-events-none absolute inset-x-4 top-4 h-16 rounded-full bg-white/20 blur-2xl" />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                      Wind compass
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-stone-950">
                      {story.visuals.wind.directionLabel}
                    </h3>
                  </div>
                  <div className="text-right text-sm text-stone-600">
                    <p>{story.visuals.wind.speedLabel}</p>
                    <p className="mt-1">Gust {story.visuals.wind.gustLabel}</p>
                  </div>
                </div>

                <div className="mt-6 flex justify-center">
                  <div className="relative h-44 w-44 rounded-full border border-white/80 bg-white/70 shadow-inner">
                    <div className="absolute inset-3 rounded-full border border-dashed border-stone-300/80" />
                    <div className="absolute inset-7 rounded-full border border-white/60" />
                    <div className="absolute left-1/2 top-2 -translate-x-1/2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                      N
                    </div>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                      S
                    </div>
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                      W
                    </div>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                      E
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="weather-bob relative h-28 w-4 origin-center transition-transform duration-700"
                        style={{
                          transform: `rotate(${story.visuals.wind.directionDegrees ?? 0}deg)`,
                        }}
                      >
                        <div className="absolute inset-x-0 bottom-2 top-8 rounded-full bg-sky-200/80" />
                        <div className="absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 border-x-[12px] border-b-[24px] border-x-transparent border-b-sky-600" />
                      </div>
                    </div>
                    <div className="weather-glow absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-stone-950 shadow-[0_0_0_8px_rgba(255,255,255,0.55)]" />
                  </div>
                </div>
              </article>

              <article
                className={`relative overflow-hidden rounded-[1.8rem] border p-5 ${toneClasses[story.visuals.rain.tone].panel}`}
              >
                <div className="pointer-events-none absolute right-3 top-3 h-20 w-20 rounded-full bg-white/25 blur-2xl" />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                      Rain jar
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-stone-950">
                      {story.visuals.rain.label}
                    </h3>
                  </div>
                  <p className="text-sm text-stone-600">{story.visuals.rain.subtext}</p>
                </div>

                <div className="mt-6 flex items-end justify-center gap-5">
                  <div className="relative h-44 w-28 overflow-hidden rounded-[2rem] border border-white/80 bg-white/70 shadow-inner">
                    <div className="weather-glow absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-blue-500/85 via-cyan-400/70 to-cyan-200/40" style={{ height: `${story.visuals.rain.fillPercent}%` }} />
                    <div className="absolute inset-x-0 bottom-0 h-full bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.45),transparent_35%)]" style={{ height: `${story.visuals.rain.fillPercent}%` }} />
                    <div className="absolute inset-x-0 top-5 h-px bg-white/70" />
                    <div className="absolute inset-x-0 top-11 h-px bg-white/50" />
                    <div className="absolute inset-x-0 top-[4.25rem] h-px bg-white/40" />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-center pb-4">
                      <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-stone-700">
                        {Math.round(story.visuals.rain.fillPercent)}%
                      </span>
                    </div>
                  </div>
                  <div className="max-w-[11rem] space-y-3 text-sm leading-6 text-stone-600">
                    <p>The jar rises as daily rain builds, so even non-technical viewers can feel the difference between dry, trace, and genuinely wet.</p>
                    <p className="font-medium text-stone-800">{story.visuals.rain.subtext}</p>
                  </div>
                </div>
              </article>
            </div>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <article className="glass-panel rounded-[2rem] bg-white/82 p-6 sm:p-7">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
              What changed recently
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-stone-950">
              The day in plain language
            </h2>
            <div className="mt-6 grid gap-4">
              {story.changes.map((change) => {
                const tone = toneClasses[change.tone];

                return (
                  <article
                    key={change.title}
                    className={`relative overflow-hidden rounded-[1.6rem] border p-4 ${tone.panel}`}
                  >
                    <div className="pointer-events-none absolute right-3 top-3 h-12 w-12 rounded-full bg-white/30 blur-xl" />
                    <p className="text-sm font-semibold text-stone-950">
                      {change.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      {change.summary}
                    </p>
                  </article>
                );
              })}
            </div>
          </article>

          <article className="glass-panel rounded-[2rem] bg-white/82 p-6 sm:p-7">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                  Weather motion
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-stone-950">
                  Shape of the last readings
                </h2>
              </div>
              <p className="text-sm text-stone-500">
                Station {result.data.station.macAddress}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {result.data.series.map((series) => (
                <WeatherChartCard key={series.id} series={series} />
              ))}
            </div>
          </article>
        </section>

        <details className="glass-panel rounded-[2rem] bg-white/82 p-6 sm:p-7">
          <summary className="cursor-pointer list-none">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                  Advanced view
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-stone-950">
                  Open the technical station details
                </h2>
              </div>
              <p className="text-sm text-stone-500">
                Raw payload, sensor keys, and exact values
              </p>
            </div>
          </summary>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {result.data.snapshot.map((item) => (
              <article
                key={item.key}
                className="rounded-[1.4rem] border border-stone-200/80 bg-white/70 p-4"
              >
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-stone-500">
                  {item.key}
                </p>
                <p className="mt-2 break-words text-sm leading-6 text-stone-700">
                  {item.value}
                </p>
              </article>
            ))}
          </div>
        </details>
      </div>
    </main>
  );
}

function WeatherErrorState({
  result,
}: {
  result: Exclude<Awaited<ReturnType<typeof getWeatherPageData>>, { state: "ready" }>;
}) {
  return (
    <main className="grid-lines min-h-screen px-5 py-6 text-stone-950 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="glass-panel rounded-[2rem] bg-white/85 p-7 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                Weather setup
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.08em] text-balance text-stone-950 sm:text-5xl">
                {result.state === "missing-config"
                  ? "The weather route is almost ready."
                  : "Ambient Weather responded, but not in a useful way."}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-stone-600 sm:text-lg">
                {result.message}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-full border border-stone-300/80 bg-white/80 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-950 hover:text-stone-950"
              >
                Back Home
              </Link>
              <RefreshButton />
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <StoryFallbackCard
              title="Route"
              value="/weather"
              body="The public route is live and server-rendered."
            />
            <StoryFallbackCard
              title="Runtime"
              value="Server-side"
              body="Your Ambient keys remain on the server."
            />
            <StoryFallbackCard
              title="Next step"
              value={
                result.state === "missing-config"
                  ? "Finish config"
                  : "Wait out rate limits"
              }
              body={
                result.state === "missing-config"
                  ? "Add the missing Ambient value listed below."
                  : "Refresh after Ambient allows another request."
              }
            />
          </div>

          {result.state === "missing-config" ? (
            <div className="mt-6 flex flex-wrap gap-3">
              {result.missing.map((key) => (
                <span
                  key={key}
                  className="rounded-full border border-stone-300 bg-stone-50 px-4 py-2 font-mono text-sm text-stone-700"
                >
                  {key}
                </span>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function StoryFallbackCard({
  title,
  value,
  body,
}: {
  title: string;
  value: string;
  body: string;
}) {
  return (
    <article className="rounded-[1.5rem] border border-stone-200/80 bg-stone-50/75 p-4">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
        {title}
      </p>
      <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-stone-950">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-stone-600">{body}</p>
    </article>
  );
}

function buildSummary(location: string, observationCount: number) {
  const locationPrefix = location ? `${location}. ` : "";
  return `${locationPrefix}${observationCount} recent observations are shaping this more visual weather story.`;
}

function WeatherPostcard({
  temperature,
  tone,
  subtitle,
}: {
  temperature: string;
  tone: keyof typeof toneClasses;
  subtitle: string;
}) {
  const accent = toneClasses[tone];

  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="weather-float rounded-[1.8rem] border border-white/80 bg-white/70 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-stone-500">
              Weather postcard
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.08em] text-stone-950">
              {temperature}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${accent.badge}`}
          >
            live
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-stone-600">{subtitle}</p>
      </div>

      <div className={`relative min-h-44 overflow-hidden rounded-[1.8rem] border border-white/80 bg-gradient-to-br ${accent.wash}`}>
        <div className="absolute inset-x-0 bottom-0 h-20 rounded-t-[45%] bg-emerald-950/12" />
        <div className="absolute inset-x-4 bottom-0 h-16 rounded-t-[40%] bg-emerald-800/18" />
        <div className="weather-glow absolute left-6 top-6 h-14 w-14 rounded-full bg-white/65 shadow-[0_0_50px_rgba(255,255,255,0.65)]" />
        {tone === "rain" ? (
          <>
            <div className="weather-drift absolute left-8 top-8 h-10 w-24 rounded-full bg-white/70" />
            <div className="weather-drift absolute left-16 top-14 h-8 w-20 rounded-full bg-white/55" />
            <div className="weather-rain absolute left-10 top-24 h-8 w-px bg-blue-500/60" />
            <div className="weather-rain absolute left-20 top-28 h-10 w-px bg-blue-500/50 [animation-delay:0.25s]" />
            <div className="weather-rain absolute left-28 top-22 h-8 w-px bg-blue-500/60 [animation-delay:0.5s]" />
            <div className="weather-rain absolute left-36 top-30 h-9 w-px bg-blue-500/50 [animation-delay:0.75s]" />
          </>
        ) : null}
        {tone === "sky" ? (
          <>
            <div className="weather-drift absolute right-6 top-10 h-16 w-16 rounded-full border border-sky-200/70 bg-sky-100/40" />
            <div className="weather-float absolute right-10 top-14 h-8 w-8 rounded-full bg-sky-300/50" />
          </>
        ) : null}
        {tone === "gold" ? (
          <div className="weather-glow absolute right-8 top-8 h-20 w-20 rounded-full bg-amber-300/65 shadow-[0_0_60px_rgba(251,191,36,0.55)]" />
        ) : null}
        {tone === "pine" ? (
          <>
            <div className="weather-float absolute right-8 top-12 h-12 w-12 rounded-full bg-emerald-200/40" />
            <div className="weather-drift absolute right-16 top-8 h-6 w-24 rounded-full bg-white/40" />
          </>
        ) : null}
        <div className="weather-bob absolute bottom-4 left-5 rounded-full bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-700">
          outside now
        </div>
      </div>
    </div>
  );
}

function WeatherChartCard({ series }: { series: WeatherSeries }) {
  const width = 320;
  const height = 124;
  const span = series.max - series.min || 1;
  const points = series.points.map((point, index) => {
    const x = (index / Math.max(series.points.length - 1, 1)) * width;
    const y = height - ((point.value - series.min) / span) * (height - 12) - 6;
    return { x, y };
  });

  const linePath = points
    .map((point, index) =>
      `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
    )
    .join(" ");
  const fillPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return (
    <article className="rounded-[1.5rem] border border-stone-200/80 bg-stone-50/75 p-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-stone-950">{series.label}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.22em] text-stone-500">
            {formatSeriesRange(series)}
          </p>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${series.label} trend`}
        className="mt-4 h-32 w-full overflow-visible"
      >
        <line
          x1="0"
          y1={height}
          x2={width}
          y2={height}
          className="stroke-stone-300"
          strokeWidth="1"
        />
        <path d={fillPath} className="fill-teal-500/12" />
        <path
          d={linePath}
          className="stroke-teal-700"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>

      <div className="mt-3 flex justify-between gap-3 text-xs text-stone-500">
        <span>{series.points[0]?.label}</span>
        <span>{series.points.at(-1)?.label}</span>
      </div>
    </article>
  );
}

function formatSeriesRange(series: WeatherSeries) {
  return `${formatCompact(series.min, series.decimals)} to ${formatCompact(
    series.max,
    series.decimals,
  )} ${series.unit}`.trim();
}

function formatCompact(value: number, decimals: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}
