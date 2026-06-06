import Link from "next/link";
import { fetchBggHotWithFallback, type BggHotGame } from "../_lib/bgg";
import { VIDEO_GAMES_HOT, type VideoGame } from "../_lib/videoGames";
import { CARD_GAMES_HOT, type CardGame } from "../_lib/cardGames";
import {
  fetchTopGoogleNews,
  formatRelative,
  REVALIDATE_HOURLY,
  type NewsItem,
} from "../../_lib/rss";

// "Currently Hot" — three subsections, each pulled live from
// different sources:
//
//   Video Games: hand-curated lineup (see _lib/videoGames.ts) where
//     each title gets a per-game Google News search so the card
//     shows recent headlines.
//
//   Card Games (TCGs): same pattern as video games, but with the
//     trading card games people are actually following — Magic,
//     Pokémon, Lorcana, One Piece, DBS, Yu-Gi-Oh!. See
//     _lib/cardGames.ts.
//
//   Tabletop: BoardGameGeek's "hot games" XML endpoint (no auth, no
//     key) returns the top 50 board games people are playing right
//     now. Wrapped in fetchBggHotWithFallback so if BGG is down (which
//     it sometimes is — their server load is real), we surface a
//     curated list instead. Section gets a "FROM CACHE" label when
//     the fallback fires so the UX is honest.

const FRESH_MAX_AGE_DAYS = 60;

async function fetchVideoGameNews(name: string): Promise<NewsItem | null> {
  return fetchTopGoogleNews(
    `"${name}" game OR update OR patch OR release`,
    REVALIDATE_HOURLY,
    { whenDays: 45, maxAgeDays: FRESH_MAX_AGE_DAYS }
  );
}

async function fetchCardGameNews(g: CardGame): Promise<NewsItem | null> {
  return fetchTopGoogleNews(
    `"${g.name}" ${g.searchTopic}`,
    REVALIDATE_HOURLY,
    { whenDays: 60, maxAgeDays: FRESH_MAX_AGE_DAYS }
  );
}

export default async function GamesHotPanel() {
  const [videoNews, cardNews, bgg] = await Promise.all([
    Promise.all(VIDEO_GAMES_HOT.map((g) => fetchVideoGameNews(g.name))),
    Promise.all(CARD_GAMES_HOT.map(fetchCardGameNews)),
    fetchBggHotWithFallback(8),
  ]);

  return (
    <div className="space-y-12 px-4 py-10 sm:px-6 sm:py-12">
      {/* ─── Video Games ────────────────────────────────────────── */}
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

      {/* ─── Card Games (TCGs) ─────────────────────────────────── */}
      <section className="mx-auto max-w-7xl border-t border-white/10 pt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black uppercase sm:text-3xl">
              Card Games — Hot Right Now
            </h2>
            <p className="mt-2 text-white/60">
              Trading card games people are actually following. Expansions,
              banlists, tournament wins.
            </p>
          </div>
          <span className="hidden font-display text-[10px] tracking-[0.3em] text-white/40 sm:block">
            CURATED · NEWS LIVE
          </span>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {CARD_GAMES_HOT.map((g, i) => (
            <CardGameCard key={g.name} game={g} news={cardNews[i]} />
          ))}
        </div>
      </section>

      {/* ─── Tabletop (BGG hot list with fallback) ─────────────── */}
      <section className="mx-auto max-w-7xl border-t border-white/10 pt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black uppercase sm:text-3xl">
              Tabletop — Hot Right Now
            </h2>
            <p className="mt-2 text-white/60">
              Top of BoardGameGeek&apos;s hot list — board games and heavier
              tabletop.
            </p>
          </div>
          <span
            className={`hidden font-display text-[10px] tracking-[0.3em] sm:block ${
              bgg.source === "live" ? "text-white/40" : "text-amber-400/70"
            }`}
          >
            {bgg.source === "live"
              ? "BGG · UPDATES 4×/DAY"
              : "BGG OFFLINE · SHOWING CURATED"}
          </span>
        </div>

        {bgg.games.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/60">
            Couldn&apos;t reach BoardGameGeek&apos;s hot list AND the fallback
            list is empty — something has gone unusually wrong. Try refreshing.
          </div>
        ) : (
          <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {bgg.games.map((g) => (
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

/* ─── Card components ─────────────────────────────────────────── */

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
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        {game.coverImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.coverImg}
            alt={game.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover opacity-90 transition group-hover:scale-105 group-hover:opacity-100"
          />
        ) : (
          <GameCoverFallback name={game.name} accent="fuchsia" />
        )}
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

function CardGameCard({
  game,
  news,
}: {
  game: CardGame;
  news: NewsItem | null;
}) {
  const rel = formatRelative(news?.pubDate);
  return (
    <Link
      href={news?.link ?? game.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-cyan-400/60 hover:bg-white/[0.05]"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        <GameCoverFallback name={game.name} accent="cyan" />
        {news && (
          <span className="absolute right-2 top-2 rounded border border-cyan-400/50 bg-black/70 px-2 py-0.5 font-display text-[9px] tracking-[0.3em] text-cyan-300">
            LIVE
          </span>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">
            {game.name}
          </p>
          {rel && (
            <span className="font-mono text-[10px] text-white/40">{rel}</span>
          )}
        </div>
        <h3 className="mt-2 text-lg font-black uppercase leading-snug">
          {news ? news.title : game.blurb}
        </h3>
        <p className="mt-3 text-xs uppercase tracking-widest text-cyan-300/80">
          {news?.publisher ?? news?.source ?? game.publisher} ↗
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
          <GameCoverFallback name={game.name} accent="amber" />
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

/* ─── Gradient + name cover placeholder ───────────────────────
   Used whenever an image source is missing or unreliable (every
   video game card, every card-game card, BGG fallback entries).
   Always renders cleanly — no external dependency, no broken-
   image icon. Hue is derived from the game name so cards in the
   same row look different. */
function GameCoverFallback({
  name,
  accent,
}: {
  name: string;
  accent: "fuchsia" | "cyan" | "amber";
}) {
  // Tiny deterministic hash for hue variety across cards.
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue1 = h % 360;
  const hue2 = (hue1 + 50) % 360;

  // Accent dictates the secondary stroke color (subtle).
  const stroke =
    accent === "fuchsia"
      ? "rgba(255, 46, 179, 0.7)"
      : accent === "cyan"
        ? "rgba(34, 211, 238, 0.7)"
        : "rgba(245, 158, 11, 0.7)";

  return (
    <div
      className="relative h-full w-full"
      style={{
        background: `
          linear-gradient(135deg,
            hsl(${hue1}, 70%, 18%) 0%,
            hsl(${hue2}, 60%, 8%) 100%)`,
      }}
    >
      {/* Diagonal scanline overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-30 [background:repeating-linear-gradient(-45deg,rgba(255,255,255,0.08)_0px,rgba(255,255,255,0.08)_1px,transparent_1px,transparent_10px)]" />
      {/* Faint accent vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${stroke}, transparent 60%)`,
          opacity: 0.35,
        }}
      />
      {/* Title text */}
      <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
        <span className="font-display text-base uppercase tracking-wider text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] sm:text-lg md:text-xl">
          {name}
        </span>
      </div>
    </div>
  );
}
