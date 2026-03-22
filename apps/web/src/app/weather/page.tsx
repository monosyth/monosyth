import Link from "next/link";

import { RefreshButton } from "@/components/weather/refresh-button";
import { StationExplorer } from "@/components/weather/station-explorer";
import { getWeatherPageData } from "@/lib/weather/ambient";
import { formatWeatherDateTime } from "@/lib/weather/time";
import type {
  WeatherForecastPeriod,
  WeatherMetric,
  WeatherObservation,
  WeatherPageData,
} from "@/lib/weather/types";

export const dynamic = "force-dynamic";

const metricCardClasses = {
  temperature: "border-amber-200/80 bg-amber-50/85 text-amber-950",
  humidity: "border-cyan-200/80 bg-cyan-50/85 text-cyan-950",
  wind: "border-sky-200/80 bg-sky-50/85 text-sky-950",
  pressure: "border-emerald-200/80 bg-emerald-50/85 text-emerald-950",
  rainToday: "border-blue-200/80 bg-blue-50/85 text-blue-950",
  fallback: "border-stone-200/80 bg-stone-50/85 text-stone-950",
} as const;

export default async function WeatherPage() {
  const result = await getWeatherPageData();

  if (result.state !== "ready") {
    return <WeatherState result={result} />;
  }

  const { data, notice } = result;
  const latest = data.observations.at(-1) ?? null;
  const headline = buildHeadline(data.metrics, latest);
  const primaryMetrics = pickPrimaryMetrics(data.metrics);
  const highlights = data.highlights.slice(0, 5);
  const supportingFacts = buildSupportingFacts(data, latest);
  const forecastPeriods = data.forecast.slice(0, 6);

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-6 text-stone-950 sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,201,93,0.18),transparent_22%),radial-gradient(circle_at_88%_12%,rgba(11,110,105,0.18),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.42),transparent_65%)]" />
      <div className="weather-drift pointer-events-none absolute left-[-8rem] top-10 h-72 w-72 rounded-full bg-amber-300/15 blur-3xl" />
      <div className="weather-drift pointer-events-none absolute right-[-6rem] top-20 h-80 w-80 rounded-full bg-sky-300/15 blur-3xl" />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="glass-panel relative overflow-hidden rounded-[2rem] bg-white/84 p-6 sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-br from-white/80 via-white/10 to-transparent" />
          <div className="relative grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-stretch">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-stone-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white">
                  Live weather dashboard
                </span>
                <span className="rounded-full border border-stone-200/80 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-600">
                  Updated {formatWeatherDateTime(data.fetchedAt)}
                </span>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-stone-500">
                  {data.station.name}
                </p>
                <h1 className="max-w-4xl text-4xl font-semibold leading-none tracking-[-0.07em] text-balance sm:text-5xl lg:text-6xl">
                  {headline.title}
                </h1>
                <p className="max-w-3xl text-base leading-7 text-stone-600 sm:text-lg">
                  {headline.subtitle}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <InfoPill label="Location" value={data.station.location || "Station location not labeled"} />
                <InfoPill
                  label="Coverage"
                  value={describeCoverage(data.timeRange.startAt, data.timeRange.endAt)}
                />
                <InfoPill
                  label="Samples"
                  value={`${data.observationCount} recent observations`}
                />
              </div>

              {notice ? (
                <div className="rounded-[1.4rem] border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm leading-6 text-amber-950">
                  {notice}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <RefreshButton />
                <Link
                  href="/"
                  className="rounded-full border border-stone-300/80 bg-white/80 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-950 hover:text-stone-950"
                >
                  Back Home
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-stone-900/90 bg-stone-950 p-6 text-white shadow-[0_20px_80px_rgba(15,23,42,0.25)] sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-white/65">
                    Right now
                  </p>
                  <p className="mt-3 text-6xl font-semibold tracking-[-0.1em] text-white sm:text-7xl">
                    {headline.temperature}
                  </p>
                </div>
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                  Ambient station
                </span>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {supportingFacts.slice(0, 4).map((fact) => (
                  <article
                    key={fact.label}
                    className="rounded-[1.3rem] border border-white/12 bg-white/8 p-4"
                  >
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/55">
                      {fact.label}
                    </p>
                    <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-white">
                      {fact.value}
                    </p>
                  </article>
                ))}
              </div>

              <div className="mt-5 rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-white/55">
                  Station note
                </p>
                <p className="mt-3 text-sm leading-6 text-white/75">
                  {buildStationNote(latest)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="glass-panel rounded-[2rem] bg-white/82 p-6 sm:p-7">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                  Current conditions
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-stone-950">
                  The numbers you actually care about
                </h2>
              </div>
              <p className="text-sm text-stone-500">
                Last station report {data.station.lastObservationAt || "not available"}
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {primaryMetrics.map((metric) => (
                <article
                  key={metric.id}
                  className={`rounded-[1.6rem] border p-5 ${pickMetricCardClass(metric.id)}`}
                >
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] opacity-70">
                    {metric.label}
                  </p>
                  <p className="mt-4 text-4xl font-semibold tracking-[-0.08em]">
                    {metric.displayValue}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <aside className="glass-panel rounded-[2rem] bg-white/82 p-6 sm:p-7">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
              What stands out
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-stone-950">
              A fast read on the loaded window
            </h2>

            <div className="mt-6 space-y-3">
              {highlights.map((highlight) => (
                <article
                  key={highlight.label}
                  className="rounded-[1.3rem] border border-stone-200/80 bg-stone-50/85 p-4"
                >
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                    {highlight.label}
                  </p>
                  <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-stone-950">
                    {highlight.value}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {supportingFacts.slice(4).map((fact) => (
                <article
                  key={fact.label}
                  className="rounded-[1.3rem] border border-stone-200/80 bg-white/85 p-4"
                >
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-stone-500">
                    {fact.label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-stone-700">{fact.value}</p>
                </article>
              ))}
            </div>
          </aside>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="glass-panel rounded-[2rem] bg-white/82 p-6 sm:p-7">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                  Short-range forecast
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-stone-950">
                  What the next several hours look like
                </h2>
              </div>
              <p className="text-sm text-stone-500">
                {forecastPeriods.length
                  ? "Powered by NOAA hourly forecast"
                  : "Forecast unavailable right now"}
              </p>
            </div>

            {forecastPeriods.length ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {forecastPeriods.map((period) => (
                  <ForecastCard key={period.startTime} period={period} />
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-[1.5rem] border border-dashed border-stone-300/80 bg-stone-50/75 p-5 text-sm leading-6 text-stone-600">
                NOAA did not return an hourly forecast for this station location on this
                fetch, so the live station data above is the most reliable source for now.
              </div>
            )}
          </div>

          <section className="glass-panel rounded-[2rem] bg-white/82 p-6 sm:p-7">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
              Station context
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-stone-950">
              Where this data comes from
            </h2>

            <div className="mt-6 space-y-3">
              <ContextCard label="Station name" value={data.station.name} />
              <ContextCard
                label="Station location"
                value={data.station.location || "No location label from Ambient Weather"}
              />
              <ContextCard
                label="Coordinates"
                value={formatCoordinates(data.station.latitude, data.station.longitude)}
              />
              <ContextCard
                label="Loaded time span"
                value={describeCoverage(data.timeRange.startAt, data.timeRange.endAt)}
              />
              <ContextCard
                label="Station identifier"
                value={maskStationId(data.station.macAddress)}
              />
            </div>
          </section>
        </section>

        <StationExplorer data={data} />
      </div>
    </main>
  );
}

function WeatherState({ result }: { result: Exclude<WeatherPageData, { state: "ready" }> }) {
  const title =
    result.state === "missing-config"
      ? "Weather data needs a little setup"
      : "Weather data is temporarily unavailable";
  const detail =
    result.state === "missing-config"
      ? `${result.message} Missing: ${result.missing.join(", ")}.`
      : result.message;

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-10 text-stone-950 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-3xl">
        <section className="glass-panel rounded-[2rem] bg-white/84 p-8 sm:p-10">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
            Ambient Weather on Monosyth
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.07em] text-stone-950 sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-base leading-7 text-stone-600">{detail}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white"
            >
              Back Home
            </Link>
            <Link
              href="/weather"
              className="rounded-full border border-stone-300/80 bg-white/80 px-4 py-2 text-sm font-semibold text-stone-700"
            >
              Reload Weather
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function ForecastCard({ period }: { period: WeatherForecastPeriod }) {
  return (
    <article className="rounded-[1.5rem] border border-stone-200/80 bg-stone-50/82 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
            {formatWeatherDateTime(period.startTime)}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.08em] text-stone-950">
            {period.temperature === null
              ? "?"
              : `${period.temperature}\u00b0${period.temperatureUnit}`}
          </p>
        </div>
        <span className="rounded-full border border-stone-200/80 bg-white/85 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-stone-600">
          {period.isDaytime ? "Day" : "Night"}
        </span>
      </div>

      <p className="mt-4 text-lg font-semibold tracking-[-0.04em] text-stone-950">
        {period.shortForecast}
      </p>
      <p className="mt-2 text-sm leading-6 text-stone-600">{period.detailedForecast}</p>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
        Wind {period.windSpeed} {period.windDirection}
      </p>
    </article>
  );
}

function ContextCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[1.3rem] border border-stone-200/80 bg-stone-50/82 p-4">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-stone-500">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-stone-700">{value}</p>
    </article>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-stone-200/80 bg-white/80 px-4 py-2 text-sm font-medium text-stone-700">
      <span className="text-stone-500">{label}:</span> {value}
    </span>
  );
}

function buildHeadline(metrics: WeatherMetric[], latest: WeatherObservation | null) {
  const temperature = pickMetric(metrics, "temperature")?.displayValue ?? "--";
  const humidity = pickMetric(metrics, "humidity")?.displayValue ?? "unknown humidity";
  const wind = pickMetric(metrics, "wind")?.displayValue ?? "calm wind";
  const rainToday = pickMetric(metrics, "rainToday")?.value ?? 0;
  const condition = describeCondition(metrics, latest);

  return {
    title: `${condition.title}, ${temperature.toLowerCase()} outside`,
    subtitle: `${condition.summary} Humidity is ${humidity.toLowerCase()} and wind is running ${wind.toLowerCase()}. ${rainToday > 0 ? "Rain is already on the board today." : "No measurable rain has shown up in today's station total yet."}`,
    temperature,
  };
}

function buildSupportingFacts(data: Extract<WeatherPageData, { state: "ready" }>["data"], latest: WeatherObservation | null) {
  return [
    {
      label: "Feels like",
      value: formatObservationValue(latest, ["feelsLike", "feelslikef"], "F", 1),
    },
    {
      label: "Dew point",
      value: formatObservationValue(latest, ["dewPoint", "dewpointf"], "F", 1),
    },
    {
      label: "Wind direction",
      value: formatObservationText(latest, ["winddir", "winddirection", "windDirection"]),
    },
    {
      label: "UV and solar",
      value: buildUvSolarSummary(latest),
    },
    {
      label: "Latest sample",
      value: data.station.lastObservationAt || "Not reported",
    },
    {
      label: "Loaded history",
      value: `${data.observationCount} samples across ${describeCoverage(data.timeRange.startAt, data.timeRange.endAt)}`,
    },
  ];
}

function pickPrimaryMetrics(metrics: WeatherMetric[]) {
  const orderedIds = ["temperature", "humidity", "wind", "pressure", "rainToday"];

  return orderedIds
    .map((id) => pickMetric(metrics, id))
    .filter((metric): metric is WeatherMetric => metric !== null);
}

function pickMetric(metrics: WeatherMetric[], id: string) {
  return metrics.find((metric) => metric.id === id) ?? null;
}

function pickMetricCardClass(metricId: string) {
  return (
    metricCardClasses[metricId as keyof typeof metricCardClasses] ??
    metricCardClasses.fallback
  );
}

function describeCondition(metrics: WeatherMetric[], latest: WeatherObservation | null) {
  const temp = pickMetric(metrics, "temperature")?.value ?? null;
  const wind = pickMetric(metrics, "wind")?.value ?? 0;
  const humidity = pickMetric(metrics, "humidity")?.value ?? null;
  const rain = pickMetric(metrics, "rainToday")?.value ?? 0;
  const pressure = pickMetric(metrics, "pressure")?.value ?? null;
  const solar = pickObservationNumber(latest, ["solarradiation"]) ?? 0;

  if (rain >= 0.1 || (humidity !== null && humidity >= 92 && wind >= 8)) {
    return {
      title: "Wet and unsettled",
      summary: "The station is reading like a damp, active stretch rather than a quiet dry window.",
    };
  }

  if (wind >= 15) {
    return {
      title: "Wind is the main story",
      summary: "Temperatures may be workable, but the breeze is what will shape how it feels outside.",
    };
  }

  if (temp !== null && temp >= 78) {
    return {
      title: "Warm and bright",
      summary: solar > 250 ? "Sun and warmth are doing most of the work right now." : "It is warm even without a strong solar push.",
    };
  }

  if (temp !== null && temp <= 40) {
    return {
      title: "Cold air in place",
      summary: "This reads like a bundle-up window more than a casual quick step outside.",
    };
  }

  if (pressure !== null && pressure >= 30) {
    return {
      title: "Pretty steady outside",
      summary: "Pressure and wind both lean calm, so this looks like a relatively settled stretch.",
    };
  }

  return {
    title: "Quiet neighborhood weather",
    summary: "Nothing extreme is jumping off the station right now, which makes this a good general-purpose snapshot.",
  };
}

function buildStationNote(latest: WeatherObservation | null) {
  const feelsLike = formatObservationValue(latest, ["feelsLike", "feelslikef"], "F", 1);
  const gust = formatObservationValue(latest, ["windgustmph"], "mph", 1);
  const uv = formatObservationValue(latest, ["uv"], "", 1);

  return `Feels like ${feelsLike.toLowerCase()}, gusts are ${gust.toLowerCase()}, and UV is ${uv.toLowerCase()}. Use the history explorer below to see whether that is stable or changing quickly.`;
}

function buildUvSolarSummary(latest: WeatherObservation | null) {
  const uv = formatObservationValue(latest, ["uv"], "", 1);
  const solar = formatObservationValue(latest, ["solarradiation"], "W/m2", 0);
  return `UV ${uv}, solar ${solar.toLowerCase()}`;
}

function formatObservationValue(
  observation: WeatherObservation | null,
  keys: string[],
  unit: string,
  decimals: number,
) {
  const value = pickObservationNumber(observation, keys);

  if (value === null) {
    return "Not reported";
  }

  const suffix = unit ? ` ${unit}` : "";
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })}${suffix}`;
}

function formatObservationText(observation: WeatherObservation | null, keys: string[]) {
  for (const key of keys) {
    const value = observation?.[key];

    if (typeof value === "string" && value.trim() !== "") {
      return value;
    }
  }

  return "Not reported";
}

function pickObservationNumber(
  observation: WeatherObservation | null,
  keys: string[],
) {
  if (!observation) {
    return null;
  }

  for (const key of keys) {
    const value = observation[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function describeCoverage(startAt: string | null, endAt: string | null) {
  if (!startAt || !endAt) {
    return "unknown time span";
  }

  return `${formatWeatherDateTime(startAt)} to ${formatWeatherDateTime(endAt)}`;
}

function formatCoordinates(latitude: number | null, longitude: number | null) {
  if (latitude === null || longitude === null) {
    return "Coordinates not available from the latest station sample";
  }

  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

function maskStationId(macAddress: string) {
  if (!macAddress) {
    return "Unavailable";
  }

  return macAddress.length <= 8
    ? macAddress
    : `${macAddress.slice(0, 4)}...${macAddress.slice(-4)}`;
}
