import { requireTrackerOwner } from "@/lib/projects/auth";
import { TrackerError } from "@/lib/projects/model";
import { createProject, exportJournal, getProject, listBoard, listEntries, recordEntry, updateProject } from "@/lib/projects/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0", "Vary": "Authorization", "X-Robots-Tag": "noindex, nofollow, noarchive" };
function fail(error: unknown) {
  if (error instanceof TrackerError) return Response.json({ error: error.message }, { status: error.status, headers });
  console.error("Project tracker request failed", error instanceof Error ? error.name : "Unknown error");
  return Response.json({ error: "Your project journal could not be reached. Please try again." }, { status: 503, headers });
}
export async function GET(request: Request) {
  try {
    await requireTrackerOwner(request);
    const url = new URL(request.url), project = url.searchParams.get("project");
    if (url.searchParams.get("export") === "1") return Response.json(await exportJournal(), {
      headers: { ...headers, "Content-Disposition": `attachment; filename="monosyth-projects-${new Date().toISOString().slice(0,10)}.json"` },
    });
    if (project) {
      const [details, history] = await Promise.all([getProject(project), listEntries(project, url.searchParams.get("cursor") ?? undefined)]);
      return Response.json({ project: details, ...history }, { headers });
    }
    return Response.json(await listBoard(), { headers });
  } catch (error) { return fail(error); }
}
export async function POST(request: Request) {
  try {
    const author = await requireTrackerOwner(request);
    if (!request.headers.get("content-type")?.includes("application/json")) throw new TrackerError("Send updates as JSON.", 415);
    if (Number(request.headers.get("content-length") || 0) > 60000) throw new TrackerError("This update is too large.", 413);
    const text = await request.text();
    if (new TextEncoder().encode(text).length > 60000) throw new TrackerError("This update is too large.", 413);
    let body;
    try { body = JSON.parse(text); } catch { throw new TrackerError("This update is not valid JSON."); }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new TrackerError("Send a project update object.");
    switch (body.action) {
      case "create": return Response.json(await createProject(body.id, body.project, author), { status: 201, headers });
      case "update": return Response.json(await updateProject(body.id, body.project, body.expectedRevision, author), { headers });
      case "record": return Response.json(await recordEntry(body.projectId, body.entry, author), { headers });
      default: throw new TrackerError("Choose create, update, or record.");
    }
  } catch (error) { return fail(error); }
}
