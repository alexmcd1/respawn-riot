import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jujutsu Shenanigans — Zoku21 | Respawn Riot",
  description:
    "1v1 cursed energy fighting game with Yuji, Megumi, Nobara, Todo, Gojo, and Sukuna. Domain expansions included. By Zoku21.",
};

export default function JjkFightPage() {
  return (
    <main className="bg-black text-white">
      <section className="border-b border-white/10 px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-400">
            Featured Creator Game
          </p>
          <h1 className="mt-3 text-4xl font-black uppercase tracking-tight sm:text-5xl">
            Jujutsu Shenanigans <span className="text-fuchsia-500">{"//"}</span> Zoku21
          </h1>
          <p className="mt-3 max-w-2xl text-white/70">
            {"Pick a JJK fighter (Yuji, Megumi, Nobara, Todo, Gojo, or Sukuna), then 1v1 the AI. Each character has six moves, including a domain expansion that costs a chunk of cursed energy. Land a critical, block a shot, win the round."}
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-white/40">
            Creator: Zoku21
          </p>
        </div>
      </section>

      <section className="px-2 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a14]">
          <iframe
            src="/games/jjk-fight.html"
            title="Jujutsu Shenanigans by Zoku21"
            className="block h-[900px] w-full sm:h-[1000px]"
          />
        </div>
      </section>
    </main>
  );
}
