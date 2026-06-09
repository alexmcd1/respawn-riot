import Link from "next/link";
import {
  fetchManyRss,
  formatRelative,
  REVALIDATE_HOURLY,
  type Feed,
} from "../../_lib/rss";

// "This Week in Books" — broad sci-fi/fantasy/lit beat that doesn't
// belong to a single curated series. Reactor (formerly Tor.com) is
// the strongest single sci-fi/fantasy outlet; Book Riot covers more
// of the wider lit + adaptations beat.

const BOOK_FEEDS: Feed[] = [
  { url: "https://reactormag.com/feed/", source: "Reactor" },
  { url: "https://bookriot.com/feed/", source: "Book Riot" },
];

const FALLBACK_FEEDS: Feed[] = [
  {
    url:
      "https://news.google.com/rss/search?q=%22science+fiction%22+OR+fantasy+book+release+OR+new&hl=en-US&gl=US&ceid=US:en&when=14d",
    source: "Google News (books)",
  },
];

export default async function BooksNewsPanel() {
  const news = await fetchManyRss(BOOK_FEEDS, {
    perFeedMax: 8,
    totalMax: 18,
    fallbacks: FALLBACK_FEEDS,
    minBeforeFallback: 6,
    revalidate: REVALIDATE_HOURLY,
  });

  return (
    <div className="space-y-12 px-4 py-10 sm:px-6 sm:py-12">
      <section className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black uppercase sm:text-3xl">
              This Week in Books
            </h2>
            <p className="mt-2 text-white/60">
              The wider sci-fi / fantasy / lit beat. From Reactor (the
              outlet formerly known as Tor.com) and Book Riot.
            </p>
          </div>
          <span className="hidden font-display text-[10px] tracking-[0.3em] text-white/40 sm:block">
            LIVE · UPDATES HOURLY
          </span>
        </div>

        {news.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/60">
            Couldn&apos;t reach the book feeds right now. Try refreshing in a bit.
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
                  className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-amber-400/50 hover:bg-white/[0.05]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.25em] text-amber-200">
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
      </section>
    </div>
  );
}
