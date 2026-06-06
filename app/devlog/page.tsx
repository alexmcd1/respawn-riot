import type { Metadata } from "next";
import Link from "next/link";
import {
  devlogPosts,
  CATEGORY_COLORS,
  type DevlogCategory,
} from "./_devlog";

export const metadata: Metadata = {
  title: "Devlog — Respawn Riot",
  description:
    "Build log for the whole site. Every meaningful shipment across food, music, games, anime, chat, sync, infra — when it shipped and why.",
};

export const revalidate = 3600;

export default function DevlogPage() {
  // Group categories present in the post list so we can render a small
  // legend / filter affordance. (Filtering itself is a future
  // enhancement — for now the categories just color-code visually.)
  const presentCategories = Array.from(
    new Set(
      devlogPosts
        .map((p) => p.category)
        .filter((c): c is DevlogCategory => !!c)
    )
  );

  const manualCount = devlogPosts.filter((p) => p.source === "manual").length;
  const autoCount = devlogPosts.filter((p) => p.source === "auto").length;

  return (
    <main className="bg-black text-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10 scanlines">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.25),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.18),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-2 stripe-band" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
          <p className="font-display text-xs tracking-[0.3em] text-fuchsia-400">
            ▌ THE BUILD LOG
          </p>
          <h1 className="mt-2 font-display text-3xl tracking-[0.04em] sm:text-5xl">
            DEVLOG <span className="text-fuchsia-400">{"//"}</span> WHAT SHIPPED
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-white/75 sm:text-base">
            Build notes for the whole site — every meaningful shipment across
            every channel, plus when it landed and why it matters. Manual
            entries get rich multi-paragraph context; auto entries are pulled
            from git history when the build pipeline runs.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-md border border-fuchsia-400/40 bg-fuchsia-500/10 px-3 py-1 font-display text-[11px] tracking-[0.25em] text-fuchsia-200">
              {devlogPosts.length} ENTRIES
            </span>
            <span className="rounded-md border border-white/15 bg-black/40 px-3 py-1 font-display text-[11px] tracking-[0.25em] text-white/70">
              {manualCount} MANUAL · {autoCount} AUTO
            </span>
          </div>

          {/* Category legend */}
          {presentCategories.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {presentCategories.map((cat) => {
                const c = CATEGORY_COLORS[cat];
                return (
                  <span
                    key={cat}
                    className={`rounded border px-2 py-0.5 font-display text-[10px] tracking-[0.25em] ${c.border} ${c.bg} ${c.text}`}
                  >
                    {cat}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Entries */}
      <section className="px-4 py-8 sm:px-6 sm:py-12">
        <ol className="mx-auto max-w-4xl space-y-5">
          {devlogPosts.map((post) => {
            const id = post.source === "manual" ? `m-${post.issue}` : `g-${post.sha}`;
            const catColors = post.category
              ? CATEGORY_COLORS[post.category]
              : { border: "border-white/15", text: "text-white/60", bg: "bg-white/[0.04]" };
            return (
              <li
                key={id}
                className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:grid-cols-[160px_1fr] sm:gap-6 sm:p-6"
              >
                {/* Left column — issue / sha / date / source pills */}
                <div className="flex items-baseline gap-3 sm:flex-col sm:items-start sm:gap-2">
                  {post.source === "manual" ? (
                    <span className="font-display text-3xl tracking-wider text-fuchsia-300">
                      #{post.issue}
                    </span>
                  ) : (
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-base text-cyan-300 underline-offset-2 hover:underline"
                    >
                      {post.sha?.slice(0, 7)}
                    </a>
                  )}
                  <span className="font-mono text-xs text-white/45">
                    {post.date}
                  </span>
                  <div className="ml-auto flex flex-col gap-1 sm:ml-0">
                    {post.category && (
                      <span
                        className={`rounded border px-2 py-0.5 text-center font-display text-[10px] tracking-[0.25em] ${catColors.border} ${catColors.bg} ${catColors.text}`}
                      >
                        {post.category}
                      </span>
                    )}
                    <span
                      className={`rounded border px-2 py-0.5 text-center font-display text-[10px] tracking-[0.2em] ${
                        post.source === "manual"
                          ? "border-fuchsia-400/40 text-fuchsia-300"
                          : "border-cyan-400/40 text-cyan-300"
                      }`}
                    >
                      {post.source === "manual" ? post.tag ?? "MANUAL" : "GIT"}
                    </span>
                  </div>
                </div>

                {/* Right column — title + body paragraphs */}
                <div>
                  <h3 className="font-display text-xl leading-tight tracking-wide text-white">
                    {post.title}
                  </h3>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-white/75">
                    {post.body.length > 0 ? (
                      post.body.map((p, i) => <p key={i}>{p}</p>)
                    ) : (
                      <p className="text-white/40">{"(no body)"}</p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <p className="mx-auto mt-10 max-w-4xl text-center text-xs text-white/45">
          Devlog updates land here. Want them in your inbox?{" "}
          <Link
            href="/#join"
            className="text-fuchsia-300 underline-offset-2 hover:underline"
          >
            Join the riot.
          </Link>
        </p>
      </section>
    </main>
  );
}
