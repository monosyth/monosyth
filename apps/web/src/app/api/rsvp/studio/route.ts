import { NextRequest, NextResponse } from "next/server";

import { isMonosythAdminEmail } from "@/lib/auth/admin";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { readRsvpStudio, writeRsvpStudio } from "@/lib/rsvp/server";

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
        { error: "This Google account is not allowed to edit Monosyth." },
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

export async function GET() {
  try {
    const snapshot = await readRsvpStudio();

    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The RSVP studio could not be loaded.",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const actor = await requireAdmin(request);

  if (actor instanceof NextResponse) {
    return actor;
  }

  try {
    const payload = (await request.json()) as { studio?: unknown };
    const snapshot = await writeRsvpStudio(payload?.studio, actor);

    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The RSVP studio could not be saved.",
      },
      { status: 500 },
    );
  }
}
