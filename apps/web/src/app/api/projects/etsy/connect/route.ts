import { requireTrackerOwner } from "@/lib/projects/auth";
import { startEtsyConnection } from "@/lib/projects/etsy";
import { TrackerError } from "@/lib/projects/model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0", "Vary": "Authorization", "X-Robots-Tag": "noindex, nofollow, noarchive" };

export async function POST(request: Request) {
  try {
    await requireTrackerOwner(request);
    return Response.json({ url: await startEtsyConnection() }, { headers });
  } catch (error) {
    if (error instanceof TrackerError) return Response.json({ error: error.message }, { status: error.status, headers });
    console.error("Etsy connection could not start", error instanceof Error ? error.name : "Unknown error");
    return Response.json({ error: "Etsy could not be connected. Please try again." }, { status: 503, headers });
  }
}
