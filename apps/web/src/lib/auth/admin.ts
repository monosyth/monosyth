import "server-only";

// Runtime configuration keeps administrator addresses out of this public repository.
export function getMonosythAdminEmails(): string[] {
  return (process.env.MONOSYTH_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isMonosythAdminEmail(email: string | null | undefined) {
  return Boolean(email && getMonosythAdminEmails().includes(email.trim().toLowerCase()));
}
