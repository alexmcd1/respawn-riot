import Link from "next/link";
import { fetchBggHot, type BggHotGame } from "../_lib/bgg";
import { VIDEO_GAMES_HOT, type VideoGame } from "../_lib/videoGames";
import {
  fetchTopGoogleNews,
  formatRelative,
  REVALIDATE_HOURLY,
  type NewsItem,
} from "../../_lib/rss";

// "Currently Hot" — two subsections, each pulled live from different
// sources:
//
//   Video Games: a hand-curated lineup (see _lib/videoGames.ts) where
//     each game gets a per-title Google News search so the card shows
//     recent headlines. Same pattern as the pop-punk band cards.
//
//   Tabletop: BoardGameGeek's "hot games" XML endpoint (no auth, no
//     key) returns the top 50 games people are actually playing right
//     now. We surface the top 8 with their BGG thumbnails. This also
//     covers TCGs since BGG categorizes Magic / Pokémon / Yu-Gi-Oh
//     under boardgame for hot-list purposes.

const FRESH_MAX_AGE_DAYS = 60;

async function fetchVideoGameNews(name: string): Promise<NewsItem | null> {
  return fetchTopGoogleNews(
    `"${name}" game OR update OR patch OR release`,
    REVALIDATE_HOURLY,
    { whenDays: 45, maxAgeDays: FRESH_MAX_AGE_DAYS }
  );
}

export default async function GamesHotPanel() {
  const [videoNews, bggHot] = await Promise.all([
    Promise.all(VIDEO_GAMES_HOT.map((g) => fetchVideoGameNews(g.name))),
    fetchBggHot(8),
  ]);

  return (
    <div className="space-y-12 px-4 py-10 sm:px-6 sm:py-12">
      {/* Video games — currently popular */}
      <section className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black uppercase sm:text-3xl">
              Video Games — Hot Right Now
            </h2>
            <p className="mt-2 text-white/60">
              The games actually getting played. Each card shows the latest
              news for that title.
            </p>
          </div>
          <span className="hidden font-display text-[10px] tracking-[0.3em] text-white/40 sm:block">
            CURATED · NEWS LIVE
          </span>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {VIDEO_GAMES_HOT.map((g, i) => (
            <VideoGameCard key={g.name} game={g} news={videoNews[i]} />
          ))}
        </div>
      </section>

      {/* Tabletop — BGG hot list */}
      <section className="mx-auto max-w-7xl border-t border-white/10 pt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black uppercase sm:text-3xl">
              Tabletop — Hot Right Now
            </h2>
            <p className="mt-2 text-white/60">
              Top of BoardGameGeek&apos;s hot list — board games, card games,
              TCGs.
            </p>
          </div>
          <span className="hidden font-display text-[10px] tracking-[0.3em] text-white/40 sm:block">
            BGG · UPDATES 4×/DAY
          </span>
        </div>

        {bggHot.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/60">
            Couldn&apos;t reach BoardGameGeek&apos;s hot list right now. Try
            again in a bit.
          </div>
        ) : (
          <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {bggHot.map((g) => (
              <li key={g.id}>
                <BggHotCard game={g} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function VideoGameCard({
  game,
  news,
}: {
  game: VideoGame;
  news: NewsItem | null;
}) {
  const rel = formatRelative(news?.pubDate);
  return (
    <Link
      href={news?.link ?? game.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-fuchsia-400/60 hover:bg-white/[0.05]"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={game.coverImg}
          alt={game.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover opacity-90 transition group-hover:scale-105 group-hover:opacity-100"
        />
        {news && (
          <span className="absolute right-2 top-2 rounded border border-fuchsia-400/50 bg-black/70 px-2 py-0.5 font-display text-[9px] tracking-[0.3em] text-fuchsia-300">
            LIVE
          </span>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-300">
            {game.name}
          </p>
          {rel && (
            <span className="font-mono text-[10px] text-white/40">{rel}</span>
          )}
        </div>
        <h3 className="mt-2 text-lg font-black uppercase leading-snug">
          {news ? news.title : game.blurb}
        </h3>
        <p className="mt-3 text-xs uppercase tracking-widest text-fuchsia-300/80">
          {news?.publisher ?? news?.source ?? game.tag} ↗
        </p>
      </div>
    </Link>
  );
}

function BggHotCard({ game }: { game: BggHotGame }) {
  return (
    <Link
      href={game.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/10 to-transparent transition hover:border-amber-400/60"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-black">
        {game.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.thumbnail}
            alt={game.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover opacity-90 transition group-hover:scale-105 group-hover:opacity-100"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-amber-500/30 via-orange-500/15 to-black" />
        )}
        <span className="absolute left-2 top-2 rounded bg-black/75 px-1.5 py-0.5 font-display text-[10px] tracking-widest text-amber-200">
          #{game.rank}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-sm font-black leading-snug">{game.name}</h3>
        {game.yearPublished && (
          <p className="mt-1 font-mono text-[10px] text-white/40">
            {game.yearPublished}
          </p>
        )}
        <p className="mt-auto pt-2 text-[10px] uppercase tracking-widest text-amber-300/80">
          BGG ↗
        </p>
      </div>
    </Link>
  );
}
