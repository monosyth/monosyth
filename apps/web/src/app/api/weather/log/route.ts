import { NextRequest, NextResponse } from "next/server";

import { captureWeatherHistorySnapshot } from "@/lib/weather/ambient";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleLogRequest(request);
}

export async function POST(request: NextRequest) {
  return handleLogRequest(request);
}

async function handleLogRequest(request: NextRequest) {
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
    const result = await captureWeatherHistorySnapshot();

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
