import "server-only";
import { getFirebaseAdminAuth } from "../firebase/admin";
import { TrackerError } from "./model";

// Personal records belong to Scott, independently of the site's broader admin list.
export const trackerOwnerEmail = () => process.env.MONOSYTH_PROJECT_OWNER_EMAIL?.trim().toLowerCase() || "";
export function isTrackerOwner(user: { email?: string; email_verified?: boolean }) {
  return Boolean(user.email_verified === true && Boolean(trackerOwnerEmail()) && user.email?.toLowerCase() === trackerOwnerEmail());
}
export async function requireTrackerOwner(
  request: Request,
  verify: (token: string) => Promise<{ email?: string; email_verified?: boolean }> = (token: string) => getFirebaseAdminAuth().verifyIdToken(token, true),
) {
  const match = /^Bearer (\S+)$/.exec(request.headers.get("authorization") ?? "");
  if (!match) throw new TrackerError("Sign in to open your projects.", 401);
  let user;
  try { user = await verify(match[1]); }
  catch { throw new TrackerError("Your sign-in has expired. Please sign in again.", 401); }
  if (!isTrackerOwner(user)) throw new TrackerError("This project journal is private to its owner.", 403);
  return trackerOwnerEmail();
}
