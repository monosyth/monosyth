import { NextRequest, NextResponse } from "next/server";

import { isMonosythAdminEmail } from "@/lib/auth/admin";
import { rebuildStoredWeatherArchive } from "@/lib/weather/ambient";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
// The full archive build can take a while when starting from a cold cache,
// so allow plenty of headroom before the function is killed.
export const maxDuration = 60;

// Why this exists alongside /api/weather/archive: that route uses the shared
// WEATHER_LOG_SECRET token and is meant for cron / curl. This one is gated
// to the signed-in studio admin so the backfill button on /app can hit it
// without exposing or asking for a token.
async function requireAdmin(request: NextRequest) {
  const bearer =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";

  if (!bearer) {
    return NextResponse.json(
      { error: "Admin sign-in is required to run the backfill." },
      { status: 401 },
    );
  }

  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(bearer);
    const email = decoded.email?.trim().toLowerCase() ?? "";

    if (!isMonosythAdminEmail(email)) {
      return NextResponse.json(
        { error: "This Google account isn't allowed to manage the weather archive." },
        { status: 403 },
      );
    }

    return { email, uid: decoded.uid };
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The admin session could not be verified.",
      },
      { status: 401 },
    );
  }
}

export async function POST(request: NextRequest) {
  const actor = await requireAdmin(request);

  if (actor instanceof NextResponse) {
    return actor;
  }

  try {
    const result = await rebuildStoredWeatherArchive();

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The weather archive backfill failed.",
      },
      { status: 500 },
    );
  }
}
