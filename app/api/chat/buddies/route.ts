import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { ensureSchema, sql } from "../../../_lib/db";
import {
  PRESENCE_ONLINE_WINDOW_SECONDS,
  type Buddy,
  type BuddiesPayload,
  type ChatStatus,
  type PendingRequest,
} from "../../../_lib/chat";

export const dynamic = "force-dynamic";

// ─── GET /api/chat/buddies ────────────────────────────────────────────────
//
// One round-trip serves the entire buddy-list shell:
//   - me  (so the UI can render the status picker, sound toggle, etc.)
//   - buddies (accepted friends with presence + unread counts)
//   - pending (incoming + outgoing requests for the requests sub-list)
//
// Presence rule: ONLINE iff (status != 'invisible') AND (last_seen_at
// within PRESENCE_ONLINE_WINDOW_SECONDS). Stored status is honored —
// Invisible always shows offline to others.

export async function GET() {
  await ensureSchema();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }
  const userId = parseInt(session.user.id, 10);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
  }

  const db = sql();

  // Me row — also bump presence as a side effect so the buddy list refresh
  // itself acts as a heartbeat. Saves a separate /presence ping on the
  // hot path.
  const meRows = (await db`
    UPDATE users SET chat_last_seen_at = NOW()
    WHERE id = ${userId}
    RETURNING
      id,
      COALESCE(NULLIF(TRIM(username), ''), NULLIF(TRIM(name), ''), SPLIT_PART(email, '@', 1), 'anonymous') AS username,
      chat_status,
      chat_away_message,
      chat_profile,
      chat_sound_enabled
  `) as Array<{
    id: number;
    username: string | null;
    chat_status: string | null;
    chat_away_message: string | null;
    chat_profile: string | null;
    chat_sound_enabled: boolean;
  }>;
  const me = meRows[0];
  if (!me) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  // Accepted buddies. Direction-agnostic: a friendship is mutual once
  // accepted, so we union the two halves (rows where I'm requester and
  // rows where I'm addressee) and join the "other" user.
  //
  // Unread count is messages sent BY them TO me with read_at IS NULL.
  const buddyRows = (await db`
    WITH accepted AS (
      SELECT
        CASE WHEN requester_id = ${userId} THEN addressee_id ELSE requester_id END AS other_id
      FROM chat_friendships
      WHERE status = 'accepted'
        AND (requester_id = ${userId} OR addressee_id = ${userId})
    )
    SELECT
      u.id AS user_id,
      COALESCE(NULLIF(TRIM(u.username), ''), NULLIF(TRIM(u.name), ''), SPLIT_PART(u.email, '@', 1), 'anonymous') AS username,
      u.chat_status,
      u.chat_away_message,
      u.chat_profile,
      u.chat_last_seen_at,
      (
        CASE
          WHEN u.chat_status = 'invisible' THEN FALSE
          WHEN u.chat_last_seen_at IS NULL THEN FALSE
          WHEN u.chat_last_seen_at > NOW() - (${PRESENCE_ONLINE_WINDOW_SECONDS}::int * INTERVAL '1 second') THEN TRUE
          ELSE FALSE
        END
      ) AS online,
      (
        SELECT COUNT(*)::int
        FROM chat_messages m
        WHERE m.sender_id = u.id
          AND m.recipient_id = ${userId}
          AND m.read_at IS NULL
      ) AS unread_count,
      (
        SELECT MAX(m.created_at)
        FROM chat_messages m
        WHERE (m.sender_id = u.id AND m.recipient_id = ${userId})
           OR (m.sender_id = ${userId} AND m.recipient_id = u.id)
      ) AS last_message_at
    FROM accepted a
    JOIN users u ON u.id = a.other_id
    ORDER BY
      online DESC,
      unread_count DESC,
      last_message_at DESC NULLS LAST,
      LOWER(username) ASC
  `) as Array<{
    user_id: number;
    username: string | null;
    chat_status: string | null;
    chat_away_message: string | null;
    chat_profile: string | null;
    chat_last_seen_at: string | null;
    online: boolean;
    unread_count: number;
    last_message_at: string | null;
  }>;

  const buddies: Buddy[] = buddyRows.map((r) => ({
    userId: r.user_id,
    username: r.username?.trim() || "anonymous",
    status: (r.chat_status as ChatStatus) ?? "available",
    presence: r.online ? "online" : "offline",
    awayMessage: r.chat_away_message,
    profile: r.chat_profile,
    lastSeenAt: r.chat_last_seen_at,
    unreadCount: r.unread_count,
  }));

  // Pending requests — incoming (need accept/decline) + outgoing
  // (waiting on them). Both shown so the user knows what's open.
  const pendingRows = (await db`
    SELECT
      f.id AS friendship_id,
      CASE WHEN f.requester_id = ${userId} THEN f.addressee_id ELSE f.requester_id END AS other_id,
      CASE WHEN f.requester_id = ${userId} THEN 'outgoing' ELSE 'incoming' END AS direction,
      COALESCE(NULLIF(TRIM(u.username), ''), NULLIF(TRIM(u.name), ''), SPLIT_PART(u.email, '@', 1), 'anonymous') AS username,
      f.created_at::text AS created_at
    FROM chat_friendships f
    JOIN users u
      ON u.id = CASE WHEN f.requester_id = ${userId} THEN f.addressee_id ELSE f.requester_id END
    WHERE f.status = 'pending'
      AND (f.requester_id = ${userId} OR f.addressee_id = ${userId})
    ORDER BY direction ASC, f.created_at DESC
  `) as Array<{
    friendship_id: number;
    other_id: number;
    direction: "incoming" | "outgoing";
    username: string | null;
    created_at: string;
  }>;

  const pending: PendingRequest[] = pendingRows.map((r) => ({
    friendshipId: r.friendship_id,
    userId: r.other_id,
    username: r.username?.trim() || "anonymous",
    direction: r.direction,
    createdAt: r.created_at,
  }));

  const payload: BuddiesPayload = {
    ok: true,
    me: {
      userId: me.id,
      username: me.username?.trim() || "anonymous",
      status: (me.chat_status as ChatStatus) ?? "available",
      awayMessage: me.chat_away_message,
      profile: me.chat_profile,
      soundEnabled: me.chat_sound_enabled !== false,
    },
    buddies,
    pending,
  };
  return NextResponse.json(payload);
}
