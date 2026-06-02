// Username validation + reservation.
//
// Rules:
//   - 3-20 characters
//   - lowercase letters, numbers, underscore, hyphen
//   - can't start/end with underscore or hyphen
//   - can't be a reserved word (anonymous, admin, etc.)
//
// Case-insensitive uniqueness enforced by the LOWER(username) index
// in db.ts. We store the user's chosen casing but match case-insensitively.

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{1,18}[a-z0-9])?$/i;

const RESERVED = new Set([
  "admin", "administrator", "moderator", "mod", "root",
  "system", "support", "help", "staff", "owner",
  "anonymous", "anon", "deleted", "removed", "you",
  "respawnriot", "respawn", "riot", "kidghost", "ghost",
  "auth", "api", "account", "settings", "login", "signin", "signout",
  "null", "undefined", "true", "false",
]);

export type UsernameValidation =
  | { ok: true; normalized: string }
  | { ok: false; error: string };

export function validateUsername(raw: unknown): UsernameValidation {
  if (typeof raw !== "string") {
    return { ok: false, error: "Username must be text." };
  }
  const trimmed = raw.trim();
  if (trimmed.length < USERNAME_MIN) {
    return { ok: false, error: `Too short — minimum ${USERNAME_MIN} characters.` };
  }
  if (trimmed.length > USERNAME_MAX) {
    return { ok: false, error: `Too long — maximum ${USERNAME_MAX} characters.` };
  }
  if (!USERNAME_PATTERN.test(trimmed)) {
    return {
      ok: false,
      error: "Only letters, numbers, _, - allowed. Can't start or end with _ or -.",
    };
  }
  if (RESERVED.has(trimmed.toLowerCase())) {
    return { ok: false, error: "That username is reserved. Try another." };
  }
  // Store as-typed; uniqueness check is case-insensitive
  return { ok: true, normalized: trimmed };
}

/**
 * Display-name fallback chain used by every page that surfaces an
 * authored item. Pass whatever fields are available.
 */
export function displayName(opts: {
  username?: string | null;
  name?: string | null;
  email?: string | null;
}): string {
  if (opts.username && opts.username.trim()) return opts.username.trim();
  if (opts.name && opts.name.trim()) return opts.name.trim();
  if (opts.email && opts.email.includes("@")) {
    return opts.email.split("@")[0];
  }
  return "anonymous";
}
