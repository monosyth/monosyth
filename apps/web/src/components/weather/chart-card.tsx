import type { WeatherSeries } from "@/lib/weather/types";

export function WeatherChartCard({
  series,
  title,
  subtitle,
  tone = "pine",
}: {
  series: WeatherSeries;
  title?: string;
  subtitle?: string;
  tone?: "gold" | "sky" | "rain" | "pine";
}) {
  const width = 320;
  const height = 132;
  const span = series.max - series.min || 1;
  const points = series.points.map((point, index) => {
    const x = (index / Math.max(series.points.length - 1, 1)) * width;
    const y = height - ((point.value - series.min) / span) * (height - 18) - 9;
    return { x, y };
  });

  const linePath = points
    .map((point, index) =>
      `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
    )
    .join(" ");
  const fillPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;
  const currentValue = series.points.at(-1)?.value ?? series.max;
  const startingValue = series.points[0]?.value ?? currentValue;
  const delta = currentValue - startingValue;

  return (
    <article
      className={`rounded-[1.5rem] border p-4 shadow-sm ${pickCardClass(tone)}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-stone-950">{title ?? series.label}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.22em] text-stone-500">
            {subtitle ?? formatSeriesRange(series)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tracking-[-0.08em] text-stone-950">
            {formatCompact(currentValue, series.decimals)}
            {series.unit ? (
              <span className="ml-1 text-sm font-medium text-stone-500">
                {series.unit}
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            {formatDelta(delta, series)}
          </p>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${series.label} trend`}
        className="mt-4 h-32 w-full overflow-visible"
      >
        <defs>
          <linearGradient id={`weather-fill-${series.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={pickFillColor(tone)} />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        <line
          x1="0"
          y1={height}
          x2={width}
          y2={height}
          className="stroke-stone-300/70"
          strokeWidth="1"
        />
        <path d={fillPath} fill={`url(#weather-fill-${series.id})`} className="opacity-70" />
        <path
          d={linePath}
          className={pickStrokeClass(tone)}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-stone-500">
        <span>{series.points[0]?.label}</span>
        <span>
          Min {formatCompact(series.min, series.decimals)} / Max{" "}
          {formatCompact(series.max, series.decimals)}
        </span>
        <span>{series.points.at(-1)?.label}</span>
      </div>
    </article>
  );
}

function pickCardClass(tone: "gold" | "sky" | "rain" | "pine") {
  if (tone === "rain") {
    return "border-blue-200/80 bg-blue-50/82";
  }

  if (tone === "sky") {
    return "border-sky-200/80 bg-sky-50/82";
  }

  if (tone === "gold") {
    return "border-amber-200/80 bg-amber-50/82";
  }

  return "border-emerald-200/80 bg-emerald-50/82";
}

function pickFillColor(tone: "gold" | "sky" | "rain" | "pine") {
  if (tone === "rain") {
    return "#60a5fa";
  }

  if (tone === "sky") {
    return "#38bdf8";
  }

  if (tone === "gold") {
    return "#fbbf24";
  }

  return "#34d399";
}

function pickStrokeClass(tone: "gold" | "sky" | "rain" | "pine") {
  if (tone === "rain") {
    return "stroke-blue-700";
  }

  if (tone === "sky") {
    return "stroke-sky-700";
  }

  if (tone === "gold") {
    return "stroke-amber-700";
  }

  return "stroke-emerald-700";
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

function formatDelta(delta: number, series: WeatherSeries) {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${formatCompact(delta, series.decimals)} ${series.unit} vs start`.trim();
}
