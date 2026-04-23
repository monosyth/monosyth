import { NextRequest, NextResponse } from "next/server";

import { isMonosythAdminEmail } from "@/lib/auth/admin";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { listRsvpResponses, submitRsvpResponse } from "@/lib/rsvp/server";

export const dynamic = "force-dynamic";

async function requireAdmin(request: NextRequest) {
  const bearer =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";

  if (!bearer) {
    return NextResponse.json(
      { error: "Admin authorization is required." },
      { status: 401 },
    );
  }

  try {
    const decodedToken = await getFirebaseAdminAuth().verifyIdToken(bearer);
    const email = decodedToken.email?.trim().toLowerCase() ?? "";

    if (!isMonosythAdminEmail(email)) {
      return NextResponse.json(
        { error: "This Google account is not allowed to view Monosyth RSVPs." },
        { status: 403 },
      );
    }

    return {
      email,
      uid: decodedToken.uid,
    };
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

export async function GET(request: NextRequest) {
  const actor = await requireAdmin(request);

  if (actor instanceof NextResponse) {
    return actor;
  }

  const eventId = request.nextUrl.searchParams.get("eventId")?.trim() ?? "";

  if (!eventId) {
    return NextResponse.json(
      { error: "An eventId query parameter is required." },
      { status: 400 },
    );
  }

  try {
    const responses = await listRsvpResponses(eventId);

    return NextResponse.json({
      responses,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Recent RSVP responses could not be loaded.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      answers?: unknown;
      eventId?: string;
    };
    const eventId = payload?.eventId?.trim() ?? "";

    if (!eventId) {
      return NextResponse.json(
        { error: "An eventId is required." },
        { status: 400 },
      );
    }

    const response = await submitRsvpResponse(eventId, payload.answers);

    return NextResponse.json({
      ok: true,
      response,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Your RSVP could not be submitted.",
      },
      { status: 400 },
    );
  }
}
