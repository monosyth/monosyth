import { agentService } from "@/lib/projects/agent-store";
import { agentBody, agentFailure, checkOrigin, privateHeaders } from "@/lib/projects/agent-http";
import { exactKeys, parseAgentEntry, tokenValue } from "@/lib/projects/agent-model";
import { validId, TrackerError } from "@/lib/projects/model";
import { getProject, listEntries, recordEntry } from "@/lib/projects/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const token = tokenValue(request), url = new URL(request.url);
    if ([...url.searchParams.keys()].some(key => !["project", "cursor"].includes(key))) throw new TrackerError("This connection can only read its approved project.", 403);
    const projectId = validId(url.searchParams.get("project"));
    await agentService().authorize(token, projectId);
    const [project, history] = await Promise.all([getProject(projectId), listEntries(projectId, url.searchParams.get("cursor") ?? undefined)]);
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
