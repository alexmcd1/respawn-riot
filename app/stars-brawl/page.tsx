import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stars Brawl — Zoku21 | Respawn Riot",
  description:
    "Top-down brawler. Pick from six brawlers, fight the AI in a walled arena. Supers, shockwaves, bear summons. By Zoku21.",
};

export default function StarsBrawlPage() {
  return (
    <main className="bg-black text-white">
      <section className="border-b border-white/10 px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs uppercase tracking-[0.3em] text-yellow-400">
            Featured Creator Game
          </p>
          <h1 className="mt-3 text-4xl font-black uppercase tracking-tight sm:text-5xl">
            Stars Brawl <span className="text-yellow-400">{"//"}</span> Zoku21
          </h1>
          <p className="mt-3 max-w-2xl text-white/70">
            {"Pick one of six brawlers (Bull, Shelly, Colt, Nita, Poco, Rosa) and 1v1 the AI in a walled arena. WASD or arrows to move, click to attack, space (or the SUPER button) for your special once the meter's full."}
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-white/40">
            Creator: Zoku21
          </p>
        </div>
      </section>

      <section className="px-2 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#1a0a2e]">
          <iframe
            src="/games/stars-brawl.html"
            title="Stars Brawl by Zoku21"
            className="block h-[720px] w-full sm:h-[780px]"
          />
        </div>
      </section>
    </main>
  );
}
