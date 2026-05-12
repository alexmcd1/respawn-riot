import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "QuestList — kid_ghost | Respawn Riot",
  description:
    "Gamified single-file task tracker. XP, levels, coins, daily quests. Built by kid_ghost.",
};

export default function QuestListPage() {
  return (
    <main className="bg-black text-white">
      <section className="border-b border-white/10 px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs uppercase tracking-[0.3em] text-violet-400">
            Built In-House
          </p>
          <h1 className="mt-3 text-4xl font-black uppercase tracking-tight sm:text-5xl">
            QuestList <span className="text-violet-500">{"//"}</span> kid_ghost
          </h1>
          <p className="mt-3 max-w-2xl text-white/70">
            {"A gamified task tracker. Complete tasks, earn XP, level up, collect coins. Everything is stored in your browser's localStorage — your data, your machine."}
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-white/40">
            Built by kid_ghost
          </p>
        </div>
      </section>

      <section className="px-2 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a14]">
          <iframe
            src="/games/questlist/index.html"
            title="QuestList by kid_ghost"
            className="block h-[1100px] w-full sm:h-[1200px]"
          />
        </div>
      </section>
    </main>
  );
}
