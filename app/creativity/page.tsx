import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ensureSchema, sql } from "../_lib/db";
import {
  DEFAULT_SORT,
  SORT_OPTIONS,
  bodyExcerpt,
  isValidSort,
  type PostListItem,
  type Sort,
} from "../_lib/creativity";
import type { Session } from "next-auth";
import { auth } from "../../auth";
import PostCard from "./_components/PostCard";
import NewPostForm from "./_components/NewPostForm";

export const metadata: Metadata = {
  title: "Creativity Corner — Respawn Riot",
  description:
    "Broadcast ideas, riff on others'. A free frequency for makers, writers, musicians, and game devs.",
};

export const dynamic = "force-dynamic";

// Server-fetch the post list. Anyone can read; if signed in we surface
// viewer-amplified state per row so AmplifyButton starts in the right
// position without an extra client roundtrip.
async function fetchPosts(sort: Sort, viewerId: number | null): Promise<PostListItem[]> {
  await ensureSchema();
  const db = sql();
  const viewerIdParam = viewerId ?? 0;

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

  // Display-name fallback computed in SQL: username → name → email
  // local part → 'anonymous'. Inlined into each tagged template since
  // the fallback expression has no user-controlled inputs.
  if (sort === "live") {
    rows = (await db`
      SELECT p.id, p.title, p.body, p.tags, p.score, p.comment_count,
             p.created_at::text AS created_at,
             COALESCE(
               NULLIF(TRIM(u.username), ''),
               NULLIF(TRIM(u.name), ''),
               SPLIT_PART(u.email, '@', 1),
               'anonymous'
             ) AS author_name,
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
      LIMIT 50
    `) as typeof rows;
  } else if (sort === "signal") {
    rows = (await db`
      SELECT p.id, p.title, p.body, p.tags, p.score, p.comment_count,
             p.created_at::text AS created_at,
             COALESCE(
               NULLIF(TRIM(u.username), ''),
               NULLIF(TRIM(u.name), ''),
               SPLIT_PART(u.email, '@', 1),
               'anonymous'
             ) AS author_name,
             v."userId" AS viewer_amplified
      FROM creativity_posts p
      JOIN users u ON u.id = p."authorId"
      LEFT JOIN creativity_votes v
        ON v.post_id = p.id AND v."userId" = ${viewerIdParam}
      WHERE p.deleted_at IS NULL
      ORDER BY p.score DESC, p.created_at DESC
      LIMIT 50
    `) as typeof rows;
  } else {
    rows = (await db`
      SELECT p.id, p.title, p.body, p.tags, p.score, p.comment_count,
             p.created_at::text AS created_at,
             COALESCE(
               NULLIF(TRIM(u.username), ''),
               NULLIF(TRIM(u.name), ''),
               SPLIT_PART(u.email, '@', 1),
               'anonymous'
             ) AS author_name,
             v."userId" AS viewer_amplified
      FROM creativity_posts p
      JOIN users u ON u.id = p."authorId"
      LEFT JOIN creativity_votes v
        ON v.post_id = p.id AND v."userId" = ${viewerIdParam}
      WHERE p.deleted_at IS NULL
      ORDER BY p.created_at DESC
      LIMIT 50
    `) as typeof rows;
  }

  return rows.map((r) => ({
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
}

export default async function CreativityPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const params = await searchParams;
  const sort: Sort = isValidSort(params.sort) ? params.sort : DEFAULT_SORT;
  // Gracefully degrade if DB / auth is unreachable — surface a banner
  // instead of a 500. Common in local dev (no DATABASE_URL) and any
  // production outage scenario.
  let session: Session | null = null;
  try { session = (await auth()) as Session | null; } catch { /* signed-out fallback */ }
  const viewerId = session?.user?.id ? parseInt(session.user.id, 10) : null;

  // Detect signed-in users who haven't set a username yet so we can
  // nudge them to pick one before broadcasting.
  let viewerNeedsUsername = false;
  if (viewerId) {
    try {
      await ensureSchema();
      const rows = (await sql()`
        SELECT username FROM users WHERE id = ${viewerId}
      `) as Array<{ username: string | null }>;
      viewerNeedsUsername = !rows[0]?.username;
    } catch {
      // Best-effort; banner just won't show
    }
  }
  let posts: PostListItem[] = [];
  let loadError: string | null = null;
  try {
    posts = await fetchPosts(sort, viewerId);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load transmissions.";
  }

  return (
    <main className="bg-black text-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-fuchsia-500/30 scanlines">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.25),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.18),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-2 stripe-band" />

        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <p className="font-display text-xs tracking-[0.3em] text-fuchsia-400">
            ▌ CHANNEL 10 // BROADCAST
          </p>
          <h1 className="mt-3 font-display text-4xl tracking-[0.04em] sm:text-6xl">
            CREATIVITY <span className="text-fuchsia-400">{"//"}</span> CORNER
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/75 sm:text-base">
            Drop a transmission. Reply. Amplify what hits. A free frequency
            for makers, writers, musicians, devs, and people building weird
            things in their basements.
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-3xl space-y-5">
          {/* Username nudge — only shown for signed-in users without one */}
          {viewerNeedsUsername && (
            <Link
              href="/account"
              className="block rounded-2xl border border-cyan-400/40 bg-cyan-500/10 p-4 text-sm transition hover:bg-cyan-500/15"
            >
              <p className="font-display text-[10px] tracking-[0.3em] text-cyan-300">
                ▌ PICK A HANDLE
              </p>
              <p className="mt-1.5 text-white/90">
                You&apos;re signed in but haven&apos;t set a username yet. Your
                transmissions will show your email handle until you do.{" "}
                <span className="text-cyan-200 underline">Set one in Account →</span>
              </p>
            </Link>
          )}

          {/* New transmission */}
          <NewPostForm />

          {/* Sort tabs */}
          <div className="flex items-center gap-1 border-b border-white/10">
            {SORT_OPTIONS.map((opt) => {
              const active = opt.id === sort;
              return (
                <Link
                  key={opt.id}
                  href={`/creativity?sort=${opt.id}`}
                  className={`relative -mb-px border-b-2 px-3 py-2 font-display text-[11px] tracking-[0.25em] transition ${
                    active
                      ? "border-fuchsia-400 text-fuchsia-200"
                      : "border-transparent text-white/55 hover:text-white"
                  }`}
                  title={opt.blurb}
                >
                  {opt.label}
                </Link>
              );
            })}
          </div>

          {/* Posts */}
          {loadError ? (
            <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-5 text-sm text-red-100">
              <p className="font-display text-[10px] tracking-[0.3em] text-red-300">▌ TRANSMISSION DOWN</p>
              <p className="mt-2">Couldn&apos;t reach the broadcast tower. Try again in a minute.</p>
              <p className="mt-2 font-mono text-[11px] text-red-200/70">{loadError}</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center">
              <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-xl border border-fuchsia-500/40 bg-black opacity-90">
                <Image
                  src="/mascot/sticker.png"
                  alt="Kid Ghost"
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </div>
              <h3 className="mt-4 font-display text-2xl tracking-wide">
                NO SIGNAL YET
              </h3>
              <p className="mt-2 text-sm text-white/55">
                Be the first to broadcast. Share an idea, a half-formed
                concept, or a thing you&apos;re trying to make.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </ul>
          )}
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-xs text-white/45">
        Be kind. Be weird. Don&apos;t doxx anyone. Posts saved to a database;
        sign-in via magic link required to participate.
      </footer>
    </main>
  );
}
