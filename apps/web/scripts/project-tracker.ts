import { applicationDefault, initializeApp } from "firebase-admin/app";
import { loadEnvConfig } from "@next/env";

async function main() {
  const [command = "help", id] = process.argv.slice(2);
  if (command === "help" || command === "--help") {
    console.log(`Monosyth project journal — https://monosyth.com/projects
Run from apps/web: node --conditions=react-server --import tsx scripts/project-tracker.ts <command>
  list                  List projects and their current revisions
  get <project-id>      Read a project and its latest 50 entries
  create <project-id>   Read a ProjectInput JSON object from stdin
  update <project-id>   Read {project: ProjectInput, expectedRevision: number} from stdin
  record <project-id>   Read an EntryInput JSON object from stdin
  export                Write a complete portable JSON export to stdout
  seed                  Add initial projects from verified local notes; preserve existing records
Record entries need a stable id for safe retries. Optional status/nextStep changes need expectedRevision.
Authentication uses Scott's existing Google Cloud Application Default Credentials; no tracker API key is stored.`);
    return;
  }
  if (!["list", "get", "create", "update", "record", "export", "seed"].includes(command)) throw new Error("Unknown command. Use --help.");
  loadEnvConfig(process.cwd());
  const owner = process.env.MONOSYTH_PROJECT_OWNER_EMAIL?.trim().toLowerCase();
  if (!owner) throw new Error("The private tracker owner setting is missing from the local environment.");
  const credential = applicationDefault();
  const token = await credential.getAccessToken();
  const identityResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${token.access_token}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!identityResponse.ok) throw new Error("Could not verify the existing owner Google Cloud login. Re-authenticate Application Default Credentials for the owner.");
  const identity = await identityResponse.json() as { email?: string; verified_email?: boolean };
  if (identity.email?.toLowerCase() !== owner || identity.verified_email !== true) throw new Error("The existing Application Default Credentials do not belong to the verified tracker owner.");
  initializeApp({ projectId: "monosyth", credential });
  const store = await import("../src/lib/projects/store");
  const { validId } = await import("../src/lib/projects/model");
  const projectId = ["get", "create", "update", "record"].includes(command) ? validId(id) : "";
  const input = async () => {
    let text = "";
    for await (const chunk of process.stdin) {
      text += chunk.toString();
      if (Buffer.byteLength(text) > 60000) throw new Error("This update is too large.");
    }
    return JSON.parse(text);
  };
  let result: unknown;
  if (command === "list") {
    const board = await store.listBoard();
    result = board.projects.map(({ id, name, status, revision, nextStep, updatedAt }) => ({ id, name, status, revision, nextStep, updatedAt }));
  }
  if (command === "get") result = { project: await store.getProject(projectId), ...await store.listEntries(projectId) };
  if (command === "create") result = await store.createProject(projectId, await input(), "Codex");
  if (command === "update") { const data = await input(); result = await store.updateProject(projectId, data.project, data.expectedRevision, "Codex"); }
  if (command === "record") {
    const data = await input();
    if (!data.id) throw new Error("Supply a stable entry id so interrupted writes can be retried safely.");
    result = await store.recordEntry(projectId, data, "Codex");
  }
  if (command === "export") result = await store.exportJournal();
  if (command === "seed") {
    const seeds = [
      { id: "project-journal", name: "Monosyth project journal", area: "Studio tools", status: "active", summary: "A private home for project progress, decisions, files, and the next useful step.", nextStep: "Finish deployment and verify the first recorded work session.", decisions: [], links: [{ label: "Open project journal", url: "https://monosyth.com/projects" }] },
      { id: "font-foundry", name: "Monosyth Type", area: "Typography", status: "waiting", summary: "Original typefaces, including Everyday Carved and the new sans family under the working name Plyden.", nextStep: "Review the prepared Plyden weights, Obliques, and working name.", decisions: ["Review the new family weights and Obliques", "Confirm the Plyden working name"], links: [{ label: "Foundry project", url: "/Users/scottwaite/claude/monosyth-type" }, { label: "Plyden family handoff", url: "/Users/scottwaite/claude/monosyth-type/fonts/label-sans/family-v1.000/README.md" }] },
      { id: "sewstudio", name: "SEWstudio", area: "Patterns & sewing", status: "waiting", summary: "Quilt and sewing patterns, illustrated teaching guides, and the Trellis collection.", nextStep: "Review the unpublished Trellis pattern packages and choose the next release.", decisions: ["Choose which prepared Trellis package to review next"], links: [{ label: "Pattern project", url: "/Users/scottwaite/claude/SEWstudio" }, { label: "Pattern review library", url: "/Users/scottwaite/claude/SEWstudio/review/index.html" }, { label: "Saved draft review links", url: "/Users/scottwaite/claude/SEWstudio/development/trellis-pattern-suite/ETSY-DRAFTS.md" }] },
      { id: "monosyth-website", name: "Monosyth website", area: "Web & shop", status: "review", summary: "The Monosyth website, shop, private studio, and supporting web services.", nextStep: "Confirm the current website priorities before adding planned work.", decisions: [], links: [{ label: "Monosyth", url: "https://monosyth.com" }, { label: "Website source", url: "/Users/scottwaite/monosythlabs" }] },
      { id: "weather-birdnet", name: "Weather & BirdNET", area: "Home observatory", status: "review", summary: "The home weather dashboard, bird identification journal, and listening setup.", nextStep: "Review the current observatory status and choose the next improvement.", decisions: [], links: [{ label: "Weather dashboard", url: "https://monosyth.com/weather" }, { label: "Bird journal", url: "https://monosyth.com/weather/birds" }, { label: "Local project", url: "/Users/scottwaite/monosyth/weather-birdnet" }] },
    ];
    const sources: Record<string, string> = {
      "project-journal": "Owner request in the project tracker build chat, October 28, 2026",
      "font-foundry": "/Users/scottwaite/claude/monosyth-type/README.md",
      "sewstudio": "/Users/scottwaite/claude/SEWstudio/README.md",
      "monosyth-website": "/Users/scottwaite/monosythlabs/README.md",
      "weather-birdnet": "/Users/scottwaite/monosyth/weather-birdnet/home-server-relay/README.md",
    };
    const records = [];
    for (const seed of seeds) {
      let created = false;
      try { await store.createProject(seed.id, seed, "Codex"); created = true; }
      catch (error) { if (!(error instanceof Error) || !("status" in error) || error.status !== 409) throw error; }
      await store.recordEntry(seed.id, {
        id: `initial-import-${seed.id}`, kind: "import", title: "Starting context imported from existing notes",
        body: seed.id === "font-foundry" ? "The foundry README records approval of the 0.004 Medium refinement on October 28, 2026. The ten-style family is prepared; the new weights, Obliques, and name remain for owner review. This entry imports that reference and does not claim new work today."
          : seed.id === "sewstudio" ? "The project README records published patterns alongside unpublished Trellis packages awaiting owner review. This imports the project context; it does not publish or approve any pattern."
          : "Imported a starting project description. Confirm current priorities and status when resuming this project. This is a reference import, not a newly completed work session.",
        verification: "Read the linked local project notes during setup.", source: sources[seed.id],
      }, "Codex");
      records.push({ id: seed.id, created });
    }
    result = records;
  }
  console.log(JSON.stringify(result, null, 2));
}
main().catch(error => {
  // Tokens and credential contents never belong in error output.
  console.error(error instanceof Error ? error.message : "Project journal command failed.");
  process.exitCode = 1;
});
