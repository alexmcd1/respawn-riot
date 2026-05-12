import type { Metadata } from "next";
import Link from "next/link";
import { devlogPosts } from "./_devlog";

export const metadata: Metadata = {
  title: "Gaming — Respawn Riot",
  description:
    "Gaming news and an inside look at the games we're building.",
};

const news = [
  {
    headline: "The Biggest New Game Releases Of May 2026",
    body: "GameSpot's full rundown of the month's heaviest hitters.",
    href: "https://www.gamespot.com/gallery/the-biggest-new-game-releases-of-may-2026/2900-7667/",
    source: "GameSpot",
    tag: "Releases",
  },
  {
    headline: "Forza Horizon 6 hits Game Pass — 550 cars across Japan",
    body: "Microsoft's racing flagship goes open-world Japan in its biggest map yet.",
    href: "https://news.xbox.com/en-us/2026/05/05/xbox-game-pass-may-2026-wave-1/",
    source: "Xbox Wire",
    tag: "Releases",
  },
  {
    headline: "Subnautica 2 launches in Game Preview May 14",
    body: "Underwater survival adventure on a new alien world from Unknown Worlds.",
    href: "https://news.xbox.com/en-us/2026/05/05/xbox-game-pass-may-2026-wave-1/",
    source: "Xbox Wire",
    tag: "Indie",
  },
  {
    headline: "007 First Light finally launches this month",
    body: "IO Interactive's young Bond game hits after a long ramp.",
    href: "https://www.gamespot.com/gallery/the-biggest-new-game-releases-of-may-2026/2900-7667/",
    source: "GameSpot",
    tag: "AAA",
  },
  {
    headline: "PC Gamer's full May 2026 release calendar",
    body: "Forza, Subnautica 2, and a stack of early-access launches.",
    href: "https://www.pcgamer.com/games/pc-game-release-dates-may-2026/",
    source: "PC Gamer",
    tag: "PC",
  },
  {
    headline: "Insider Gaming's full May 2026 schedule",
    body: "Every notable release on every platform, day by day.",
    href: "https://insider-gaming.com/may-2026-video-game-releases-full-schedule-and-biggest-games/",
    source: "Insider Gaming",
    tag: "Schedule",
  },
  {
    headline: "Steam's calendar for May 2026",
    body: "Live-updating list of every Steam release this month.",
    href: "https://steamdb.info/calendar/2026-05/",
    source: "SteamDB",
    tag: "PC",
  },
  {
    headline: "2026 Upcoming Games Release Schedule",
    body: "Year-long view from GameSpot — what's still on the calendar.",
    href: "https://www.gamespot.com/articles/2026-upcoming-games-release-schedule/1100-6534941/",
    source: "GameSpot",
    tag: "Calendar",
  },
];

export default function GamingPage() {
  return (
    <main className="bg-black text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.22),transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">
            Channel 03
          </p>
          <h1 className="mt-3 text-4xl font-black uppercase tracking-tight sm:text-6xl">
            Gaming <span className="text-cyan-500">{"//"}</span> Press Start
          </h1>
          <p className="mt-4 max-w-2xl text-white/70">
            {"What we're watching across the industry, and the two games we're hosting in-house."}
          </p>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/15 via-fuchsia-500/10 to-transparent p-6 sm:p-10">
            <p className="text-xs uppercase tracking-[0.3em] text-lime-400">
              Now Building
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase sm:text-4xl">
              RC: Respawn Creatures
            </h2>
            <p className="mt-4 max-w-2xl text-white/75">
              {"Our in-progress browser game. Pick a species — dino, water, or lion — hatch your egg, feed and train it, and watch it evolve through six stages. It's a Tamagotchi with combat in the back room."}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
                  Species
                </p>
                <p className="mt-1 text-2xl font-black">3</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
                  Engine
                </p>
                <p className="mt-1 text-2xl font-black">Phaser 4</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
                  Status
                </p>
                <p className="mt-1 text-2xl font-black">Playable</p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/game"
                className="rounded-xl bg-lime-400 px-6 py-3 font-black uppercase tracking-widest text-black transition hover:scale-105"
              >
                Play the demo
              </Link>
              <Link
                href="#devlog"
                className="rounded-xl border border-white/30 px-6 py-3 font-black uppercase tracking-widest text-white transition hover:bg-white/10"
              >
                Read the devlog
              </Link>
            </div>
          </div>

          {/* ───────── RC DEVLOG ───────── */}
          <div id="devlog" className="scroll-mt-24 rounded-3xl border border-lime-400/30 bg-gradient-to-br from-lime-500/10 via-cyan-500/5 to-transparent p-6 sm:p-10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-display text-xs tracking-[0.3em] text-lime-400">
                  ▌ DEVLOG
                </p>
                <h2 className="mt-2 font-display text-3xl tracking-[0.04em] sm:text-4xl">
                  RC // BUILD NOTES
                </h2>
              </div>
              <span className="rounded-md border border-lime-400/40 bg-black px-3 py-1 font-display text-xs tracking-[0.25em] text-lime-300">
                {devlogPosts.length} ENTRIES
              </span>
            </div>

            <ol className="mt-8 space-y-6">
              {devlogPosts.map((post) => {
                const id = post.source === "manual" ? `m-${post.issue}` : `g-${post.sha}`;
                return (
                  <li
                    key={id}
                    className="grid gap-4 rounded-2xl border border-white/10 bg-black/40 p-5 sm:grid-cols-[140px_1fr] sm:p-6"
                  >
                    <div className="flex items-baseline gap-3 sm:flex-col sm:items-start sm:gap-1">
                      {post.source === "manual" ? (
                        <span className="font-display text-3xl tracking-wider text-lime-300">
                          #{post.issue}
                        </span>
                      ) : (
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-base text-lime-300 underline-offset-2 hover:underline"
                        >
                          {post.sha}
                        </a>
                      )}
                      <span className="font-mono text-xs text-white/50">
                        {post.date}
                      </span>
                      <span
                        className={`ml-auto rounded border px-2 py-0.5 font-display text-[10px] tracking-[0.2em] sm:ml-0 ${
                          post.source === "manual"
                            ? "border-lime-400/40 text-lime-300"
                            : "border-cyan-400/40 text-cyan-300"
                        }`}
                      >
                        {post.source === "manual" ? post.tag : "GIT"}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-display text-xl tracking-wide text-white">
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

            <p className="mt-6 text-xs text-white/45">
              {"Devlog updates land here. Want them in your inbox? "}
              <Link href="/#join" className="text-lime-300 underline-offset-2 hover:underline">
                Join the riot.
              </Link>
            </p>
          </div>

          {/* ───────── ZOKU21 CREATOR DROPS ───────── */}
          <div className="rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-500/15 via-fuchsia-500/10 to-transparent p-6 sm:p-10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-display text-xs tracking-[0.3em] text-amber-400">
                  ▌ CREATOR DROPS · ZOKU21
                </p>
                <h2 className="mt-2 font-display text-3xl tracking-[0.04em] sm:text-4xl">
                  ZOKU21 // GAMES &amp; APPS
                </h2>
              </div>
              <span className="rounded-md border border-amber-400/40 bg-black px-3 py-1 font-display text-xs tracking-[0.25em] text-amber-300">
                4 DROPS
              </span>
            </div>
            <p className="mt-4 max-w-2xl text-white/75">
              {"Hosted on Respawn Riot — small, sharp builds from creator Zoku21. New drops land here as they ship."}
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                {
                  href: "/trading-cards",
                  emoji: "🃏",
                  title: "TDC: Trading Digital Cards",
                  blurb: "Pack-opening + trading. Anime-themed packs, NPC trade post, sell duplicates, luck shop.",
                  cta: "Open a pack",
                  accent: "border-amber-400/50 hover:border-amber-300",
                  chip: "text-amber-300",
                },
                {
                  href: "/jjk-fight",
                  emoji: "👁",
                  title: "Jujutsu Shenanigans",
                  blurb: "1v1 cursed energy fighter. Six characters, domain expansions, AI opponent.",
                  cta: "Pick a fighter",
                  accent: "border-fuchsia-400/50 hover:border-fuchsia-300",
                  chip: "text-fuchsia-300",
                },
                {
                  href: "/pc-builder",
                  emoji: "🖥",
                  title: "PC Builder",
                  blurb: "Pick parts, check compatibility, see estimated 1080p / 1440p / 4K performance.",
                  cta: "Build a rig",
                  accent: "border-cyan-400/50 hover:border-cyan-300",
                  chip: "text-cyan-300",
                },
                {
                  href: "/quest-list",
                  emoji: "⚔",
                  title: "QuestList",
                  blurb: "Gamified task tracker. XP, levels, coins. Local-only — your data stays on your machine.",
                  cta: "Start questing",
                  accent: "border-lime-400/50 hover:border-lime-300",
                  chip: "text-lime-300",
                },
              ].map((d) => (
                <Link
                  key={d.href}
                  href={d.href}
                  className={`group flex flex-col gap-3 rounded-2xl border bg-black/40 p-5 transition ${d.accent}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{d.emoji}</span>
                    <div>
                      <p className={`font-display text-[11px] tracking-[0.25em] ${d.chip}`}>
                        ZOKU21
                      </p>
                      <h3 className="font-display text-lg tracking-wide text-white">
                        {d.title}
                      </h3>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-white/70">{d.blurb}</p>
                  <p className="mt-auto pt-2 font-display text-xs tracking-[0.25em] text-white/80 group-hover:text-white">
                    {d.cta} →
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-zinc-950 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl font-black uppercase sm:text-3xl">
            Gaming News
          </h2>
          <p className="mt-2 text-white/60">
            Live links — not summaries. Click through to the source.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {news.map((n) => (
              <Link
                key={n.headline}
                href={n.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-400/50 hover:bg-white/[0.05]"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
                    {n.tag}
                  </p>
                  <span className="text-xs uppercase tracking-widest text-white/40">
                    {n.source}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-black uppercase leading-snug group-hover:text-white">
                  {n.headline} ↗
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/70">{n.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
