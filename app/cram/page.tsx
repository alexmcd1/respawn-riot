import type { Metadata } from "next";
import ChannelBanner from "../_components/ChannelBanner";
import MathFlashcards from "./_components/MathFlashcards";

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
      {/* Banner on all sizes now — the iframe is gone, so we don't
          need to hide the banner on mobile to preserve viewport space. */}
      <ChannelBanner
        src="/banners/cram.png"
        alt="Cram channel banner — Kid Ghost grinding flashcards in a late-night punk library"
      />

      {/* Hero — same compact pattern as the rest of the site. The
          standalone math.html still lives at /games/math.html for
          anyone who has it bookmarked, but the canonical experience
          is now this native React port. */}
      <section className="relative border-b border-emerald-500/30 px-4 py-4 sm:px-6 sm:py-8">
        {/* Hazard-tape band — reads as the bottom edge of the banner. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-2 stripe-band" />
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-[10px] tracking-[0.3em] text-emerald-400 sm:text-xs">
              ▌ CHANNEL 07 / STUDY HALL
            </p>
            <h1 className="mt-1 font-display text-2xl tracking-[0.04em] sm:mt-2 sm:text-4xl">
              CRAM <span className="text-emerald-400">{"//"}</span> FLASHCARDS
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/65">
              Grades 5–8, FL state-exam-flavored. 50 fresh questions per
              session. Built-in scratch paper and calculator — no extra
              tabs.
            </p>
          </div>
        </div>
      </section>

      {/* Native React port — same gameplay, no iframe. */}
      <MathFlashcards />
    </main>
  );
}
