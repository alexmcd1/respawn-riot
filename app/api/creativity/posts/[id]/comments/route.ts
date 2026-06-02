import { NextResponse } from "next/server";
import { auth } from "../../../../../../auth";
import { ensureSchema, sql } from "../../../../../_lib/db";
import {
  COMMENTS_PER_HOUR,
  COMMENT_BODY_MAX,
  COMMENT_BODY_MIN,
  MAX_COMMENT_DEPTH,
} from "../../../../../_lib/creativity";

export const dynamic = "force-dynamic";

// ─── POST /api/creativity/posts/[id]/comments ────────────────────────────
// Create a comment (possibly a reply if parentId is given). Updates the
// post's comment_count. Caps depth at MAX_COMMENT_DEPTH — deeper replies
// pin to the same depth so the UI doesn't keep nesting.

type Body = {
  body?: unknown;
  parentId?: unknown;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const postId = parseInt(rawId, 10);
  if (!Number.isFinite(postId)) {
    return NextResponse.json({ ok: false, error: "Bad post id" }, { status: 400 });
  }

  await ensureSchema();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "Sign in to reply." },
      { status: 401 }
    );
  }
  const userId = parseInt(session.user.id, 10);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const content = typeof body.body === "string" ? body.body.trim() : "";
  if (content.length < COMMENT_BODY_MIN || content.length > COMMENT_BODY_MAX) {
    return NextResponse.json(
      {
        ok: false,
        error: `Reply must be ${COMMENT_BODY_MIN}–${COMMENT_BODY_MAX} characters.`,
      },
      { status: 400 }
    );
  }
  const parentId =
    typeof body.parentId === "number" && Number.isFinite(body.parentId)
      ? Math.floor(body.parentId)
      : null;

  const db = sql();

  // Verify the post exists + isn't deleted
  const postExists = (await db`
    SELECT 1 FROM creativity_posts WHERE id = ${postId} AND deleted_at IS NULL
  `) as Array<unknown>;
  if (postExists.length === 0) {
    return NextResponse.json({ ok: false, error: "Transmission not found" }, { status: 404 });
  }

  // If replying, verify parent comment exists and belongs to this post.
  // Compute depth from parent (capped at MAX_COMMENT_DEPTH).
  let depth = 0;
  if (parentId != null) {
    const parentRows = (await db`
      SELECT depth FROM creativity_comments
      WHERE id = ${parentId} AND post_id = ${postId}
    `) as Array<{ depth: number }>;
    const parent = parentRows[0];
    if (!parent) {
      return NextResponse.json(
        { ok: false, error: "Parent reply not found" },
        { status: 404 }
      );
    }
    depth = Math.min(parent.depth + 1, MAX_COMMENT_DEPTH);
  }

  // Rate limit per user
  const recent = (await db`
    SELECT COUNT(*)::int AS c
    FROM creativity_comments
    WHERE "authorId" = ${userId}
      AND created_at > NOW() - INTERVAL '1 hour'
      AND deleted_at IS NULL
  `) as Array<{ c: number }>;
  if ((recent[0]?.c ?? 0) >= COMMENTS_PER_HOUR) {
    return NextResponse.json(
      { ok: false, error: `Rate limit: max ${COMMENTS_PER_HOUR} replies per hour.` },
      { status: 429 }
    );
  }

  const insertedRows = (await db`
    INSERT INTO creativity_comments (post_id, parent_id, "authorId", body, depth)
    VALUES (${postId}, ${parentId}, ${userId}, ${content}, ${depth})
    RETURNING id, post_id, parent_id, "authorId" AS author_id, body, depth,
              created_at::text AS created_at
  `) as Array<{
    id: number;
    post_id: number;
    parent_id: number | null;
    author_id: number;
    body: string;
    depth: number;
    created_at: string;
  }>;
  const c = insertedRows[0];
  if (!c) {
    return NextResponse.json({ ok: false, error: "Couldn't save reply" }, { status: 500 });
  }

  // Update denormalized count on the post
  await db`
    UPDATE creativity_posts
    SET comment_count = comment_count + 1, updated_at = NOW()
    WHERE id = ${postId}
  `;

  // Fetch the COALESCE display name so the optimistic insert matches
  // what GET would show on refresh
  const meRows = (await db`
    SELECT COALESCE(
      NULLIF(TRIM(username), ''),
      NULLIF(TRIM(name), ''),
      SPLIT_PART(email, '@', 1),
      'anonymous'
    ) AS author_name
    FROM users WHERE id = ${userId}
  `) as Array<{ author_name: string }>;
  const authorName = meRows[0]?.author_name?.trim() ?? "anonymous";

  return NextResponse.json({
    ok: true,
    comment: {
      id: c.id,
      postId: c.post_id,
      parentId: c.parent_id,
      authorId: c.author_id,
      authorName,
      body: c.body,
      depth: c.depth,
      createdAt: c.created_at,
      deletedAt: null,
      viewerCanDelete: true,
    },
  });
}
