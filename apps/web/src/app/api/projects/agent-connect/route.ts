import { agentService } from "@/lib/projects/agent-store";
import { agentBody, agentFailure, checkOrigin, privateHeaders } from "@/lib/projects/agent-http";
import { exactKeys } from "@/lib/projects/agent-model";
import { TrackerError } from "@/lib/projects/model";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const data = await agentBody(request);
    if (data.action === "start") {
      exactKeys(data, ["action", "projectId", "label"]);
      return Response.json(await agentService().start(data.projectId, data.label), { headers: privateHeaders });
    }
    if (data.action === "poll") {
      exactKeys(data, ["action", "deviceCode"]);
      return Response.json(await agentService().poll(data.deviceCode), { headers: privateHeaders });
    }
    throw new TrackerError("Choose start or poll.");
  } catch (error) { return agentFailure(error); }
}
