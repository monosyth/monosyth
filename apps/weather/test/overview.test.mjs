import test from "node:test";
import assert from "node:assert/strict";

import { buildOverviewPayload } from "../src/lib/overview.mjs";

test("buildOverviewPayload sorts observations chronologically and uses the newest reading", () => {
  const payload = buildOverviewPayload(
    {
      info: { name: "Backyard", location: "Seattle" },
      macAddress: "station-1",
      lastData: { dateutc: 1711003600 },
    },
    [
      { dateutc: 1711003600, tempf: 65, humidity: 42, windspeedmph: 7.5 },
      { dateutc: 1710990000, tempf: 55, humidity: 58, windspeedmph: 2.5 },
      { dateutc: 1711000000, tempf: 60, humidity: 50, windspeedmph: 5.5 },
    ],
  );

  assert.equal(payload.current.tempf, 65);
  assert.equal(payload.observations.length, 3);
  assert.equal(payload.observations[0].tempf, 55);
  assert.equal(payload.timeRange.startAt, new Date(1710990000 * 1000).toISOString());
  assert.equal(payload.timeRange.endAt, new Date(1711003600 * 1000).toISOString());
  assert.equal(payload.series[0].points[0].value, 55);
  assert.equal(payload.series[0].points.at(-1).value, 65);
  assert.equal(payload.metrics.find((metric) => metric.id === "temperature")?.value, 65);
});
