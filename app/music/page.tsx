import type { Metadata } from "next";
import { Suspense } from "react";
import MusicApp from "./_components/MusicApp";
import PopPunkPanel from "./_components/PopPunkPanel";
import ConcertSearch from "./_components/ConcertSearch";
import ChannelBanner from "../_components/ChannelBanner";

export const metadata: Metadata = {
  title: "Music — Respawn Riot",
  description:
    "Pop punk tour news, comeback albums, and live tour dates for the bands you actually listen to.",
};

// ISR — page is rendered once per hour, served as static HTML in
// between. The first visitor after each hourly window triggers a
// background regeneration but is NOT blocked by it — they get the
// cached HTML instantly and the fresh version goes to the NEXT
// visitor. Combined with the per-fetch caches inside PopPunkPanel
// (1w for Spotify, 1h for RSS, etc.), this means subsequent loads
// are sub-second.
//
// Previously this was force-dynamic (renders fresh on every request),
// which meant every visitor paid the full latency of ~21 sequential
// per-band OG scrapes — 15-20s cold render. ISR + Suspense streaming
// (see below) makes that a non-issue.
//
// If you ever need to force an immediate refresh (e.g. just added a
// new band), bump this value or trigger a redeploy. New Vercel deploys
// always start fresh, so deploys also invalidate this cache.
export const revalidate = 3600;

export default function MusicPage() {
  return (
    <main className="bg-black text-white">
      <ChannelBanner
        src="/banners/music.png"
        alt="Music channel banner — Kid Ghost mid-jump on a basement punk stage"
      />
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

      {/* Outer Suspense covers MusicApp's useSearchParams. */}
      <Suspense fallback={<TabsFallback />}>
        <MusicApp
          // Inner Suspense around PopPunkPanel specifically — it's the
          // heavy panel (RSS + ~25 per-band Google News fetches + ~21
          // Spotify lookups). Wrapping it here means the tab nav and
          // page shell render INSTANTLY on cold loads; the panel
          // streams in with PopPunkLoading as its skeleton.
          popPunk={
            <Suspense fallback={<PopPunkLoading />}>
              <PopPunkPanel />
            </Suspense>
          }
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

/** Skeleton shown while PopPunkPanel resolves on cold loads. Mimics
 *  the section heights so the page doesn't jump when the real panel
 *  streams in. The pulse animation makes the wait feel intentional. */
function PopPunkLoading() {
  return (
    <div className="animate-pulse">
      {/* Hero placeholder */}
      <section className="border-b border-pink-500/20 bg-gradient-to-br from-pink-500/10 to-transparent">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="h-4 w-40 rounded bg-white/10" />
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <div className="aspect-[16/9] rounded-2xl bg-white/5 lg:col-span-2" />
            <div className="flex flex-col gap-5">
              <div className="h-32 rounded-2xl bg-white/5" />
              <div className="h-32 rounded-2xl bg-white/5" />
            </div>
          </div>
        </div>
      </section>
      {/* Tour News placeholder */}
      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="h-6 w-48 rounded bg-white/10" />
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-72 rounded-2xl bg-white/5" />
            ))}
          </div>
        </div>
      </section>
      <p className="px-6 pb-10 text-center font-mono text-[11px] tracking-widest text-white/35">
        ▌ TUNING IN…
      </p>
    </div>
  );
}
