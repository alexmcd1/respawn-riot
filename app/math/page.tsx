import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Math — Respawn Riot",
  description:
    "Flashcard practice for grades 5–8 with calculator, scratch paper, and a streak tracker.",
};

export default function MathPage() {
  return (
    <main className="bg-black text-white">
      {/* Compact hero — kept small on mobile so the iframe gets the
          remaining viewport without a second scroll bar. */}
      <section className="border-b border-white/10 px-4 py-4 sm:px-6 sm:py-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-[10px] tracking-[0.3em] text-emerald-400 sm:text-xs">
              ▌ CHANNEL 09
            </p>
            <h1 className="mt-1 font-display text-2xl tracking-[0.04em] sm:mt-2 sm:text-4xl">
              MATH <span className="text-emerald-400">{"//"}</span> FLASHCARDS
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

      {/* Iframe takes the remaining viewport.
            - 100dvh handles iOS Safari's collapsing toolbar correctly
            - On mobile (vh = 100dvh and 0 horizontal padding) the math
              app has the entire screen below the hero, eliminating the
              double-scroll. The math app's own internal scrollbar is
              the only one users interact with.
            - On desktop, a comfortable centered frame with the emerald
              glow we use for the other game pages. */}
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
