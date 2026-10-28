import { NextRequest, NextResponse } from "next/server";
import { resolveAdminAccess } from "@/lib/auth/admin-access";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  const { isAdmin, status } = await resolveAdminAccess(token, (value) =>
    getFirebaseAdminAuth().verifyIdToken(value),
  );
  return NextResponse.json({ isAdmin }, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
