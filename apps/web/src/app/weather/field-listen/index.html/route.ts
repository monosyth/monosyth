import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { isMonosythAdminEmail } from "@/lib/auth/admin";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { PHONE_LISTEN_COOKIE } from "@/lib/weather/phone-listen-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function signInRedirect(request: NextRequest) {
  const origin = process.env.NODE_ENV === "production" ? "https://monosyth.com" : request.nextUrl.origin;
  const response = NextResponse.redirect(new URL("/weather/listen", origin), 307);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const session = request.cookies.get(PHONE_LISTEN_COOKIE)?.value;
  if (!session) return signInRedirect(request);

  try {
    const user = await getFirebaseAdminAuth().verifySessionCookie(session, true);
    if (!isMonosythAdminEmail(user.email)) return signInRedirect(request);
  } catch {
    return signInRedirect(request);
  }

  const html = await readFile(join(process.cwd(), "src/private/weather/field-listen/index.html"), "utf8");
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
