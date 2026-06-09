import Link from "next/link";
import {
  fetchManyRss,
  formatRelative,
  REVALIDATE_HOURLY,
  type Feed,
  type NewsItem,
} from "../../_lib/rss";

// Comic Con beat with a Florida-first lean. MegaCon Orlando is the
// flagship (regularly cracks 100k+ attendance), Tampa Bay Comic Con
// is the secondary, and we keep an SDCC / NYCC channel for the big
// industry news that drops at the major-cons.
//
// All three are Google News searches — none of the cons run public
// RSS feeds we can rely on, but Google News gives us 100 items per
// query which is plenty.

const MEGACON_FEED: Feed = {
  url: "https://news.google.com/rss/search?q=%22MegaCon+Orlando%22&hl=en-US&gl=US&ceid=US:en&when=60d",
  source: "Google News (MegaCon)",
};

const TAMPA_FEED: Feed = {
  url: "https://news.google.com/rss/search?q=%22Tampa+Bay+Comic+Con%22+OR+%22Tampa+Comic+Con%22&hl=en-US&gl=US&ceid=US:en&when=90d",
  source: "Google News (Tampa)",
};

const MAJORS_FEED: Feed = {
  url: "https://news.google.com/rss/search?q=%22San+Diego+Comic-Con%22+OR+%22New+York+Comic+Con%22+OR+SDCC+OR+NYCC&hl=en-US&gl=US&ceid=US:en&when=14d",
  source: "Google News (SDCC / NYCC)",
};

export default async function ComicConPanel() {
  const [mega, tampa, majors] = await Promise.all([
    fetchManyRss([MEGACON_FEED], { perFeedMax: 12, totalMax: 12, revalidate: REVALIDATE_HOURLY }),
    fetchManyRss([TAMPA_FEED], { perFeedMax: 9, totalMax: 9, revalidate: REVALIDATE_HOURLY }),
    fetchManyRss([MAJORS_FEED], { perFeedMax: 9, totalMax: 9, revalidate: REVALIDATE_HOURLY }),
  ]);

  return (
    <div className="space-y-12 px-4 py-10 sm:px-6 sm:py-12">
      {/* ─── MegaCon hero ───────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-3xl border border-fuchsia-400/40 bg-gradient-to-br from-fuchsia-500/15 via-violet-500/10 to-transparent p-6 sm:p-10">
          <p className="font-display text-[11px] tracking-[0.3em] text-fuchsia-300">
            ▌ HOME CON · ORLANDO
          </p>
          <h2 className="mt-2 font-display text-3xl tracking-[0.04em] sm:text-4xl">
            MegaCon Orlando
          </h2>
          <p className="mt-3 max-w-2xl text-white/75">
            The Florida flagship — held at the Orange County Convention Center,
            typically Thursday–Sunday. Big celebrity guest lineup, a packed
            artist alley, panels for every major fandom, and the show floor
            you actually want to walk twice.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ExtLink href="https://megaconorlando.com/" accent="fuchsia">
              MegaCon Orlando — Official
            </ExtLink>
            <ExtLink
              href="https://megaconorlando.com/guests/"
              accent="fuchsia"
            >
              Guest list
            </ExtLink>
            <ExtLink
              href="https://www.occc.net/Default.aspx"
              accent="fuchsia"
            >
              Venue · OCCC
            </ExtLink>
          </div>
        </div>

        {mega.length > 0 && (
          <div className="mt-8">
            <h3 className="font-display text-[11px] tracking-[0.3em] text-fuchsia-300">
              ▌ LATEST · MEGACON ORLANDO
            </h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {mega.map((n) => (
                <ConNewsCard key={n.link} news={n} accent="fuchsia" />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ─── Tampa Bay Comic Con ─────────────────────────────────── */}
      <section className="mx-auto max-w-7xl border-t border-white/10 pt-12">
        <div className="overflow-hidden rounded-3xl border border-cyan-400/40 bg-gradient-to-br from-cyan-500/15 via-blue-500/10 to-transparent p-6 sm:p-10">
          <p className="font-display text-[11px] tracking-[0.3em] text-cyan-300">
            ▌ FLORIDA #2 · TAMPA
          </p>
          <h2 className="mt-2 font-display text-3xl tracking-[0.04em] sm:text-4xl">
            Tampa Bay Comic Con
          </h2>
          <p className="mt-3 max-w-2xl text-white/75">
            Held at the Tampa Convention Center, typically late summer. Smaller
            footprint than MegaCon but a strong artist alley and a really
            walkable show floor — easier to see everything in one day.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ExtLink href="https://tampabaycomiccon.com/" accent="cyan">
              Tampa Bay Comic Con — Official
            </ExtLink>
            <ExtLink
              href="https://www.tampaconventioncenter.com/"
              accent="cyan"
            >
              Venue · Tampa CC
            </ExtLink>
          </div>
        </div>

        {tampa.length > 0 && (
          <div className="mt-8">
            <h3 className="font-display text-[11px] tracking-[0.3em] text-cyan-300">
              ▌ LATEST · TAMPA BAY
            </h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tampa.map((n) => (
                <ConNewsCard key={n.link} news={n} accent="cyan" />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ─── Majors ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl border-t border-white/10 pt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black uppercase sm:text-3xl">
              The Majors · SDCC + NYCC
            </h2>
            <p className="mt-2 text-white/60">
              Where the industry-shifting announcements still happen. Worth
              tracking even if we&apos;re not flying out.
            </p>
          </div>
          <span className="hidden font-display text-[10px] tracking-[0.3em] text-white/40 sm:block">
            LIVE · UPDATES HOURLY
          </span>
        </div>

        {majors.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/60">
            Quiet on the wire right now. Big news usually clusters around the
            con dates (mid-July for SDCC, early October for NYCC).
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {majors.map((n) => (
              <ConNewsCard key={n.link} news={n} accent="amber" />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ConNewsCard({
  news,
  accent,
}: {
  news: NewsItem;
  accent: "fuchsia" | "cyan" | "amber";
}) {
  const rel = formatRelative(news.pubDate);
  const tagClass =
    accent === "fuchsia"
      ? "text-fuchsia-300"
      : accent === "cyan"
        ? "text-cyan-300"
        : "text-amber-300";
  const hoverBorder =
    accent === "fuchsia"
      ? "hover:border-fuchsia-400/50"
      : accent === "cyan"
        ? "hover:border-cyan-400/50"
        : "hover:border-amber-400/50";
  return (
    <Link
      href={news.link}
      target="_blank"
      rel="noopener noreferrer"
      className={`group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition ${hoverBorder} hover:bg-white/[0.05]`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={`text-xs uppercase tracking-[0.25em] ${tagClass}`}>
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

function ExtLink({
  href,
  accent,
  children,
}: {
  href: string;
  accent: "fuchsia" | "cyan" | "amber";
  children: React.ReactNode;
}) {
  const cls =
    accent === "fuchsia"
      ? "border-fuchsia-400/50 bg-fuchsia-500/10 text-fuchsia-200 hover:bg-fuchsia-500/20"
      : accent === "cyan"
        ? "border-cyan-400/50 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
        : "border-amber-400/50 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20";
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`rounded-md border px-3 py-1.5 font-display text-[11px] tracking-[0.25em] ${cls}`}
    >
      {children} ↗
    </Link>
  );
}
