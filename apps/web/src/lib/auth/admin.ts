const MONOSYTH_ADMIN_EMAILS = [
  "monosyth@gmail.com",
  "dallas.shinkle@gmail.com",
] as const;

const ADMIN_EMAIL_SET = new Set(
  MONOSYTH_ADMIN_EMAILS.map((email) => email.toLowerCase()),
);

export function getMonosythAdminEmails() {
  return [...MONOSYTH_ADMIN_EMAILS];
}

export function isMonosythAdminEmail(email: string | null | undefined) {
  return Boolean(email && ADMIN_EMAIL_SET.has(email.trim().toLowerCase()));
}
