import Link from "next/link";
import {
  fetchManyRss,
  fetchTopGoogleNews,
  formatRelative,
  REVALIDATE_HOURLY,
  type Feed,
  type NewsItem,
} from "../../_lib/rss";
import { THRILLER_AUTHORS, type ThrillerAuthor } from "../_lib/thrillers";

// Two surfaces on the Thrillers tab:
//
//   1. Per-author cards (curated). Each pulls a fresh Google News
//      headline for the author so the card surfaces new releases /
//      adaptations / tour announcements automatically.
//   2. Genre news feed — Google News for the genre as a whole.

const GENRE_FEEDS: Feed[] = [
  {
    url:
      "https://news.google.com/rss/search?q=%22psychological+thriller%22+book+release+OR+new&hl=en-US&gl=US&ceid=US:en&when=30d",
    source: "Google News (thrillers)",
  },
];

async function fetchAuthorNews(a: ThrillerAuthor): Promise<NewsItem | null> {
  return fetchTopGoogleNews(a.searchTopic, REVALIDATE_HOURLY, {
    whenDays: 90,
    maxAgeDays: 365,
  });
}

export default async function ThrillersPanel() {
  const [authorNews, genreNews] = await Promise.all([
    Promise.all(THRILLER_AUTHORS.map(fetchAuthorNews)),
    fetchManyRss(GENRE_FEEDS, {
      perFeedMax: 10,
      totalMax: 9,
      revalidate: REVALIDATE_HOURLY,
    }),
  ]);

  return (
    <div className="space-y-12 px-4 py-10 sm:px-6 sm:py-12">
      <section className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black uppercase sm:text-3xl">
              Psychological Thrillers
            </h2>
            <p className="mt-2 text-white/60">
              The authors in heavy rotation. Each card shows their freshest
              headline — new releases, adaptations, tour stops — auto-pulled
              from Google News.
            </p>
          </div>
          <span className="hidden font-display text-[10px] tracking-[0.3em] text-white/40 sm:block">
            CURATED · NEWS LIVE
          </span>
        </div>

        <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {THRILLER_AUTHORS.map((a, i) => (
            <li key={a.name}>
              <AuthorCard author={a} news={authorNews[i]} />
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-7xl border-t border-white/10 pt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black uppercase sm:text-3xl">
              Genre News Beat
            </h2>
            <p className="mt-2 text-white/60">
              The wider thriller world — anything tagged psychological
              thriller in the last 30 days.
            </p>
          </div>
          <span className="hidden font-display text-[10px] tracking-[0.3em] text-white/40 sm:block">
            LIVE · UPDATES HOURLY
          </span>
        </div>

        {genreNews.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/60">
            Couldn&apos;t reach the genre feed right now. Try refreshing in a bit.
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {genreNews.map((n) => (
              <NewsCard key={n.link} news={n} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AuthorCard({ author, news }: { author: ThrillerAuthor; news: NewsItem | null }) {
  const rel = formatRelative(news?.pubDate);
  return (
    <Link
      href={news?.link ?? author.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group block h-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-rose-500/10 via-fuchsia-500/5 to-transparent p-5 transition hover:border-rose-400/50 hover:bg-white/[0.04]"
      style={{ boxShadow: `0 0 28px -8px rgba(244,63,94,0.30)` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-[10px] tracking-[0.3em] text-rose-200">
            ▌ THRILLER · AUTHOR
          </p>
          <h3 className="mt-1 font-display text-lg tracking-wide text-white sm:text-xl">
            {author.name}
          </h3>
          <p className="font-mono text-[11px] text-white/55">{author.notable}</p>
        </div>
        {news && rel && (
          <span className="shrink-0 font-mono text-[10px] text-white/40">{rel}</span>
        )}
      </div>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/70">{author.blurb}</p>
      <div className="mt-4 border-t border-white/10 pt-3">
        {news ? (
          <>
            <p className="font-display text-[10px] tracking-[0.25em] text-rose-200">
              ▌ LATEST · {news.publisher ?? news.source}
            </p>
            <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-white/85 group-hover:text-white">
              {news.title} ↗
            </p>
          </>
        ) : (
          <p className="font-display text-[11px] tracking-[0.25em] text-white/45">
            Visit author site →
          </p>
        )}
      </div>
    </Link>
  );
}

function NewsCard({ news }: { news: NewsItem }) {
  const rel = formatRelative(news.pubDate);
  return (
    <Link
      href={news.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-rose-400/50 hover:bg-white/[0.05]"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.25em] text-rose-200">
          {news.publisher ?? news.source}
        </p>
        {rel && <span className="font-mono text-[10px] text-white/40">{rel}</span>}
      </div>
      <h3 className="mt-2 text-base font-black uppercase leading-snug group-hover:text-white">
        {news.title} ↗
      </h3>
    </Link>
  );
}
