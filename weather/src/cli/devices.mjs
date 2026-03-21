import { describeDevice, listDevices } from "../lib/ambient.mjs";

const wantsJson = process.argv.includes("--json");

try {
  const devices = await listDevices();

  if (!devices.length) {
    console.log("No Ambient Weather devices were returned for this account.");
    process.exit(0);
  }

  const rows = devices.map((device, index) => describeDevice(device, index));

  if (wantsJson) {
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  }

  console.table(rows);
  console.log("");
  console.log("Copy one macAddress into AMBIENT_MAC_ADDRESS in your .env file, then run `npm run latest`.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
