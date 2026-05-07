import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Battery at 4% — Respawn Riot",
  description: "This page didn't respawn.",
};

export default function NotFound() {
  return (
    <main className="relative min-h-[80vh] overflow-hidden bg-black text-white scanlines">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(217,70,239,0.30),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(34,211,238,0.20),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-2 stripe-band" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2 stripe-band" />

      <div className="relative mx-auto grid max-w-5xl items-center gap-10 px-6 py-16 sm:py-24 md:grid-cols-[minmax(0,360px)_1fr]">
        {/* Mascot */}
        <div className="relative mx-auto w-full max-w-[320px] md:max-w-none">
          <span className="sticker absolute -left-3 -top-3 z-20 rounded-md bg-fuchsia-500 px-3 py-1 font-display text-[11px] tracking-[0.25em] text-black shadow-[0_0_18px_rgba(217,70,239,0.7)]">
            ERROR 404
          </span>
          <span className="sticker absolute -right-3 top-6 z-20 rounded-md border-2 border-cyan-300 bg-black px-3 py-1 font-display text-[11px] tracking-[0.25em] text-cyan-300">
            SIGNAL LOST
          </span>
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-fuchsia-500/40 bg-black shadow-[0_0_50px_rgba(217,70,239,0.35)]">
            <Image
              src="/mascot/battery.jpg"
              alt="The Kid Ghost holding coffee with a battery-at-4% indicator"
              fill
              sizes="(min-width: 768px) 360px, 320px"
              className="object-cover"
              priority
            />
          </div>
        </div>

        {/* Text */}
        <div className="text-center md:text-left">
          <p className="font-display text-sm tracking-[0.3em] text-fuchsia-400">
            ▌ ERROR
          </p>
          <h1 className="mt-3 font-display text-6xl leading-[0.9] tracking-[0.04em] sm:text-8xl">
            BATTERY <br /> AT <span className="text-fuchsia-400">4%</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-white/75 md:mx-0 mx-auto">
            {"this page didn't respawn. either it never existed or it got glitched out of the timeline."}
          </p>
          <p className="mt-2 max-w-md text-sm text-white/45 md:mx-0 mx-auto">
            {"—kg"}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row md:justify-start justify-center">
            <Link
              href="/"
              className="neon-btn rounded-md bg-white px-6 py-3 font-display text-base tracking-[0.25em] text-black shadow-[0_0_24px_rgba(255,255,255,0.25)] hover:scale-[1.04]"
            >
              ◀ BACK TO HOME
            </Link>
            <Link
              href="/game"
              className="neon-btn rounded-md border-2 border-lime-400 bg-black px-6 py-3 font-display text-base tracking-[0.25em] text-lime-300 hover:bg-lime-400/10"
            >
              ◢ PLAY RC
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
