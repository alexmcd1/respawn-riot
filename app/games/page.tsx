import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Games — Respawn Riot",
  description:
    "The whole arcade in one place: RC, TDC, Jujutsu Shenanigans, PC Builder, Stars Brawl, and the devlog where it all gets built.",
};

type Tile = {
  href: string;
  tag: string;
  title: string;
  blurb: string;
  emoji: string;
  // Tailwind utility chunks for the tile's accent
  border: string;
  text: string;
  ring: string;
  gradient: string;
  ctaBg: string;
};

const TILES: Tile[] = [
  {
    href: "/gaming",
    tag: "▌ NEWS & DEVLOG",
    title: "Gaming News + Devlog",
    blurb:
      "Hand-curated headlines, plus an inside look at what we're building this week.",
    emoji: "📰",
    border: "border-fuchsia-400/50",
    text: "text-fuchsia-200",
    ring: "rgba(217,70,239,0.30)",
    gradient: "from-fuchsia-500/20 via-pink-500/10 to-transparent",
    ctaBg: "bg-fuchsia-500 hover:bg-fuchsia-400",
  },
  {
    href: "/game",
    tag: "▌ IN-HOUSE · KID_GHOST",
    title: "RC: Respawn Creatures",
    blurb:
      "Hatch, feed, train, fight. Three species, six evolution stages, no two creatures the same.",
    emoji: "🥚",
    border: "border-lime-400/55",
    text: "text-lime-200",
    ring: "rgba(163,230,53,0.30)",
    gradient: "from-lime-500/20 via-cyan-500/10 to-transparent",
    ctaBg: "bg-lime-400 hover:bg-lime-300 !text-black",
  },
  {
    href: "/trading-cards",
    tag: "▌ CREATOR · ZOKU21",
    title: "TDC: Trading Digital Cards",
    blurb:
      "Open anime-themed packs, trade with NPCs, build out a deep collection over time.",
    emoji: "🃏",
    border: "border-amber-400/55",
    text: "text-amber-200",
    ring: "rgba(251,191,36,0.30)",
    gradient: "from-amber-500/20 via-yellow-500/10 to-transparent",
    ctaBg: "bg-amber-400 hover:bg-amber-300 !text-black",
  },
  {
    href: "/jjk-fight",
    tag: "▌ CREATOR · ZOKU21",
    title: "Jujutsu Shenanigans",
    blurb:
      "1v1 cursed-energy fighter. Six characters, domain expansions, AI opponent.",
    emoji: "👁",
    border: "border-fuchsia-400/55",
    text: "text-fuchsia-200",
    ring: "rgba(217,70,239,0.30)",
    gradient: "from-purple-500/20 via-fuchsia-500/10 to-transparent",
    ctaBg: "bg-fuchsia-500 hover:bg-fuchsia-400",
  },
  {
    href: "/pc-builder",
    tag: "▌ CREATOR · ZOKU21",
    title: "PC Builder",
    blurb:
      "Pick parts, check compatibility, see estimated 1080p / 1440p / 4K performance.",
    emoji: "🖥",
    border: "border-cyan-400/55",
    text: "text-cyan-200",
    ring: "rgba(34,211,238,0.30)",
    gradient: "from-cyan-500/20 via-blue-500/10 to-transparent",
    ctaBg: "bg-cyan-400 hover:bg-cyan-300 !text-black",
  },
  {
    href: "/stars-brawl",
    tag: "▌ CREATOR · ZOKU21",
    title: "Stars Brawl",
    blurb:
      "Top-down brawler. Six characters, supers, walled arena. 1v1 the AI.",
    emoji: "⭐",
    border: "border-yellow-400/55",
    text: "text-yellow-200",
    ring: "rgba(250,204,21,0.30)",
    gradient: "from-yellow-500/20 via-orange-500/10 to-transparent",
    ctaBg: "bg-yellow-400 hover:bg-yellow-300 !text-black",
  },
];

export default function GamesPage() {
  return (
    <main className="bg-black text-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-fuchsia-500/30 scanlines">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.30),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.22),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-2 stripe-band" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
          <p className="font-display text-xs tracking-[0.3em] text-fuchsia-400">
            ▌ CHANNEL 03
          </p>
          <h1 className="mt-2 font-display text-3xl tracking-[0.04em] sm:text-5xl">
            GAMES <span className="text-fuchsia-400">{"//"}</span> THE WHOLE ARCADE
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/75 sm:text-base">
            Everything we&apos;re playing, building, and hosting — in one tile
            grid. Click in.
          </p>
        </div>
      </section>

      {/* Tile grid */}
      <section className="px-4 py-8 sm:px-6 sm:py-12">
        <ul className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TILES.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`group relative block h-full overflow-hidden rounded-2xl border bg-gradient-to-br ${t.gradient} ${t.border} p-5 transition hover:scale-[1.015]`}
                style={{ boxShadow: `0 0 28px -8px ${t.ring}` }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/60 text-3xl">
                    {t.emoji}
                  </div>
                  <div className="min-w-0">
                    <p className={`font-display text-[10px] tracking-[0.3em] ${t.text}`}>
                      {t.tag}
                    </p>
                    <h2 className="mt-1 font-display text-lg leading-tight tracking-wide text-white sm:text-xl">
                      {t.title}
                    </h2>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/70">{t.blurb}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center rounded-lg px-4 py-2 font-display text-xs tracking-[0.25em] text-black transition group-hover:scale-[1.04] ${t.ctaBg}`}
                  >
                    ▶ ENTER
                  </span>
                  <span className="font-mono text-[10px] tracking-widest text-white/30">
                    {t.href}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-xs text-white/45">
        Hosted creator games run in your browser. Devlog updates run weekly.
      </footer>
    </main>
  );
}
