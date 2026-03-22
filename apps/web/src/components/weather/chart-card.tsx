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
          <p className="text-sm font-semibold text-stone-950">{title ?? series.label}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.22em] text-stone-500">
            {subtitle ?? formatSeriesRange(series)}
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
        <path
          d={fillPath}
          className={`fill-current opacity-15 ${tone === "rain" ? "text-blue-500" : tone === "sky" ? "text-sky-500" : tone === "gold" ? "text-amber-500" : "text-emerald-600"}`}
        />
        <path
          d={linePath}
          className={
            tone === "rain"
              ? "stroke-blue-700"
              : tone === "sky"
                ? "stroke-sky-700"
                : tone === "gold"
                  ? "stroke-amber-700"
                  : "stroke-emerald-700"
          }
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
