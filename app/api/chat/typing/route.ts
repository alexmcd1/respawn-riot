import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { ensureSchema, sql } from "../../../_lib/db";

export const dynamic = "force-dynamic";

// ─── POST /api/chat/typing ────────────────────────────────────────────────
//
// Tell the server "I'm typing to <to>". Upserts a chat_typing row;
// the GET /messages endpoint reports typing=true when the row was
// updated within TYPING_FRESH_SECONDS.
//
// The client debounces these pings (see TYPING_PING_DEBOUNCE_MS) so we
// don't write on every keystroke.
//
// Body: { to: <userId>, stopped?: boolean }
//   stopped=true clears the row immediately (e.g. on send, or when the
//   user backspaces to empty).

type TypingBody = { to?: unknown; stopped?: unknown };

export async function POST(request: Request) {
  await ensureSchema();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }
  const userId = parseInt(session.user.id, 10);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
  }

  let body: TypingBody;
  try {
    body = (await request.json()) as TypingBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const peerId = typeof body.to === "number" ? body.to : parseInt(String(body.to ?? ""), 10);
  if (!Number.isFinite(peerId) || peerId === userId) {
    return NextResponse.json({ ok: false, error: "Invalid recipient" }, { status: 400 });
  }
  const stopped = body.stopped === true;

  const db = sql();

  // Must be friends — same constraint as messages. Cheaper than a JOIN
  // every time, but worth blocking spam from non-buddies.
  const friends = (await db`
    SELECT 1 FROM chat_friendships
    WHERE status = 'accepted'
      AND (
        (requester_id = ${userId} AND addressee_id = ${peerId})
        OR (requester_id = ${peerId} AND addressee_id = ${userId})
      )
    LIMIT 1
  `) as Array<{ "?column?": number }>;
  if (friends.length === 0) {
    return NextResponse.json({ ok: false, error: "Not buddies" }, { status: 403 });
  }

  if (stopped) {
    await db`
      DELETE FROM chat_typing
      WHERE sender_id = ${userId} AND recipient_id = ${peerId}
    `;
  } else {
    // Upsert — refresh updated_at on conflict.
    await db`
      INSERT INTO chat_typing (sender_id, recipient_id, updated_at)
      VALUES (${userId}, ${peerId}, NOW())
      ON CONFLICT (sender_id, recipient_id)
      DO UPDATE SET updated_at = NOW()
    `;
  }
  return NextResponse.json({ ok: true });
}
