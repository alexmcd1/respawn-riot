import type { Metadata } from "next";
import { Suspense } from "react";
import MusicApp from "./_components/MusicApp";
import PopPunkPanel from "./_components/PopPunkPanel";
import ConcertSearch from "./_components/ConcertSearch";

export const metadata: Metadata = {
  title: "Music — Respawn Riot",
  description:
    "Pop punk tour news, comeback albums, and live tour dates for the bands you actually listen to.",
};

// Render dynamically at request time. The underlying data fetches
// (RSS feeds, Google News per-band, Spotify, OG-image scrapes) are
// each individually cached via Next's fetch revalidate (1h to 1w
// depending on source), so the page is still fast — it just doesn't
// bake HTML at build time the way static generation does. The
// difference shows up when env vars (e.g. SPOTIFY_*) change after a
// build: under static caching the page kept serving the build-time
// snapshot for up to an hour; force-dynamic picks up the new state
// on the very next request.
export const dynamic = "force-dynamic";

export default function MusicPage() {
  return (
    <main className="bg-black text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,114,182,0.25),transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
          <p className="text-xs uppercase tracking-[0.3em] text-pink-400">
            Channel 02
          </p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-5xl">
            Music <span className="text-pink-500">{"//"}</span> Still Loud
          </h1>
          <p className="mt-2 max-w-2xl text-white/70">
            Pop punk news that updates itself and a one-tap search for upcoming
            tour dates — pick a tab.
          </p>
        </div>
      </section>

      {/* Suspense is required because MusicApp uses useSearchParams. */}
      <Suspense fallback={<TabsFallback />}>
        <MusicApp
          popPunk={<PopPunkPanel />}
          concerts={
            <section className="px-4 py-8 sm:px-6 sm:py-12">
              <div className="mx-auto max-w-3xl">
                <div className="mb-5">
                  <p className="font-display text-[11px] tracking-[0.3em] text-pink-400">
                    ▌ CONCERTS
                  </p>
                  <h2 className="mt-2 font-display text-2xl tracking-wide sm:text-3xl">
                    When&apos;s the next show?
                  </h2>
                  <p className="mt-2 text-sm text-white/65">
                    Pick a band or type one in. We&apos;ll pull upcoming tour
                    dates from Ticketmaster, falling back to Bandsintown for
                    bands they don&apos;t cover yet.
                  </p>
                </div>
                <ConcertSearch />
              </div>
            </section>
          }
        />
      </Suspense>
    </main>
  );
}

function TabsFallback() {
  return <div className="h-16 border-b border-white/10 bg-black/85" aria-hidden />;
}
