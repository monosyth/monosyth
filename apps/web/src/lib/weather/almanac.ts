import {
  getMoonIllumination,
  getMoonPosition,
  getMoonTimes,
  getPosition,
  getTimes,
} from "suncalc";

type AlmanacRow = {
  label: string;
  value: string;
};

export type WeatherAlmanac = {
  sun: AlmanacRow[];
  moon: AlmanacRow[];
};

const LOS_ANGELES_TIME_ZONE = "America/Los_Angeles";

export function buildWeatherAlmanac(input: {
  date: Date;
  latitude: number;
  longitude: number;
}): WeatherAlmanac {
  const { date, latitude, longitude } = input;
  const sunTimes = getTimes(date, latitude, longitude);
  const sunPosition = getPosition(date, latitude, longitude);
  const moonTimes = getMoonTimes(date, latitude, longitude);
  const moonPosition = getMoonPosition(date, latitude, longitude);
  const moonIllumination = getMoonIllumination(date);
  const moonTransit = findMoonTransit(date, latitude, longitude);
  const nextFullMoon = findMoonPhaseEvent(date, "full");
  const nextNewMoon = findMoonPhaseEvent(date, "new");

  return {
    sun: [
      { label: "Start civil twilight", value: formatClockWithSeconds(sunTimes.dawn) },
      { label: "Sunrise", value: formatClockWithSeconds(sunTimes.sunrise) },
      { label: "Transit", value: formatClockWithSeconds(sunTimes.solarNoon) },
      { label: "Sunset", value: formatClockWithSeconds(sunTimes.sunset) },
      { label: "End civil twilight", value: formatClockWithSeconds(sunTimes.dusk) },
      { label: "Azimuth", value: formatDegrees(toCompassDegrees(sunPosition.azimuth)) },
      { label: "Altitude", value: formatDegrees(toDegrees(sunPosition.altitude)) },
    ],
    moon: [
      {
        label: "Rise",
        value: moonTimes.alwaysDown
          ? "Below horizon"
          : moonTimes.alwaysUp
            ? "Always up"
            : formatClockWithSeconds(moonTimes.rise),
      },
      { label: "Transit", value: formatClockWithSeconds(moonTransit.when) },
      {
        label: "Set",
        value: moonTimes.alwaysDown
          ? "Below horizon"
          : moonTimes.alwaysUp
            ? "Always up"
            : formatClockWithSeconds(moonTimes.set),
      },
      { label: "Azimuth", value: formatDegrees(toCompassDegrees(moonPosition.azimuth)) },
      { label: "Altitude", value: formatDegrees(toDegrees(moonPosition.altitude)) },
      {
        label: "Phase",
        value: `${describeMoonPhase(moonIllumination.phase)} (${Math.round(moonIllumination.fraction * 100)}% full)`,
      },
      { label: "Full moon", value: formatLong(nextFullMoon) },
      { label: "New moon", value: formatLong(nextNewMoon) },
    ],
  };
}

function findMoonTransit(date: Date, latitude: number, longitude: number) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  let best = {
    when: new Date(dayStart),
    altitude: Number.NEGATIVE_INFINITY,
  };

  for (let minutes = 0; minutes < 24 * 60; minutes += 10) {
    const sample = new Date(dayStart.getTime() + minutes * 60_000);
    const position = getMoonPosition(sample, latitude, longitude);

    if (position.altitude > best.altitude) {
      best = {
        when: sample,
        altitude: position.altitude,
      };
    }
  }

  return best;
}

function findMoonPhaseEvent(date: Date, target: "full" | "new") {
  const targetPhase = target === "full" ? 0.5 : 0;
  let bestDate = new Date(date);
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let hours = 0; hours <= 45 * 24; hours += 6) {
    const sample = new Date(date.getTime() + hours * 60 * 60_000);
    const phase = getMoonIllumination(sample).phase;
    const distance = getCircularPhaseDistance(phase, targetPhase);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestDate = sample;
    }
  }

  const refinedStart = new Date(bestDate.getTime() - 6 * 60 * 60_000);

  for (let minutes = 0; minutes <= 12 * 60; minutes += 15) {
    const sample = new Date(refinedStart.getTime() + minutes * 60_000);
    const phase = getMoonIllumination(sample).phase;
    const distance = getCircularPhaseDistance(phase, targetPhase);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestDate = sample;
    }
  }

  return bestDate;
}

function getCircularPhaseDistance(phase: number, target: number) {
  const distance = Math.abs(phase - target);
  return Math.min(distance, 1 - distance);
}

function describeMoonPhase(phase: number) {
  if (phase < 0.03 || phase > 0.97) {
    return "New moon";
  }

  if (phase < 0.22) {
    return "Waxing crescent";
  }

  if (phase < 0.28) {
    return "First quarter";
  }

  if (phase < 0.47) {
    return "Waxing gibbous";
  }

  if (phase < 0.53) {
    return "Full moon";
  }

  if (phase < 0.72) {
    return "Waning gibbous";
  }

  if (phase < 0.78) {
    return "Last quarter";
  }

  return "Waning crescent";
}

function toDegrees(radians: number) {
  return (radians * 180) / Math.PI;
}

function toCompassDegrees(radians: number) {
  return (toDegrees(radians) + 180 + 360) % 360;
}

function formatDegrees(value: number) {
  return `${value.toFixed(1)}°`;
}

function formatClockWithSeconds(value?: Date) {
  if (!value || Number.isNaN(value.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: LOS_ANGELES_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

function formatLong(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: LOS_ANGELES_TIME_ZONE,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}
