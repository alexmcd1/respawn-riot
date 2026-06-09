import type { Metadata } from "next";
import { Suspense } from "react";
import BooksApp from "./_components/BooksApp";
import SeriesPanel from "./_components/SeriesPanel";
import ThrillersPanel from "./_components/ThrillersPanel";
import BooksNewsPanel from "./_components/BooksNewsPanel";

export const metadata: Metadata = {
  title: "Books — Respawn Riot",
  description:
    "Sci-fi & fantasy series in heavy rotation (Star Wars, Dresden, ASOIAF, Ready Player One, Dungeon Crawler Carl, Sanderson) plus a dedicated psychological-thriller beat.",
};

// Daily revalidate for the page chrome — each panel's fetches set
// their own tighter revalidate (hourly for Google News, hourly for
// the publisher RSS feeds).
export const revalidate = 86400;

export default function BooksPage() {
  return (
    <main className="bg-black text-white">
      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-amber-500/30 scanlines">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.22),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(217,70,239,0.18),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-2 stripe-band" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
          <p className="font-display text-xs tracking-[0.3em] text-amber-300">
            ▌ CHANNEL 09
          </p>
          <h1 className="mt-2 font-display text-3xl tracking-[0.04em] sm:text-5xl">
            BOOKS <span className="text-amber-400">{"//"}</span> QUEST FOR PAGES
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/75 sm:text-base">
            What we&apos;re reading and what we&apos;re waiting on. Sci-fi and
            fantasy series in heavy rotation, plus a dedicated section for
            psychological thrillers — each card pulls a live headline so
            new books and adaptations surface automatically.
          </p>
        </div>
      </section>

      {/* ─── Tabbed mini-app ─────────────────────────────────────── */}
      <Suspense fallback={<TabsFallback />}>
        <BooksApp
          series={<SeriesPanel />}
          thrillers={<ThrillersPanel />}
          news={<BooksNewsPanel />}
        />
      </Suspense>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-xs text-white/45">
        Series + author cards via Google News (per-series search). News beat
        via Reactor + Book Riot. Curated lineup hand-picked.
      </footer>
    </main>
  );
}

function TabsFallback() {
  return <div className="h-16 border-b border-white/10 bg-black/85" aria-hidden />;
}
