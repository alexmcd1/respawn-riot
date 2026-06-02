// Admin role helper.
//
// Admins are declared via the ADMIN_EMAILS env var (comma-separated,
// case-insensitive). No DB column needed — Vercel env vars are the
// source of truth, so granting/revoking admin = one Vercel UI edit
// + a redeploy.
//
// Used by moderation surfaces (delete-any-transmission, future
// take-down tools, etc).

function adminEmailSet(): Set<string> {
  const raw = process.env.ADMIN_EMAILS;
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmailSet().has(email.trim().toLowerCase());
}
