import { NextResponse } from "next/server";

import { requireKitchenUser } from "@/lib/kitchen/auth-server";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const COLLECTION = "dallasKitchen";
// Everyone on the allowed list shares one household kitchen.
const DOC_ID = "household";
const MAX_BYTES = 900_000;

export async function GET(request: Request) {
  const user = await requireKitchenUser(request);
  if (user instanceof NextResponse) return user;
  const snap = await getFirebaseAdminDb().collection(COLLECTION).doc(DOC_ID).get();
  const data = snap.exists ? snap.data() : null;
  return NextResponse.json({ state: data?.state ? JSON.parse(data.state as string) : null });
}

export async function PUT(request: Request) {
  const user = await requireKitchenUser(request);
  if (user instanceof NextResponse) return user;
  const text = await request.text();
  if (text.length > MAX_BYTES) {
    return NextResponse.json({ error: "Your recipe box is too full to save. Remove a few old recipes." }, { status: 413 });
  }
  let parsed: { state?: unknown };
  try {
    parsed = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Bad data." }, { status: 400 });
  }
  if (!parsed.state || typeof parsed.state !== "object") {
    return NextResponse.json({ error: "Bad data." }, { status: 400 });
  }
  await getFirebaseAdminDb()
    .collection(COLLECTION)
    .doc(DOC_ID)
    .set({ state: JSON.stringify(parsed.state), updatedAt: new Date(), updatedBy: user.email });
  return NextResponse.json({ ok: true });
}
