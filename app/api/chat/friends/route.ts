import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { ensureSchema, sql } from "../../../_lib/db";
import { FRIEND_REQUESTS_PER_HOUR } from "../../../_lib/chat";

export const dynamic = "force-dynamic";

// ─── POST /api/chat/friends ───────────────────────────────────────────────
//
// Send a friend request. Body: { username }
//
// Idempotency rules:
//   - Already friends? → 200 ok (treat as no-op, return current state)
//   - You already sent a request? → 200 ok (idempotent)
//   - THEY already sent you one? → auto-accept (great UX: search → add)
//   - Anything else → INSERT a 'pending' row
//
// Rate-limited to FRIEND_REQUESTS_PER_HOUR per requester.

type AddBody = { username?: unknown };

export async function POST(request: Request) {
  await ensureSchema();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Sign in to add buddies." }, { status: 401 });
  }
  const userId = parseInt(session.user.id, 10);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
  }

  let body: AddBody;
  try {
    body = (await request.json()) as AddBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const usernameRaw = typeof body.username === "string" ? body.username.trim() : "";
  if (!usernameRaw) {
    return NextResponse.json({ ok: false, error: "Username required." }, { status: 400 });
  }

  const db = sql();

  // Look up the target user by username (case-insensitive).
  const targetRows = (await db`
    SELECT id FROM users
    WHERE LOWER(username) = LOWER(${usernameRaw})
    LIMIT 1
  `) as Array<{ id: number }>;
  const target = targetRows[0];
  if (!target) {
    return NextResponse.json({ ok: false, error: "No buddy found with that screenname." }, { status: 404 });
  }
  if (target.id === userId) {
    return NextResponse.json({ ok: false, error: "Can't add yourself." }, { status: 400 });
  }

  // Rate limit
  const recent = (await db`
    SELECT COUNT(*)::int AS c
    FROM chat_friendships
    WHERE requester_id = ${userId}
      AND created_at > NOW() - INTERVAL '1 hour'
  `) as Array<{ c: number }>;
  if ((recent[0]?.c ?? 0) >= FRIEND_REQUESTS_PER_HOUR) {
    return NextResponse.json(
      { ok: false, error: `Rate limit: max ${FRIEND_REQUESTS_PER_HOUR} buddy requests per hour.` },
      { status: 429 }
    );
  }

  // Check both directions for an existing row.
  const existing = (await db`
    SELECT id, status, requester_id, addressee_id
    FROM chat_friendships
    WHERE (requester_id = ${userId} AND addressee_id = ${target.id})
       OR (requester_id = ${target.id} AND addressee_id = ${userId})
    LIMIT 1
  `) as Array<{
    id: number;
    status: string;
    requester_id: number;
    addressee_id: number;
  }>;

  if (existing.length > 0) {
    const row = existing[0];
    if (row.status === "accepted") {
      return NextResponse.json({ ok: true, state: "friends", id: row.id });
    }
    if (row.status === "blocked") {
      return NextResponse.json({ ok: false, error: "Can't add this user." }, { status: 403 });
    }
    if (row.status === "pending") {
      if (row.requester_id === userId) {
        // We already asked. No-op.
        return NextResponse.json({ ok: true, state: "pending-out", id: row.id });
      }
      // They asked us first → auto-accept
      await db`
        UPDATE chat_friendships
        SET status = 'accepted', accepted_at = NOW()
        WHERE id = ${row.id}
      `;
      return NextResponse.json({ ok: true, state: "friends", id: row.id, autoAccepted: true });
    }
    // 'declined' — let them try again by upgrading the row to pending
    if (row.status === "declined") {
      await db`
        UPDATE chat_friendships
        SET status = 'pending', requester_id = ${userId}, addressee_id = ${target.id}, created_at = NOW(), accepted_at = NULL
        WHERE id = ${row.id}
      `;
      return NextResponse.json({ ok: true, state: "pending-out", id: row.id });
    }
  }

  const inserted = (await db`
    INSERT INTO chat_friendships (requester_id, addressee_id, status)
    VALUES (${userId}, ${target.id}, 'pending')
    RETURNING id
  `) as Array<{ id: number }>;
  return NextResponse.json({ ok: true, state: "pending-out", id: inserted[0].id });
}
