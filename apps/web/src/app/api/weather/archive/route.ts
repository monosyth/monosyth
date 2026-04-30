import { NextRequest, NextResponse } from "next/server";

import { rebuildStoredWeatherArchive } from "@/lib/weather/ambient";

export const dynamic = "force-dynamic";
// The full archive build can take a while on a cold instance — give it
// runway so a scheduled trigger isn't cut off mid-rebuild.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return handleArchiveRequest(request);
}

export async function POST(request: NextRequest) {
  return handleArchiveRequest(request);
}

async function handleArchiveRequest(request: NextRequest) {
  // Reuse the existing log secret so operators don't need to provision a
  // second token. If a different secret is needed later this can split out.
  const secret = process.env.WEATHER_LOG_SECRET?.trim() ?? "";

  if (!secret) {
    return NextResponse.json(
      { error: "WEATHER_LOG_SECRET is not configured." },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const token = url.searchParams.get("token") ?? "";

  if (bearer !== secret && token !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await rebuildStoredWeatherArchive();

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
