import type { Metadata } from "next";
import Link from "next/link";
import { devlogPosts } from "./_devlog";
import DevlogList from "./_components/DevlogList";

export const metadata: Metadata = {
  title: "Devlog — Respawn Riot",
  description:
    "Build log for the whole site. Every meaningful shipment across food, music, games, anime, chat, sync, infra — when it shipped and why.",
};

export const revalidate = 3600;

export default function DevlogPage() {
  const manualCount = devlogPosts.filter((p) => p.source === "manual").length;
  const autoCount = devlogPosts.filter((p) => p.source === "auto").length;

  return (
    <main className="bg-black text-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10 scanlines">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.25),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.18),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-2 stripe-band" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
          <p className="font-display text-xs tracking-[0.3em] text-fuchsia-400">
            ▌ THE BUILD LOG
          </p>
          <h1 className="mt-2 font-display text-3xl tracking-[0.04em] sm:text-5xl">
            DEVLOG <span className="text-fuchsia-400">{"//"}</span> WHAT SHIPPED
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-white/75 sm:text-base">
            Build notes for the whole site — every meaningful shipment across
            every channel, plus when it landed and why it matters. Tap a
            category below to filter the list to one area.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-md border border-fuchsia-400/40 bg-fuchsia-500/10 px-3 py-1 font-display text-[11px] tracking-[0.25em] text-fuchsia-200">
              {devlogPosts.length} ENTRIES
            </span>
            <span className="rounded-md border border-white/15 bg-black/40 px-3 py-1 font-display text-[11px] tracking-[0.25em] text-white/70">
              {manualCount} MANUAL · {autoCount} AUTO
            </span>
          </div>
        </div>
      </section>

      {/* Filterable entries — extracted into a client component so we
          can support category filtering without making this whole
          page client-side. */}
      <section className="px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-4xl">
          <DevlogList posts={devlogPosts} />
        </div>

        <p className="mx-auto mt-10 max-w-4xl text-center text-xs text-white/45">
          Devlog updates land here. Want them in your inbox?{" "}
          <Link
            href="/#join"
            className="text-fuchsia-300 underline-offset-2 hover:underline"
          >
            Join the riot.
          </Link>
        </p>
      </section>
    </main>
  );
}
