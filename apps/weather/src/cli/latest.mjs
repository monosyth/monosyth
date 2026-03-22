import {
  describeDevice,
  getDeviceHistory,
  listDevices,
  pickDevice,
  summarizeObservation,
} from "../lib/ambient.mjs";
import { getAmbientConfig } from "../lib/env.mjs";
import { pickLatestObservation } from "../lib/time.mjs";

const wantsJson = process.argv.includes("--json");

try {
  const config = getAmbientConfig();
  const devices = await listDevices();
  const device = pickDevice(devices, config.macAddress);

  if (!device) {
    throw new Error("No matching Ambient Weather device was found.");
  }

  const history = await getDeviceHistory(device.macAddress, { limit: config.limit });
  const latestObservation = pickLatestObservation(history);

  if (wantsJson) {
    console.log(
      JSON.stringify(
        {
          device: describeDevice(device),
          observations: history,
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  console.log(`Station: ${device.info?.name ?? "Unnamed station"}`);
  console.log(`MAC: ${device.macAddress ?? "unknown"}`);

  if (device.info?.location) {
    console.log(`Location: ${device.info.location}`);
  }

  console.log("");

  if (!latestObservation) {
    console.log("No station observations were returned.");
    process.exit(0);
  }

  for (const row of summarizeObservation(latestObservation)) {
    console.log(`${row.label}: ${row.value}`);
  }

  console.log("");
  console.log("Use `npm run latest:json` if you want the full raw payload for app design.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
