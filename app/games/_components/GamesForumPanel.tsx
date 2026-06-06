import Link from "next/link";
import { ensureSchema, sql } from "../../_lib/db";
import {
  bodyExcerpt,
  relativeTime,
  type PostListItem,
} from "../../_lib/creativity";

// "Now Playing" — surfaces Creativity Corner transmissions tagged
// with anything in the games tag set, plus a CTA to post a new one.
// Reuses the existing forum infrastructure (no new DB tables) — just
// a read-only filtered view of creativity_posts.

const GAME_TAGS = [
  "games",
  "gaming",
  "videogame",
  "videogames",
  "boardgame",
  "boardgames",
  "cardgame",
  "cardgames",
  "tabletop",
  "tcg",
];

async function loadGamePosts(): Promise<PostListItem[]> {
  try {
    await ensureSchema();
    const db = sql();
    // tags && ARRAY[...] tests for any overlap between the post's
    // tags array and our game tag set — Postgres array intersection
    // operator. Indexed scan would need a GIN index on tags; for now
    // the table is small enough that a seq scan is fine.
    const rows = (await db`
      SELECT p.id, p.title, p.body, p.tags, p.score, p.comment_count,
             p.created_at::text AS created_at,
             COALESCE(
               NULLIF(TRIM(u.username), ''),
               NULLIF(TRIM(u.name), ''),
               SPLIT_PART(u.email, '@', 1),
               'anonymous'
             ) AS author_name
      FROM creativity_posts p
      JOIN users u ON u.id = p."authorId"
      WHERE p.deleted_at IS NULL
        AND p.tags && ${GAME_TAGS}::text[]
      ORDER BY p.created_at DESC
      LIMIT 12
    `) as Array<{
      id: number;
      title: string;
      body: string;
      tags: string[];
      score: number;
      comment_count: number;
      created_at: string;
      author_name: string | null;
    }>;
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      bodyExcerpt: bodyExcerpt(r.body),
      tags: r.tags,
      score: r.score,
      commentCount: r.comment_count,
      authorName: r.author_name?.trim() || "anonymous",
      createdAt: r.created_at,
    }));
  } catch (err) {
    console.warn("[games-forum] load failed:", err);
    return [];
  }
}

export default async function GamesForumPanel() {
  const posts = await loadGamePosts();

  return (
    <div className="px-4 py-10 sm:px-6 sm:py-12">
      <section className="mx-auto max-w-4xl">
        {/* Hero CTA */}
        <div className="rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/[0.08] via-fuchsia-500/[0.04] to-transparent p-6">
          <p className="font-display text-[11px] tracking-[0.3em] text-cyan-300">
            ▌ NOW PLAYING
          </p>
          <h2 className="mt-2 text-2xl font-black uppercase sm:text-3xl">
            What ARE you playing?
          </h2>
          <p className="mt-2 max-w-2xl text-white/70">
            Posts about games people are actually playing — pulled from the
            Creativity Corner forum and filtered to anything tagged{" "}
            {GAME_TAGS.slice(0, 4).map((t) => (
              <code
                key={t}
                className="mx-0.5 rounded bg-cyan-500/10 px-1 py-0.5 font-mono text-[11px] text-cyan-200"
              >
                #{t}
              </code>
            ))}{" "}
            and friends. Tag your post with one of these to surface it here.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href="/creativity?tag=games"
              className="rounded-md bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 font-display text-sm tracking-[0.2em] text-black transition hover:scale-[1.03]"
            >
              ▸ POST WHAT YOU&apos;RE PLAYING
            </Link>
            <Link
              href="/creativity"
              className="font-display text-[11px] tracking-[0.25em] text-cyan-300 hover:text-cyan-200"
            >
              VISIT THE FULL FORUM ↗
            </Link>
          </div>
        </div>

        {/* Posts list */}
        <div className="mt-8">
          <h3 className="font-display text-[11px] tracking-[0.3em] text-fuchsia-300">
            ▌ RECENT TRANSMISSIONS
          </h3>

          {posts.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-white/15 p-8 text-center">
              <p className="text-sm text-white/65">
                No gaming transmissions yet — be the first.
              </p>
              <p className="mt-2 text-xs text-white/40">
                Hit the button above, write a post about what you&apos;re
                playing, and add a{" "}
                <code className="rounded bg-white/10 px-1 font-mono text-fuchsia-200">
                  #games
                </code>{" "}
                tag.
              </p>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {posts.map((p) => (
                <li key={p.id}>
                  <PostRow post={p} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function PostRow({ post }: { post: PostListItem }) {
  return (
    <Link
      href={`/creativity/${post.id}`}
      className="group block rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-fuchsia-400/40 hover:bg-white/[0.05]"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-base font-black uppercase leading-snug group-hover:text-white">
          {post.title}
        </h4>
        <span className="shrink-0 rounded bg-fuchsia-500/15 px-2 py-0.5 font-mono text-[10px] tracking-widest text-fuchsia-200">
          ▲ {post.score}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-sm text-white/65">
        {post.bodyExcerpt}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/45">
        <span>by {post.authorName}</span>
        <span>·</span>
        <span>{relativeTime(post.createdAt)}</span>
        <span>·</span>
        <span>
          {post.commentCount} {post.commentCount === 1 ? "reply" : "replies"}
        </span>
        {post.tags.length > 0 && (
          <>
            <span>·</span>
            <span className="flex flex-wrap gap-1">
              {post.tags.slice(0, 4).map((t) => (
                <span
                  key={t}
                  className="rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-cyan-200"
                >
                  #{t}
                </span>
              ))}
            </span>
          </>
        )}
      </div>
    </Link>
  );
}
