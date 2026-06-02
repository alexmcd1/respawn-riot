import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { isAdminEmail } from "../../../../_lib/admin";
import { ensureSchema, sql } from "../../../../_lib/db";

export const dynamic = "force-dynamic";

// ─── DELETE /api/creativity/comments/[id] ────────────────────────────────
// Soft-delete (sets deleted_at, leaves the row + structure so the thread
// still renders). Only the author can delete their own comment.
// Decrements the parent post's comment_count.

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const commentId = parseInt(rawId, 10);
  if (!Number.isFinite(commentId)) {
    return NextResponse.json({ ok: false, error: "Bad id" }, { status: 400 });
  }

  await ensureSchema();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }
  const userId = parseInt(session.user.id, 10);
  const isAdmin = isAdminEmail(session.user.email);
  const db = sql();

  // Same admin pattern as posts: admins delete any, flag with
  // deleted_by_admin when removing someone else's content.
  let rows: Array<{ post_id: number }>;
  if (isAdmin) {
    rows = (await db`
      UPDATE creativity_comments
      SET deleted_at = NOW(),
          deleted_by_admin = ("authorId" <> ${userId})
      WHERE id = ${commentId} AND deleted_at IS NULL
      RETURNING post_id
    `) as Array<{ post_id: number }>;
  } else {
    rows = (await db`
      UPDATE creativity_comments
      SET deleted_at = NOW()
      WHERE id = ${commentId} AND "authorId" = ${userId} AND deleted_at IS NULL
      RETURNING post_id
    `) as Array<{ post_id: number }>;
  }
  if (rows.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Not yours to delete (or already deleted)" },
      { status: 403 }
    );
  }

  await db`
    UPDATE creativity_posts
    SET comment_count = GREATEST(comment_count - 1, 0)
    WHERE id = ${rows[0].post_id}
  `;

  return NextResponse.json({ ok: true });
}
