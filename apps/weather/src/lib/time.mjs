export function toTimestamp(value) {
  if (!value) {
    return 0;
  }

  if (typeof value === "number") {
    return value > 1e12 ? value : value * 1000;
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    return parsed > 1e12 ? parsed : parsed * 1000;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatTimestamp(value) {
  if (!value) {
    return "";
  }

  const timestamp = toTimestamp(value);

  if (!timestamp) {
    return String(value);
  }

  return new Date(timestamp).toLocaleString();
}

export function pickLatestObservation(observations) {
  let latestObservation = null;
  let latestTimestamp = 0;

  for (const observation of observations) {
    const timestamp = toTimestamp(observation?.dateutc);

    if (timestamp >= latestTimestamp) {
      latestObservation = observation;
      latestTimestamp = timestamp;
    }
  }

  return latestObservation;
}
