import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { ensureSchema, sql } from "../../../_lib/db";
import {
  DEFAULT_SORT,
  POSTS_PER_HOUR,
  POST_BODY_MAX,
  POST_BODY_MIN,
  POST_TITLE_MAX,
  POST_TITLE_MIN,
  bodyExcerpt,
  isValidSort,
  normalizeTags,
  type PostListItem,
  type Sort,
} from "../../../_lib/creativity";

export const dynamic = "force-dynamic";

// ─── GET /api/creativity/posts ────────────────────────────────────────────
// Returns a paginated list of transmissions. Sort options:
//   fresh  — newest first
//   live   — Reddit-style hot (log(score) - age/12h)
//   signal — top of all time (raw score)
// Anyone can read. If the requester is signed in, viewerAmplified gets
// filled in per row so the UI can hide already-amplified states.

export async function GET(request: Request) {
  await ensureSchema();
  const db = sql();
  const session = await auth();
  const viewerId = session?.user?.id ? parseInt(session.user.id, 10) : null;

  const url = new URL(request.url);
  const sortRaw = url.searchParams.get("sort");
  const sort: Sort = isValidSort(sortRaw) ? sortRaw : DEFAULT_SORT;
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "30", 10) || 30, 1),
    100
  );

  // ORDER BY varies by sort. Inline as SQL since the tagged template
  // can't safely interpolate identifiers.
  let rows: Array<{
    id: number;
    title: string;
    body: string;
    tags: string[];
    score: number;
    comment_count: number;
    created_at: string;
    author_name: string | null;
    viewer_amplified: number | null;
  }>;
  const viewerIdParam = viewerId ?? 0;
  if (sort === "live") {
    rows = (await db`
      SELECT p.id, p.title, p.body, p.tags, p.score, p.comment_count,
             p.created_at::text AS created_at,
             COALESCE(NULLIF(TRIM(u.username), ''), NULLIF(TRIM(u.name), ''), SPLIT_PART(u.email, '@', 1), 'anonymous') AS author_name,
             v."userId" AS viewer_amplified
      FROM creativity_posts p
      JOIN users u ON u.id = p."authorId"
      LEFT JOIN creativity_votes v
        ON v.post_id = p.id AND v."userId" = ${viewerIdParam}
      WHERE p.deleted_at IS NULL
      ORDER BY
        (SIGN(p.score) * LOG(GREATEST(ABS(p.score), 1))
         - EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 43200) DESC,
        p.created_at DESC
      LIMIT ${limit}
    `) as typeof rows;
  } else if (sort === "signal") {
    rows = (await db`
      SELECT p.id, p.title, p.body, p.tags, p.score, p.comment_count,
             p.created_at::text AS created_at,
             COALESCE(NULLIF(TRIM(u.username), ''), NULLIF(TRIM(u.name), ''), SPLIT_PART(u.email, '@', 1), 'anonymous') AS author_name,
             v."userId" AS viewer_amplified
      FROM creativity_posts p
      JOIN users u ON u.id = p."authorId"
      LEFT JOIN creativity_votes v
        ON v.post_id = p.id AND v."userId" = ${viewerIdParam}
      WHERE p.deleted_at IS NULL
      ORDER BY p.score DESC, p.created_at DESC
      LIMIT ${limit}
    `) as typeof rows;
  } else {
    rows = (await db`
      SELECT p.id, p.title, p.body, p.tags, p.score, p.comment_count,
             p.created_at::text AS created_at,
             COALESCE(NULLIF(TRIM(u.username), ''), NULLIF(TRIM(u.name), ''), SPLIT_PART(u.email, '@', 1), 'anonymous') AS author_name,
             v."userId" AS viewer_amplified
      FROM creativity_posts p
      JOIN users u ON u.id = p."authorId"
      LEFT JOIN creativity_votes v
        ON v.post_id = p.id AND v."userId" = ${viewerIdParam}
      WHERE p.deleted_at IS NULL
      ORDER BY p.created_at DESC
      LIMIT ${limit}
    `) as typeof rows;
  }

  const posts: PostListItem[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    bodyExcerpt: bodyExcerpt(r.body),
    tags: r.tags,
    score: r.score,
    commentCount: r.comment_count,
    authorName: r.author_name?.trim() || "anonymous",
    createdAt: r.created_at,
    viewerAmplified: viewerId ? r.viewer_amplified != null : undefined,
  }));

  return NextResponse.json({ ok: true, sort, posts });
}

// ─── POST /api/creativity/posts ──────────────────────────────────────────
// Create a new transmission. Auth required. Validates lengths +
// rate-limits to POSTS_PER_HOUR per user.

type CreateBody = {
  title?: unknown;
  body?: unknown;
  tags?: unknown;
};

export async function POST(request: Request) {
  await ensureSchema();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "Sign in to broadcast a transmission." },
      { status: 401 }
    );
  }
  const userId = parseInt(session.user.id, 10);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
  }

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.body === "string" ? body.body.trim() : "";
  if (title.length < POST_TITLE_MIN || title.length > POST_TITLE_MAX) {
    return NextResponse.json(
      {
        ok: false,
        error: `Title must be ${POST_TITLE_MIN}–${POST_TITLE_MAX} characters.`,
      },
      { status: 400 }
    );
  }
  if (content.length < POST_BODY_MIN || content.length > POST_BODY_MAX) {
    return NextResponse.json(
      {
        ok: false,
        error: `Body must be ${POST_BODY_MIN}–${POST_BODY_MAX} characters.`,
      },
      { status: 400 }
    );
  }
  const tags = normalizeTags(body.tags);

  const db = sql();

  // Rate limit: count posts by this user in the last hour
  const recent = (await db`
    SELECT COUNT(*)::int AS c
    FROM creativity_posts
    WHERE "authorId" = ${userId}
      AND created_at > NOW() - INTERVAL '1 hour'
      AND deleted_at IS NULL
  `) as Array<{ c: number }>;
  if ((recent[0]?.c ?? 0) >= POSTS_PER_HOUR) {
    return NextResponse.json(
      {
        ok: false,
        error: `Rate limit: max ${POSTS_PER_HOUR} transmissions per hour. Wait a bit.`,
      },
      { status: 429 }
    );
  }

  const rows = (await db`
    INSERT INTO creativity_posts ("authorId", title, body, tags)
    VALUES (${userId}, ${title}, ${content}, ${tags})
    RETURNING id
  `) as Array<{ id: number }>;
  const id = rows[0]?.id;
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Couldn't save the transmission." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, id });
}
