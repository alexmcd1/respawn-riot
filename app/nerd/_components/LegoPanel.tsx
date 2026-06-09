import Link from "next/link";
import {
  fetchManyRss,
  formatRelative,
  REVALIDATE_HOURLY,
  type Feed,
} from "../../_lib/rss";

// LEGO new-set + reveal beat. Brick Fanatics + The Brick Fan are the
// two strongest English-language LEGO news outlets — both return
// reveals, official announcements, and big-set news (which is the
// section we care about most).
//
// Brickset's own RSS endpoint returned 0 bytes in the latest probe so
// it's not in the lineup. Google News fills in for the broader "LEGO
// announces" / "LEGO reveals" search when the primaries are light.

const LEGO_FEEDS: Feed[] = [
  { url: "https://www.brickfanatics.com/feed/", source: "Brick Fanatics" },
  { url: "https://www.thebrickfan.com/feed/", source: "The Brick Fan" },
];

const FALLBACK_FEEDS: Feed[] = [
  {
    url:
      "https://news.google.com/rss/search?q=%22LEGO%22+%22new+set%22+OR+%22reveals%22+OR+%22announces%22&hl=en-US&gl=US&ceid=US:en&when=30d",
    source: "Google News (LEGO)",
  },
];

export default async function LegoPanel() {
  const news = await fetchManyRss(LEGO_FEEDS, {
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
              LEGO Drops
            </h2>
            <p className="mt-2 text-white/60">
              New sets, reveals, and announcements. We love the big builds —
              UCS Star Wars, Hogwarts, modular buildings — so this is the
              feed to watch for that next 3,000-piece monster.
            </p>
          </div>
          <span className="hidden font-display text-[10px] tracking-[0.3em] text-white/40 sm:block">
            LIVE · UPDATES HOURLY
          </span>
        </div>

        {news.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/60">
            Couldn&apos;t reach the LEGO feeds right now. Try refreshing in a bit.
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
                  className="group rounded-2xl border border-white/10 bg-gradient-to-br from-yellow-500/10 via-red-500/[0.05] to-transparent p-5 transition hover:border-yellow-400/50 hover:bg-white/[0.05]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.25em] text-yellow-300">
                      ▌ {n.source}
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

        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm text-white/65">
          <p className="font-display text-[10px] tracking-[0.3em] text-yellow-300">
            ▌ JUMP TO
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <ExtLink href="https://www.lego.com/en-us/categories/new-arrivals">
              LEGO.com — New Arrivals
            </ExtLink>
            <ExtLink href="https://www.lego.com/en-us/categories/coming-soon">
              Coming Soon
            </ExtLink>
            <ExtLink href="https://www.lego.com/en-us/themes/star-wars">
              Star Wars Theme
            </ExtLink>
            <ExtLink href="https://brickset.com/sets/year-2026">
              Brickset · 2026 Sets
            </ExtLink>
          </div>
        </div>
      </section>
    </div>
  );
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-md border border-yellow-400/40 bg-yellow-500/10 px-3 py-1.5 font-display text-[11px] tracking-[0.25em] text-yellow-200 hover:bg-yellow-500/20"
    >
      {children} ↗
    </Link>
  );
}
