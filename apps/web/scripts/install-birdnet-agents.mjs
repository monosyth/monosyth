import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import ffmpeg from "ffmpeg-static";

if (process.platform !== "darwin") throw new Error("This installer configures macOS LaunchAgents.");
const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = process.env.BIRDNET_ROOT || path.join(os.homedir(), "monosyth/weather-birdnet");
for (const file of ["runtime/birdnet-go", "runtime/libtensorflowlite_c.dylib", "config.yaml", "trial.json", "reference/labels-en-us.txt"]) {
  if (!existsSync(path.join(root, file))) throw new Error(`Prepare BirdNET first: missing ${file}`);
}
await mkdir(path.join(root, "data/logs"), { recursive: true });
const runner = path.join(root, "run-listener.mjs");
await writeFile(runner, `import {spawn} from 'node:child_process';
const root=${JSON.stringify(root)};
const child=spawn(root+'/runtime/birdnet-go',['--config',root+'/config.yaml','serve'],{cwd:root,stdio:'inherit',env:{...process.env,TZ:'America/Los_Angeles',DYLD_LIBRARY_PATH:root+'/runtime',PATH:${JSON.stringify(path.dirname(ffmpeg) + ":/opt/homebrew/bin:/usr/bin:/bin")}}});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
child.on('error',()=>process.exit(1));
child.on('exit',code=>process.exit(code??0));
`, { mode: 0o700 });
const escape = text => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const agents = [
  { label: "com.monosyth.birdnet-listener", args: [process.execPath, runner], cwd: root, schedule: "<key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>30</integer>" },
  { label: "com.monosyth.birdnet-sync", args: [process.execPath, "--import", "tsx", path.join(appDir, "scripts/sync-birdnet.ts")], cwd: appDir, schedule: "<key>StartInterval</key><integer>60</integer>" },
];
const dir = path.join(os.homedir(), "Library/LaunchAgents");
await mkdir(dir, { recursive: true });
for (const agent of agents) {
  const file = path.join(dir, `${agent.label}.plist`);
  if (existsSync(file) && !process.argv.includes("--replace")) throw new Error(`${agent.label} already exists; use --replace after reviewing it.`);
  await writeFile(file, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>Label</key><string>${agent.label}</string>
<key>ProgramArguments</key><array>${agent.args.map(arg => `<string>${escape(arg)}</string>`).join("")}</array>
<key>WorkingDirectory</key><string>${escape(agent.cwd)}</string>
<key>EnvironmentVariables</key><dict><key>BIRDNET_ROOT</key><string>${escape(root)}</string><key>TZ</key><string>America/Los_Angeles</string></dict>
<key>RunAtLoad</key><true/>${agent.schedule}
<key>StandardOutPath</key><string>${escape(root)}/data/logs/${agent.label}.log</string>
<key>StandardErrorPath</key><string>${escape(root)}/data/logs/${agent.label}.error.log</string>
</dict></plist>`, { mode: 0o600 });
  console.log(`Prepared ${file}`);
}
