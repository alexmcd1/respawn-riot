import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "../../../auth";
import { ensureSchema, sql } from "../../_lib/db";
import {
  relativeTime,
  threadComments,
  type CommentNode,
  type CommentRow,
  type PostDetail,
} from "../../_lib/creativity";
import AmplifyButton from "../_components/AmplifyButton";
import CommentThread from "../_components/CommentThread";
import PostBody from "../_components/PostBody";
import DeletePostButton from "../_components/DeletePostButton";

export const dynamic = "force-dynamic";

type Loaded = { post: PostDetail; comments: CommentNode[] };

async function loadPostAndComments(
  id: number,
  viewerId: number | null
): Promise<Loaded | null> {
  await ensureSchema();
  const db = sql();
  const viewerIdParam = viewerId ?? 0;

  const postRows = (await db`
    SELECT p.id, p.title, p.body, p.tags, p.score, p.comment_count,
           p."authorId" AS author_id,
           COALESCE(
             NULLIF(TRIM(u.username), ''),
             NULLIF(TRIM(u.name), ''),
             SPLIT_PART(u.email, '@', 1),
             'anonymous'
           ) AS author_name,
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
  if (!p) return null;

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
           c."authorId" AS author_id,
           COALESCE(
             NULLIF(TRIM(u.username), ''),
             NULLIF(TRIM(u.name), ''),
             SPLIT_PART(u.email, '@', 1),
             'anonymous'
           ) AS author_name,
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
    body: c.deleted_at ? "[deleted]" : c.body,
    depth: c.depth,
    createdAt: c.created_at,
    deletedAt: c.deleted_at,
    viewerCanDelete: viewerId === c.author_id && !c.deleted_at,
  }));

  return { post, comments: threadComments(flat) };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  if (!Number.isFinite(id)) return { title: "Transmission — Respawn Riot" };
  const loaded = await loadPostAndComments(id, null);
  if (!loaded) return { title: "Transmission — Respawn Riot" };
  return {
    title: `${loaded.post.title} — Creativity Corner`,
    description: loaded.post.body.slice(0, 200),
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  if (!Number.isFinite(id)) notFound();

  let session: Session | null = null;
  try { session = (await auth()) as Session | null; } catch { /* signed-out fallback */ }
  const viewerId = session?.user?.id ? parseInt(session.user.id, 10) : null;
  let loaded: Loaded | null = null;
  try {
    loaded = await loadPostAndComments(id, viewerId);
  } catch {
    // DB unreachable — fall through to 404 rather than 500
    loaded = null;
  }
  if (!loaded) notFound();

  const { post, comments } = loaded;

  return (
    <main className="bg-black text-white">
      {/* Mini hero / breadcrumb */}
      <section className="border-b border-white/10 bg-zinc-950">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          <Link
            href="/creativity"
            className="font-display text-xs tracking-[0.25em] text-fuchsia-300/85 hover:text-fuchsia-200"
          >
            ← BACK TO BROADCASTS
          </Link>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Post header */}
          <article className="space-y-4 rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/[0.08] via-pink-500/[0.04] to-transparent p-5">
            <div className="flex gap-3">
              <div className="shrink-0">
                <AmplifyButton
                  postId={post.id}
                  initialScore={post.score}
                  initialAmplified={post.viewerAmplified}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[10px] tracking-[0.3em] text-fuchsia-300">
                  ▌ TRANSMISSION
                </p>
                <h1 className="mt-1 font-display text-2xl leading-tight tracking-wide sm:text-3xl">
                  {post.title}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                  <span className="text-white/45">
                    by{" "}
                    <span className="text-fuchsia-300/85">{post.authorName}</span>
                  </span>
                  <span className="text-white/35">·</span>
                  <span className="text-white/45">{relativeTime(post.createdAt)}</span>
                  <span className="text-white/35">·</span>
                  <span className="text-white/45">
                    {post.commentCount}{" "}
                    {post.commentCount === 1 ? "reply" : "replies"}
                  </span>
                  {post.viewerCanDelete && (
                    <>
                      <span className="text-white/35">·</span>
                      <DeletePostButton postId={post.id} />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Body */}
            <PostBody source={post.body} />

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-t border-white/10 pt-3">
                {post.tags.map((t) => (
                  <Link
                    key={t}
                    href={`/creativity?tag=${encodeURIComponent(t)}`}
                    className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-cyan-200 hover:bg-cyan-500/20"
                  >
                    ◢ {t}
                  </Link>
                ))}
              </div>
            )}
          </article>

          {/* Replies */}
          <section id="replies">
            <h2 className="mb-3 font-display text-[11px] tracking-[0.3em] text-fuchsia-300">
              ▌ REPLIES ({post.commentCount})
            </h2>
            <CommentThread postId={post.id} initialComments={comments} />
          </section>
        </div>
      </section>
    </main>
  );
}
