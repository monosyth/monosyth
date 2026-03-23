import type { WeatherObservation } from "@/lib/weather/types";

const WEATHER_TIME_ZONE = "America/Los_Angeles";
export const WEATHER_SUMMARY_MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export type WeatherSummaryRecordRow = {
  label: string;
  value: string;
  detail: string;
};

export type WeatherSummarySection = {
  title: string;
  rows: WeatherSummaryRecordRow[];
};

export type WeatherMonthlyReportRow = {
  year: number;
  months: boolean[];
};

export type WeatherMonthlyMatrixRow = {
  year: number;
  months: string[];
  total: string;
};

export type WeatherMonthlyMatrix = {
  title: string;
  unitLabel: string;
  rows: WeatherMonthlyMatrixRow[];
};

export type WeatherSummaryArchive = {
  stationStartLabel: string;
  lastUpdatedLabel: string;
  monthlyReportRows: WeatherMonthlyReportRow[];
  recordSections: WeatherSummarySection[];
  monthlyMatrices: WeatherMonthlyMatrix[];
};

type DayAggregate = {
  year: number;
  month: number;
  day: number;
  label: string;
  maxTemp: MetricRecord | null;
  minTemp: MetricRecord | null;
  maxDailyRain: MetricRecord | null;
  maxLightning: MetricRecord | null;
};

type MonthAggregate = {
  tempSum: number;
  tempCount: number;
  rainTotal: number;
  rainyDays: number;
  lightningTotal: number;
  observationDays: number;
};

type YearAggregate = {
  tempSum: number;
  tempCount: number;
  months: Map<number, MonthAggregate>;
};

type MetricRecord = {
  value: number;
  timestamp: number;
};

export function buildWeatherSummaryArchive(observations: WeatherObservation[]): WeatherSummaryArchive | null {
  if (!observations.length) {
    return null;
  }

  const earliestTimestamp = observations[0]?.timestamp ?? 0;
  const latestTimestamp = observations.at(-1)?.timestamp ?? Date.now();
  const dayMap = buildDayAggregates(observations);
  const yearMap = buildYearAggregates(observations, dayMap);
  const years = [...yearMap.keys()].sort((left, right) => left - right);

  return {
    stationStartLabel: earliestTimestamp ? formatSummaryMonthYear(earliestTimestamp) : "Unknown",
    lastUpdatedLabel: formatSummaryDateTime(latestTimestamp),
    monthlyReportRows: years.map((year) => ({
      year,
      months: WEATHER_SUMMARY_MONTH_LABELS.map(
        (_, monthIndex) => yearMap.get(year)?.months.has(monthIndex + 1) ?? false,
      ),
    })),
    recordSections: buildRecordSections(observations, dayMap),
    monthlyMatrices: [
      buildMonthlyMatrix(
        yearMap,
        "Average Monthly Temperature",
        "°F",
        (month) => (month.tempCount ? formatNumber(month.tempSum / month.tempCount, 1) : "-"),
        (year) => (year.tempCount ? formatNumber(year.tempSum / year.tempCount, 1) : "-"),
      ),
      buildMonthlyMatrix(
        yearMap,
        "Total Monthly Rainfall",
        "in",
        (month) => (month.observationDays ? formatNumber(month.rainTotal, 2) : "-"),
        (year) =>
          formatNumber(
            [...year.months.values()].reduce((sum, month) => sum + month.rainTotal, 0),
            2,
          ),
      ),
      buildMonthlyMatrix(
        yearMap,
        "Number of Days it Rained",
        "Days",
        (month) => (month.observationDays ? String(month.rainyDays) : "-"),
        (year) =>
          String([...year.months.values()].reduce((sum, month) => sum + month.rainyDays, 0)),
      ),
      buildMonthlyMatrix(
        yearMap,
        "Total Lightning Strikes",
        "Strikes",
        (month) => (month.observationDays ? String(month.lightningTotal) : "-"),
        (year) =>
          String(
            [...year.months.values()].reduce((sum, month) => sum + month.lightningTotal, 0),
          ),
      ),
      buildMonthlyMatrix(
        yearMap,
        "Number of Days with Observations",
        "Days",
        (month) => (month.observationDays ? String(month.observationDays) : "-"),
        (year) =>
          String(
            [...year.months.values()].reduce((sum, month) => sum + month.observationDays, 0),
          ),
      ),
    ],
  };
}

function buildDayAggregates(observations: WeatherObservation[]) {
  const dayMap = new Map<string, DayAggregate>();

  for (const observation of observations) {
    const timestamp = observation.timestamp ?? 0;

    if (!timestamp) {
      continue;
    }

    const parts = getCalendarParts(timestamp);
    const key = `${parts.year}-${parts.month}-${parts.day}`;
    const aggregate = dayMap.get(key) ?? {
      year: parts.year,
      month: parts.month,
      day: parts.day,
      label: `${parts.month}/${parts.day}/${parts.year}`,
      maxTemp: null,
      minTemp: null,
      maxDailyRain: null,
      maxLightning: null,
    };

    aggregate.maxTemp = pickHighRecord(aggregate.maxTemp, pickObservationRecord(observation, ["tempf"]));
    aggregate.minTemp = pickLowRecord(aggregate.minTemp, pickObservationRecord(observation, ["tempf"]));
    aggregate.maxDailyRain = pickHighRecord(
      aggregate.maxDailyRain,
      pickObservationRecord(observation, ["dailyrainin"]),
    );
    aggregate.maxLightning = pickHighRecord(
      aggregate.maxLightning,
      pickObservationRecord(observation, ["lightning_day", "lightning"]),
    );

    dayMap.set(key, aggregate);
  }

  return dayMap;
}

function buildYearAggregates(observations: WeatherObservation[], dayMap: Map<string, DayAggregate>) {
  const yearMap = new Map<number, YearAggregate>();

  for (const observation of observations) {
    const timestamp = observation.timestamp ?? 0;

    if (!timestamp) {
      continue;
    }

    const temperature = pickNumber(observation, ["tempf"]);
    const parts = getCalendarParts(timestamp);
    const yearAggregate = getYearAggregate(yearMap, parts.year);
    const monthAggregate = getMonthAggregate(yearAggregate, parts.month);

    if (temperature !== null) {
      yearAggregate.tempSum += temperature;
      yearAggregate.tempCount += 1;
      monthAggregate.tempSum += temperature;
      monthAggregate.tempCount += 1;
    }
  }

  for (const day of dayMap.values()) {
    const yearAggregate = getYearAggregate(yearMap, day.year);
    const monthAggregate = getMonthAggregate(yearAggregate, day.month);

    monthAggregate.observationDays += 1;
    monthAggregate.rainTotal += day.maxDailyRain?.value ?? 0;
    monthAggregate.rainyDays += (day.maxDailyRain?.value ?? 0) > 0 ? 1 : 0;
    monthAggregate.lightningTotal += Math.round(day.maxLightning?.value ?? 0);
  }

  return yearMap;
}

function buildRecordSections(
  observations: WeatherObservation[],
  dayMap: Map<string, DayAggregate>,
): WeatherSummarySection[] {
  const dayAggregates = [...dayMap.values()];

  return [
    {
      title: "Outside Temperatures",
      rows: [
        buildMetricRow("Highest", findExtremeObservation(observations, ["tempf"], "max"), 1, "°F"),
        buildMetricRow("Lowest", findExtremeObservation(observations, ["tempf"], "min"), 1, "°F"),
        buildMetricRow("Min Max", pickMinMax(dayAggregates), 1, "°F"),
        buildMetricRow("Max Min", pickMaxMin(dayAggregates), 1, "°F"),
      ].filter((row): row is WeatherSummaryRecordRow => row !== null),
    },
    {
      title: "Dewpoint",
      rows: [
        buildMetricRow("Highest", findExtremeObservation(observations, ["dewPoint", "dewpointf"], "max"), 1, "°F"),
        buildMetricRow("Lowest", findExtremeObservation(observations, ["dewPoint", "dewpointf"], "min"), 1, "°F"),
      ].filter((row): row is WeatherSummaryRecordRow => row !== null),
    },
    {
      title: "Precipitation",
      rows: [
        buildMetricRow("Highest Daily Rainfall", findExtremeDay(dayAggregates, "maxDailyRain", "max"), 2, "in", true),
        buildMetricRow("Highest Rain Rate", findExtremeObservation(observations, ["hourlyrainin"], "max"), 2, "in/h"),
      ].filter((row): row is WeatherSummaryRecordRow => row !== null),
    },
    {
      title: "Heat Index",
      rows: [
        buildMetricRow("Highest", findExtremeObservation(observations, ["heatindexf"], "max"), 1, "°F"),
      ].filter((row): row is WeatherSummaryRecordRow => row !== null),
    },
    {
      title: "Barometer",
      rows: [
        buildMetricRow("Highest", findExtremeObservation(observations, ["baromrelin", "baromabsin"], "max"), 3, "inHg"),
        buildMetricRow("Lowest", findExtremeObservation(observations, ["baromrelin", "baromabsin"], "min"), 3, "inHg"),
      ].filter((row): row is WeatherSummaryRecordRow => row !== null),
    },
    {
      title: "Wind",
      rows: [
        buildMetricRow("Highest Sustained", findExtremeObservation(observations, ["windspeedmph"], "max"), 1, "mph"),
        buildMetricRow("Highest Gust", findExtremeObservation(observations, ["windgustmph"], "max"), 1, "mph"),
      ].filter((row): row is WeatherSummaryRecordRow => row !== null),
    },
    {
      title: "Wind Chill",
      rows: [
        buildMetricRow("Lowest", findExtremeObservation(observations, ["windchillf"], "min"), 1, "°F"),
      ].filter((row): row is WeatherSummaryRecordRow => row !== null),
    },
    {
      title: "Solar Radiation",
      rows: [
        buildMetricRow("Highest", findExtremeObservation(observations, ["solarradiation"], "max"), 0, "W/m²"),
      ].filter((row): row is WeatherSummaryRecordRow => row !== null),
    },
    {
      title: "Brightness",
      rows: [
        buildMetricRow("Highest", findExtremeObservation(observations, ["brightness", "lux"], "max"), 0, "lx"),
      ].filter((row): row is WeatherSummaryRecordRow => row !== null),
    },
    {
      title: "Lightning",
      rows: [
        buildMetricRow("Highest", findExtremeDay(dayAggregates, "maxLightning", "max"), 0, "", true),
      ].filter((row): row is WeatherSummaryRecordRow => row !== null),
    },
  ].filter((section) => section.rows.length > 0);
}

function buildMonthlyMatrix(
  yearMap: Map<number, YearAggregate>,
  title: string,
  unitLabel: string,
  monthFormatter: (month: MonthAggregate, year: YearAggregate) => string,
  yearFormatter: (year: YearAggregate) => string,
): WeatherMonthlyMatrix {
  const rows = [...yearMap.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([year, aggregate]) => ({
      year,
      months: WEATHER_SUMMARY_MONTH_LABELS.map((_, monthIndex) => {
        const month = aggregate.months.get(monthIndex + 1);
        return month ? monthFormatter(month, aggregate) : "-";
      }),
      total: yearFormatter(aggregate),
    }));

  return {
    title,
    unitLabel,
    rows,
  };
}

function getYearAggregate(yearMap: Map<number, YearAggregate>, year: number) {
  const existing = yearMap.get(year);

  if (existing) {
    return existing;
  }

  const created: YearAggregate = {
    tempSum: 0,
    tempCount: 0,
    months: new Map<number, MonthAggregate>(),
  };
  yearMap.set(year, created);
  return created;
}

function getMonthAggregate(yearAggregate: YearAggregate, month: number) {
  const existing = yearAggregate.months.get(month);

  if (existing) {
    return existing;
  }

  const created: MonthAggregate = {
    tempSum: 0,
    tempCount: 0,
    rainTotal: 0,
    rainyDays: 0,
    lightningTotal: 0,
    observationDays: 0,
  };
  yearAggregate.months.set(month, created);
  return created;
}

function buildMetricRow(
  label: string,
  record: MetricRecord | null,
  decimals: number,
  unit: string,
  dayOnly = false,
) {
  if (!record) {
    return null;
  }

  return {
    label,
    value: `${formatNumber(record.value, decimals)}${unit ? ` ${unit}` : ""}`.trim(),
    detail: dayOnly ? formatSummaryDate(record.timestamp) : formatSummaryDateTime(record.timestamp),
  };
}

function findExtremeObservation(
  observations: WeatherObservation[],
  keys: string[],
  mode: "min" | "max",
) {
  let winner: MetricRecord | null = null;

  for (const observation of observations) {
    const candidate = pickObservationRecord(observation, keys);

    if (!candidate) {
      continue;
    }

    if (!winner) {
      winner = candidate;
      continue;
    }

    if (mode === "max" ? candidate.value > winner.value : candidate.value < winner.value) {
      winner = candidate;
    }
  }

  return winner;
}

function findExtremeDay(
  days: DayAggregate[],
  key: "maxDailyRain" | "maxLightning",
  mode: "min" | "max",
) {
  let winner: MetricRecord | null = null;

  for (const day of days) {
    const candidate = day[key];

    if (!candidate) {
      continue;
    }

    if (!winner) {
      winner = candidate;
      continue;
    }

    if (mode === "max" ? candidate.value > winner.value : candidate.value < winner.value) {
      winner = candidate;
    }
  }

  return winner;
}

function pickMinMax(days: DayAggregate[]) {
  let winner: MetricRecord | null = null;

  for (const day of days) {
    if (!day.maxTemp) {
      continue;
    }

    if (!winner || day.maxTemp.value < winner.value) {
      winner = day.maxTemp;
    }
  }

  return winner;
}

function pickMaxMin(days: DayAggregate[]) {
  let winner: MetricRecord | null = null;

  for (const day of days) {
    if (!day.minTemp) {
      continue;
    }

    if (!winner || day.minTemp.value > winner.value) {
      winner = day.minTemp;
    }
  }

  return winner;
}

function pickObservationRecord(observation: WeatherObservation, keys: string[]) {
  const value = pickNumber(observation, keys);
  const timestamp = observation.timestamp ?? 0;

  if (value === null || !timestamp) {
    return null;
  }

  return { value, timestamp };
}

function pickHighRecord(current: MetricRecord | null, candidate: MetricRecord | null) {
  if (!candidate) {
    return current;
  }

  if (!current || candidate.value > current.value) {
    return candidate;
  }

  return current;
}

function pickLowRecord(current: MetricRecord | null, candidate: MetricRecord | null) {
  if (!candidate) {
    return current;
  }

  if (!current || candidate.value < current.value) {
    return candidate;
  }

  return current;
}

function pickNumber(source: WeatherObservation, keys: string[]) {
  for (const key of keys) {
    const raw = source[key];

    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw;
    }

    if (typeof raw === "string" && raw.trim() !== "") {
      const parsed = Number(raw);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function getCalendarParts(timestamp: number) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: WEATHER_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const parts = formatter.formatToParts(new Date(timestamp));

  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? "0"),
    month: Number(parts.find((part) => part.type === "month")?.value ?? "0"),
    day: Number(parts.find((part) => part.type === "day")?.value ?? "0"),
  };
}

function formatNumber(value: number, decimals: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

function formatSummaryDateTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: WEATHER_TIME_ZONE,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

function formatSummaryDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: WEATHER_TIME_ZONE,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(timestamp));
}

function formatSummaryMonthYear(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: WEATHER_TIME_ZONE,
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}
