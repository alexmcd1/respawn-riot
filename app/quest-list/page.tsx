import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "QuestList — kid_ghost | Respawn Riot",
  description:
    "Gamified single-file task tracker. XP, levels, coins, daily quests. Built by kid_ghost.",
};

export default function QuestListPage() {
  return (
    <main className="bg-black text-white">
      {/* Compact hero — matches the channel/cyberpunk pattern used across
          the rest of the site, so the QuestList page reads as part of
          Respawn Riot instead of a bolted-on iframe demo. */}
      <section className="border-b border-white/10 px-4 py-4 sm:px-6 sm:py-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-[10px] tracking-[0.3em] text-violet-300 sm:text-xs">
              ▌ CHANNEL 05 / BUILT IN-HOUSE
            </p>
            <h1 className="mt-1 font-display text-2xl tracking-[0.04em] sm:mt-2 sm:text-4xl">
              QUESTLIST <span className="text-violet-400">{"//"}</span> KID_GHOST
            </h1>
          </div>
          <Link
            href="/games/questlist/index.html"
            target="_blank"
            rel="noopener"
            prefetch={false}
            className="rounded-md border border-violet-400/60 px-3 py-1.5 font-display text-[11px] tracking-[0.25em] text-violet-200 hover:bg-violet-500/10 sm:text-xs"
          >
            ⤢ FULLSCREEN
          </Link>
        </div>
      </section>

      {/* Viewport-height iframe — matches the math page pattern. The OLD
          version used h-[1100px], which is taller than most viewports
          AND smaller than QuestList's own task list when populated. That
          combo gave us BOTH an outer page scrollbar (iframe taller than
          window) AND an inner one (QuestList content taller than 1100px
          iframe). Switching to 100dvh-minus-hero gives QuestList exactly
          the viewport to work with — one scrollbar, internal, where the
          user expects it. */}
      <section className="px-0 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-5xl overflow-hidden border-y border-violet-400/30 bg-black sm:rounded-2xl sm:border sm:shadow-[0_0_40px_rgba(139,92,246,0.18)]">
          <iframe
            src="/games/questlist/index.html"
            title="QuestList by kid_ghost"
            className="block w-full h-[calc(100dvh-104px)] sm:h-[calc(100dvh-160px)] sm:min-h-[720px]"
          />
        </div>
      </section>
    </main>
  );
}
