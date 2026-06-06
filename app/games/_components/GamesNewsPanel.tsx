import Link from "next/link";
import {
  fetchManyRss,
  formatRelative,
  REVALIDATE_HOURLY,
  type Feed,
} from "../../_lib/rss";

// News from across both video games AND tabletop. The fetchManyRss
// helper rotates through all sources, dedupes, and caps the total so
// no single publisher dominates the headline list.

const VIDEO_GAME_FEEDS: Feed[] = [
  { url: "https://feeds.ign.com/ign/games-all", source: "IGN" },
  { url: "https://www.polygon.com/rss/games/index.xml", source: "Polygon" },
  { url: "https://www.pushsquare.com/feeds/latest", source: "Push Square" },
  { url: "https://www.eurogamer.net/?format=rss", source: "Eurogamer" },
];

const TABLETOP_FEEDS: Feed[] = [
  { url: "https://www.dicebreaker.com/feed.rss", source: "Dicebreaker" },
  { url: "https://boardgamegeek.com/rss/news", source: "BoardGameGeek News" },
];

const FALLBACK_FEEDS: Feed[] = [
  { url: "https://news.google.com/rss/search?q=video+game+news+OR+board+game+news&hl=en-US&gl=US&ceid=US:en", source: "Google News (games)" },
];

export default async function GamesNewsPanel() {
  // Two independent fetches so the side-by-side layout shows a steady
  // mix of video + tabletop even if one source set is down.
  const [videoNews, tabletopNews] = await Promise.all([
    fetchManyRss(VIDEO_GAME_FEEDS, {
      perFeedMax: 5,
      totalMax: 12,
      fallbacks: FALLBACK_FEEDS,
      minBeforeFallback: 4,
      revalidate: REVALIDATE_HOURLY,
    }),
    fetchManyRss(TABLETOP_FEEDS, {
      perFeedMax: 5,
      totalMax: 8,
      revalidate: REVALIDATE_HOURLY,
    }),
  ]);

  return (
    <div className="space-y-12 px-4 py-10 sm:px-6 sm:py-12">
      {/* Video games headline grid */}
      <section className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black uppercase sm:text-3xl">
              Video Game News
            </h2>
            <p className="mt-2 text-white/60">
              From IGN, Polygon, Push Square, and Eurogamer. Refreshes hourly.
            </p>
          </div>
          <span className="hidden font-display text-[10px] tracking-[0.3em] text-white/40 sm:block">
            LIVE · UPDATES HOURLY
          </span>
        </div>

        {videoNews.length === 0 ? (
          <NewsEmpty area="video games" />
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {videoNews.map((n) => (
              <NewsCard key={n.link} news={n} accent="fuchsia" />
            ))}
          </div>
        )}
      </section>

      {/* Tabletop news */}
      <section className="mx-auto max-w-7xl border-t border-white/10 pt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black uppercase sm:text-3xl">
              Tabletop News
            </h2>
            <p className="mt-2 text-white/60">
              Board games, card games, TTRPGs. From Dicebreaker + BoardGameGeek.
            </p>
          </div>
          <span className="hidden font-display text-[10px] tracking-[0.3em] text-white/40 sm:block">
            LIVE · UPDATES HOURLY
          </span>
        </div>

        {tabletopNews.length === 0 ? (
          <NewsEmpty area="tabletop" />
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tabletopNews.map((n) => (
              <NewsCard key={n.link} news={n} accent="amber" />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function NewsCard({
  news,
  accent,
}: {
  news: { link: string; title: string; source: string; pubDate?: string };
  accent: "fuchsia" | "amber";
}) {
  const rel = formatRelative(news.pubDate);
  const accentClasses =
    accent === "fuchsia"
      ? {
          tag: "text-fuchsia-300",
          hoverBorder: "hover:border-fuchsia-400/50",
        }
      : {
          tag: "text-amber-300",
          hoverBorder: "hover:border-amber-400/50",
        };
  return (
    <Link
      href={news.link}
      target="_blank"
      rel="noopener noreferrer"
      className={`group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition ${accentClasses.hoverBorder} hover:bg-white/[0.05]`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={`text-xs uppercase tracking-[0.25em] ${accentClasses.tag}`}>
          {news.source}
        </p>
        {rel && (
          <span className="font-mono text-[10px] text-white/40">{rel}</span>
        )}
      </div>
      <h3 className="mt-2 text-base font-black uppercase leading-snug group-hover:text-white">
        {news.title} ↗
      </h3>
    </Link>
  );
}

function NewsEmpty({ area }: { area: string }) {
  return (
    <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/60">
      Couldn&apos;t reach the {area} feeds right now. Try refreshing in a bit.
    </div>
  );
}
