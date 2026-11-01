import "server-only";
import { NextResponse } from "next/server";

import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

export type KitchenUser = { uid: string; email: string };

function allowedEmails() {
  return (process.env.KITCHEN_ALLOWED_EMAILS ?? "")
    .split(",")
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
}

/** Returns the signed-in household member, or a ready-made error response. */
export async function requireKitchenUser(request: Request): Promise<KitchenUser | NextResponse> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }
  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(token);
    const email = (decoded.email ?? "").toLowerCase();
    if (!email || !decoded.email_verified || !allowedEmails().includes(email)) {
      return NextResponse.json({ error: "This kitchen is private.", reason: "not-allowed" }, { status: 403 });
    }
    return { uid: decoded.uid, email };
  } catch {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
}
