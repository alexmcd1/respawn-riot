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
  {
    href: "/orlando",
    tag: "Orlando",
    title: "Theme Parks, Weather + Roads",
    body: "Live NWS weather + alerts, Disney + Universal news, and traffic on I-75 and the Turnpike.",
    accent: "from-orange-500/20 to-transparent",
    border: "hover:border-orange-400/60",
    chip: "text-orange-300",
  },
] as const;

export default function Home() {
  return (
    <main className="bg-black text-white">
      {/* ───────── BANNER ───────── */}
      <section className="relative overflow-hidden border-b border-fuchsia-500/40 scanlines grain">
        {/* Color pour */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(217,70,239,0.45),transparent_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_80%,rgba(34,211,238,0.35),transparent_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,0,128,0.4),transparent_55%)]" />
        {/* Diagonal stripe band on edges */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-2 stripe-band" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2 stripe-band" />

        <div className="relative mx-auto flex max-w-7xl flex-col items-center justify-center px-6 py-16 text-center sm:py-24">
          {/* Top sticker row */}
          <div className="mb-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <span className="sticker rounded-md bg-fuchsia-500 px-3 py-1 font-display text-[12px] tracking-[0.25em] text-black shadow-[0_0_18px_rgba(217,70,239,0.7)]">
              EST. 2026
            </span>
            <span className="sticker rounded-md border-2 border-cyan-300 bg-black px-3 py-1 font-display text-[12px] tracking-[0.25em] text-cyan-300">
              ONLINE • RIOT MODE
            </span>
            <span className="sticker rounded-md bg-lime-400 px-3 py-1 font-display text-[12px] tracking-[0.25em] text-black">
              ★★★★★
            </span>
          </div>

          {/* Big Title */}
          <h1 className="font-display text-[64px] leading-[0.9] tracking-[0.04em] sm:text-[120px] md:text-[160px] lg:text-[200px]">
            <span
              className="glitch bg-gradient-to-b from-white via-fuchsia-200 to-fuchsia-500 bg-clip-text text-transparent"
              data-text="RESPAWN"
            >
              RESPAWN
            </span>
            <br />
            <span
              className="glitch bg-gradient-to-b from-cyan-200 via-pink-300 to-pink-600 bg-clip-text text-transparent"
              data-text="RIOT"
            >
              RIOT
            </span>
          </h1>

          {/* Subline */}
          <p className="mt-6 max-w-2xl font-display text-sm tracking-[0.3em] text-white/80 sm:text-base">
            ANIME · POP PUNK · GAMING · CREATOR DROPS
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/65 sm:text-base">
            {"A loud, glitchy hub for the things we love loudest — and the games we'd rather be playing (or building)."}
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="#sections"
              className="neon-btn rounded-md bg-white px-6 py-3 font-display text-base tracking-[0.25em] text-black shadow-[0_0_24px_rgba(255,255,255,0.25)] hover:scale-[1.04]"
            >
              ▶ PICK A CHANNEL
            </Link>
            <Link
              href="/game"
              className="neon-btn rounded-md border-2 border-lime-400 bg-black px-6 py-3 font-display text-base tracking-[0.25em] text-lime-300 hover:bg-lime-400/10"
            >
              ◢ PLAY LUMLING
            </Link>
            <Link
              href="/trading-cards"
              className="neon-btn rounded-md border-2 border-amber-400 bg-black px-6 py-3 font-display text-base tracking-[0.25em] text-amber-300 hover:bg-amber-400/10"
            >
              ✦ OPEN A TDC PACK
            </Link>
          </div>

          {/* Stat strip */}
          <div className="mt-10 grid w-full max-w-3xl grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { k: 'CHANNELS', v: '05' },
              { k: 'GAMES', v: '02' },
              { k: 'DEVLOGS', v: '∞' },
              { k: 'SLEEP', v: 'NONE' },
            ].map((s) => (
              <div
                key={s.k}
                className="rounded-md border border-white/10 bg-black/50 p-3 text-left"
              >
                <p className="font-display text-[11px] tracking-[0.3em] text-fuchsia-300">{s.k}</p>
                <p className="font-display text-2xl tracking-wider text-white">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="sections"
        className="border-t border-white/10 bg-zinc-950 px-6 py-20"
      >
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 font-display text-sm tracking-[0.3em] text-fuchsia-400">
            ▌ CHANNELS
          </p>
          <h2 className="font-display text-4xl tracking-[0.04em] sm:text-5xl">
            PICK YOUR SCENE.
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
          <p className="mb-3 font-display text-sm tracking-[0.3em] text-cyan-400">
            ▌ STAY CONNECTED
          </p>
          <h2 className="font-display text-4xl tracking-[0.04em] sm:text-5xl">
            JOIN THE RIOT
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
