import type { Metadata } from "next";
import Link from "next/link";
import BuddiesPageClient from "./_components/BuddiesPageClient";

export const metadata: Metadata = {
  title: "Buddies — Respawn Riot",
  description:
    "Find friends by screenname, send buddy requests, see who's online, and DM them. AIM-style chat for the Respawn Riot crew.",
};

// The /buddies page is a "full" view of what the corner buddy list
// surfaces. Useful when:
//   - signed-out users want to know the feature exists
//   - signed-in users want a bigger search / requests view
//
// Actual chat windows still spawn from the floating overlay in the root
// layout — opening a chat from here just calls the same openWindow()
// action via the shared ChatContext.

export default function BuddiesPage() {
  return (
    <main className="min-h-[60vh] bg-black text-white">
      {/* Hero strip */}
      <section className="relative border-b border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 via-fuchsia-500/5 to-transparent">
        <div className="pointer-events-none absolute inset-0 opacity-25 [background:repeating-linear-gradient(to_bottom,rgba(255,255,255,0.03)_0px,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_3px)]" />
        <div className="relative mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
          <p className="font-display text-[11px] tracking-[0.4em] text-cyan-300">
            ▌ CHANNEL 09 / BUDDIES
          </p>
          <h1 className="mt-2 font-display text-3xl tracking-wide sm:text-5xl">
            <span className="text-white">SCREENNAME</span>
            <span className="mx-2 text-cyan-400">·</span>
            <span className="text-cyan-300">SIGNAL ON</span>
          </h1>
          <p className="mt-3 max-w-2xl text-white/65">
            AIM-style buddy chat for the Respawn Riot crew. Search for
            people by screenname, send a buddy request, see who&rsquo;s online, and
            slide into the DMs. The corner buddy list floats on every page —
            this is the bigger view.
          </p>
          <p className="mt-3 text-xs text-white/45">
            Don&rsquo;t have a screenname yet? Set one up on the{" "}
            <Link href="/account" className="text-cyan-300 hover:text-cyan-200">
              account page
            </Link>.
          </p>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-4xl">
          <BuddiesPageClient />
        </div>
      </section>
    </main>
  );
}
