import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Gaming — Respawn Riot",
  description:
    "Gaming news and an inside look at the creature game we're building.",
};

const news = [
  {
    headline: "Indies are eating the awards circuit",
    body: "Solo and small-team releases keep stealing GOTY nominations. The big publishers are noticing — and copying.",
    tag: "Industry",
  },
  {
    headline: "The handheld arms race",
    body: "Steam Deck successors, Switch 2 momentum, and the ROG Ally lineup are turning the living room into a multi-device fight.",
    tag: "Hardware",
  },
  {
    headline: "Live-service fatigue is real",
    body: "More studios pivoting back to tight, finished single-player experiences after a wave of canceled GaaS bets.",
    tag: "Trends",
  },
  {
    headline: "Modding scenes keep classics alive",
    body: "Skyrim, Half-Life 2, and now Elden Ring with thriving custom content — proof that the long tail is the real release window.",
    tag: "Community",
  },
  {
    headline: "Speedrun events keep breaking records",
    body: "AGDQ and SGDQ runs every season are setting new bars and raising serious money for charity along the way.",
    tag: "Esports",
  },
  {
    headline: "AI-assisted devtools are everywhere",
    body: "From asset pipelines to playtesting, the indie toolchain shifted hard in the last 12 months.",
    tag: "Dev",
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
            {"What we're watching across the industry, and a look at the creature we're building in-house."}
          </p>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/15 via-fuchsia-500/10 to-transparent p-6 sm:p-10">
            <p className="text-xs uppercase tracking-[0.3em] text-lime-400">
              Now Building
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase sm:text-4xl">
              Lumling: A Pocket Creature
            </h2>
            <p className="mt-4 max-w-2xl text-white/75">
              {"Our in-progress browser game. Hatch a Lumling, keep it fed, win fights, and watch it evolve through five stages — Egg, Lumling, Lumora, Lumorex, Lumaxis. It's a Tamagotchi with combat in the back room."}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
                  Stages
                </p>
                <p className="mt-1 text-2xl font-black">5</p>
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
                href="/#join"
                className="rounded-xl border border-white/30 px-6 py-3 font-black uppercase tracking-widest text-white transition hover:bg-white/10"
              >
                Get devlog updates
              </Link>
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
            {"The threads we're pulling on this month."}
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {news.map((n) => (
              <article
                key={n.headline}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-400/50 hover:bg-white/[0.05]"
              >
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
                  {n.tag}
                </p>
                <h3 className="mt-2 text-lg font-black uppercase">
                  {n.headline}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/70">{n.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
