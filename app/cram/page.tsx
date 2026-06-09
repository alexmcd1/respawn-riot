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

      {/* Iframe runs edge-to-edge with NO container chrome (no rounded
          corners, no border, no shadow) and the inner body is made
          transparent via the ?embed=1 query param — math.html's <body>
          flips to `class="embed"` which drops its gradient backdrop, so
          the parent's black bleeds through and the seam disappears.
          The end result reads as a native section of the page, not an
          iframe pasted in. */}
      <section className="px-0">
        <div className="mx-auto max-w-5xl">
          <iframe
            src="/games/math.html?embed=1"
            title="Math Flashcards — Grades 5–8"
            className="block w-full border-0 bg-transparent h-[calc(100dvh-104px)] sm:h-[80vh] sm:min-h-[640px]"
            style={{ colorScheme: 'dark' }}
          />
        </div>
      </section>
    </main>
  );
}
