import { NextRequest, NextResponse } from "next/server";

import {
  GUEST_COOKIE_NAME,
  buildGuestCookie,
  createGuestSession,
  verifyGuestSession,
} from "@/lib/rsvp/guest-session";

export const dynamic = "force-dynamic";

function isValidEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email);
}

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(GUEST_COOKIE_NAME)?.value ?? null;
  const session = verifyGuestSession(cookie);
  return NextResponse.json({ session });
}

export async function POST(request: NextRequest) {
  let payload: { name?: string; email?: string };
  try {
    payload = (await request.json()) as { name?: string; email?: string };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const name = (payload.name ?? "").trim();
  const email = (payload.email ?? "").trim();

  if (!name) {
    return NextResponse.json(
      { error: "Please enter your name." },
      { status: 400 },
    );
  }
  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const session = createGuestSession(name, email);

  const response = NextResponse.json({ session });
  response.headers.set("set-cookie", buildGuestCookie(session));
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ session: null });
  response.headers.set("set-cookie", buildGuestCookie(null));
  return response;
}
