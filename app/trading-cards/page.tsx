import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TDC — Trading Digital Cards | Respawn Riot",
  description:
    "TDC: Trading Digital Cards. Open packs, trade with NPCs, build a collection. A game by A Zoku21.",
};

export default function TradingCardsPage() {
  return (
    <main className="bg-black text-white">
      <section className="border-b border-white/10 px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-400">
            Featured Game
          </p>
          <h1 className="mt-3 text-4xl font-black uppercase tracking-tight sm:text-5xl">
            TDC <span className="text-amber-500">{"//"}</span> Trading Digital Cards
          </h1>
          <p className="mt-3 max-w-2xl text-white/70">
            {"Open themed anime card packs, build out a collection, and trade with NPCs. Created by A Zoku21."}
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-white/40">
            Creator: A Zoku21
          </p>
        </div>
      </section>

      <section className="px-2 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a12]">
          <iframe
            src="/games/trading-cards.html"
            title="TDC — Trading Digital Cards"
            className="block h-[1100px] w-full sm:h-[1200px]"
          />
        </div>
      </section>
    </main>
  );
}
