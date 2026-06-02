import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { ensureSchema, sql } from "../../../_lib/db";
import {
  PRESENCE_ONLINE_WINDOW_SECONDS,
  SEARCH_RESULTS_MAX,
  type UserSearchResult,
} from "../../../_lib/chat";

export const dynamic = "force-dynamic";

// ─── GET /api/chat/search?q=foo ───────────────────────────────────────────
//
// Used by the "Add buddy" modal. Returns up to SEARCH_RESULTS_MAX users
// whose username starts with the query (case-insensitive), excluding the
// viewer. For each hit we compute their current relationship to the
// viewer so the row can render the right action button:
//
//   "none"        → [+ ADD]
//   "self"        → (filtered out — we never return the viewer's own row)
//   "pending-out" → "REQUEST SENT"
//   "pending-in"  → [ACCEPT]
//   "friends"     → "ALREADY ADDED" (or open chat button)
//
// Requires at least 2 chars of query so we don't dump the whole table.

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
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  if (q.length < 2) {
    return NextResponse.json({ ok: true, results: [] });
  }
  // Strip anything that wouldn't be in a valid username so we don't
  // accidentally inject SQL-special chars into the LIKE pattern.
  // (Neon parameterizes safely, but keeping the input clean reduces
  // weird matches like "%_x" matching a too-broad set.)
  const safe = q.replace(/[^a-z0-9_-]/g, "");
  if (!safe) {
    return NextResponse.json({ ok: true, results: [] });
  }
  const prefix = safe + "%";

  const db = sql();
  const rows = (await db`
    SELECT
      u.id AS user_id,
      COALESCE(NULLIF(TRIM(u.username), ''), NULLIF(TRIM(u.name), ''), SPLIT_PART(u.email, '@', 1), 'anonymous') AS username,
      (
        CASE
          WHEN u.chat_status = 'invisible' THEN FALSE
          WHEN u.chat_last_seen_at IS NULL THEN FALSE
          WHEN u.chat_last_seen_at > NOW() - (${PRESENCE_ONLINE_WINDOW_SECONDS}::int * INTERVAL '1 second') THEN TRUE
          ELSE FALSE
        END
      ) AS online,
      f.id AS friendship_id,
      f.status AS friendship_status,
      f.requester_id AS friendship_requester
    FROM users u
    LEFT JOIN chat_friendships f
      ON (
        (f.requester_id = u.id AND f.addressee_id = ${userId})
        OR
        (f.addressee_id = u.id AND f.requester_id = ${userId})
      )
    WHERE u.id <> ${userId}
      AND u.username IS NOT NULL
      AND LOWER(u.username) LIKE ${prefix}
    ORDER BY online DESC, LOWER(u.username) ASC
    LIMIT ${SEARCH_RESULTS_MAX}
  `) as Array<{
    user_id: number;
    username: string | null;
    online: boolean;
    friendship_id: number | null;
    friendship_status: string | null;
    friendship_requester: number | null;
  }>;

  const results: UserSearchResult[] = rows.map((r) => {
    let relation: UserSearchResult["relation"] = "none";
    if (r.friendship_status === "accepted") {
      relation = "friends";
    } else if (r.friendship_status === "pending") {
      relation = r.friendship_requester === userId ? "pending-out" : "pending-in";
    }
    return {
      userId: r.user_id,
      username: r.username?.trim() || "anonymous",
      presence: r.online ? "online" : "offline",
      relation,
    };
  });

  return NextResponse.json({ ok: true, results });
}
