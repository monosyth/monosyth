import type { WeatherDailyRollup } from "@/lib/weather/rollups";
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

// Module-scope cached formatters. Building Intl.DateTimeFormat is expensive
// (40-100 µs each); previously these were rebuilt inside hot loops, e.g.
// once per observation for getCalendarParts. Reusing the same instance for
// every call cuts that overhead to a single allocation.
const calendarPartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: WEATHER_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
});
const shortWeekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: WEATHER_TIME_ZONE,
  weekday: "short",
});
const monthDayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: WEATHER_TIME_ZONE,
  month: "short",
  day: "numeric",
});
const summaryDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: WEATHER_TIME_ZONE,
  month: "2-digit",
  day: "2-digit",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});
const summaryDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: WEATHER_TIME_ZONE,
  month: "2-digit",
  day: "2-digit",
  year: "numeric",
});
const summaryMonthYearFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: WEATHER_TIME_ZONE,
  month: "short",
  year: "numeric",
});
const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: WEATHER_TIME_ZONE,
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});
const monthLongYearFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: WEATHER_TIME_ZONE,
  month: "long",
  year: "numeric",
});

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

export type WeatherPeriodMatrixColumn = {
  key: string;
  label: string;
  detail: string;
  isFuture: boolean;
};

export type WeatherPeriodMatrixCell = {
  displayValue: string;
  numericValue: number | null;
  hasObservation: boolean;
  isFuture: boolean;
};

export type WeatherPeriodMatrixRow = {
  label: string;
  summaryValue: string;
  cells: WeatherPeriodMatrixCell[];
};

export type WeatherPeriodMatrix = {
  title: string;
  subtitle: string;
  unitLabel: string;
  summaryLabel: string;
  colorScale: "temperature" | "rain";
  columns: WeatherPeriodMatrixColumn[];
  rows: WeatherPeriodMatrixRow[];
};

export type WeatherPeriodNavigation = {
  rangeLabel: string;
  prevAnchor: string | null;
  nextAnchor: string | null;
  isCurrent: boolean;
};

export type WeatherDayCondition =
  | "sunny"
  | "partly-cloudy"
  | "cloudy"
  | "rainy"
  | "stormy"
  | "snowy"
  | "windy"
  | "unknown";

export type WeatherMonthCalendarDay = {
  key: string;
  dayNumber: number | null;
  isCurrentMonth: boolean;
  isFuture: boolean;
  isToday: boolean;
  isInRange: boolean;
  highValue: number | null;
  highDisplay: string;
  lowValue: number | null;
  lowDisplay: string;
  rainValue: number | null;
  rainDisplay: string;
  hasObservations: boolean;
  weekdayLabel: string;
  longDateLabel: string;
  condition: WeatherDayCondition;
};

export type WeatherWeekStory = {
  eyebrow: string;
  title: string;
  body: string;
  stats: Array<{ label: string; value: string; note: string }>;
};

export type WeatherMonthCalendar = {
  title: string;
  subtitle: string;
  monthLabel: string;
  weeks: WeatherMonthCalendarDay[][];
  navigation: WeatherPeriodNavigation;
};

export type WeatherSummaryArchive = {
  stationStartLabel: string;
  lastUpdatedLabel: string;
  monthlyReportRows: WeatherMonthlyReportRow[];
  recordSections: WeatherSummarySection[];
  monthlyMatrices: WeatherMonthlyMatrix[];
};

export type WeatherDayDetail = {
  dayKey: string;
  longDateLabel: string;
  hasObservations: boolean;
  highDisplay: string;
  lowDisplay: string;
  averageDisplay: string;
  rainDisplay: string;
  observationCount: number;
};

type DayAggregate = {
  year: number;
  month: number;
  day: number;
  label: string;
  maxTemp: MetricRecord | null;
  minTemp: MetricRecord | null;
  tempSum: number;
  tempCount: number;
  maxSolar?: MetricRecord | null;
  avgHumidity?: number | null;
  dailyRainTotal: MetricRecord | null;
  maxLightning: MetricRecord | null;
  observationCount: number;
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

type RecordExtremes = {
  tempMax: MetricRecord | null;
  tempMin: MetricRecord | null;
  dewpointMax: MetricRecord | null;
  dewpointMin: MetricRecord | null;
  rainRateMax: MetricRecord | null;
  heatIndexMax: MetricRecord | null;
  baromMax: MetricRecord | null;
  baromMin: MetricRecord | null;
  windMax: MetricRecord | null;
  gustMax: MetricRecord | null;
  windChillMin: MetricRecord | null;
  solarMax: MetricRecord | null;
  brightnessMax: MetricRecord | null;
};

type AggregationResult = {
  dayMap: Map<string, DayAggregate>;
  yearMap: Map<number, YearAggregate>;
  extremes: RecordExtremes;
  earliestTimestamp: number;
  latestTimestamp: number;
};

// Reads-and-aggregates ALL observations in a single pass instead of running
// separate passes for day map / year map / each metric extreme. This was
// previously O(N * 12+) — now it's O(N).
function aggregateObservations(observations: WeatherObservation[]): AggregationResult {
  const dayMap = new Map<string, DayAggregate>();
  const yearMap = new Map<number, YearAggregate>();
  const extremes: RecordExtremes = {
    tempMax: null,
    tempMin: null,
    dewpointMax: null,
    dewpointMin: null,
    rainRateMax: null,
    heatIndexMax: null,
    baromMax: null,
    baromMin: null,
    windMax: null,
    gustMax: null,
    windChillMin: null,
    solarMax: null,
    brightnessMax: null,
  };
  let earliestTimestamp = 0;
  let latestTimestamp = 0;

  // Caller may not have sorted observations; persistence layer normally does
  // but the daily-rain-difference logic depends on sequence order. We sort
  // in-place on a shallow copy to avoid mutating caller state.
  const sorted = [...observations].sort(
    (left, right) => (left.timestamp ?? 0) - (right.timestamp ?? 0),
  );
  let previousDailyRain: number | null = null;
  let previousDayKey: string | null = null;

  for (const observation of sorted) {
    const timestamp = observation.timestamp ?? 0;

    if (!timestamp) {
      continue;
    }

    if (!earliestTimestamp || timestamp < earliestTimestamp) {
      earliestTimestamp = timestamp;
    }

    if (timestamp > latestTimestamp) {
      latestTimestamp = timestamp;
    }

    const parts = getCalendarParts(timestamp);
    const dayKey = buildDayKey(parts.year, parts.month, parts.day);

    // Reset the running daily-rain delta when we cross into a new day —
    // Ambient resets dailyrainin at midnight local time.
    if (previousDayKey !== null && previousDayKey !== dayKey) {
      previousDailyRain = null;
    }

    let day = dayMap.get(dayKey);

    if (!day) {
      day = {
        year: parts.year,
        month: parts.month,
        day: parts.day,
        label: `${parts.month}/${parts.day}/${parts.year}`,
        maxTemp: null,
        minTemp: null,
        tempSum: 0,
        tempCount: 0,
        maxSolar: null,
        avgHumidity: null,
        dailyRainTotal: null,
        maxLightning: null,
        observationCount: 0,
      };
      dayMap.set(dayKey, day);
    }
    day.observationCount += 1;

    const solarSample = pickObservationRecord(observation, ["solarradiation"], timestamp);
    if (solarSample) {
      day.maxSolar = pickHighRecord(day.maxSolar ?? null, solarSample);
    }
    const humidityRaw = pickNumber(observation, ["humidity"]);
    if (humidityRaw !== null) {
      const previousAvg = day.avgHumidity ?? null;
      const previousCount = day.observationCount - 1;
      day.avgHumidity =
        previousAvg === null || previousCount <= 0
          ? humidityRaw
          : (previousAvg * previousCount + humidityRaw) / (previousCount + 1);
    }

    const yearAggregate = getYearAggregate(yearMap, parts.year);
    const monthAggregate = getMonthAggregate(yearAggregate, parts.month);

    const tempRecord = pickObservationRecord(observation, ["tempf"], timestamp);
    if (tempRecord) {
      day.maxTemp = pickHighRecord(day.maxTemp, tempRecord);
      day.minTemp = pickLowRecord(day.minTemp, tempRecord);
      day.tempSum += tempRecord.value;
      day.tempCount += 1;
      yearAggregate.tempSum += tempRecord.value;
      yearAggregate.tempCount += 1;
      monthAggregate.tempSum += tempRecord.value;
      monthAggregate.tempCount += 1;
      extremes.tempMax = pickHighRecord(extremes.tempMax, tempRecord);
      extremes.tempMin = pickLowRecord(extremes.tempMin, tempRecord);
    }

    const dewpointRecord = pickObservationRecord(observation, ["dewPoint", "dewpointf"], timestamp);
    if (dewpointRecord) {
      extremes.dewpointMax = pickHighRecord(extremes.dewpointMax, dewpointRecord);
      extremes.dewpointMin = pickLowRecord(extremes.dewpointMin, dewpointRecord);
    }

    const rainRateRecord = pickObservationRecord(observation, ["hourlyrainin"], timestamp);
    if (rainRateRecord) {
      extremes.rainRateMax = pickHighRecord(extremes.rainRateMax, rainRateRecord);
    }

    const heatIndexRecord = pickObservationRecord(observation, ["heatindexf"], timestamp);
    if (heatIndexRecord) {
      extremes.heatIndexMax = pickHighRecord(extremes.heatIndexMax, heatIndexRecord);
    }

    const baromRecord = pickObservationRecord(observation, ["baromrelin", "baromabsin"], timestamp);
    if (baromRecord) {
      extremes.baromMax = pickHighRecord(extremes.baromMax, baromRecord);
      extremes.baromMin = pickLowRecord(extremes.baromMin, baromRecord);
    }

    const windRecord = pickObservationRecord(observation, ["windspeedmph"], timestamp);
    if (windRecord) {
      extremes.windMax = pickHighRecord(extremes.windMax, windRecord);
    }

    const gustRecord = pickObservationRecord(observation, ["windgustmph"], timestamp);
    if (gustRecord) {
      extremes.gustMax = pickHighRecord(extremes.gustMax, gustRecord);
    }

    const chillRecord = pickObservationRecord(observation, ["windchillf"], timestamp);
    if (chillRecord) {
      extremes.windChillMin = pickLowRecord(extremes.windChillMin, chillRecord);
    }

    const solarRecord = pickObservationRecord(observation, ["solarradiation"], timestamp);
    if (solarRecord) {
      extremes.solarMax = pickHighRecord(extremes.solarMax, solarRecord);
    }

    const brightnessRecord = pickObservationRecord(observation, ["brightness", "lux"], timestamp);
    if (brightnessRecord) {
      extremes.brightnessMax = pickHighRecord(extremes.brightnessMax, brightnessRecord);
    }

    const dailyRain = pickNumber(observation, ["dailyrainin"]);
    if (dailyRain !== null) {
      const rainIncrement =
        previousDailyRain === null
          ? dailyRain
          : dailyRain + 1e-6 >= previousDailyRain
            ? Math.max(dailyRain - previousDailyRain, 0)
            : dailyRain;

      day.dailyRainTotal = {
        value: roundMetric((day.dailyRainTotal?.value ?? 0) + rainIncrement, 4),
        timestamp,
      };
      previousDailyRain = dailyRain;
    }

    const lightningRecord = pickObservationRecord(observation, ["lightning_day", "lightning"], timestamp);
    if (lightningRecord) {
      day.maxLightning = pickHighRecord(day.maxLightning, lightningRecord);
    }

    previousDayKey = dayKey;
  }

  // Roll daily totals up into per-month aggregates.
  for (const day of dayMap.values()) {
    const yearAggregate = getYearAggregate(yearMap, day.year);
    const monthAggregate = getMonthAggregate(yearAggregate, day.month);

    monthAggregate.observationDays += 1;
    monthAggregate.rainTotal += day.dailyRainTotal?.value ?? 0;
    monthAggregate.rainyDays += (day.dailyRainTotal?.value ?? 0) > 0 ? 1 : 0;
    monthAggregate.lightningTotal += Math.round(day.maxLightning?.value ?? 0);
  }

  return { dayMap, yearMap, extremes, earliestTimestamp, latestTimestamp };
}

export function buildWeatherSummaryArchive(observations: WeatherObservation[]): WeatherSummaryArchive | null {
  if (!observations.length) {
    return null;
  }

  const { dayMap, yearMap, extremes, earliestTimestamp, latestTimestamp } =
    aggregateObservations(observations);
  const years = [...yearMap.keys()].sort((left, right) => left - right);

  return {
    stationStartLabel: earliestTimestamp ? formatSummaryMonthYear(earliestTimestamp) : "Unknown",
    lastUpdatedLabel: latestTimestamp ? formatSummaryDateTime(latestTimestamp) : "Unknown",
    monthlyReportRows: years.map((year) => ({
      year,
      months: WEATHER_SUMMARY_MONTH_LABELS.map(
        (_, monthIndex) => yearMap.get(year)?.months.has(monthIndex + 1) ?? false,
      ),
    })),
    recordSections: buildRecordSectionsFromExtremes(extremes, dayMap),
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

// Builds the same WeatherSummaryArchive shape, but from pre-aggregated daily
// rollup docs instead of raw observations. The rollups already have
// per-metric extremes baked in, so we don't need to walk a year of minute
// resolution data — one linear pass over ~365 docs is plenty.
export function buildWeatherSummaryArchiveFromRollups(
  rollups: WeatherDailyRollup[],
): WeatherSummaryArchive | null {
  if (!rollups.length) {
    return null;
  }

  const { dayMap, yearMap, extremes, earliestTimestamp, latestTimestamp } =
    aggregateRollups(rollups);
  const years = [...yearMap.keys()].sort((left, right) => left - right);

  return {
    stationStartLabel: earliestTimestamp ? formatSummaryMonthYear(earliestTimestamp) : "Unknown",
    lastUpdatedLabel: latestTimestamp ? formatSummaryDateTime(latestTimestamp) : "Unknown",
    monthlyReportRows: years.map((year) => ({
      year,
      months: WEATHER_SUMMARY_MONTH_LABELS.map(
        (_, monthIndex) => yearMap.get(year)?.months.has(monthIndex + 1) ?? false,
      ),
    })),
    recordSections: buildRecordSectionsFromExtremes(extremes, dayMap),
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

function aggregateRollups(rollups: WeatherDailyRollup[]) {
  const dayMap = new Map<string, DayAggregate>();
  const yearMap = new Map<number, YearAggregate>();
  const extremes: RecordExtremes = {
    tempMax: null,
    tempMin: null,
    dewpointMax: null,
    dewpointMin: null,
    rainRateMax: null,
    heatIndexMax: null,
    baromMax: null,
    baromMin: null,
    windMax: null,
    gustMax: null,
    windChillMin: null,
    solarMax: null,
    brightnessMax: null,
  };
  let earliestTimestamp = 0;
  let latestTimestamp = 0;

  for (const rollup of rollups) {
    const humidityHigh = rollup.humidityMax?.value ?? null;
    const humidityLow = rollup.humidityMin?.value ?? null;
    const avgHumidity =
      humidityHigh !== null && humidityLow !== null
        ? (humidityHigh + humidityLow) / 2
        : humidityHigh ?? humidityLow;

    const day: DayAggregate = {
      year: rollup.year,
      month: rollup.month,
      day: rollup.day,
      label: `${rollup.month}/${rollup.day}/${rollup.year}`,
      maxTemp: rollup.tempMax,
      minTemp: rollup.tempMin,
      tempSum: rollup.tempSum,
      tempCount: rollup.tempCount,
      maxSolar: rollup.solarMax,
      avgHumidity,
      dailyRainTotal:
        rollup.rainTotal > 0
          ? { value: rollup.rainTotal, timestamp: rollup.latestObservationAt }
          : null,
      maxLightning: rollup.lightningMax,
      observationCount: rollup.observationCount,
    };
    dayMap.set(rollup.dayKey, day);

    const yearAggregate = getYearAggregate(yearMap, rollup.year);
    const monthAggregate = getMonthAggregate(yearAggregate, rollup.month);

    if (rollup.tempCount > 0) {
      yearAggregate.tempSum += rollup.tempSum;
      yearAggregate.tempCount += rollup.tempCount;
      monthAggregate.tempSum += rollup.tempSum;
      monthAggregate.tempCount += rollup.tempCount;
    }
    monthAggregate.observationDays += 1;
    monthAggregate.rainTotal += rollup.rainTotal;
    monthAggregate.rainyDays += rollup.rainTotal > 0 ? 1 : 0;
    monthAggregate.lightningTotal += Math.round(rollup.lightningMax?.value ?? 0);

    extremes.tempMax = pickHighRecord(extremes.tempMax, rollup.tempMax);
    extremes.tempMin = pickLowRecord(extremes.tempMin, rollup.tempMin);
    extremes.dewpointMax = pickHighRecord(extremes.dewpointMax, rollup.dewpointMax);
    extremes.dewpointMin = pickLowRecord(extremes.dewpointMin, rollup.dewpointMin);
    extremes.rainRateMax = pickHighRecord(extremes.rainRateMax, rollup.rainRateMax);
    extremes.heatIndexMax = pickHighRecord(extremes.heatIndexMax, rollup.heatIndexMax);
    extremes.baromMax = pickHighRecord(extremes.baromMax, rollup.pressureMax);
    extremes.baromMin = pickLowRecord(extremes.baromMin, rollup.pressureMin);
    extremes.windMax = pickHighRecord(extremes.windMax, rollup.windMax);
    extremes.gustMax = pickHighRecord(extremes.gustMax, rollup.gustMax);
    extremes.windChillMin = pickLowRecord(extremes.windChillMin, rollup.windChillMin);
    extremes.solarMax = pickHighRecord(extremes.solarMax, rollup.solarMax);
    extremes.brightnessMax = pickHighRecord(extremes.brightnessMax, rollup.brightnessMax);

    const dayStart = rollup.tempMax?.timestamp ?? rollup.latestObservationAt;
    if (dayStart) {
      if (!earliestTimestamp || dayStart < earliestTimestamp) {
        earliestTimestamp = dayStart;
      }
      if (rollup.latestObservationAt > latestTimestamp) {
        latestTimestamp = rollup.latestObservationAt;
      }
    }
  }

  return { dayMap, yearMap, extremes, earliestTimestamp, latestTimestamp };
}

// Same shape as buildWeatherWeekView/MonthView but seeded from rollups.
// Used by the page's history-aware paths so navigating to a previous week
// or month doesn't trigger a fresh raw-observation scan.
export function buildWeekViewFromRollups(
  rollups: WeatherDailyRollup[],
  weekOffset = 0,
): WeatherWeekView {
  const dayMap = rollupsToDayMap(rollups);
  return buildWeekViewWithDayMap(dayMap, weekOffset);
}

export function buildMonthViewFromRollups(
  rollups: WeatherDailyRollup[],
  monthOffset = 0,
): WeatherMonthView {
  const dayMap = rollupsToDayMap(rollups);
  return buildMonthViewWithDayMap(dayMap, monthOffset);
}

function rollupsToDayMap(rollups: WeatherDailyRollup[]) {
  const dayMap = new Map<string, DayAggregate>();
  for (const rollup of rollups) {
    const humidityHigh = rollup.humidityMax?.value ?? null;
    const humidityLow = rollup.humidityMin?.value ?? null;
    const avgHumidity =
      humidityHigh !== null && humidityLow !== null
        ? (humidityHigh + humidityLow) / 2
        : humidityHigh ?? humidityLow;

    dayMap.set(rollup.dayKey, {
      year: rollup.year,
      month: rollup.month,
      day: rollup.day,
      label: `${rollup.month}/${rollup.day}/${rollup.year}`,
      maxTemp: rollup.tempMax,
      minTemp: rollup.tempMin,
      tempSum: rollup.tempSum,
      tempCount: rollup.tempCount,
      maxSolar: rollup.solarMax,
      avgHumidity,
      dailyRainTotal:
        rollup.rainTotal > 0
          ? { value: rollup.rainTotal, timestamp: rollup.latestObservationAt }
          : null,
      maxLightning: rollup.lightningMax,
      observationCount: rollup.observationCount,
    });
  }
  return dayMap;
}

export type WeatherWeekView = {
  matrices: WeatherPeriodMatrix[];
  navigation: WeatherPeriodNavigation;
  days: WeatherMonthCalendarDay[];
  weekStartKey: string;
};

export function buildWeatherWeekView(
  observations: WeatherObservation[],
  weekOffset = 0,
): WeatherWeekView {
  const { dayMap } = aggregateObservations(observations);
  return buildWeekViewWithDayMap(dayMap, weekOffset);
}

function buildWeekViewWithDayMap(
  dayMap: Map<string, DayAggregate>,
  weekOffset: number,
): WeatherWeekView {
  const today = getCalendarParts(Date.now());
  const todayKey = buildDayKey(today.year, today.month, today.day);
  const weekdayIndex = getWeekdayIndex(today.year, today.month, today.day);
  const currentWeekStart = shiftCalendarDay(today.year, today.month, today.day, -weekdayIndex);
  const start = shiftCalendarDay(currentWeekStart.year, currentWeekStart.month, currentWeekStart.day, weekOffset * 7);
  const startKey = buildDayKey(start.year, start.month, start.day);
  const end = shiftCalendarDay(start.year, start.month, start.day, 6);

  const columns = Array.from({ length: 7 }, (_, index) => {
    const day = shiftCalendarDay(start.year, start.month, start.day, index);
    const key = buildDayKey(day.year, day.month, day.day);
    return {
      key,
      label: formatShortWeekday(day.year, day.month, day.day),
      detail: formatMonthDay(day.year, day.month, day.day),
      isFuture: key > todayKey,
    } satisfies WeatherPeriodMatrixColumn;
  });

  const matrices = buildPeriodMatricesFromDayMap(dayMap, columns, "week");
  const days = columns.map((column) => buildCalendarDay(column.key, dayMap, todayKey, true));

  const startLabel = formatMonthDay(start.year, start.month, start.day);
  const endLabel = formatMonthDay(end.year, end.month, end.day);
  const yearLabel = start.year === end.year ? `, ${end.year}` : `, ${start.year}–${end.year}`;
  const navigation: WeatherPeriodNavigation = {
    rangeLabel: `${startLabel} – ${endLabel}${yearLabel}`,
    prevAnchor: String(weekOffset - 1),
    nextAnchor: weekOffset >= 0 ? null : String(weekOffset + 1),
    isCurrent: weekOffset === 0,
  };

  return {
    matrices,
    navigation,
    days,
    weekStartKey: startKey,
  };
}

function buildPeriodMatricesFromDayMap(
  dayMap: Map<string, DayAggregate>,
  columns: WeatherPeriodMatrixColumn[],
  view: "week" | "month",
): WeatherPeriodMatrix[] {
  if (!columns.length) {
    return [];
  }

  const periodLabel = view === "week" ? "week" : "month";
  const temperatureRows = buildTemperatureRows(columns, dayMap);
  const rainfallRows = buildRainfallRows(columns, dayMap);

  const matrices: WeatherPeriodMatrix[] = [
    {
      title: view === "week" ? "Daily Temperatures" : "Daily Temperatures",
      subtitle: `Daily highs and lows for the selected ${periodLabel}.`,
      unitLabel: "°F",
      summaryLabel: "Avg",
      colorScale: "temperature",
      columns,
      rows: temperatureRows,
    },
    {
      title: view === "week" ? "Daily Rainfall" : "Daily Rainfall",
      subtitle: `Daily rainfall totals for the selected ${periodLabel}.`,
      unitLabel: "in",
      summaryLabel: "Total",
      colorScale: "rain",
      columns,
      rows: rainfallRows,
    },
  ];

  return matrices.filter((matrix) =>
    matrix.rows.some((row) => row.cells.some((cell) => cell.hasObservation || !cell.isFuture)),
  );
}

// Backwards-compatible API used elsewhere in the page; just delegates to the
// week/month view builders so the single aggregation pass is shared.
export function buildWeatherPeriodMatrices(
  observations: WeatherObservation[],
  view: "week" | "month",
): WeatherPeriodMatrix[] {
  if (!observations.length) {
    return [];
  }

  if (view === "week") {
    return buildWeatherWeekView(observations, 0).matrices;
  }

  return buildWeatherMonthView(observations, 0).matrices;
}

export type WeatherMonthView = {
  matrices: WeatherPeriodMatrix[];
  calendar: WeatherMonthCalendar;
};

export function buildWeatherMonthView(
  observations: WeatherObservation[],
  monthOffset = 0,
): WeatherMonthView {
  const { dayMap } = aggregateObservations(observations);
  return buildMonthViewWithDayMap(dayMap, monthOffset);
}

function buildMonthViewWithDayMap(
  dayMap: Map<string, DayAggregate>,
  monthOffset: number,
): WeatherMonthView {
  const calendar = buildMonthCalendarWithDayMap(dayMap, monthOffset);
  const today = getCalendarParts(Date.now());
  const todayKey = buildDayKey(today.year, today.month, today.day);
  const anchor = shiftToMonth(today.year, today.month, monthOffset);
  const daysInMonth = getDaysInMonth(anchor.year, anchor.month);

  const columns = Array.from({ length: daysInMonth }, (_, index) => {
    const dayNumber = index + 1;
    const key = buildDayKey(anchor.year, anchor.month, dayNumber);
    return {
      key,
      label: String(dayNumber),
      detail: formatShortWeekday(anchor.year, anchor.month, dayNumber),
      isFuture: key > todayKey,
    } satisfies WeatherPeriodMatrixColumn;
  });

  const matrices = buildPeriodMatricesFromDayMap(dayMap, columns, "month");

  return { matrices, calendar };
}

export function buildWeatherMonthCalendar(
  observations: WeatherObservation[],
  monthOffset = 0,
): WeatherMonthCalendar | null {
  if (!observations.length && monthOffset === 0) {
    return null;
  }

  const { dayMap } = aggregateObservations(observations);
  return buildMonthCalendarWithDayMap(dayMap, monthOffset);
}

function buildMonthCalendarWithDayMap(
  dayMap: Map<string, DayAggregate>,
  monthOffset: number,
): WeatherMonthCalendar {
  const today = getCalendarParts(Date.now());
  const todayKey = buildDayKey(today.year, today.month, today.day);
  const anchor = shiftToMonth(today.year, today.month, monthOffset);
  const firstWeekday = getWeekdayIndex(anchor.year, anchor.month, 1);
  const daysInMonth = getDaysInMonth(anchor.year, anchor.month);
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  const days: WeatherMonthCalendarDay[] = Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - firstWeekday + 1;

    if (dayNumber < 1 || dayNumber > daysInMonth) {
      return {
        key: `empty-${index}`,
        dayNumber: null,
        isCurrentMonth: false,
        isFuture: false,
        isToday: false,
        isInRange: false,
        highValue: null,
        highDisplay: "-",
        lowValue: null,
        lowDisplay: "-",
        rainValue: null,
        rainDisplay: "-",
        hasObservations: false,
        weekdayLabel: "",
        longDateLabel: "",
        condition: "unknown",
      } satisfies WeatherMonthCalendarDay;
    }

    const key = buildDayKey(anchor.year, anchor.month, dayNumber);
    return buildCalendarDay(key, dayMap, todayKey, true);
  });

  const weeks = Array.from({ length: days.length / 7 }, (_, index) =>
    days.slice(index * 7, index * 7 + 7),
  );

  const monthLabel = formatLongMonthYear(anchor.year, anchor.month, 1);
  const isCurrent = monthOffset === 0;
  const navigation: WeatherPeriodNavigation = {
    rangeLabel: monthLabel,
    prevAnchor: String(monthOffset - 1),
    nextAnchor: monthOffset >= 0 ? null : String(monthOffset + 1),
    isCurrent,
  };

  return {
    title: "Monthly Calendar",
    subtitle: "Tap any day to drill into station observations for that date.",
    monthLabel,
    weeks,
    navigation,
  };
}

function buildCalendarDay(
  key: string,
  dayMap: Map<string, DayAggregate>,
  todayKey: string,
  isCurrentMonth: boolean,
): WeatherMonthCalendarDay {
  const aggregate = dayMap.get(key);
  const [yearStr, monthStr, dayStr] = key.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const dayNumber = Number(dayStr);

  return {
    key,
    dayNumber,
    isCurrentMonth,
    isFuture: key > todayKey,
    isToday: key === todayKey,
    isInRange: true,
    highValue: aggregate?.maxTemp?.value ?? null,
    highDisplay: aggregate?.maxTemp ? formatNumber(aggregate.maxTemp.value, 0) : "-",
    lowValue: aggregate?.minTemp?.value ?? null,
    lowDisplay: aggregate?.minTemp ? formatNumber(aggregate.minTemp.value, 0) : "-",
    rainValue: aggregate?.dailyRainTotal?.value ?? null,
    rainDisplay: aggregate?.dailyRainTotal ? formatNumber(aggregate.dailyRainTotal.value, 2) : "-",
    hasObservations: !!aggregate && aggregate.observationCount > 0,
    weekdayLabel: formatShortWeekday(year, month, dayNumber),
    longDateLabel: formatLongDate(year, month, dayNumber),
    condition: inferDayCondition(aggregate),
  };
}

// Friendly icon picker that walks down a priority list — storms beat rain,
// rain beats clouds, clouds beat sun, etc. Solar radiation tells us how
// sunny it actually was; humidity is a tiebreaker for overcast vs clear.
export function inferDayCondition(
  aggregate: DayAggregate | null | undefined,
): WeatherDayCondition {
  if (!aggregate || aggregate.observationCount === 0) {
    return "unknown";
  }

  const lightning = aggregate.maxLightning?.value ?? 0;
  if (lightning >= 1) {
    return "stormy";
  }

  const lowTemp = aggregate.minTemp?.value ?? null;
  const rainTotal = aggregate.dailyRainTotal?.value ?? 0;
  if (rainTotal >= 0.05 && lowTemp !== null && lowTemp <= 32) {
    return "snowy";
  }

  if (rainTotal >= 0.1) {
    return "rainy";
  }

  const solarPeak = aggregate.maxSolar?.value ?? null;
  const humidity = aggregate.avgHumidity ?? null;

  // Strong daytime solar signal → mostly sunny.
  if (solarPeak !== null && solarPeak >= 700 && (humidity === null || humidity < 75)) {
    return "sunny";
  }

  if (solarPeak !== null && solarPeak >= 350) {
    return "partly-cloudy";
  }

  if (humidity !== null && humidity >= 85) {
    return "cloudy";
  }

  if (solarPeak !== null && solarPeak < 200) {
    return "cloudy";
  }

  return "partly-cloudy";
}

// Plain-language paragraph describing the selected week. We compare against
// the same calendar window from a week earlier (when both windows have at
// least a couple of observed days) so the summary feels like a real story
// rather than just a stat dump.
export function buildWeatherWeekStory(
  weekDays: WeatherMonthCalendarDay[],
  priorWeekDays: WeatherMonthCalendarDay[] = [],
  rangeLabel: string,
  isCurrent: boolean,
): WeatherWeekStory | null {
  const observedDays = weekDays.filter((day) => day.hasObservations);

  if (!observedDays.length) {
    return null;
  }

  const highs = observedDays
    .map((day) => day.highValue)
    .filter((value): value is number => value !== null);
  const lows = observedDays
    .map((day) => day.lowValue)
    .filter((value): value is number => value !== null);
  const totalRain = observedDays.reduce(
    (sum, day) => sum + (day.rainValue ?? 0),
    0,
  );
  const rainyDays = observedDays.filter((day) => (day.rainValue ?? 0) >= 0.01).length;
  const peakDay = observedDays.reduce<WeatherMonthCalendarDay | null>((best, day) => {
    if (day.highValue === null) return best;
    if (!best || (best.highValue ?? -Infinity) < day.highValue) return day;
    return best;
  }, null);
  const coldestDay = observedDays.reduce<WeatherMonthCalendarDay | null>((best, day) => {
    if (day.lowValue === null) return best;
    if (!best || (best.lowValue ?? Infinity) > day.lowValue) return day;
    return best;
  }, null);

  const avgHigh = highs.length ? highs.reduce((s, v) => s + v, 0) / highs.length : null;
  const avgLow = lows.length ? lows.reduce((s, v) => s + v, 0) / lows.length : null;

  const priorObserved = priorWeekDays.filter((day) => day.hasObservations);
  const priorHighs = priorObserved
    .map((day) => day.highValue)
    .filter((v): v is number => v !== null);
  const priorAvgHigh = priorHighs.length
    ? priorHighs.reduce((s, v) => s + v, 0) / priorHighs.length
    : null;

  const tempDirection =
    avgHigh !== null && priorAvgHigh !== null
      ? avgHigh - priorAvgHigh
      : null;

  const sentences: string[] = [];

  if (avgHigh !== null && avgLow !== null) {
    sentences.push(
      `${isCurrent ? "This week so far" : "That week"}, the daily high averaged <strong>${formatNumber(avgHigh, 0)}°F</strong> with overnight lows around <em>${formatNumber(avgLow, 0)}°F</em>.`,
    );
  }

  if (peakDay && peakDay.highValue !== null) {
    sentences.push(
      `The warmest moment was <strong>${peakDay.weekdayLabel} (${formatNumber(peakDay.highValue, 0)}°F)</strong>${coldestDay && coldestDay.key !== peakDay.key && coldestDay.lowValue !== null ? `, and the coldest was <em>${coldestDay.weekdayLabel} morning at ${formatNumber(coldestDay.lowValue, 0)}°F</em>` : ""}.`,
    );
  }

  if (rainyDays > 0) {
    sentences.push(
      `It rained on <strong>${rainyDays} ${rainyDays === 1 ? "day" : "days"}</strong>, totaling ${formatNumber(totalRain, 2)} inches.`,
    );
  } else {
    sentences.push("There was <strong>no measurable rainfall</strong> across the week.");
  }

  if (tempDirection !== null && Math.abs(tempDirection) >= 1.5) {
    sentences.push(
      tempDirection > 0
        ? `Overall, things ran <strong>${formatNumber(Math.abs(tempDirection), 0)}° warmer</strong> than the previous week.`
        : `Overall, things ran <em>${formatNumber(Math.abs(tempDirection), 0)}° cooler</em> than the previous week.`,
    );
  }

  const stats = [
    avgHigh !== null
      ? {
          label: "Avg High",
          value: `${formatNumber(avgHigh, 0)}°`,
          note: "Daily peak temperature",
        }
      : null,
    avgLow !== null
      ? {
          label: "Avg Low",
          value: `${formatNumber(avgLow, 0)}°`,
          note: "Overnight minimum",
        }
      : null,
    {
      label: "Rainfall",
      value: `${formatNumber(totalRain, 2)}″`,
      note: `${rainyDays} rainy ${rainyDays === 1 ? "day" : "days"}`,
    },
    peakDay && peakDay.highValue !== null
      ? {
          label: "Hottest",
          value: `${formatNumber(peakDay.highValue, 0)}°`,
          note: peakDay.weekdayLabel,
        }
      : null,
  ].filter((stat): stat is { label: string; value: string; note: string } => stat !== null);

  return {
    eyebrow: isCurrent ? "This Week's Story" : "Weekly Recap",
    title: rangeLabel,
    body: sentences.join(" "),
    stats,
  };
}

export function buildWeatherDayDetail(
  observations: WeatherObservation[],
  dayKey: string,
): WeatherDayDetail {
  const [yearStr, monthStr, dayStr] = dayKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const longDateLabel = formatLongDate(year, month, day);

  if (!observations.length) {
    return {
      dayKey,
      longDateLabel,
      hasObservations: false,
      highDisplay: "-",
      lowDisplay: "-",
      averageDisplay: "-",
      rainDisplay: "-",
      observationCount: 0,
    };
  }

  const { dayMap } = aggregateObservations(observations);
  const aggregate = dayMap.get(dayKey);

  if (!aggregate) {
    return {
      dayKey,
      longDateLabel,
      hasObservations: false,
      highDisplay: "-",
      lowDisplay: "-",
      averageDisplay: "-",
      rainDisplay: "-",
      observationCount: 0,
    };
  }

  return {
    dayKey,
    longDateLabel,
    hasObservations: true,
    highDisplay: aggregate.maxTemp ? `${formatNumber(aggregate.maxTemp.value, 1)} °F` : "-",
    lowDisplay: aggregate.minTemp ? `${formatNumber(aggregate.minTemp.value, 1)} °F` : "-",
    averageDisplay:
      aggregate.tempCount > 0
        ? `${formatNumber(aggregate.tempSum / aggregate.tempCount, 1)} °F`
        : "-",
    rainDisplay: aggregate.dailyRainTotal
      ? `${formatNumber(aggregate.dailyRainTotal.value, 2)} in`
      : "0 in",
    observationCount: aggregate.observationCount,
  };
}

function buildTemperatureRows(
  columns: WeatherPeriodMatrixColumn[],
  dayMap: Map<string, DayAggregate>,
): WeatherPeriodMatrixRow[] {
  const highs = columns.map((column) => buildMetricCell(dayMap.get(column.key)?.maxTemp, 0, column.isFuture));
  const lows = columns.map((column) => buildMetricCell(dayMap.get(column.key)?.minTemp, 0, column.isFuture));

  return [
    {
      label: "High",
      summaryValue: formatAverageSummary(highs, 1),
      cells: highs,
    },
    {
      label: "Low",
      summaryValue: formatAverageSummary(lows, 1),
      cells: lows,
    },
  ];
}

function buildRainfallRows(
  columns: WeatherPeriodMatrixColumn[],
  dayMap: Map<string, DayAggregate>,
): WeatherPeriodMatrixRow[] {
  const rain = columns.map((column) =>
    buildMetricCell(dayMap.get(column.key)?.dailyRainTotal, 2, column.isFuture),
  );

  return [
    {
      label: "Rain",
      summaryValue: formatTotalSummary(rain, 2),
      cells: rain,
    },
  ];
}

function buildRecordSectionsFromExtremes(
  extremes: RecordExtremes,
  dayMap: Map<string, DayAggregate>,
): WeatherSummarySection[] {
  const dayAggregates = [...dayMap.values()];

  return [
    {
      title: "Outside Temperatures",
      rows: [
        buildMetricRow("Highest", extremes.tempMax, 1, "°F"),
        buildMetricRow("Lowest", extremes.tempMin, 1, "°F"),
        buildMetricRow("Min Max", pickMinMax(dayAggregates), 1, "°F"),
        buildMetricRow("Max Min", pickMaxMin(dayAggregates), 1, "°F"),
      ].filter((row): row is WeatherSummaryRecordRow => row !== null),
    },
    {
      title: "Dewpoint",
      rows: [
        buildMetricRow("Highest", extremes.dewpointMax, 1, "°F"),
        buildMetricRow("Lowest", extremes.dewpointMin, 1, "°F"),
      ].filter((row): row is WeatherSummaryRecordRow => row !== null),
    },
    {
      title: "Precipitation",
      rows: [
        buildMetricRow(
          "Highest Daily Rainfall",
          findExtremeDay(dayAggregates, "dailyRainTotal", "max"),
          2,
          "in",
          true,
        ),
        buildMetricRow("Highest Rain Rate", extremes.rainRateMax, 2, "in/h"),
      ].filter((row): row is WeatherSummaryRecordRow => row !== null),
    },
    {
      title: "Heat Index",
      rows: [buildMetricRow("Highest", extremes.heatIndexMax, 1, "°F")].filter(
        (row): row is WeatherSummaryRecordRow => row !== null,
      ),
    },
    {
      title: "Barometer",
      rows: [
        buildMetricRow("Highest", extremes.baromMax, 3, "inHg"),
        buildMetricRow("Lowest", extremes.baromMin, 3, "inHg"),
      ].filter((row): row is WeatherSummaryRecordRow => row !== null),
    },
    {
      title: "Wind",
      rows: [
        buildMetricRow("Highest Sustained", extremes.windMax, 1, "mph"),
        buildMetricRow("Highest Gust", extremes.gustMax, 1, "mph"),
      ].filter((row): row is WeatherSummaryRecordRow => row !== null),
    },
    {
      title: "Wind Chill",
      rows: [buildMetricRow("Lowest", extremes.windChillMin, 1, "°F")].filter(
        (row): row is WeatherSummaryRecordRow => row !== null,
      ),
    },
    {
      title: "Solar Radiation",
      rows: [buildMetricRow("Highest", extremes.solarMax, 0, "W/m²")].filter(
        (row): row is WeatherSummaryRecordRow => row !== null,
      ),
    },
    {
      title: "Brightness",
      rows: [buildMetricRow("Highest", extremes.brightnessMax, 0, "lx")].filter(
        (row): row is WeatherSummaryRecordRow => row !== null,
      ),
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

function buildMetricCell(
  record: MetricRecord | null | undefined,
  decimals: number,
  isFuture: boolean,
): WeatherPeriodMatrixCell {
  if (!record) {
    return {
      displayValue: "-",
      numericValue: null,
      hasObservation: false,
      isFuture,
    };
  }

  return {
    displayValue: formatNumber(record.value, decimals),
    numericValue: record.value,
    hasObservation: true,
    isFuture,
  };
}

function findExtremeDay(
  days: DayAggregate[],
  key: "dailyRainTotal" | "maxLightning",
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

function pickObservationRecord(observation: WeatherObservation, keys: string[], timestamp: number) {
  const value = pickNumber(observation, keys);

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
  const parts = calendarPartsFormatter.formatToParts(new Date(timestamp));

  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? "0"),
    month: Number(parts.find((part) => part.type === "month")?.value ?? "0"),
    day: Number(parts.find((part) => part.type === "day")?.value ?? "0"),
  };
}

export function buildDayKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getCurrentDayKey() {
  const today = getCalendarParts(Date.now());
  return buildDayKey(today.year, today.month, today.day);
}

function getWeekdayIndex(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0)).getUTCDay();
}

function shiftCalendarDay(year: number, month: number, day: number, offsetDays: number) {
  const date = new Date(Date.UTC(year, month - 1, day + offsetDays, 12, 0, 0, 0));

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function shiftToMonth(year: number, month: number, monthOffset: number) {
  const date = new Date(Date.UTC(year, month - 1 + monthOffset, 1, 12, 0, 0, 0));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
  };
}

function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0, 12, 0, 0, 0)).getUTCDate();
}

function formatShortWeekday(year: number, month: number, day: number) {
  return shortWeekdayFormatter.format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0)));
}

function formatMonthDay(year: number, month: number, day: number) {
  return monthDayFormatter.format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0)));
}

function formatLongDate(year: number, month: number, day: number) {
  return longDateFormatter.format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0)));
}

function formatLongMonthYear(year: number, month: number, day: number) {
  return monthLongYearFormatter.format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0)));
}

function formatAverageSummary(cells: WeatherPeriodMatrixCell[], decimals: number) {
  const values = cells
    .map((cell) => cell.numericValue)
    .filter((value): value is number => value !== null);

  if (!values.length) {
    return "-";
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return formatNumber(average, decimals);
}

function formatTotalSummary(cells: WeatherPeriodMatrixCell[], decimals: number) {
  const values = cells
    .map((cell) => cell.numericValue)
    .filter((value): value is number => value !== null);

  if (!values.length) {
    return "-";
  }

  return formatNumber(values.reduce((sum, value) => sum + value, 0), decimals);
}

function formatNumber(value: number, decimals: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

function roundMetric(value: number, decimals: number) {
  const precision = 10 ** decimals;
  return Math.round(value * precision) / precision;
}

function formatSummaryDateTime(timestamp: number) {
  return summaryDateTimeFormatter.format(new Date(timestamp));
}

function formatSummaryDate(timestamp: number) {
  return summaryDateFormatter.format(new Date(timestamp));
}

function formatSummaryMonthYear(timestamp: number) {
  return summaryMonthYearFormatter.format(new Date(timestamp));
}
