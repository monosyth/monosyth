import { agentService } from "@/lib/projects/agent-store";
import { agentBody, agentFailure, checkOrigin, privateHeaders } from "@/lib/projects/agent-http";
import { exactKeys, parseAgentEntry, tokenValue } from "@/lib/projects/agent-model";
import { validId, TrackerError } from "@/lib/projects/model";
import { getEntry, getProject, listEntries, recordEntry } from "@/lib/projects/store";
import { projectBrief, summarizeHistory, validLimit } from "@/lib/projects/brief";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const token = tokenValue(request), url = new URL(request.url);
    if ([...url.searchParams.keys()].some(key => !["project", "cursor", "view", "limit", "entry"].includes(key))) throw new TrackerError("This connection can only read its approved project.", 403);
    const projectId = validId(url.searchParams.get("project"));
    const cursor = url.searchParams.get("cursor") ?? undefined, limit = url.searchParams.get("limit");
    // Older clients page with only a cursor and expect full entries; new reads default to the compact brief.
    const view = url.searchParams.get("view") ?? (cursor ? "full" : "brief");
    if (!["brief", "history", "entry", "full"].includes(view)) throw new TrackerError("Choose the brief, history, entry, or full view.");
    await agentService().authorize(token, projectId);
    if (view === "entry") return Response.json(await getEntry(projectId, validId(url.searchParams.get("entry"))), { headers: privateHeaders });
    if (view === "history") {
      const history = await listEntries(projectId, cursor, validLimit(limit, 10));
      return Response.json(summarizeHistory(history.entries, history.nextCursor), { headers: privateHeaders });
    }
    if (view === "brief") {
      const [project, history] = await Promise.all([getProject(projectId), listEntries(projectId, undefined, validLimit(limit))]);
      return Response.json(projectBrief(project, history.entries, history.nextCursor, {
        entry: `python3 project-journal-linux.py entry ${projectId} <entry-id>`,
        history: `python3 project-journal-linux.py history ${projectId} --cursor ${history.nextCursor}`,
      }), { headers: privateHeaders });
    }
    const [project, history] = await Promise.all([getProject(projectId), listEntries(projectId, cursor)]);
    return Response.json({ project, ...history }, { headers: privateHeaders });
  } catch (error) { return agentFailure(error); }
}
export async function POST(request: Request) {
  try {
    const token = tokenValue(request);
    checkOrigin(request);
    const data = await agentBody(request);
    exactKeys(data, ["projectId", "entry"]);
    const projectId = validId(data.projectId), entry = parseAgentEntry(data.entry), service = agentService();
    const grant = await service.authorize(token, projectId);
    return Response.json(await recordEntry(projectId, entry, `Claude · ${grant.label}`, tx => service.guardWrite(token, projectId, tx)), { headers: privateHeaders });
  } catch (error) { return agentFailure(error); }
}
export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    return Response.json(await agentService().revokeToken(tokenValue(request)), { headers: privateHeaders });
  } catch (error) { return agentFailure(error); }
}
