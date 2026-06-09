import type { Metadata } from "next";
import Link from "next/link";
import ChannelBanner from "../_components/ChannelBanner";

export const metadata: Metadata = {
  title: "Cram — Respawn Riot",
  description:
    "Late-night cram sessions for whatever you need to know. Flashcards for grades 5–8 first, more study tools on the way.",
};

// /cram is the rebranded /math page (which still redirects here for
// backward-compat). The channel started life as math flashcards but
// is meant to grow into a general home for educational mini-apps —
// vocab, chords, capitals, language drills, whatever. "Cram" carries
// the late-night, half-panicked, pop-punk-coded "I have to learn this
// by tomorrow" energy without being subject-specific.

export default function CramPage() {
  return (
    <main className="bg-black text-white">
      {/* Banner hidden on mobile: the iframe needs every pixel of vertical
          space below the NavBar on small screens. Desktop has room. */}
      <div className="hidden sm:block">
        <ChannelBanner
          src="/banners/cram.png"
          alt="Cram channel banner — Kid Ghost grinding flashcards in a late-night punk library"
        />
      </div>
      {/* Compact hero — kept small on mobile so the iframe gets the
          remaining viewport without a second scroll bar. */}
      <section className="border-b border-white/10 px-4 py-4 sm:px-6 sm:py-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-[10px] tracking-[0.3em] text-emerald-400 sm:text-xs">
              ▌ CHANNEL 07 / STUDY HALL
            </p>
            <h1 className="mt-1 font-display text-2xl tracking-[0.04em] sm:mt-2 sm:text-4xl">
              CRAM <span className="text-emerald-400">{"//"}</span> FLASHCARDS
            </h1>
          </div>
          <Link
            href="/games/math.html"
            target="_blank"
            rel="noopener"
            prefetch={false}
            className="rounded-md border border-emerald-400/60 px-3 py-1.5 font-display text-[11px] tracking-[0.25em] text-emerald-200 hover:bg-emerald-500/10 sm:text-xs"
          >
            ⤢ FULLSCREEN
          </Link>
        </div>
      </section>

      {/* Iframe takes the remaining viewport. Same setup as the
          original math page — 100dvh handles iOS Safari's collapsing
          toolbar; on mobile the math app gets the full screen below
          the hero so there's only one scrollbar (the math app's own). */}
      <section className="px-0 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-5xl overflow-hidden border-y border-emerald-400/30 bg-black sm:rounded-2xl sm:border sm:shadow-[0_0_40px_rgba(16,185,129,0.15)]">
          <iframe
            src="/games/math.html"
            title="Math Flashcards — Grades 5–8"
            className="block w-full h-[calc(100dvh-104px)] sm:h-[80vh] sm:min-h-[640px]"
          />
        </div>
      </section>
    </main>
  );
}
