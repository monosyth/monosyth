import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { createMoveHandler } from "@/lib/move/http";
import { accessPlan } from "@/lib/move/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const handle = createMoveHandler({
  verify: (token) => getFirebaseAdminAuth().verifyIdToken(token, true),
  read: (uid) => accessPlan(uid),
  change: (uid, body) => accessPlan(uid, body),
});
export const GET = handle;
export const POST = handle;
