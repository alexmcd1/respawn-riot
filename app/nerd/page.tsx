import type { Metadata } from "next";
import { Suspense } from "react";
import NerdApp from "./_components/NerdApp";
import NerdNewsPanel from "./_components/NerdNewsPanel";
import LegoPanel from "./_components/LegoPanel";
import ComicConPanel from "./_components/ComicConPanel";

export const metadata: Metadata = {
  title: "Nerd — Respawn Riot",
  description:
    "The fandom feed — Marvel, Star Wars, sci-fi news; LEGO drops (especially the big sets); Comic Con coverage with a MegaCon Orlando focus; plus a crochet-pattern multi-search.",
};

export const revalidate = 86400;

export default function NerdPage() {
  return (
    <main className="bg-black text-white">
      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-fuchsia-500/30 scanlines">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.25),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.18),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-2 stripe-band" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
          <p className="font-display text-xs tracking-[0.3em] text-fuchsia-400">
            ▌ CHANNEL 10
          </p>
          <h1 className="mt-2 font-display text-3xl tracking-[0.04em] sm:text-5xl">
            NERD <span className="text-fuchsia-400">{"//"}</span> FANDOM PIPELINE
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/75 sm:text-base">
            The hub for everything that isn&apos;t gaming or anime — Marvel and
            Star Wars news, big-set LEGO drops, Comic Con coverage with
            MegaCon Orlando out front, and a crochet pattern search for the
            fandom amigurumi we keep meaning to make.
          </p>
        </div>
      </section>

      {/* ─── Tabbed mini-app ─────────────────────────────────────── */}
      <Suspense fallback={<TabsFallback />}>
        <NerdApp
          news={<NerdNewsPanel />}
          lego={<LegoPanel />}
          comicon={<ComicConPanel />}
        />
      </Suspense>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-xs text-white/45">
        News beat via CBR / ScreenRant / Polygon. LEGO drops via Brick
        Fanatics + The Brick Fan. Comic Con beat via per-con Google News
        searches. Crochet search runs client-side; no tracking, no backend.
      </footer>
    </main>
  );
}

function TabsFallback() {
  return <div className="h-16 border-b border-white/10 bg-black/85" aria-hidden />;
}
