import { NextRequest, NextResponse } from "next/server";

import { isMonosythAdminEmail } from "@/lib/auth/admin";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import {
  GUEST_COOKIE_NAME,
  verifyGuestSession,
} from "@/lib/rsvp/guest-session";
import {
  listRsvpResponses,
  listRsvpResponsesDetailed,
  submitRsvpResponse,
} from "@/lib/rsvp/server";

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
  const detailed =
    request.nextUrl.searchParams.get("detailed") === "1" ||
    request.nextUrl.searchParams.get("detailed") === "true";
  const limitRaw = request.nextUrl.searchParams.get("limit");
  const limit =
    limitRaw && Number.isFinite(Number(limitRaw)) ? Number(limitRaw) : undefined;

  if (!eventId) {
    return NextResponse.json(
      { error: "An eventId query parameter is required." },
      { status: 400 },
    );
  }

  try {
    const responses = detailed
      ? await listRsvpResponsesDetailed(eventId, { limit })
      : await listRsvpResponses(eventId);

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

    // Identify the guest. We accept three tiers:
    //   1. Firebase ID token (Bearer) from a Google sign-in.
    //   2. A signed guest-session cookie (name + email sign-in).
    //   3. Anonymous fallback — no identity attached.
    // Either of 1 or 2 lets us tag the submission with a uid and upsert on
    // resubmit.
    const bearer =
      request.headers
        .get("authorization")
        ?.replace(/^Bearer\s+/i, "")
        .trim() ?? "";
    let guest:
      | { uid: string; email: string | null; displayName: string | null }
      | undefined;
    if (bearer) {
      try {
        const decoded = await getFirebaseAdminAuth().verifyIdToken(bearer);
        guest = {
          uid: decoded.uid,
          email: decoded.email ?? null,
          displayName:
            (decoded.name as string | undefined) ??
            (decoded.email ? decoded.email.split("@")[0] : null),
        };
      } catch {
        // Fall through to cookie / anonymous.
      }
    }
    if (!guest) {
      const guestCookie =
        request.cookies.get(GUEST_COOKIE_NAME)?.value ?? null;
      const session = verifyGuestSession(guestCookie);
      if (session) {
        guest = {
          uid: session.uid,
          email: session.email,
          displayName: session.name,
        };
      }
    }

    const response = await submitRsvpResponse(eventId, payload.answers, guest);

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
