import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Math — Respawn Riot",
  description:
    "Flashcard practice for grades 5–8 with calculator, scratch paper, and a streak tracker.",
};

export default function MathPage() {
  return (
    <main className="bg-black text-white">
      <section className="border-b border-white/10 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-5xl">
          <p className="font-display text-xs tracking-[0.3em] text-emerald-400">
            ▌ CHANNEL 09
          </p>
          <h1 className="mt-3 font-display text-4xl tracking-[0.04em] sm:text-5xl">
            MATH <span className="text-emerald-400">{"//"}</span> FLASHCARDS
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/70 sm:text-base">
            {"Grades 5–8 practice — pick a grade, work the problems. Built-in calculator, scratch paper, streak tracker."}
          </p>
        </div>
      </section>

      {/* Iframe wrapper — keeps the standalone app's purple gradient
          contained while the rest of the site chrome (nav, back-to-top,
          ticker) wraps around it like every other game page. */}
      <section className="px-2 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-emerald-400/30 bg-black shadow-[0_0_40px_rgba(16,185,129,0.15)]">
          <iframe
            src="/games/math.html"
            title="Math Flashcards — Grades 5–8"
            className="block h-[80vh] min-h-[640px] w-full"
          />
        </div>
      </section>
    </main>
  );
}
