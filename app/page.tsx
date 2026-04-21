export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,0,255,0.25),transparent_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(255,0,100,0.18),transparent_35%)]" />

        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-6 py-24 text-center">
          <p className="mb-4 rounded-full border border-white/20 px-4 py-1 text-sm uppercase tracking-[0.3em] text-white/70">
            Punk energy for digital worlds
          </p>

          <h1 className="max-w-5xl text-5xl font-black uppercase tracking-tight sm:text-7xl md:text-8xl">
            Respawn Riot
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
            A loud, glitchy, game-inspired brand built for chaos, creativity,
            and second chances.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              href="#join"
              className="rounded-xl bg-white px-6 py-3 font-bold text-black transition hover:scale-105"
            >
              Join the Riot
            </a>
            <a
              href="#about"
              className="rounded-xl border border-white/30 px-6 py-3 font-bold text-white transition hover:bg-white/10"
            >
              Learn More
            </a>
          </div>

          <div className="mt-16 grid w-full max-w-5xl gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <h2 className="mb-3 text-xl font-bold">Game Culture</h2>
              <p className="text-sm leading-6 text-white/70">
                Built around gaming, community, competition, and unforgettable
                moments.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <h2 className="mb-3 text-xl font-bold">Punk Identity</h2>
              <p className="text-sm leading-6 text-white/70">
                Bold visuals, rebellious attitude, and a style that does not
                blend in.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <h2 className="mb-3 text-xl font-bold">Built to Grow</h2>
              <p className="text-sm leading-6 text-white/70">
                Start as a sharp one-page launch and expand into content,
                community, merch, or media.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="about"
        className="border-t border-white/10 bg-zinc-950 px-6 py-20"
      >
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2">
          <div>
            <p className="mb-3 text-sm uppercase tracking-[0.25em] text-fuchsia-400">
              About
            </p>
            <h2 className="text-3xl font-black uppercase sm:text-4xl">
              Play Loud. Build Fast.
            </h2>
          </div>

          <div>
            <p className="text-base leading-7 text-white/75">
              Respawn Riot is a brand concept for people who love games, style,
              noise, and making things that feel alive. This first version is
              intentionally focused: one strong homepage, one clear message, and
              one call to action.
            </p>
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
            Be the first to hear about drops, updates, launches, and whatever
            chaos comes next.
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