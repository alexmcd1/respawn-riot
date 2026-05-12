import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PC Builder — Zoku21 | Respawn Riot",
  description:
    "Pick parts, check compatibility, see estimated 1080p / 1440p / 4K performance. A creator app by Zoku21.",
};

export default function PcBuilderPage() {
  return (
    <main className="bg-black text-white">
      <section className="border-b border-white/10 px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">
            Featured Creator App
          </p>
          <h1 className="mt-3 text-4xl font-black uppercase tracking-tight sm:text-5xl">
            PC Builder <span className="text-cyan-500">{"//"}</span> Zoku21
          </h1>
          <p className="mt-3 max-w-2xl text-white/70">
            {"Pick CPU, GPU, motherboard, RAM, storage, PSU, cooler, and case. Get live compatibility checks and estimated 1080p/1440p/4K performance scores. Try the presets if you want a starting point."}
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-white/40">
            Creator: Zoku21
          </p>
        </div>
      </section>

      <section className="px-2 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a14]">
          <iframe
            src="/games/pc-builder.html"
            title="PC Builder by Zoku21"
            className="block h-[1300px] w-full sm:h-[1400px]"
          />
        </div>
      </section>
    </main>
  );
}
