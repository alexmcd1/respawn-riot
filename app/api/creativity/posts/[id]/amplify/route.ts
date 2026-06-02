import { NextResponse } from "next/server";
import { auth } from "../../../../../../auth";
import { ensureSchema, sql } from "../../../../../_lib/db";
import { AMPLIFY_PER_HOUR } from "../../../../../_lib/creativity";

export const dynamic = "force-dynamic";

// ─── POST /api/creativity/posts/[id]/amplify ─────────────────────────────
// Toggle the requester's amplify vote for a post.
// First call: inserts a +1 vote, increments post.score.
// Second call: removes the vote, decrements post.score.
// Returns the new state so the UI can update without refetching.

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const postId = parseInt(rawId, 10);
  if (!Number.isFinite(postId)) {
    return NextResponse.json({ ok: false, error: "Bad id" }, { status: 400 });
  }

  await ensureSchema();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "Sign in to amplify a transmission." },
      { status: 401 }
    );
  }
  const userId = parseInt(session.user.id, 10);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
  }

  const db = sql();

  // Make sure the post exists + isn't deleted before we let someone
  // burn rate-limit budget on it
  const postExists = (await db`
    SELECT 1 FROM creativity_posts WHERE id = ${postId} AND deleted_at IS NULL
  `) as Array<unknown>;
  if (postExists.length === 0) {
    return NextResponse.json({ ok: false, error: "Transmission not found" }, { status: 404 });
  }

  // Rate limit
  const recent = (await db`
    SELECT COUNT(*)::int AS c
    FROM creativity_votes
    WHERE "userId" = ${userId} AND created_at > NOW() - INTERVAL '1 hour'
  `) as Array<{ c: number }>;
  if ((recent[0]?.c ?? 0) >= AMPLIFY_PER_HOUR) {
    return NextResponse.json(
      { ok: false, error: "Rate limit on amplify. Slow down a bit." },
      { status: 429 }
    );
  }

  // Toggle: if there's an existing vote, remove + decrement; else insert + increment.
  const existing = (await db`
    SELECT 1 FROM creativity_votes WHERE "userId" = ${userId} AND post_id = ${postId}
  `) as Array<unknown>;
  let amplified: boolean;
  let newScore: number;
  if (existing.length > 0) {
    await db`DELETE FROM creativity_votes WHERE "userId" = ${userId} AND post_id = ${postId}`;
    const rows = (await db`
      UPDATE creativity_posts SET score = score - 1 WHERE id = ${postId}
      RETURNING score
    `) as Array<{ score: number }>;
    amplified = false;
    newScore = rows[0]?.score ?? 0;
  } else {
    await db`
      INSERT INTO creativity_votes ("userId", post_id, value)
      VALUES (${userId}, ${postId}, 1)
    `;
    const rows = (await db`
      UPDATE creativity_posts SET score = score + 1 WHERE id = ${postId}
      RETURNING score
    `) as Array<{ score: number }>;
    amplified = true;
    newScore = rows[0]?.score ?? 0;
  }

  return NextResponse.json({ ok: true, amplified, score: newScore });
}
