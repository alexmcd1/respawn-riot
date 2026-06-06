import type { Metadata } from "next";
import Link from "next/link";
import { fetchManyRss, formatRelative, type Feed } from "../_lib/rss";
import {
  displayTitle,
  fetchTopCharacters,
  fetchTrendingAiringAnime,
  fetchTrendingManga,
  fetchUpcomingAnime,
  formatSeason,
  shortDescription,
  type AnilistMedia,
  type AnilistCharacter,
} from "../_lib/anilist";
import ChannelBanner from "../_components/ChannelBanner";

export const metadata: Metadata = {
  title: "Anime — Respawn Riot",
  description:
    "What's actually trending in anime right now, what's coming next, and the news beat. Auto-refreshed via AniList every hour.",
};

// Hourly revalidation. AniList recommends 5-minute minimum; we go an
// hour because "what's hot" doesn't shift faster than that.
export const revalidate = 3600;

const ANIME_FEEDS: Feed[] = [
  { url: "https://www.animenewsnetwork.com/all/rss.xml?ann-edition=us", source: "Anime News Network" },
  { url: "https://animecorner.me/feed/", source: "Anime Corner" },
  { url: "https://www.crunchyroll.com/news/rss", source: "Crunchyroll News" },
];

const ANIME_FALLBACKS: Feed[] = [
  { url: "https://news.google.com/rss/search?q=anime+news&hl=en-US&gl=US&ceid=US:en", source: "Google News (anime)" },
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
  // All five data fetches in parallel — each has its own try/catch so
  // a single failed fetch can't take down the page.
  const [news, trending, upcoming, manga, characters] = await Promise.all([
    fetchManyRss(ANIME_FEEDS, {
      perFeedMax: 6,
      totalMax: 9,
      fallbacks: ANIME_FALLBACKS,
      minBeforeFallback: 4,
    }),
    fetchTrendingAiringAnime(5),
    fetchUpcomingAnime(6),
    fetchTrendingManga(6),
    fetchTopCharacters(8),
  ]);

  return (
    <main className="bg-black text-white">
      <ChannelBanner
        src="/banners/anime.png"
        alt="Anime channel banner — Kid Ghost in dramatic shonen-OP anime style"
      />
      {/* ─── Hero ─────────────────────────────────────────────────── */}
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
            What&apos;s actually trending right now, what&apos;s coming next, and the headline beat — auto-refreshed via AniList + news feeds.
          </p>
        </div>
      </section>

      {/* ─── Trending Now (currently airing, sorted by AniList trending) ─── */}
      <section className="border-t border-white/10 bg-zinc-950 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black uppercase sm:text-3xl">
                Trending Now
              </h2>
              <p className="mt-2 text-white/60">
                Currently airing, ranked by AniList&apos;s real-time activity signal.
              </p>
            </div>
            <span className="hidden font-display text-[10px] tracking-[0.3em] text-white/40 sm:block">
              LIVE · UPDATES HOURLY
            </span>
          </div>

          {trending.length === 0 ? (
            <EmptyAniListState area="trending" />
          ) : (
            <ol className="mt-8 space-y-4">
              {trending.map((a, i) => (
                <li key={a.id}>
                  <TrendingRow rank={i + 1} media={a} />
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {/* ─── Coming Soon ─────────────────────────────────────────── */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black uppercase sm:text-3xl">
                Coming Soon
              </h2>
              <p className="mt-2 text-white/60">
                Highly anticipated anime that haven&apos;t aired yet.
              </p>
            </div>
            <span className="hidden font-display text-[10px] tracking-[0.3em] text-white/40 sm:block">
              SORTED BY HYPE
            </span>
          </div>

          {upcoming.length === 0 ? (
            <EmptyAniListState area="upcoming" />
          ) : (
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((a) => (
                <li key={a.id}>
                  <UpcomingCard media={a} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ─── Manga Updates ─────────────────────────────────────── */}
      <section className="border-t border-white/10 bg-zinc-950 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black uppercase sm:text-3xl">
                Manga Updates
              </h2>
              <p className="mt-2 text-white/60">
                Currently serializing — sorted by AniList&apos;s real-time
                trending signal. Includes ongoing series and ones on hiatus
                (HxH, Berserk, etc.) so the flagships aren&apos;t excluded.
              </p>
            </div>
            <span className="hidden font-display text-[10px] tracking-[0.3em] text-white/40 sm:block">
              LIVE · UPDATES HOURLY
            </span>
          </div>

          {manga.length === 0 ? (
            <EmptyAniListState area="manga" />
          ) : (
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {manga.map((m) => (
                <li key={m.id}>
                  <MangaCard media={m} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ─── Most-favorited characters ─────────────────────────── */}
      <section className="border-t border-white/10 bg-zinc-950 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-black uppercase sm:text-3xl">
              Most-Favorited Characters
            </h2>
            <span className="hidden text-xs uppercase tracking-[0.3em] text-white/40 sm:block">
              All-time on AniList
            </span>
          </div>

          {characters.length === 0 ? (
            <EmptyAniListState area="characters" />
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {characters.map((c) => (
                <CharacterCard key={c.id} character={c} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── News / RSS — unchanged ─────────────────────────────── */}
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

      {/* ─── Find Cool Stuff — unchanged ────────────────────────── */}
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

// ─── Sub-components ──────────────────────────────────────────────────

function TrendingRow({ rank, media }: { rank: number; media: AnilistMedia }) {
  const title = displayTitle(media.title);
  const blurb = shortDescription(media.description, 220);
  const score = media.averageScore ?? media.meanScore;
  return (
    <Link
      href={media.siteUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-fuchsia-400/40 hover:bg-white/[0.05]"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/15 text-2xl font-black text-fuchsia-300">
        {rank}
      </div>
      {/* Cover thumbnail — plain <img> to avoid Next/Image remote-patterns
          setup for AniList's CDN. */}
      {media.coverImage.large && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media.coverImage.large}
          alt={title}
          loading="lazy"
          decoding="async"
          className="hidden h-24 w-16 shrink-0 rounded-md object-cover sm:block"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-xs uppercase tracking-[0.25em] text-white/50">
            {media.genres.slice(0, 3).join(" / ") || "Anime"}
          </p>
          {score != null && (
            <span className="rounded bg-fuchsia-500/15 px-2 py-0.5 font-mono text-[10px] tracking-widest text-fuchsia-200">
              ★ {score / 10}
            </span>
          )}
          {media.episodes != null && (
            <span className="font-mono text-[10px] text-white/45">
              {media.episodes} eps
            </span>
          )}
        </div>
        <h3 className="mt-1 text-xl font-black uppercase">{title}</h3>
        {blurb && (
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/70">{blurb}</p>
        )}
        <p className="mt-3 text-xs uppercase tracking-widest text-fuchsia-300/80">
          View on AniList ↗
        </p>
      </div>
    </Link>
  );
}

function UpcomingCard({ media }: { media: AnilistMedia }) {
  const title = displayTitle(media.title);
  const blurb = shortDescription(media.description, 160);
  const season = formatSeason(media.season, media.seasonYear);
  return (
    <Link
      href={media.siteUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-fuchsia-500/10 to-transparent transition hover:border-fuchsia-400/60"
    >
      {/* Banner or cover used as the top image. Fall back to a tiny
          gradient header when no banner exists. */}
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        {media.bannerImage || media.coverImage.extraLarge ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.bannerImage ?? media.coverImage.extraLarge ?? ""}
            alt={title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover opacity-90 transition group-hover:scale-105 group-hover:opacity-100"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-fuchsia-500/30 via-pink-500/15 to-black" />
        )}
        {season && (
          <span className="absolute right-2 top-2 rounded border border-fuchsia-400/50 bg-black/70 px-2 py-0.5 font-display text-[9px] tracking-[0.3em] text-fuchsia-300">
            {season}
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">
          {media.genres.slice(0, 2).join(" / ") || "Anime"}
        </p>
        <h3 className="mt-1 text-base font-black uppercase leading-snug">{title}</h3>
        {blurb && (
          <p className="mt-2 line-clamp-3 text-sm leading-snug text-white/70">{blurb}</p>
        )}
      </div>
    </Link>
  );
}

function MangaCard({ media }: { media: AnilistMedia }) {
  const title = displayTitle(media.title);
  const blurb = shortDescription(media.description, 160);
  const score = media.averageScore ?? media.meanScore;
  // Status pill text: AniList returns RELEASING / HIATUS / FINISHED /
  // NOT_YET_RELEASED / CANCELLED. We only ever query RELEASING+HIATUS
  // so those are the two that need friendly labels.
  const statusLabel =
    media.status === "RELEASING"
      ? "ONGOING"
      : media.status === "HIATUS"
        ? "ON HIATUS"
        : media.status?.replace(/_/g, " ") ?? "";
  const isHiatus = media.status === "HIATUS";
  return (
    <Link
      href={media.siteUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/10 to-transparent transition hover:border-cyan-400/60"
    >
      {/* Banner or cover used as the top image — manga banners are rare
          on AniList, so we mostly fall back to the cover art. */}
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        {media.bannerImage || media.coverImage.extraLarge ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.bannerImage ?? media.coverImage.extraLarge ?? ""}
            alt={title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover opacity-90 transition group-hover:scale-105 group-hover:opacity-100"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-cyan-500/30 via-fuchsia-500/15 to-black" />
        )}
        {statusLabel && (
          <span
            className={`absolute right-2 top-2 rounded border bg-black/70 px-2 py-0.5 font-display text-[9px] tracking-[0.3em] ${
              isHiatus
                ? "border-amber-400/50 text-amber-300"
                : "border-cyan-400/50 text-cyan-300"
            }`}
          >
            {statusLabel}
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
            {media.genres.slice(0, 2).join(" / ") || "Manga"}
          </p>
          {score != null && (
            <span className="rounded bg-cyan-500/15 px-2 py-0.5 font-mono text-[10px] tracking-widest text-cyan-200">
              ★ {score / 10}
            </span>
          )}
          {media.chapters != null && media.chapters > 0 ? (
            <span className="font-mono text-[10px] text-white/45">
              {media.chapters} ch.
            </span>
          ) : (
            <span className="font-mono text-[10px] text-white/45">
              ongoing
            </span>
          )}
        </div>
        <h3 className="mt-1 text-base font-black uppercase leading-snug">{title}</h3>
        {blurb && (
          <p className="mt-2 line-clamp-3 text-sm leading-snug text-white/70">{blurb}</p>
        )}
        <p className="mt-3 text-xs uppercase tracking-widest text-cyan-300/80 group-hover:text-cyan-300">
          Read on AniList ↗
        </p>
      </div>
    </Link>
  );
}

function CharacterCard({ character }: { character: AnilistCharacter }) {
  const fromTitle = character.media.nodes[0]?.title
    ? displayTitle(character.media.nodes[0].title)
    : "";
  return (
    <Link
      href={character.siteUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-fuchsia-500/10 to-transparent p-4 transition hover:border-fuchsia-400/60"
    >
      {character.image.large && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={character.image.large}
          alt={character.name.full}
          loading="lazy"
          decoding="async"
          className="h-24 w-20 shrink-0 rounded-lg object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        {fromTitle && (
          <p className="truncate text-[10px] uppercase tracking-[0.25em] text-fuchsia-300">
            {fromTitle}
          </p>
        )}
        <h3 className="mt-1 text-lg font-black uppercase leading-tight">
          {character.name.full}
        </h3>
        <p className="mt-2 font-mono text-[10px] text-white/45">
          ♥ {character.favourites.toLocaleString()} faves
        </p>
        <p className="mt-2 text-xs uppercase tracking-widest text-fuchsia-300/80 group-hover:text-fuchsia-300">
          Profile on AniList ↗
        </p>
      </div>
    </Link>
  );
}

function EmptyAniListState({ area }: { area: string }) {
  return (
    <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/60">
      Couldn&apos;t reach AniList for {area} right now. Refresh in a bit, or
      hit{" "}
      <Link
        href="https://anilist.co"
        target="_blank"
        rel="noopener noreferrer"
        className="text-fuchsia-300 hover:underline"
      >
        anilist.co
      </Link>{" "}
      directly.
    </div>
  );
}
