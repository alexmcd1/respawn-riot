import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "../../../auth";
import { ensureSchema, sql } from "../../_lib/db";
import { displayName, validateUsername } from "../../_lib/username";

export const dynamic = "force-dynamic";

// ─── GET /api/account ─────────────────────────────────────────────────────
// Returns the current user's email + username + computed display name.
// Auth required.

export async function GET() {
  const session = (await auth()) as Session | null;
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }
  await ensureSchema();
  const db = sql();
  const userId = parseInt(session.user.id, 10);
  const rows = (await db`
    SELECT id, email, name, username
    FROM users
    WHERE id = ${userId}
  `) as Array<{ id: number; email: string | null; name: string | null; username: string | null }>;
  const u = rows[0];
  if (!u) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    email: u.email,
    username: u.username,
    displayName: displayName({ username: u.username, name: u.name, email: u.email }),
  });
}

// ─── PATCH /api/account ──────────────────────────────────────────────────
// Update the current user's username. Validates format + checks
// case-insensitive uniqueness. To CLEAR the username pass null/empty.

type Body = { username?: unknown };

export async function PATCH(request: Request) {
  const session = (await auth()) as Session | null;
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }
  const userId = parseInt(session.user.id, 10);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  // Clearing the username (set to null)
  if (body.username === null || body.username === "") {
    await ensureSchema();
    const db = sql();
    await db`UPDATE users SET username = NULL WHERE id = ${userId}`;
    return NextResponse.json({ ok: true, username: null });
  }

  const result = validateUsername(body.username);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  await ensureSchema();
  const db = sql();

  // Case-insensitive uniqueness check. Allow the user to "re-save" their
  // own current username with different casing (treat as no-op rename).
  const conflicts = (await db`
    SELECT id FROM users
    WHERE LOWER(username) = LOWER(${result.normalized})
      AND id <> ${userId}
    LIMIT 1
  `) as Array<{ id: number }>;
  if (conflicts.length > 0) {
    return NextResponse.json(
      { ok: false, error: "That username is taken." },
      { status: 409 }
    );
  }

  await db`
    UPDATE users
    SET username = ${result.normalized}
    WHERE id = ${userId}
  `;
  return NextResponse.json({ ok: true, username: result.normalized });
}
