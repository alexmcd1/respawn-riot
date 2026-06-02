import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { isAdminEmail } from "../../../../_lib/admin";
import { ensureSchema, sql } from "../../../../_lib/db";
import {
  threadComments,
  type CommentRow,
  type PostDetail,
} from "../../../../_lib/creativity";

export const dynamic = "force-dynamic";

// ─── GET /api/creativity/posts/[id] ─────────────────────────────────────
// Single post + full threaded comment tree. Anyone can read; viewer-
// specific fields (amplified / can-delete) are added if signed in.

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "Bad id" }, { status: 400 });
  }

  await ensureSchema();
  const db = sql();
  const session = await auth();
  const viewerId = session?.user?.id ? parseInt(session.user.id, 10) : null;

  const viewerIdParam = viewerId ?? 0;
  const postRows = (await db`
    SELECT p.id, p.title, p.body, p.tags, p.score, p.comment_count,
           p."authorId" AS author_id, COALESCE(NULLIF(TRIM(u.username), ''), NULLIF(TRIM(u.name), ''), SPLIT_PART(u.email, '@', 1), 'anonymous') AS author_name,
           p.created_at::text AS created_at,
           v."userId" AS viewer_amplified
    FROM creativity_posts p
    JOIN users u ON u.id = p."authorId"
    LEFT JOIN creativity_votes v
      ON v.post_id = p.id AND v."userId" = ${viewerIdParam}
    WHERE p.id = ${id} AND p.deleted_at IS NULL
  `) as Array<{
    id: number;
    title: string;
    body: string;
    tags: string[];
    score: number;
    comment_count: number;
    author_id: number;
    author_name: string | null;
    created_at: string;
    viewer_amplified: number | null;
  }>;

  const p = postRows[0];
  if (!p) {
    return NextResponse.json(
      { ok: false, error: "Transmission not found" },
      { status: 404 }
    );
  }

  const post: PostDetail = {
    id: p.id,
    title: p.title,
    body: p.body,
    tags: p.tags,
    score: p.score,
    commentCount: p.comment_count,
    authorId: p.author_id,
    authorName: p.author_name?.trim() || "anonymous",
    createdAt: p.created_at,
    viewerAmplified: viewerId ? p.viewer_amplified != null : undefined,
    viewerCanDelete: viewerId === p.author_id,
  };

  const commentRows = (await db`
    SELECT c.id, c.post_id, c.parent_id,
           c."authorId" AS author_id, COALESCE(NULLIF(TRIM(u.username), ''), NULLIF(TRIM(u.name), ''), SPLIT_PART(u.email, '@', 1), 'anonymous') AS author_name,
           c.body, c.depth,
           c.created_at::text AS created_at,
           c.deleted_at::text AS deleted_at
    FROM creativity_comments c
    JOIN users u ON u.id = c."authorId"
    WHERE c.post_id = ${id}
    ORDER BY c.created_at ASC
  `) as Array<{
    id: number;
    post_id: number;
    parent_id: number | null;
    author_id: number;
    author_name: string | null;
    body: string;
    depth: number;
    created_at: string;
    deleted_at: string | null;
  }>;

  const flat: CommentRow[] = commentRows.map((c) => ({
    id: c.id,
    postId: c.post_id,
    parentId: c.parent_id,
    authorId: c.author_id,
    authorName: c.author_name?.trim() || "anonymous",
    // Mask deleted comments' body so the thread structure still renders
    body: c.deleted_at ? "[deleted]" : c.body,
    depth: c.depth,
    createdAt: c.created_at,
    deletedAt: c.deleted_at,
    viewerCanDelete: viewerId === c.author_id && !c.deleted_at,
  }));

  return NextResponse.json({
    ok: true,
    post,
    comments: threadComments(flat),
  });
}

// ─── DELETE /api/creativity/posts/[id] ───────────────────────────────────
// Soft-delete (sets deleted_at) so the comment thread stays renderable
// and the post can be undeleted by an admin later if needed. Only the
// author can delete.

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  if (!Number.isFinite(id)) {
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

  // Author can always delete their own. Admins can delete anyone's,
  // and we flag those as deleted_by_admin so the UI shows
  // "[removed by mod]" instead of the generic "[deleted]".
  let rows: Array<{ id: number }>;
  if (isAdmin) {
    rows = (await db`
      UPDATE creativity_posts
      SET deleted_at = NOW(),
          deleted_by_admin = ("authorId" <> ${userId})
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING id
    `) as Array<{ id: number }>;
  } else {
    rows = (await db`
      UPDATE creativity_posts
      SET deleted_at = NOW()
      WHERE id = ${id} AND "authorId" = ${userId} AND deleted_at IS NULL
      RETURNING id
    `) as Array<{ id: number }>;
  }
  if (rows.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Not yours to delete (or already deleted)" },
      { status: 403 }
    );
  }
  return NextResponse.json({ ok: true });
}
