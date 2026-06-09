import Link from "next/link";
import {
  fetchManyRss,
  formatRelative,
  REVALIDATE_HOURLY,
  type Feed,
} from "../../_lib/rss";

// General sci-fi / Marvel / Star Wars news beat — CBR, ScreenRant,
// Polygon. All three return real items as of the most recent probe.
// Google News fills in for fandom-specific queries if RSS is light.

const NERD_FEEDS: Feed[] = [
  { url: "https://www.cbr.com/feed/", source: "CBR" },
  { url: "https://screenrant.com/feed/", source: "ScreenRant" },
  { url: "https://www.polygon.com/rss/index.xml", source: "Polygon" },
];

const FALLBACK_FEEDS: Feed[] = [
  {
    url:
      "https://news.google.com/rss/search?q=%22Star+Wars%22+OR+Marvel+OR+%22sci-fi%22+news&hl=en-US&gl=US&ceid=US:en&when=14d",
    source: "Google News (nerd)",
  },
];

export default async function NerdNewsPanel() {
  const news = await fetchManyRss(NERD_FEEDS, {
    perFeedMax: 6,
    totalMax: 18,
    fallbacks: FALLBACK_FEEDS,
    minBeforeFallback: 8,
    revalidate: REVALIDATE_HOURLY,
  });

  return (
    <div className="space-y-12 px-4 py-10 sm:px-6 sm:py-12">
      <section className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black uppercase sm:text-3xl">
              Fandom News Beat
            </h2>
            <p className="mt-2 text-white/60">
              Marvel, Star Wars, broader sci-fi. From CBR, ScreenRant, and
              Polygon — auto-refreshed hourly.
            </p>
          </div>
          <span className="hidden font-display text-[10px] tracking-[0.3em] text-white/40 sm:block">
            LIVE · UPDATES HOURLY
          </span>
        </div>

        {news.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/60">
            Couldn&apos;t reach the nerd feeds right now. Try refreshing in a bit.
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
                  className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-400/50 hover:bg-white/[0.05]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
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
