import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { ensureSchema, sql } from "../../../_lib/db";
import {
  MESSAGES_PER_MINUTE,
  PRESENCE_ONLINE_WINDOW_SECONDS,
  TYPING_FRESH_SECONDS,
  validateMessageBody,
  type ChatMessage,
  type ChatStatus,
} from "../../../_lib/chat";

export const dynamic = "force-dynamic";

// ─── GET /api/chat/messages?with=<userId>&since=<isoOrId> ─────────────────
//
// Returns the conversation with one other user. Both viewers must be
// friends (accepted friendship) — DMs without a buddy relationship are
// blocked.
//
// Optional `since` param can be a numeric message id; only messages with
// id > since are returned (delta poll). Without it, returns the last N
// messages (most recent at the end so the UI doesn't have to reverse).
//
// As a side effect, marks all messages FROM the peer TO me as read.
// Also returns the peer's current presence + typing state so the UI
// only has to hit one endpoint when a chat window is open.

const MESSAGES_PAGE_LIMIT = 100;

export async function GET(request: Request) {
  await ensureSchema();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }
  const userId = parseInt(session.user.id, 10);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
  }

  const url = new URL(request.url);
  const peerId = parseInt(url.searchParams.get("with") || "", 10);
  if (!Number.isFinite(peerId) || peerId === userId) {
    return NextResponse.json({ ok: false, error: "Invalid peer id" }, { status: 400 });
  }
  const sinceRaw = url.searchParams.get("since");
  const since = sinceRaw && Number.isFinite(parseInt(sinceRaw, 10)) ? parseInt(sinceRaw, 10) : 0;

  const db = sql();

  // Must be friends (in either direction).
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

  // Mark incoming-to-me as read up to NOW (we're displaying them).
  await db`
    UPDATE chat_messages
    SET read_at = NOW()
    WHERE recipient_id = ${userId}
      AND sender_id = ${peerId}
      AND read_at IS NULL
  `;

  // Bump our own presence (an open conversation is the strongest possible
  // "I am here" signal).
  await db`UPDATE users SET chat_last_seen_at = NOW() WHERE id = ${userId}`;

  // Fetch messages. If `since` is provided, just return the delta.
  const rows = since > 0
    ? ((await db`
        SELECT id, sender_id, recipient_id, body,
               created_at::text AS created_at,
               read_at::text AS read_at
        FROM chat_messages
        WHERE id > ${since}
          AND (
            (sender_id = ${userId} AND recipient_id = ${peerId})
            OR (sender_id = ${peerId} AND recipient_id = ${userId})
          )
        ORDER BY id ASC
        LIMIT ${MESSAGES_PAGE_LIMIT}
      `) as Array<{
        id: number;
        sender_id: number;
        recipient_id: number;
        body: string;
        created_at: string;
        read_at: string | null;
      }>)
    : ((await db`
        SELECT id, sender_id, recipient_id, body,
               created_at::text AS created_at,
               read_at::text AS read_at
        FROM (
          SELECT id, sender_id, recipient_id, body, created_at, read_at
          FROM chat_messages
          WHERE
            (sender_id = ${userId} AND recipient_id = ${peerId})
            OR (sender_id = ${peerId} AND recipient_id = ${userId})
          ORDER BY id DESC
          LIMIT ${MESSAGES_PAGE_LIMIT}
        ) recent
        ORDER BY id ASC
      `) as Array<{
        id: number;
        sender_id: number;
        recipient_id: number;
        body: string;
        created_at: string;
        read_at: string | null;
      }>);

  const messages: ChatMessage[] = rows.map((r) => ({
    id: r.id,
    senderId: r.sender_id,
    recipientId: r.recipient_id,
    body: r.body,
    createdAt: r.created_at,
    readAt: r.read_at,
  }));

  // Peer info — display name, presence, typing flag.
  const peerRows = (await db`
    SELECT
      COALESCE(NULLIF(TRIM(u.username), ''), NULLIF(TRIM(u.name), ''), SPLIT_PART(u.email, '@', 1), 'anonymous') AS username,
      u.chat_status,
      u.chat_away_message,
      u.chat_profile,
      (
        CASE
          WHEN u.chat_status = 'invisible' THEN FALSE
          WHEN u.chat_last_seen_at IS NULL THEN FALSE
          WHEN u.chat_last_seen_at > NOW() - (${PRESENCE_ONLINE_WINDOW_SECONDS}::int * INTERVAL '1 second') THEN TRUE
          ELSE FALSE
        END
      ) AS online,
      EXISTS (
        SELECT 1 FROM chat_typing t
        WHERE t.sender_id = u.id
          AND t.recipient_id = ${userId}
          AND t.updated_at > NOW() - (${TYPING_FRESH_SECONDS}::int * INTERVAL '1 second')
      ) AS peer_typing
    FROM users u
    WHERE u.id = ${peerId}
  `) as Array<{
    username: string | null;
    chat_status: string | null;
    chat_away_message: string | null;
    chat_profile: string | null;
    online: boolean;
    peer_typing: boolean;
  }>;
  const peer = peerRows[0];

  return NextResponse.json({
    ok: true,
    peer: peer
      ? {
          userId: peerId,
          username: peer.username?.trim() || "anonymous",
          status: (peer.chat_status as ChatStatus) ?? "available",
          presence: peer.online ? "online" : "offline",
          awayMessage: peer.chat_away_message,
          profile: peer.chat_profile,
          typing: peer.peer_typing,
        }
      : null,
    messages,
  });
}

// ─── POST /api/chat/messages ──────────────────────────────────────────────
// Send a DM. Body: { to: <userId>, body: <text> }
// Must be friends. Rate-limited per sender.

type SendBody = { to?: unknown; body?: unknown };

export async function POST(request: Request) {
  await ensureSchema();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Sign in to send messages." }, { status: 401 });
  }
  const userId = parseInt(session.user.id, 10);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
  }

  let body: SendBody;
  try {
    body = (await request.json()) as SendBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const peerId = typeof body.to === "number" ? body.to : parseInt(String(body.to ?? ""), 10);
  if (!Number.isFinite(peerId) || peerId === userId) {
    return NextResponse.json({ ok: false, error: "Invalid recipient" }, { status: 400 });
  }
  const validation = validateMessageBody(body.body);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const db = sql();

  // Must be friends.
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
    return NextResponse.json(
      { ok: false, error: "You can only DM buddies. Add them first." },
      { status: 403 }
    );
  }

  // Rate limit: messages by this sender in the last minute.
  const recent = (await db`
    SELECT COUNT(*)::int AS c FROM chat_messages
    WHERE sender_id = ${userId}
      AND created_at > NOW() - INTERVAL '1 minute'
  `) as Array<{ c: number }>;
  if ((recent[0]?.c ?? 0) >= MESSAGES_PER_MINUTE) {
    return NextResponse.json(
      { ok: false, error: "Slow down — too many messages." },
      { status: 429 }
    );
  }

  const rows = (await db`
    INSERT INTO chat_messages (sender_id, recipient_id, body)
    VALUES (${userId}, ${peerId}, ${validation.body})
    RETURNING id, created_at::text AS created_at
  `) as Array<{ id: number; created_at: string }>;
  const inserted = rows[0];

  // Clear our own typing marker for this recipient — we just sent.
  await db`
    DELETE FROM chat_typing
    WHERE sender_id = ${userId} AND recipient_id = ${peerId}
  `;

  // Bump presence.
  await db`UPDATE users SET chat_last_seen_at = NOW() WHERE id = ${userId}`;

  const message: ChatMessage = {
    id: inserted.id,
    senderId: userId,
    recipientId: peerId,
    body: validation.body,
    createdAt: inserted.created_at,
    readAt: null,
  };
  return NextResponse.json({ ok: true, message });
}
