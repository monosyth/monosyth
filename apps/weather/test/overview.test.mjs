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

test("buildOverviewPayload adds threshold alerts from configured station rules", () => {
  const payload = buildOverviewPayload(
    {
      info: { name: "Backyard", location: "Seattle" },
      macAddress: "station-1",
      lastData: { dateutc: 1711007200 },
    },
    [
      { dateutc: 1711000000, tempf: 94, windgustmph: 41, hourlyrainin: 0.64, uv: 10 },
      { dateutc: 1711003600, tempf: 88, windspeedmph: 22, humidity: 41 },
      { dateutc: 1711007200, tempf: 34, humidity: 65 },
    ],
    {
      alerts: {
        freezeTempF: 36,
        heatTempF: 90,
        windMph: 20,
        gustMph: 30,
        hourlyRainIn: 0.3,
        uvIndex: 8,
      },
    },
  );

  const alertsById = Object.fromEntries(payload.alerts.map((alert) => [alert.id, alert]));

  assert.deepEqual(Object.keys(alertsById).sort(), [
    "freeze-risk",
    "heat-spike",
    "heavy-rain",
    "high-uv",
    "strong-wind",
  ]);
  assert.equal(alertsById["freeze-risk"]?.severity, "warning");
  assert.equal(alertsById["heat-spike"]?.severity, "warning");
  assert.equal(alertsById["strong-wind"]?.severity, "danger");
  assert.equal(alertsById["heavy-rain"]?.value, "0.64 in");
  assert.match(alertsById["high-uv"]?.summary ?? "", /index 8/i);
});
