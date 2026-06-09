import Link from "next/link";
import {
  fetchTopGoogleNews,
  formatRelative,
  REVALIDATE_HOURLY,
  type NewsItem,
} from "../../_lib/rss";
import { SCIFI_FANTASY, type BookSeries } from "../_lib/series";

// One card per curated series. Each card pulls a fresh Google News
// headline for its searchTopic — that way the cards stay live (new
// book announcements, TV adaptations) without us having to babysit
// the data. If the per-series search returns nothing, the card just
// links to the publisher / author page instead.

async function fetchSeriesNews(s: BookSeries): Promise<NewsItem | null> {
  return fetchTopGoogleNews(s.searchTopic, REVALIDATE_HOURLY, {
    whenDays: 90,
    maxAgeDays: 365,
  });
}

const ACCENT: Record<
  BookSeries["accent"],
  { border: string; tag: string; ring: string; gradient: string }
> = {
  fuchsia: {
    border: "border-fuchsia-400/40",
    tag: "text-fuchsia-200",
    ring: "rgba(217,70,239,0.30)",
    gradient: "from-fuchsia-500/15 via-pink-500/10 to-transparent",
  },
  cyan: {
    border: "border-cyan-400/40",
    tag: "text-cyan-200",
    ring: "rgba(34,211,238,0.30)",
    gradient: "from-cyan-500/15 via-blue-500/10 to-transparent",
  },
  amber: {
    border: "border-amber-400/40",
    tag: "text-amber-200",
    ring: "rgba(251,191,36,0.30)",
    gradient: "from-amber-500/15 via-yellow-500/10 to-transparent",
  },
  lime: {
    border: "border-lime-400/40",
    tag: "text-lime-200",
    ring: "rgba(163,230,53,0.30)",
    gradient: "from-lime-500/15 via-emerald-500/10 to-transparent",
  },
  violet: {
    border: "border-violet-400/40",
    tag: "text-violet-200",
    ring: "rgba(139,92,246,0.30)",
    gradient: "from-violet-500/15 via-purple-500/10 to-transparent",
  },
  rose: {
    border: "border-rose-400/40",
    tag: "text-rose-200",
    ring: "rgba(244,63,94,0.30)",
    gradient: "from-rose-500/15 via-pink-500/10 to-transparent",
  },
  emerald: {
    border: "border-emerald-400/40",
    tag: "text-emerald-200",
    ring: "rgba(52,211,153,0.30)",
    gradient: "from-emerald-500/15 via-teal-500/10 to-transparent",
  },
};

export default async function SeriesPanel() {
  // One Google News fetch per series in parallel.
  const news = await Promise.all(SCIFI_FANTASY.map(fetchSeriesNews));

  return (
    <div className="space-y-12 px-4 py-10 sm:px-6 sm:py-12">
      <section className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black uppercase sm:text-3xl">
              Sci-Fi &amp; Fantasy Reads
            </h2>
            <p className="mt-2 text-white/60">
              The series in active rotation — long-runners, ongoing
              cliffhangers, and the ones we&apos;re still waiting on. Each card
              pulls the freshest headline via Google News.
            </p>
          </div>
          <span className="hidden font-display text-[10px] tracking-[0.3em] text-white/40 sm:block">
            CURATED · NEWS LIVE
          </span>
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SCIFI_FANTASY.map((s, i) => (
            <li key={s.name}>
              <SeriesCard series={s} news={news[i]} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SeriesCard({ series, news }: { series: BookSeries; news: NewsItem | null }) {
  const a = ACCENT[series.accent];
  const rel = formatRelative(news?.pubDate);
  return (
    <Link
      href={news?.link ?? series.href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative block h-full overflow-hidden rounded-2xl border bg-gradient-to-br ${a.gradient} ${a.border} p-5 transition hover:scale-[1.015]`}
      style={{ boxShadow: `0 0 28px -8px ${a.ring}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {series.tags.map((t) => (
              <span
                key={t}
                className={`rounded border border-white/10 bg-black/40 px-1.5 py-0.5 font-display text-[9px] tracking-[0.25em] ${a.tag}`}
              >
                {t}
              </span>
            ))}
          </div>
          <h3 className="mt-2 font-display text-lg leading-tight tracking-wide text-white sm:text-xl">
            {series.name}
          </h3>
          <p className="font-mono text-[11px] text-white/55">{series.author}</p>
        </div>
        {news && rel && (
          <span className="shrink-0 font-mono text-[10px] text-white/40">{rel}</span>
        )}
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/70">{series.blurb}</p>

      <div className="mt-4 border-t border-white/10 pt-3">
        {news ? (
          <>
            <p className={`font-display text-[10px] tracking-[0.25em] ${a.tag}`}>
              ▌ LATEST · {news.publisher ?? news.source}
            </p>
            <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-white/85 group-hover:text-white">
              {news.title} ↗
            </p>
          </>
        ) : (
          <p className="font-display text-[11px] tracking-[0.25em] text-white/45">
            Visit publisher →
          </p>
        )}
      </div>
    </Link>
  );
}
