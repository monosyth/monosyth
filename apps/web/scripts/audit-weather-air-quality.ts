import assert from "node:assert/strict";
import test from "node:test";
import { parseSeattleAirQuality, aqiCategory } from "../src/lib/weather/air-quality";

const now = Date.parse("2026-10-19T19:20:00Z");
const record = (changes: Record<number, string> = {}) => {
  const fields = ["10/19/26", "10/19/26", "12:00", "PDT", "0", "O", "Y", "Seattle-Bellevue-Kent Valley", "WA", "47.5620", "-122.3405", "PM2.5", "53", "Moderate", "No", "", "Puget Sound Clean Air Agency"];
  for (const [key, value] of Object.entries(changes)) fields[Number(key)] = value;
  return fields.join("|");
};

test("AirNow observations use the documented local timezone and AQI category", () => {
  const value = parseSeattleAirQuality(record(), now)!;
  assert.equal(value.value, 53);
  assert.equal(value.category, "Moderate");
  assert.equal(value.timestamp, Date.parse("2026-10-19T19:00:00Z"));
  assert.equal(value.agency, "Puget Sound Clean Air Agency");
});
test("forecasts, yesterday's peaks, secondary pollutants and other regions are excluded", () => {
  const text = [record({5: "F"}), record({5: "Y"}), record({6: "N"}), record({7: "Tacoma-Puyallup"}), record({8: "OR"})].join("\n");
  assert.equal(parseSeattleAirQuality(text, now), null);
});
test("newest primary observation wins rather than an older higher reading", () => {
  const text = [record({2: "11:00", 12: "99"}), record()].join("\n");
  assert.equal(parseSeattleAirQuality(text, now)!.value, 53);
});
test("missing, malformed and out of range AQI are not reported as zero", () => {
  for (const raw of ["", "NaN", "-1", "999", "53.2"]) assert.equal(parseSeattleAirQuality(record({12: raw}), now), null);
  assert.equal(parseSeattleAirQuality(record({12: "0"}), now)!.value, 0);
});
test("stale and future observations are not shown as current air quality", () => {
  assert.equal(parseSeattleAirQuality(record({2: "08:00"}), now), null);
  assert.equal(parseSeattleAirQuality(record({2: "13:00"}), now), null);
});
test("standard-time dates are interpreted with the correct Pacific offset", () => {
  const winter = Date.parse("2026-11-19T20:20:00Z");
  const result = parseSeattleAirQuality(record({0: "11/19/26", 1: "11/19/26", 3: "PST"}), winter)!;
  assert.equal(result.timestamp, Date.parse("2026-11-19T20:00:00Z"));
});
test("AQI category boundaries follow AirNow's bands", () => {
  assert.equal(aqiCategory(50), "Good");
  assert.equal(aqiCategory(51), "Moderate");
  assert.equal(aqiCategory(101), "Unhealthy for sensitive groups");
  assert.equal(aqiCategory(151), "Unhealthy");
  assert.equal(aqiCategory(201), "Very unhealthy");
  assert.equal(aqiCategory(301), "Hazardous");
});
