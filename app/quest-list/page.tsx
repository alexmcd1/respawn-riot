import type { Metadata } from "next";
import Link from "next/link";
import QuestListEmbed from "./_components/QuestListEmbed";
import ChannelBanner from "../_components/ChannelBanner";

export const metadata: Metadata = {
  title: "QuestList — kid_ghost | Respawn Riot",
  description:
    "Gamified single-file task tracker. XP, levels, coins, daily quests. Built by kid_ghost.",
};

export default function QuestListPage() {
  return (
    <main className="bg-black text-white">
      {/* Banner hidden on mobile so the QuestList iframe keeps the full
          viewport below the NavBar — the app needs that vertical space. */}
      <div className="hidden sm:block">
        <ChannelBanner
          src="/banners/quests.png"
          alt="Quests channel banner — Kid Ghost in a violet-lit punk tavern checking off a glowing scroll"
        />
      </div>
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

      {/* Auto-resizing iframe — content height comes back via postMessage
          from inside QuestList (see public/games/questlist/index.html
          end-of-body script) so the outer page becomes the only scroll
          surface. No more "window inside a window" double-scroll. */}
      <QuestListEmbed />
    </main>
  );
}
