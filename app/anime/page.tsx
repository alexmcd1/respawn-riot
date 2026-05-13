import type { Metadata } from "next";
import Link from "next/link";
import { fetchManyRss, formatRelative, type Feed } from "../_lib/rss";

export const metadata: Metadata = {
  title: "Anime — Respawn Riot",
  description:
    "Top tier characters, the five anime everyone is watching right now, and where to find more.",
};

// Auto-refresh news every hour
export const revalidate = 3600;

const ANIME_FEEDS: Feed[] = [
  { url: "https://www.animenewsnetwork.com/all/rss.xml?ann-edition=us", source: "Anime News Network" },
  { url: "https://animecorner.me/feed/", source: "Anime Corner" },
  { url: "https://www.crunchyroll.com/news/rss", source: "Crunchyroll News" },
];

const characters = [
  { name: "Gojo Satoru", from: "Jujutsu Kaisen", vibe: "Infinity. Cursed swagger.", mal: "https://myanimelist.net/character/164471/Satoru_Gojou" },
  { name: "Frieren", from: "Frieren: Beyond Journey's End", vibe: "Quiet elf, devastating spells.", mal: "https://myanimelist.net/character/180420/Frieren" },
  { name: "Sung Jinwoo", from: "Solo Leveling", vibe: "Shadow monarch energy.", mal: "https://myanimelist.net/character/183009/Jinwoo_Sung" },
  { name: "Power", from: "Chainsaw Man", vibe: "Chaos goblin supreme.", mal: "https://myanimelist.net/character/169825/Power" },
  { name: "Makima", from: "Chainsaw Man", vibe: "Ultimate red-flag boss.", mal: "https://myanimelist.net/character/169827/Makima" },
  { name: "Yor Forger", from: "Spy x Family", vibe: "Wholesome assassin mom.", mal: "https://myanimelist.net/character/175071/Yor_Forger" },
  { name: "Levi Ackerman", from: "Attack on Titan", vibe: "Humanity's strongest gremlin.", mal: "https://myanimelist.net/character/45627/Levi_Ackerman" },
  { name: "Denji", from: "Chainsaw Man", vibe: "Devil-powered disaster boy.", mal: "https://myanimelist.net/character/169821/Denji" },
];

const top5 = [
  {
    rank: 1,
    title: "Witch Hat Atelier",
    blurb:
      "Top of the Spring 2026 charts. The most highly anticipated show of the season opened with a two-episode premiere and hasn't slowed down.",
    tag: "Fantasy / Adventure",
    mal: "https://myanimelist.net/anime/52173/Tongari_Boushi_no_Atelier",
  },
  {
    rank: 2,
    title: "Daemons of the Shadow Realm",
    blurb:
      "From Hiromu Arakawa (Fullmetal Alchemist). One of the season's must-watches — already winning audiences with its early episodes.",
    tag: "Fantasy / Action",
    mal: "https://myanimelist.net/anime/56964/Yomi_no_Tsugai",
  },
  {
    rank: 3,
    title: "Nippon Sangoku",
    blurb:
      "Arguably the most unique new anime airing this season. Historical with a sharp visual identity.",
    tag: "Historical / Drama",
    mal: "https://myanimelist.net/search/all?q=nippon%20sangoku&cat=all",
  },
  {
    rank: 4,
    title: "One Piece",
    blurb:
      "Still going. The Egghead arc keeps the fandom locked in twenty-five years deep.",
    tag: "Adventure / Shonen",
    mal: "https://myanimelist.net/anime/21/One_Piece",
  },
  {
    rank: 5,
    title: "Hell's Paradise: Jigokuraku",
    blurb:
      "Back from an overlong hiatus and immediately back in rotation.",
    tag: "Action / Supernatural",
    mal: "https://myanimelist.net/anime/46569/Jigokuraku",
  },
];

const findCool = [
  { title: "Crunchyroll", body: "Where most current-season anime stream subbed and dubbed.", href: "https://www.crunchyroll.com" },
  { title: "Netflix Anime", body: "Solo Leveling lives here, plus a deep back catalog.", href: "https://www.netflix.com/browse/genre/7424" },
  { title: "MyAnimeList", body: "Track what you've watched and find what's next.", href: "https://myanimelist.net" },
  { title: "AniList", body: "Prettier tracker. Great trending charts and rec graphs.", href: "https://anilist.co" },
  { title: "r/anime", body: "Episode discussion threads land within minutes of release.", href: "https://www.reddit.com/r/anime" },
  { title: "Anime News Network", body: "Industry reporting, interviews, and the news beat.", href: "https://www.animenewsnetwork.com" },
];

export default async function AnimePage() {
  const news = await fetchManyRss(ANIME_FEEDS, 6, 9);
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
              Click for official profile
            </span>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {characters.map((c) => (
              <Link
                key={c.name}
                href={c.mal}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-2xl border border-white/10 bg-gradient-to-br from-fuchsia-500/10 to-transparent p-5 transition hover:border-fuchsia-400/60"
              >
                <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">
                  {c.from}
                </p>
                <h3 className="mt-2 text-xl font-black uppercase">{c.name}</h3>
                <p className="mt-3 text-sm text-white/70">{c.vibe}</p>
                <p className="mt-4 text-xs uppercase tracking-widest text-fuchsia-300/80 group-hover:text-fuchsia-300">
                  Profile on MAL ↗
                </p>
              </Link>
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
            {"What's actually charting this Spring 2026 season."}
          </p>

          <ol className="mt-8 space-y-4">
            {top5.map((a) => (
              <li key={a.rank}>
                <Link
                  href={a.mal}
                  target="_blank"
                  rel="noopener noreferrer"
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
                    <p className="mt-3 text-xs uppercase tracking-widest text-fuchsia-300/80">
                      View on MAL ↗
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-black uppercase sm:text-3xl">
              This Week in Anime
            </h2>
            <span className="hidden font-display text-[10px] tracking-[0.3em] text-white/40 sm:block">
              LIVE · UPDATES HOURLY
            </span>
          </div>
          <p className="mt-2 text-white/60">
            Latest from ANN, Anime Corner, and Crunchyroll News.
          </p>

          {news.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/60">
              {"Couldn't reach the feeds right now. Try refreshing in a bit."}
            </div>
          ) : (
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {news.map((n) => {
                const rel = formatRelative(n.pubDate);
                return (
                  <Link
                    key={n.link}
                    href={n.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-fuchsia-400/50 hover:bg-white/[0.05]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">
                        {n.source}
                      </p>
                      {rel && (
                        <span className="font-mono text-[10px] text-white/40">
                          {rel}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 text-base font-black uppercase leading-snug group-hover:text-white">
                      {n.title} ↗
                    </h3>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-white/10 bg-zinc-950 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl font-black uppercase sm:text-3xl">
            Find Cool Stuff
          </h2>
          <p className="mt-2 text-white/60">
            Where to stream, track, and dig deeper.
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
                  <span className="inline-block text-fuchsia-400 transition group-hover:translate-x-1">
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
