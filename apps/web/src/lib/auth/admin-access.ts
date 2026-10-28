import "server-only";
import { isMonosythAdminEmail } from "./admin";

type VerifiedUser = { email?: string };
export async function resolveAdminAccess(
  token: string | undefined,
  verify: (token: string) => Promise<VerifiedUser>,
): Promise<{ isAdmin: boolean; status: number }> {
  if (!token) return { isAdmin: false, status: 401 };
  try {
    const user = await verify(token);
    const isAdmin = isMonosythAdminEmail(user.email);
    return { isAdmin, status: isAdmin ? 200 : 403 };
  } catch {
    return { isAdmin: false, status: 401 };
  }
}
