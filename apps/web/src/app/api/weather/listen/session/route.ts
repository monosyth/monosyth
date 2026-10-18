import { NextRequest, NextResponse } from "next/server";
import { isMonosythAdminEmail } from "@/lib/auth/admin";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { PHONE_LISTEN_COOKIE, PHONE_LISTEN_COOKIE_PATH, PHONE_LISTEN_SESSION_SECONDS } from "@/lib/weather/phone-listen-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!bearer) return NextResponse.json({ error: "Sign in to open phone listening." }, { status: 401 });

  try {
    const auth = getFirebaseAdminAuth();
    const user = await auth.verifyIdToken(bearer);
    if (!isMonosythAdminEmail(user.email)) {
      return NextResponse.json({ error: "This account cannot open phone listening." }, { status: 403 });
    }
    const session = await auth.createSessionCookie(bearer, { expiresIn: PHONE_LISTEN_SESSION_SECONDS * 1000 });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(PHONE_LISTEN_COOKIE, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: PHONE_LISTEN_COOKIE_PATH,
      maxAge: PHONE_LISTEN_SESSION_SECONDS,
    });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return NextResponse.json({ error: "Sign-in could not be verified." }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(PHONE_LISTEN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: PHONE_LISTEN_COOKIE_PATH,
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
