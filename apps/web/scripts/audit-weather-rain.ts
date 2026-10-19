import assert from "node:assert/strict";
import test from "node:test";
import { buildRainSummary } from "../src/lib/weather/rain";

const now = Date.parse("2026-10-19T19:00:00Z");
const hour = 3_600_000;

test("rain totals preserve measured zero and missing values", () => {
  const result = buildRainSummary([{timestamp: now, dailyrainin: 0, hourlyrainin: 0, weeklyrainin: "0.25", yearlyrainin: -1}], now);
  assert.equal(result.today, 0);
  assert.equal(result.week, .25);
  assert.equal(result.month, null);
  assert.equal(result.year, null);
  assert.equal(result.peakHour, 0);
  assert.equal(result.reports, 1);
  assert.equal(result.timeline[0].amount, null);
});

test("latest valid observation wins and future reports are excluded", () => {
  const result = buildRainSummary([
    {timestamp: now, dailyrainin: .2},
    {timestamp: now + hour, dailyrainin: 99},
    {timestamp: now - hour, dailyrainin: .1},
    {timestamp: NaN, dailyrainin: 100},
  ], now);
  assert.equal(result.today, .2);
  assert.equal(result.timestamp, now);
});

test("a previous local day's counters are not labelled as today's totals", () => {
  const midnight = Date.parse("2026-10-19T07:05:00Z");
  const result = buildRainSummary([{timestamp: midnight - 10 * 60_000, dailyrainin: .8, weeklyrainin: 2, monthlyrainin: 3, yearlyrainin: 10}], midnight);
  assert.equal(result.today, null);
  assert.equal(result.week, null);
  assert.equal(result.month, null);
  assert.equal(result.year, null);
});

test("rolling hourly reports are never summed into a period total", () => {
  const result = buildRainSummary([
    {timestamp: now - hour, hourlyrainin: .2, dailyrainin: .4},
    {timestamp: now, hourlyrainin: .3, dailyrainin: .5, monthlyrainin: 2.1},
  ], now);
  assert.equal(result.today, .5);
  assert.equal(result.month, 2.1);
  assert.equal(result.week, null);
  assert.equal(result.peakHour, .3);
  assert.equal(result.reports, 2);
});

test("timeline uses one latest nonmissing report per hour and keeps gaps", () => {
  const result = buildRainSummary([
    {timestamp: now - 30 * 60_000, hourlyrainin: .1},
    {timestamp: now - 10 * 60_000, hourlyrainin: .2},
    {timestamp: now - 5 * 60_000, hourlyrainin: null},
    {timestamp: now - 25 * hour, hourlyrainin: 10},
  ], now);
  assert.equal(result.timeline.length, 24);
  assert.equal(result.timeline[23].amount, .2);
  assert.equal(result.timeline[23].timestamp, now - 10 * 60_000);
  assert.equal(result.reports, 1);
  assert.equal(result.timeline[22].amount, null);
});

test("an empty station history has no invented rainfall", () => {
  const result = buildRainSummary([], now);
  assert.equal(result.today, null);
  assert.equal(result.peakHour, null);
  assert.equal(result.timestamp, null);
  assert.equal(result.reports, 0);
  assert.ok(result.timeline.every(point => point.amount === null));
});
