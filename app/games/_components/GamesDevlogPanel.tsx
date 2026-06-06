import Link from "next/link";
import { devlogPosts } from "../../devlog/_devlog";
import DevlogList from "../../devlog/_components/DevlogList";

// Build Log tab on /games. Reuses the same DevlogList client component
// that powers the standalone /devlog page — same data, same filter UX
// — so the build log is consistent everywhere it's surfaced.
//
// Lives under /games because the user wanted it discoverable from the
// gaming experience, but the content itself is site-wide (not games-
// specific). The filter pills make that obvious — visitors can narrow
// to GAMES, MUSIC, FOOD, etc. or leave on ALL.

export default function GamesDevlogPanel() {
  return (
    <div className="px-4 py-10 sm:px-6 sm:py-12">
      <section className="mx-auto max-w-4xl">
        <div className="mb-6">
          <p className="font-display text-[11px] tracking-[0.3em] text-fuchsia-300">
            ▌ THE BUILD LOG
          </p>
          <h2 className="mt-2 text-2xl font-black uppercase sm:text-3xl">
            Site-wide Development Log
          </h2>
          <p className="mt-2 max-w-2xl text-white/65">
            Build notes for the whole site — not just games. Tap a pill below
            to filter to one area (e.g. <code className="rounded bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[11px] text-cyan-200">GAMES</code> to see only game-related updates).
            Full standalone view also lives at{' '}
            <Link href="/devlog" className="text-fuchsia-300 underline-offset-2 hover:underline">
              /devlog
            </Link>.
          </p>
        </div>
        <DevlogList posts={devlogPosts} />
      </section>
    </div>
  );
}
