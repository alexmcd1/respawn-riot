import Link from "next/link";

const sections = [
  {
    href: "/anime",
    tag: "Anime",
    title: "Top Tier Characters & Top 5 Drops",
    body: "Power rankings, the seasons everyone's losing it over, and where to actually watch them.",
    accent: "from-fuchsia-500/20 to-transparent",
    border: "hover:border-fuchsia-400/60",
    chip: "text-fuchsia-300",
  },
  {
    href: "/pop-punk",
    tag: "Pop Punk",
    title: "2000s Legends + The New Wave",
    body: "Tour rumors, comeback albums, and the bands keeping the genre loud in 2026.",
    accent: "from-pink-500/20 to-transparent",
    border: "hover:border-pink-400/60",
    chip: "text-pink-300",
  },
  {
    href: "/gaming",
    tag: "Gaming",
    title: "News + The Game We're Building",
    body: "What's shipping, what's hyped, and a closer look at our own creature in progress.",
    accent: "from-cyan-500/20 to-transparent",
    border: "hover:border-cyan-400/60",
    chip: "text-cyan-300",
  },
  {
    href: "/trading-cards",
    tag: "TDC",
    title: "Trading Digital Cards by A Zoku21",
    body: "Open anime-themed packs, trade with NPCs, build a collection. Hosted creator game.",
    accent: "from-amber-500/20 to-transparent",
    border: "hover:border-amber-400/60",
    chip: "text-amber-300",
  },
] as const;

export default function Home() {
  return (
    <main className="bg-black text-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,0,255,0.25),transparent_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(255,0,100,0.18),transparent_35%)]" />

        <div className="relative mx-auto flex max-w-7xl flex-col items-center justify-center px-6 py-20 text-center sm:py-28">
          <p className="mb-4 rounded-full border border-white/20 px-4 py-1 text-xs uppercase tracking-[0.3em] text-white/70 sm:text-sm">
            Punk energy for digital worlds
          </p>

          <h1 className="max-w-5xl text-5xl font-black uppercase tracking-tight sm:text-7xl md:text-8xl">
            Respawn Riot
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
            {"A loud, glitchy hub for the things we love loudest — anime, pop punk, and the games we'd rather be playing (or building)."}
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="#sections"
              className="rounded-xl bg-white px-6 py-3 font-bold text-black transition hover:scale-105"
            >
              Pick a Riot
            </Link>
            <Link
              href="/game"
              className="rounded-xl border border-white/30 px-6 py-3 font-bold text-white transition hover:bg-white/10"
            >
              Play the Game
            </Link>
          </div>
        </div>
      </section>

      <section
        id="sections"
        className="border-t border-white/10 bg-zinc-950 px-6 py-20"
      >
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-sm uppercase tracking-[0.25em] text-fuchsia-400">
            Channels
          </p>
          <h2 className="text-3xl font-black uppercase sm:text-4xl">
            Pick your scene.
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {sections.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition ${s.border} hover:bg-white/[0.06]`}
              >
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${s.accent} opacity-60 transition group-hover:opacity-100`}
                />
                <div className="relative">
                  <p
                    className={`text-xs uppercase tracking-[0.3em] ${s.chip}`}
                  >
                    {s.tag}
                  </p>
                  <h3 className="mt-3 text-xl font-black uppercase">
                    {s.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-white/70">
                    {s.body}
                  </p>
                  <p className="mt-6 text-sm font-bold uppercase tracking-widest text-white/80 group-hover:text-white">
                    Enter →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="join" className="px-6 py-20">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur sm:p-12">
          <p className="mb-3 text-sm uppercase tracking-[0.25em] text-cyan-400">
            Stay Connected
          </p>
          <h2 className="text-3xl font-black uppercase sm:text-4xl">
            Join the Riot
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/70">
            Drops, tour pickups, anime power rankings, devlogs — the chaos in
            one inbox.
          </p>

          <form className="mx-auto mt-8 flex max-w-xl flex-col gap-4 sm:flex-row">
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white outline-none placeholder:text-white/35"
            />
            <button
              type="submit"
              className="rounded-xl bg-fuchsia-500 px-6 py-3 font-bold text-white transition hover:scale-105"
            >
              Sign Up
            </button>
          </form>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-white/50">
        © 2026 Respawn Riot. Built for second chances.
      </footer>
    </main>
  );
}
