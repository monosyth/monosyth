import { requireTrackerOwner } from "@/lib/projects/auth";
import { agentService } from "@/lib/projects/agent-store";
import { agentBody, agentFailure, checkOrigin, privateHeaders } from "@/lib/projects/agent-http";
import { exactKeys } from "@/lib/projects/agent-model";
import { TrackerError } from "@/lib/projects/model";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    await requireTrackerOwner(request);
    return Response.json({ connections: await agentService().list() }, { headers: privateHeaders });
  } catch (error) { return agentFailure(error); }
}
export async function POST(request: Request) {
  try {
    await requireTrackerOwner(request);
    checkOrigin(request);
    const data = await agentBody(request), service = agentService();
    switch (data.action) {
      case "lookup": exactKeys(data, ["action", "code"]); return Response.json(await service.lookup(data.code), { headers: privateHeaders });
      case "approve": exactKeys(data, ["action", "code", "lifetimeDays"]); return Response.json(await service.decide(data.code, true, data.lifetimeDays), { headers: privateHeaders });
      case "deny": exactKeys(data, ["action", "code"]); return Response.json(await service.decide(data.code, false, undefined), { headers: privateHeaders });
      case "revoke": exactKeys(data, ["action", "id"]); return Response.json(await service.revoke(data.id), { headers: privateHeaders });
      default: throw new TrackerError("Choose a supported connection action.");
    }
  } catch (error) { return agentFailure(error); }
}
