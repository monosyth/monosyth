import { analyticsOverview } from "@/lib/projects/analytics-overview";
import { requireTrackerOwner } from "@/lib/projects/auth";
import { TrackerError } from "@/lib/projects/model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0", "Vary": "Authorization", "X-Robots-Tag": "noindex, nofollow, noarchive" };

export async function GET(request: Request) {
  try {
    await requireTrackerOwner(request);
    const refresh = new URL(request.url).searchParams.get("refresh") === "1";
    return Response.json(await analyticsOverview(refresh), { headers });
  } catch (error) {
    if (error instanceof TrackerError) return Response.json({ error: error.message }, { status: error.status, headers });
    console.error("Analytics overview request failed", error instanceof Error ? error.name : "Unknown error");
    return Response.json({ error: "Analytics could not be loaded. Please try again." }, { status: 503, headers });
  }
}
