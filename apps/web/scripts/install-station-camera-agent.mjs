import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "darwin") throw new Error("The camera capture schedule requires macOS.");
const appDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const label="com.monosyth.weather-camera-capture";
const target=path.join(homedir(),"Library","LaunchAgents",`${label}.plist`);
const xml=value=>value.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
const plist=`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${label}</string>
<key>ProgramArguments</key><array><string>${xml(path.join(appDir,"scripts/run-station-camera-capture.sh"))}</string></array>
<key>WorkingDirectory</key><string>${xml(appDir)}</string>
<key>RunAtLoad</key><true/>
<key>StartInterval</key><integer>300</integer>
<key>StandardOutPath</key><string>/tmp/monosyth-weather-camera.log</string>
<key>StandardErrorPath</key><string>/tmp/monosyth-weather-camera-error.log</string>
</dict></plist>
`;
if (process.argv.includes("--print")) {
  console.log(plist);
} else {
  await mkdir(path.dirname(target),{recursive:true});
  const old=await readFile(target).catch(()=>null);
  if (old) await writeFile(`${target}.backup`,old);
  try {execFileSync("launchctl",["bootout",`gui/${process.getuid()}`,target],{stdio:"pipe"});} catch { /* It may not be registered yet. */ }
  await writeFile(target,plist);
  execFileSync("launchctl",["bootstrap",`gui/${process.getuid()}`,target],{stdio:"inherit"});
  console.log(`Camera capture scheduled every five minutes from ${appDir}. Captures run during daylight while this Mac is awake and signed in.`);
}
