import Image from "next/image";
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

        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-6 py-12 sm:py-20 md:grid-cols-[1fr_minmax(280px,420px)] md:gap-10 lg:grid-cols-[1fr_minmax(360px,520px)]">
          {/* LEFT — text + CTAs */}
          <div className="text-center md:text-left">
            {/* Top sticker row */}
            <div className="mb-5 flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:justify-start">
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
            <h1 className="font-display text-[56px] leading-[0.9] tracking-[0.04em] sm:text-[88px] md:text-[96px] lg:text-[128px] xl:text-[148px]">
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
            <p className="mt-6 font-display text-sm tracking-[0.3em] text-white/80 sm:text-base">
              ANIME · POP PUNK · GAMING · CREATOR DROPS
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/65 sm:text-base md:mx-0">
              {"A loud, glitchy hub for the things we love loudest — and the games we'd rather be playing (or building)."}
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row md:justify-start sm:justify-center md:flex-wrap">
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
            <div className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-4">
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

          {/* RIGHT — Kid Ghost mascot */}
          <div className="relative order-first mx-auto w-full max-w-[280px] sm:max-w-[360px] md:order-none md:max-w-none">
            {/* sticker badge floating top */}
            <span className="sticker absolute -left-3 -top-3 z-20 rounded-md bg-fuchsia-500 px-3 py-1 font-display text-[11px] tracking-[0.25em] text-black shadow-[0_0_18px_rgba(217,70,239,0.7)] sm:-left-4 sm:-top-4">
              KID GHOST
            </span>
            <span className="sticker absolute -right-3 top-6 z-20 rounded-md border-2 border-cyan-300 bg-black px-3 py-1 font-display text-[11px] tracking-[0.25em] text-cyan-300 sm:-right-4">
              SAVE FILE: KID.GHO$T
            </span>
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-fuchsia-500/40 bg-black shadow-[0_0_50px_rgba(217,70,239,0.35)]">
              {/* glow halo */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(217,70,239,0.45),transparent_60%)]" />
              <Image
                src="/mascot/animated.gif"
                alt="The Kid Ghost — site mascot, animated"
                fill
                sizes="(min-width: 1024px) 520px, (min-width: 768px) 420px, 360px"
                className="object-cover"
                priority
                unoptimized
              />
              {/* corner tag */}
              <span className="absolute bottom-2 right-3 font-display text-[10px] tracking-[0.3em] text-white/40">
                {"◢ R/R // 06"}
              </span>
            </div>
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

      {/* ───────── MEET THE KID GHOST ───────── */}
      <section className="relative overflow-hidden border-t border-fuchsia-500/30 px-6 py-16 sm:py-24 scanlines">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(217,70,239,0.20),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(34,211,238,0.18),transparent_50%)]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[minmax(0,460px)_1fr]">
          {/* Full body art */}
          <div className="relative mx-auto w-full max-w-[420px] md:max-w-none">
            <div className="absolute -inset-4 -z-10 rotate-[-2deg] bg-fuchsia-500/10 blur-2xl" />
            <Image
              src="/mascot/fullbody.png"
              alt="The Kid Ghost full-body illustration — skeleton in a patched leather jacket leaning on a Game Boy skateboard"
              width={1024}
              height={1536}
              sizes="(min-width: 768px) 460px, 100vw"
              className="h-auto w-full rounded-2xl border border-fuchsia-500/30 bg-black object-contain"
              priority={false}
            />
          </div>

          {/* Bio */}
          <div>
            <p className="font-display text-sm tracking-[0.3em] text-fuchsia-400">
              ▌ SITE MASCOT
            </p>
            <h2 className="mt-3 font-display text-5xl tracking-[0.04em] sm:text-6xl">
              MEET <span className="text-fuchsia-400">THE</span> KID GHOST
            </h2>
            <p className="mt-4 text-base leading-7 text-white/80">
              {"Forever 16. Patched leather jacket two sizes too big. Got respawned wrong once — the fuchsia pixel in his eye socket is the save file. Doesn't tell you what's in his headphones."}
            </p>

            <ul className="mt-6 grid gap-2 text-sm text-white/75 sm:grid-cols-2">
              <li className="rounded-md border border-white/10 bg-black/50 px-3 py-2">
                <span className="font-display tracking-[0.25em] text-fuchsia-300">NAME · </span>
                The Kid Ghost
              </li>
              <li className="rounded-md border border-white/10 bg-black/50 px-3 py-2">
                <span className="font-display tracking-[0.25em] text-fuchsia-300">AGE · </span>
                Forever 16
              </li>
              <li className="rounded-md border border-white/10 bg-black/50 px-3 py-2">
                <span className="font-display tracking-[0.25em] text-fuchsia-300">SAVE FILE · </span>
                KID.GHO$T
              </li>
              <li className="rounded-md border border-white/10 bg-black/50 px-3 py-2">
                <span className="font-display tracking-[0.25em] text-fuchsia-300">SIGNS OFF · </span>
                —kg
              </li>
            </ul>

            {/* Sample lines as stickers */}
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="sticker rounded-md border border-fuchsia-400/60 bg-black px-3 py-1.5 text-xs text-fuchsia-200">
                {"\"respawn'd. again. lol\""}
              </span>
              <span className="sticker rounded-md border border-cyan-400/60 bg-black px-3 py-1.5 text-xs text-cyan-200">
                {"\"the timeline is fake. press start.\""}
              </span>
              <span className="sticker rounded-md border border-pink-400/60 bg-black px-3 py-1.5 text-xs text-pink-200">
                {"\"today's mood: SCANLINES\""}
              </span>
            </div>
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

      <footer className="relative border-t border-white/10 px-6 py-10 text-center text-sm text-white/50">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4">
          <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-fuchsia-500/40 bg-black shadow-[0_0_24px_rgba(217,70,239,0.35)]">
            <Image
              src="/mascot/animated.gif"
              alt="The Kid Ghost"
              fill
              sizes="80px"
              className="object-cover"
              unoptimized
            />
          </div>
          <p className="font-display tracking-[0.25em]">© 2026 RESPAWN/RIOT</p>
          <p className="text-xs text-white/40">
            Built for second chances. The Kid Ghost says <span className="text-fuchsia-300">—kg</span>
          </p>
        </div>
      </footer>
    </main>
  );
}
