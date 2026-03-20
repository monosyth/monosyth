import type { WeatherOverview, WeatherSeries, WeatherSnapshotItem } from "@/lib/weather/types";

type StoryTone = "gold" | "sky" | "rain" | "pine";

export type WeatherStory = {
  mood: {
    title: string;
    subtitle: string;
    tone: StoryTone;
    temperatureDisplay: string;
    stamp: string;
    chips: string[];
  };
  outfit: {
    title: string;
    summary: string;
    pieces: string[];
    tone: StoryTone;
  };
  activity: Array<{
    title: string;
    verdict: string;
    summary: string;
    tone: StoryTone;
  }>;
  visuals: {
    wind: {
      directionDegrees: number | null;
      directionLabel: string;
      speedLabel: string;
      gustLabel: string;
      tone: StoryTone;
    };
    rain: {
      fillPercent: number;
      label: string;
      subtext: string;
      tone: StoryTone;
    };
  };
  categories: Array<{
    id: string;
    title: string;
    eyebrow: string;
    summary: string;
    value: string;
    meterLabel: string;
    meterValue: number;
    tone: StoryTone;
    details: string[];
  }>;
  changes: Array<{
    title: string;
    summary: string;
    tone: StoryTone;
  }>;
};

export function buildWeatherStory(data: WeatherOverview): WeatherStory {
  const temperature = metricValue(data, "temperature");
  const humidity = metricValue(data, "humidity");
  const wind = metricValue(data, "wind");
  const gust = metricValue(data, "gust");
  const rainToday = metricValue(data, "rainToday");
  const uv = metricValue(data, "uv");
  const solar = metricValue(data, "solar");
  const pressure = metricValue(data, "pressure");
  const dewPoint = snapshotNumber(data.snapshot, "dewPoint");
  const hourlyRain = snapshotNumber(data.snapshot, "hourlyrainin");
  const windDegrees = snapshotNumber(data.snapshot, "winddir");
  const windDirection = cardinalDirection(snapshotNumber(data.snapshot, "winddir"));

  return {
    mood: {
      title: buildMoodTitle({ temperature, wind, rainToday, uv }),
      subtitle: buildMoodSubtitle({
        temperature,
        humidity,
        wind,
        rainToday,
        uv,
        solar,
      }),
      tone: pickMoodTone({ wind, rainToday, uv, temperature }),
      temperatureDisplay: formatTemperature(temperature),
      stamp: data.station.lastObservationAt || formatDate(data.fetchedAt),
      chips: [
        comfortChip(temperature, humidity),
        windChip(wind, gust),
        rainChip(rainToday, hourlyRain),
        sunChip(uv, solar),
      ].filter(Boolean),
    },
    outfit: buildOutfit({ temperature, wind, rainToday, uv, humidity }),
    activity: buildActivities({ temperature, wind, rainToday, uv }),
    visuals: {
      wind: {
        directionDegrees: windDegrees,
        directionLabel: windDirection || "Variable",
        speedLabel: numberWithUnit(wind, "mph", 1),
        gustLabel: numberWithUnit(gust, "mph", 1),
        tone: pickWindTone(wind, gust),
      },
      rain: {
        fillPercent: clamp(percentOf(rainToday, 1.25), 0, 100),
        label: rainChip(rainToday, hourlyRain) || "Dry ground",
        subtext:
          (hourlyRain ?? 0) > 0
            ? `${numberWithUnit(hourlyRain, "in", 2)} this hour`
            : `${numberWithUnit(rainToday, "in", 2)} today`,
        tone: pickRainTone(rainToday, hourlyRain),
      },
    },
    categories: [
      {
        id: "comfort",
        title: "Temperature & Comfort",
        eyebrow: comfortChip(temperature, humidity) || "Outdoor comfort",
        summary: comfortSummary(temperature, humidity, dewPoint),
        value: formatTemperature(temperature),
        meterLabel: "Comfort balance",
        meterValue: comfortMeter(temperature, humidity),
        tone: pickComfortTone(temperature),
        details: [
          formatDetail("Humidity", percent(humidity)),
          formatDetail("Dew point", numberWithUnit(dewPoint, "F", 1)),
          formatDetail("Feels outside", comfortPhrase(temperature, humidity)),
        ],
      },
      {
        id: "wind",
        title: "Wind & Motion",
        eyebrow: windChip(wind, gust) || "Air movement",
        summary: windSummary(wind, gust, windDirection),
        value: numberWithUnit(wind, "mph", 1),
        meterLabel: "Wind energy",
        meterValue: clamp(percentOf(wind, 25), 0, 100),
        tone: pickWindTone(wind, gust),
        details: [
          formatDetail("Peak gust", numberWithUnit(gust, "mph", 1)),
          formatDetail("Direction", windDirection || "Variable"),
          formatDetail("How it feels", windPhrase(wind)),
        ],
      },
      {
        id: "rain",
        title: "Rain & Ground",
        eyebrow: rainChip(rainToday, hourlyRain) || "Ground moisture",
        summary: rainSummary(rainToday, hourlyRain),
        value: numberWithUnit(rainToday, "in", 2),
        meterLabel: "Rain today",
        meterValue: clamp(percentOf(rainToday, 1), 0, 100),
        tone: pickRainTone(rainToday, hourlyRain),
        details: [
          formatDetail("This hour", numberWithUnit(hourlyRain, "in", 2)),
          formatDetail("Today", numberWithUnit(rainToday, "in", 2)),
          formatDetail("Ground story", rainPhrase(rainToday)),
        ],
      },
      {
        id: "sky",
        title: "Sky & Sun",
        eyebrow: sunChip(uv, solar) || "Brightness and pressure",
        summary: skySummary(uv, solar, pressure),
        value: uvLabel(uv),
        meterLabel: "Sun strength",
        meterValue: clamp(percentOf(uv, 11), 0, 100),
        tone: pickSkyTone(uv, solar),
        details: [
          formatDetail("Solar", numberWithUnit(solar, "W/m2", 0)),
          formatDetail("UV", numberWithUnit(uv, "", 1)),
          formatDetail("Pressure", numberWithUnit(pressure, "inHg", 2)),
        ],
      },
    ],
    changes: [
      describeSeriesChange(findSeries(data.series, "temperature"), "Temperature", "gold"),
      describeSeriesChange(findSeries(data.series, "wind"), "Wind", "sky"),
      describeSeriesChange(findSeries(data.series, "humidity"), "Humidity", "pine"),
      describeSeriesChange(findSeries(data.series, "rain"), "Rain", "rain"),
    ].filter((value): value is NonNullable<typeof value> => value !== null),
  };
}

function buildOutfit(values: {
  temperature: number | null;
  wind: number | null;
  rainToday: number | null;
  uv: number | null;
  humidity: number | null;
}) {
  const pieces = [];
  const temperature = values.temperature ?? 65;
  const wind = values.wind ?? 0;
  const rainToday = values.rainToday ?? 0;
  const uv = values.uv ?? 0;
  const humidity = values.humidity ?? 50;

  if (temperature < 45) {
    pieces.push("jacket");
  } else if (temperature < 60) {
    pieces.push("light layer");
  } else if (temperature > 82) {
    pieces.push("cool clothes");
  } else {
    pieces.push("easy layer");
  }

  if (wind >= 12) {
    pieces.push("wind-ready outer layer");
  }

  if (rainToday > 0 || humidity > 82) {
    pieces.push("water-resistant shoes");
  }

  if (uv >= 5) {
    pieces.push("hat or sunscreen");
  }

  return {
    title:
      temperature < 50
        ? "Dress for a cool edge."
        : temperature > 82
          ? "Dress light and breathable."
          : "A flexible layer is enough.",
    summary: `If you were heading out right now, ${outfitSummary(
      temperature,
      wind,
      rainToday,
      uv,
    )}`,
    pieces,
    tone: pickMoodTone(values),
  };
}

function buildActivities(values: {
  temperature: number | null;
  wind: number | null;
  rainToday: number | null;
  uv: number | null;
}) {
  const walkScore = scoreWalk(values);
  const patioScore = scorePatio(values);
  const gardenScore = scoreGarden(values);

  return [
    {
      title: "Walk",
      verdict: activityVerdict(walkScore),
      summary: walkSummary(values, walkScore),
      tone: activityTone(walkScore),
    },
    {
      title: "Patio time",
      verdict: activityVerdict(patioScore),
      summary: patioSummary(values, patioScore),
      tone: activityTone(patioScore),
    },
    {
      title: "Garden check",
      verdict: activityVerdict(gardenScore),
      summary: gardenSummary(values, gardenScore),
      tone: activityTone(gardenScore),
    },
  ];
}

function metricValue(data: WeatherOverview, id: string) {
  return data.metrics.find((metric) => metric.id === id)?.value ?? null;
}

function snapshotNumber(snapshot: WeatherSnapshotItem[], key: string) {
  const raw = snapshot.find((item) => item.key === key)?.value ?? "";
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function findSeries(seriesList: WeatherSeries[], id: string) {
  return seriesList.find((series) => series.id === id) ?? null;
}

function describeSeriesChange(
  series: WeatherSeries | null,
  title: string,
  tone: StoryTone,
) {
  if (!series || series.points.length < 2) {
    return null;
  }

  const start = series.points[0].value;
  const end = series.points.at(-1)?.value ?? start;
  const change = end - start;
  const direction =
    Math.abs(change) < 0.01 ? "held steady" : change > 0 ? "moved up" : "moved down";

  return {
    title,
    tone,
    summary: `${direction} from ${compact(start, series.decimals)} to ${compact(end, series.decimals)} ${series.unit}`.trim(),
  };
}

function buildMoodTitle(values: {
  temperature: number | null;
  wind: number | null;
  rainToday: number | null;
  uv: number | null;
}) {
  if ((values.rainToday ?? 0) >= 0.15) {
    return "Rain has made the day feel active and damp.";
  }

  if ((values.wind ?? 0) >= 12) {
    return "The air outside feels lively and in motion.";
  }

  if ((values.uv ?? 0) >= 6 && (values.temperature ?? 0) >= 72) {
    return "It feels bright, warm, and very daytime.";
  }

  if ((values.temperature ?? 0) <= 45) {
    return "It feels crisp, cool, and worth a jacket.";
  }

  return "Outside feels calm, readable, and easy to understand.";
}

function buildMoodSubtitle(values: {
  temperature: number | null;
  humidity: number | null;
  wind: number | null;
  rainToday: number | null;
  uv: number | null;
  solar: number | null;
}) {
  return `${comfortPhrase(values.temperature, values.humidity)}. ${windPhrase(values.wind)}. ${skyPhrase(values.uv, values.solar)}.`;
}

function comfortSummary(
  temperature: number | null,
  humidity: number | null,
  dewPoint: number | null,
) {
  const dewText =
    dewPoint === null
      ? "The air reading is easy to read at a glance."
      : `Dew point is ${compact(dewPoint, 1)}F, which helps explain how sticky the air feels.`;

  return `${comfortPhrase(temperature, humidity)}. ${dewText}`;
}

function windSummary(
  wind: number | null,
  gust: number | null,
  direction: string,
) {
  const directionText = direction ? ` from the ${direction}` : "";
  const gustText =
    gust === null ? "Gust data is not available right now." : `Strongest gust reached ${compact(gust, 1)} mph.`;

  return `${windPhrase(wind)}${directionText}. ${gustText}`;
}

function rainSummary(rainToday: number | null, hourlyRain: number | null) {
  const hourlyText =
    hourlyRain === null
      ? "Hourly rainfall is not available."
      : hourlyRain > 0
        ? `${compact(hourlyRain, 2)} inches fell in the last hour.`
        : "No measurable rain fell in the last hour.";

  return `${rainPhrase(rainToday)} ${hourlyText}`;
}

function skySummary(
  uv: number | null,
  solar: number | null,
  pressure: number | null,
) {
  const pressureText =
    pressure === null
      ? ""
      : ` Pressure is ${compact(pressure, 2)} inHg, which helps frame the current sky setup.`;

  return `${skyPhrase(uv, solar)}.${pressureText}`;
}

function comfortPhrase(temperature: number | null, humidity: number | null) {
  const temp = temperature ?? 0;
  const hum = humidity ?? 50;

  if (temp <= 40) {
    return hum >= 75 ? "It feels cold and damp" : "It feels cold and crisp";
  }

  if (temp <= 58) {
    return hum >= 70 ? "It feels cool with a little moisture in the air" : "It feels cool and comfortable";
  }

  if (temp <= 76) {
    return hum >= 70 ? "It feels mild but a bit sticky" : "It feels mild and easygoing";
  }

  if (temp <= 88) {
    return hum >= 65 ? "It feels warm and muggy" : "It feels warm and open";
  }

  return hum >= 55 ? "It feels hot and heavy" : "It feels hot and dry";
}

function outfitSummary(
  temperature: number,
  wind: number,
  rainToday: number,
  uv: number,
) {
  if (rainToday > 0.1) {
    return "plan for a damp day and keep something weather-ready nearby.";
  }

  if (wind >= 12) {
    return "the main thing to account for is moving air, not just temperature.";
  }

  if (temperature >= 82 && uv >= 5) {
    return "the sun will matter as much as the thermometer.";
  }

  if (temperature <= 50) {
    return "a little insulation will make the outside feel much friendlier.";
  }

  return "you probably only need one easy extra layer.";
}

function scoreWalk(values: {
  temperature: number | null;
  wind: number | null;
  rainToday: number | null;
}) {
  let score = 78;

  if ((values.temperature ?? 65) < 42 || (values.temperature ?? 65) > 92) {
    score -= 24;
  }

  if ((values.wind ?? 0) > 18) {
    score -= 18;
  }

  if ((values.rainToday ?? 0) > 0.15) {
    score -= 20;
  }

  return clamp(score, 0, 100);
}

function scorePatio(values: {
  temperature: number | null;
  wind: number | null;
  rainToday: number | null;
  uv: number | null;
}) {
  let score = 74;

  if ((values.rainToday ?? 0) > 0.05) {
    score -= 35;
  }

  if ((values.wind ?? 0) > 15) {
    score -= 18;
  }

  if ((values.temperature ?? 68) < 55 || (values.temperature ?? 68) > 90) {
    score -= 16;
  }

  if ((values.uv ?? 0) > 8) {
    score -= 8;
  }

  return clamp(score, 0, 100);
}

function scoreGarden(values: {
  temperature: number | null;
  wind: number | null;
  rainToday: number | null;
  uv: number | null;
}) {
  let score = 70;

  if ((values.rainToday ?? 0) > 0.2) {
    score -= 25;
  }

  if ((values.wind ?? 0) > 12) {
    score -= 10;
  }

  if ((values.temperature ?? 68) < 38 || (values.temperature ?? 68) > 95) {
    score -= 20;
  }

  if ((values.uv ?? 0) > 9) {
    score -= 10;
  }

  return clamp(score, 0, 100);
}

function activityVerdict(score: number) {
  if (score >= 72) {
    return "Great";
  }

  if (score >= 50) {
    return "Okay";
  }

  return "Maybe later";
}

function activityTone(score: number): StoryTone {
  if (score >= 72) {
    return "pine";
  }

  if (score >= 50) {
    return "gold";
  }

  return "rain";
}

function walkSummary(
  values: { temperature: number | null; wind: number | null; rainToday: number | null },
  score: number,
) {
  if (score >= 72) {
    return "A walk should feel easy with only minor weather friction.";
  }

  if ((values.rainToday ?? 0) > 0.15) {
    return "The rain is the biggest reason to skip the long version.";
  }

  if ((values.wind ?? 0) > 18) {
    return "Walking is fine, but the air movement will be the main thing you notice.";
  }

  return "A short walk is still doable, but the weather is asking for some compromise.";
}

function patioSummary(
  values: {
    temperature: number | null;
    wind: number | null;
    rainToday: number | null;
    uv: number | null;
  },
  score: number,
) {
  if (score >= 72) {
    return "Sitting outside looks pretty inviting right now.";
  }

  if ((values.rainToday ?? 0) > 0.05) {
    return "Moisture is the main patio spoiler at the moment.";
  }

  if ((values.uv ?? 0) > 8) {
    return "Shade matters if you plan to stay out for a while.";
  }

  return "Patio time works better with a little shelter or timing.";
}

function gardenSummary(
  values: {
    temperature: number | null;
    wind: number | null;
    rainToday: number | null;
  },
  score: number,
) {
  if (score >= 72) {
    return "This looks like a comfortable window for a quick garden check.";
  }

  if ((values.rainToday ?? 0) > 0.2) {
    return "The ground may already be doing enough on its own.";
  }

  if ((values.wind ?? 0) > 12) {
    return "Wind will make delicate outdoor chores feel fussier than usual.";
  }

  return "You can still head out, but the timing is not especially ideal.";
}

function windPhrase(wind: number | null) {
  const value = wind ?? 0;

  if (value < 2) {
    return "The air is almost still";
  }

  if (value < 7) {
    return "There is a light breeze";
  }

  if (value < 14) {
    return "The breeze is noticeable";
  }

  if (value < 22) {
    return "It feels windy";
  }

  return "The wind is a major part of the experience";
}

function rainPhrase(rainToday: number | null) {
  const value = rainToday ?? 0;

  if (value === 0) {
    return "The ground story is dry today.";
  }

  if (value < 0.1) {
    return "Only a trace of rain has landed today.";
  }

  if (value < 0.4) {
    return "There has been light but meaningful rain today.";
  }

  if (value < 1) {
    return "Rain has been a real part of the day.";
  }

  return "It has been a genuinely wet day.";
}

function skyPhrase(uv: number | null, solar: number | null) {
  const uvValue = uv ?? 0;
  const solarValue = solar ?? 0;

  if (uvValue >= 8 || solarValue >= 800) {
    return "The sky is delivering strong sun";
  }

  if (uvValue >= 4 || solarValue >= 500) {
    return "There is a healthy amount of daylight";
  }

  if (uvValue >= 1 || solarValue >= 150) {
    return "Light is present, but not intense";
  }

  return "The sky energy is soft right now";
}

function comfortChip(temperature: number | null, humidity: number | null) {
  if (temperature === null) {
    return "";
  }

  if (temperature < 45) {
    return "Cool air";
  }

  if (temperature < 72) {
    return humidity !== null && humidity > 70 ? "Mild but humid" : "Easygoing comfort";
  }

  if (temperature < 86) {
    return humidity !== null && humidity > 65 ? "Warm and sticky" : "Warm and pleasant";
  }

  return "Heat on deck";
}

function windChip(wind: number | null, gust: number | null) {
  const maxValue = Math.max(wind ?? 0, gust ?? 0);

  if (maxValue < 3) {
    return "Still";
  }

  if (maxValue < 8) {
    return "Breezy";
  }

  if (maxValue < 16) {
    return "Moving air";
  }

  if (maxValue < 26) {
    return "Windy";
  }

  return "Strong gusts";
}

function rainChip(rainToday: number | null, hourlyRain: number | null) {
  if ((hourlyRain ?? 0) > 0) {
    return "Rain now";
  }

  if ((rainToday ?? 0) > 0.2) {
    return "Wet day";
  }

  if ((rainToday ?? 0) > 0) {
    return "Trace rain";
  }

  return "Dry ground";
}

function sunChip(uv: number | null, solar: number | null) {
  if ((uv ?? 0) >= 8 || (solar ?? 0) >= 800) {
    return "High sun";
  }

  if ((uv ?? 0) >= 4 || (solar ?? 0) >= 500) {
    return "Bright sky";
  }

  if ((uv ?? 0) >= 1 || (solar ?? 0) >= 150) {
    return "Soft daylight";
  }

  return "Muted sky";
}

function pickMoodTone(values: {
  wind: number | null;
  rainToday: number | null;
  uv: number | null;
  temperature: number | null;
}): StoryTone {
  if ((values.rainToday ?? 0) >= 0.15) {
    return "rain";
  }

  if ((values.wind ?? 0) >= 10) {
    return "sky";
  }

  if ((values.uv ?? 0) >= 5 || (values.temperature ?? 0) >= 72) {
    return "gold";
  }

  return "pine";
}

function pickComfortTone(temperature: number | null): StoryTone {
  if ((temperature ?? 0) >= 75) {
    return "gold";
  }

  if ((temperature ?? 0) <= 50) {
    return "sky";
  }

  return "pine";
}

function pickWindTone(wind: number | null, gust: number | null): StoryTone {
  return Math.max(wind ?? 0, gust ?? 0) >= 12 ? "sky" : "pine";
}

function pickRainTone(rainToday: number | null, hourlyRain: number | null): StoryTone {
  return (rainToday ?? 0) > 0 || (hourlyRain ?? 0) > 0 ? "rain" : "gold";
}

function pickSkyTone(uv: number | null, solar: number | null): StoryTone {
  return (uv ?? 0) >= 4 || (solar ?? 0) >= 400 ? "gold" : "sky";
}

function cardinalDirection(degrees: number | null) {
  if (degrees === null) {
    return "";
  }

  const directions = [
    "north",
    "north-east",
    "east",
    "south-east",
    "south",
    "south-west",
    "west",
    "north-west",
  ];

  const index = Math.round((((degrees % 360) + 360) % 360) / 45) % 8;
  return directions[index];
}

function formatTemperature(value: number | null) {
  if (value === null) {
    return "No reading";
  }

  return `${compact(value, 1)} F`;
}

function percent(value: number | null) {
  return value === null ? "No reading" : `${compact(value, 0)}%`;
}

function uvLabel(value: number | null) {
  if (value === null) {
    return "No UV reading";
  }

  if (value < 3) {
    return `Low UV (${compact(value, 1)})`;
  }

  if (value < 6) {
    return `Moderate UV (${compact(value, 1)})`;
  }

  if (value < 8) {
    return `High UV (${compact(value, 1)})`;
  }

  return `Very high UV (${compact(value, 1)})`;
}

function numberWithUnit(value: number | null, unit: string, decimals: number) {
  if (value === null) {
    return "No reading";
  }

  return `${compact(value, decimals)}${unit ? ` ${unit}` : ""}`;
}

function formatDetail(label: string, value: string) {
  return `${label}: ${value}`;
}

function compact(value: number, decimals: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

function percentOf(value: number | null, max: number) {
  return ((value ?? 0) / max) * 100;
}

function comfortMeter(temperature: number | null, humidity: number | null) {
  const tempScore =
    temperature === null ? 45 : 100 - Math.min(Math.abs(68 - temperature) * 3, 100);
  const humidityScore =
    humidity === null ? 45 : 100 - Math.min(Math.abs(50 - humidity) * 2, 100);

  return clamp((tempScore + humidityScore) / 2, 0, 100);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatDate(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
