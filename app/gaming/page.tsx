import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Gaming — Respawn Riot",
  description:
    "An inside look at the games we're building, hosted creator drops, and links into the gaming hub.",
};

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
              Now Building · Built In-House by kid_ghost
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase sm:text-4xl">
              RC: Respawn Creatures
            </h2>
            <p className="mt-4 max-w-2xl text-white/75">
              {"In-progress browser game by kid_ghost. Pick a species — dino, water, or lion — hatch your egg, feed and train it, and watch it evolve through six stages. It's a Tamagotchi with combat in the back room."}
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
                href="/devlog"
                className="rounded-xl border border-white/30 px-6 py-3 font-black uppercase tracking-widest text-white transition hover:bg-white/10"
              >
                Read the build log
              </Link>
            </div>
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
                  href: "/stars-brawl",
                  emoji: "⭐",
                  title: "Stars Brawl",
                  blurb: "Top-down brawler with six characters, supers, and a walled arena. 1v1 the AI.",
                  cta: "Pick a brawler",
                  accent: "border-yellow-400/50 hover:border-yellow-300",
                  chip: "text-yellow-300",
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

          {/* ───────── KID_GHOST IN-HOUSE: QUESTLIST ───────── */}
          <div className="rounded-3xl border border-violet-400/30 bg-gradient-to-br from-violet-500/15 via-fuchsia-500/10 to-transparent p-6 sm:p-10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-display text-xs tracking-[0.3em] text-violet-400">
                  ▌ BUILT IN-HOUSE · KID_GHOST
                </p>
                <h2 className="mt-2 font-display text-3xl tracking-[0.04em] sm:text-4xl">
                  QUESTLIST // GAMIFIED TASKS
                </h2>
              </div>
              <span className="rounded-md border border-violet-400/40 bg-black px-3 py-1 font-display text-xs tracking-[0.25em] text-violet-300">
                APP · LOCAL-ONLY
              </span>
            </div>
            <p className="mt-4 max-w-2xl text-white/75">
              {"Not a game exactly — a task tracker that gives XP for finishing things. Levels, coins, daily quests. Everything stays in your browser's localStorage. Built by kid_ghost."}
            </p>
            <div className="mt-6">
              <Link
                href="/quest-list"
                className="inline-block rounded-xl bg-violet-400 px-6 py-3 font-display text-sm tracking-[0.25em] text-black transition hover:scale-[1.04] hover:bg-violet-300"
              >
                ⚔ START QUESTING
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTAs to the related hubs — live gaming news now lives at
          /games (the actual hub), site-wide build notes at /devlog. */}
      <section className="border-t border-white/10 bg-zinc-950 px-6 py-12">
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
          <Link
            href="/games"
            className="group rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 to-transparent p-6 transition hover:border-cyan-400/60"
          >
            <p className="font-display text-[11px] tracking-[0.3em] text-cyan-300">
              ▌ CHANNEL 03 / GAMES
            </p>
            <h3 className="mt-2 font-display text-xl tracking-wide text-white">
              Live news, hot lists, forum
            </h3>
            <p className="mt-2 text-sm text-white/65">
              Video game + card game + tabletop news that auto-refreshes,
              what&apos;s currently hot, and posts about what people are
              playing.
            </p>
            <p className="mt-3 font-display text-xs tracking-[0.25em] text-cyan-300 group-hover:text-cyan-200">
              ▸ ENTER THE HUB
            </p>
          </Link>

          <Link
            href="/devlog"
            className="group rounded-2xl border border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-500/10 to-transparent p-6 transition hover:border-fuchsia-400/60"
          >
            <p className="font-display text-[11px] tracking-[0.3em] text-fuchsia-300">
              ▌ THE BUILD LOG
            </p>
            <h3 className="mt-2 font-display text-xl tracking-wide text-white">
              Site-wide build log
            </h3>
            <p className="mt-2 text-sm text-white/65">
              Devlog for the whole site — every meaningful shipment across
              every channel, not just games. Used to live here; now it has
              its own page.
            </p>
            <p className="mt-3 font-display text-xs tracking-[0.25em] text-fuchsia-300 group-hover:text-fuchsia-200">
              ▸ READ THE LOG
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}
