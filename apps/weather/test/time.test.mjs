import test from "node:test";
import assert from "node:assert/strict";

import { formatTimestamp, pickLatestObservation, toTimestamp } from "../src/lib/time.mjs";

test("toTimestamp normalizes seconds and milliseconds to the same instant", () => {
  assert.equal(toTimestamp(1711000000), 1711000000000);
  assert.equal(toTimestamp("1711000000"), 1711000000000);
  assert.equal(toTimestamp(1711000000000), 1711000000000);
});

test("formatTimestamp returns the original value when the date cannot be parsed", () => {
  assert.equal(formatTimestamp("not-a-date"), "not-a-date");
});

test("pickLatestObservation selects the newest dateutc regardless of order", () => {
  const latest = pickLatestObservation([
    { dateutc: 1711000000, tempf: 60 },
    { dateutc: 1710990000, tempf: 55 },
    { dateutc: 1711003600, tempf: 65 },
  ]);

  assert.deepEqual(latest, { dateutc: 1711003600, tempf: 65 });
});
