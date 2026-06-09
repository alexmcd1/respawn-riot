import type { Metadata } from "next";
import Link from "next/link";
import ChannelBanner from "../_components/ChannelBanner";
import QuestList from "./_components/QuestList";

export const metadata: Metadata = {
  title: "QuestList — kid_ghost | Respawn Riot",
  description:
    "Gamified task tracker. XP, levels, coins, daily quests. Built by kid_ghost.",
};

// Force-dynamic because cloud sync state is per-session and we don't want
// any stale rendering to interfere with the QuestList client mount.
export const dynamic = "force-dynamic";

export default function QuestListPage() {
  return (
    <main className="bg-black text-white">
      <ChannelBanner
        src="/banners/quests.png"
        alt="Quests channel banner — Kid Ghost in a violet-lit punk tavern checking off a glowing scroll"
      />

      {/* Hero — same pattern as the rest of the site. The standalone
          iframe app still lives at /games/questlist/index.html for any
          legacy bookmarks and for the Gmail integration that didn't ship
          in this native port yet. */}
      <section className="border-b border-white/10 px-4 py-4 sm:px-6 sm:py-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-[10px] tracking-[0.3em] text-violet-300 sm:text-xs">
              ▌ CHANNEL 05 / BUILT IN-HOUSE
            </p>
            <h1 className="mt-1 font-display text-2xl tracking-[0.04em] sm:mt-2 sm:text-4xl">
              QUESTLIST <span className="text-violet-400">{"//"}</span> KID_GHOST
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/65">
              Gamified task tracker. Earn XP and coins, build day-streaks,
              unlock achievements. Synced across devices when signed in.
            </p>
          </div>
          <Link
            href="/games/questlist/index.html"
            target="_blank"
            rel="noopener"
            prefetch={false}
            className="rounded-md border border-violet-400/60 px-3 py-1.5 font-display text-[11px] tracking-[0.25em] text-violet-200 hover:bg-violet-500/10 sm:text-xs"
            title="Open the original standalone version (includes Gmail integration not yet ported)"
          >
            Legacy view ↗
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-5xl">
        <QuestList />
      </div>
    </main>
  );
}
