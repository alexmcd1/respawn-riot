import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Anime — Respawn Riot",
  description:
    "Top tier characters, the five anime everyone is watching right now, and where to find more.",
};

const characters = [
  { name: "Gojo Satoru", from: "Jujutsu Kaisen", vibe: "Infinity. Cursed swagger." },
  { name: "Frieren", from: "Frieren: Beyond Journey's End", vibe: "Quiet elf, devastating spells." },
  { name: "Sung Jinwoo", from: "Solo Leveling", vibe: "Shadow monarch energy." },
  { name: "Power", from: "Chainsaw Man", vibe: "Chaos goblin supreme." },
  { name: "Makima", from: "Chainsaw Man", vibe: "Ultimate red-flag boss." },
  { name: "Yor Forger", from: "Spy x Family", vibe: "Wholesome assassin mom." },
  { name: "Levi Ackerman", from: "Attack on Titan", vibe: "Humanity's strongest gremlin." },
  { name: "Denji", from: "Chainsaw Man", vibe: "Devil-powered disaster boy." },
];

const top5 = [
  {
    rank: 1,
    title: "Solo Leveling",
    blurb:
      "Sung Jinwoo's run keeps trending every weekend a new episode drops. Animation budget feels personal.",
    tag: "Action / Shonen",
  },
  {
    rank: 2,
    title: "Frieren: Beyond Journey's End",
    blurb:
      "The thinking person's anime of the moment. Slow, gorgeous, and absolutely devastating in the quietest way.",
    tag: "Fantasy / Drama",
  },
  {
    rank: 3,
    title: "Jujutsu Kaisen",
    blurb:
      "The Culling Game arc keeps the cursed energy hot. Every fight is a Twitter event.",
    tag: "Action / Supernatural",
  },
  {
    rank: 4,
    title: "One Piece",
    blurb:
      "Egghead Island arc has the fandom locked in. Twenty-five years deep and still finding new gears.",
    tag: "Adventure / Shonen",
  },
  {
    rank: 5,
    title: "Demon Slayer",
    blurb:
      "Final arcs are landing with movie-grade animation. Ufotable refusing to miss.",
    tag: "Action / Supernatural",
  },
];

const findCool = [
  {
    title: "Crunchyroll",
    body: "Where most of these are streaming subbed and dubbed.",
    href: "https://www.crunchyroll.com",
  },
  {
    title: "Netflix Anime",
    body: "Solo Leveling lives here, plus a deep back catalog.",
    href: "https://www.netflix.com/browse/genre/7424",
  },
  {
    title: "MyAnimeList",
    body: "Track what you've watched and find what's next based on what you love.",
    href: "https://myanimelist.net",
  },
  {
    title: "AniList",
    body: "The prettier tracker. Great for trending charts and rec graphs.",
    href: "https://anilist.co",
  },
  {
    title: "r/anime",
    body: "Episode discussion threads drop within minutes of every release.",
    href: "https://www.reddit.com/r/anime",
  },
  {
    title: "Anime News Network",
    body: "Industry reporting, interviews, and the news beat.",
    href: "https://www.animenewsnetwork.com",
  },
];

export default function AnimePage() {
  return (
    <main className="bg-black text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.25),transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-400">
            Channel 01
          </p>
          <h1 className="mt-3 text-4xl font-black uppercase tracking-tight sm:text-6xl">
            Anime <span className="text-fuchsia-500">{"//"}</span> Hype Floor
          </h1>
          <p className="mt-4 max-w-2xl text-white/70">
            {"The characters everyone's drawing fanart of, the five shows you can't dodge on the timeline, and the best places to actually watch them."}
          </p>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-black uppercase sm:text-3xl">
              Most Popular Characters
            </h2>
            <span className="hidden text-xs uppercase tracking-[0.3em] text-white/40 sm:block">
              Power ranked, vibes-first
            </span>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {characters.map((c) => (
              <div
                key={c.name}
                className="group rounded-2xl border border-white/10 bg-gradient-to-br from-fuchsia-500/10 to-transparent p-5 transition hover:border-fuchsia-400/60"
              >
                <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">
                  {c.from}
                </p>
                <h3 className="mt-2 text-xl font-black uppercase">{c.name}</h3>
                <p className="mt-3 text-sm text-white/70">{c.vibe}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-zinc-950 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl font-black uppercase sm:text-3xl">
            Top 5 Anime Right Now
          </h2>
          <p className="mt-2 text-white/60">
            {"What the timeline won't shut up about this season."}
          </p>

          <ol className="mt-8 space-y-4">
            {top5.map((a) => (
              <li
                key={a.rank}
                className="flex gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-fuchsia-400/40 hover:bg-white/[0.05]"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/15 text-2xl font-black text-fuchsia-300">
                  {a.rank}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-white/50">
                    {a.tag}
                  </p>
                  <h3 className="mt-1 text-xl font-black uppercase">
                    {a.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    {a.blurb}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl font-black uppercase sm:text-3xl">
            Find Cool Stuff
          </h2>
          <p className="mt-2 text-white/60">
            Where to stream, track, and dig deeper on the picks above.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {findCool.map((c) => (
              <Link
                key={c.title}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-fuchsia-400/60 hover:bg-white/[0.06]"
              >
                <h3 className="text-lg font-black uppercase">
                  {c.title}{" "}
                  <span className="text-fuchsia-400 transition group-hover:translate-x-1 inline-block">
                    ↗
                  </span>
                </h3>
                <p className="mt-2 text-sm text-white/70">{c.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
