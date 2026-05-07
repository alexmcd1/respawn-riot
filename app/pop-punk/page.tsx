import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pop Punk — Respawn Riot",
  description:
    "Tour news, comeback albums, and the new wave keeping the genre loud.",
};

const tours = [
  {
    band: "Blink-182",
    headline: "World tour leg keeps adding dates",
    body: "The reunited classic lineup is still on the road. Travis is back behind the kit, the setlists lean nostalgia.",
    when: "Now playing",
  },
  {
    band: "Fall Out Boy",
    headline: "Festival headliners across the summer circuit",
    body: "So Much (For) Stardust era continues. Expect deep cuts and full pyro.",
    when: "Summer 2026",
  },
  {
    band: "Green Day",
    headline: "Saviors Tour rolls on",
    body: "Playing Dookie and American Idiot front to back at select stops. Yes, all of it.",
    when: "Now playing",
  },
  {
    band: "Paramore",
    headline: "On a planned hiatus, but solo Hayley shows are popping up",
    body: "No new tour announced for the band, but Hayley Williams keeps surprising small venues.",
    when: "Watch this space",
  },
];

const albums = [
  {
    band: "My Chemical Romance",
    headline: "New material rumored after the reunion run",
    body: "The Black Parade anniversary shows reignited the album-five conversation. No confirmed date — fans are theorizing daily.",
  },
  {
    band: "Sum 41",
    headline: "Heaven :x: Hell was the farewell, and it slaps",
    body: "The double album closed the chapter with one half pop punk, one half thrash. Final tour wrapped — physical pressings still moving.",
  },
  {
    band: "Yellowcard",
    headline: "Childhood Eyes EP era + new singles",
    body: "Back from the dead and recording again. The violin lives.",
  },
  {
    band: "New Found Glory",
    headline: "Make The Most Of It deluxe pressings",
    body: "Still touring the album that proved they never lost a step.",
  },
];

const newWave = [
  {
    artist: "Meet Me @ The Altar",
    why: "Pop punk torch carriers. Massive hooks, three-piece firepower.",
  },
  {
    artist: "Stand Atlantic",
    why: "Australian crew bending pop punk into hyperpop and back.",
  },
  {
    artist: "Pinkshift",
    why: "Riot-grrrl roots, scream-it-in-the-pit choruses.",
  },
  {
    artist: "Magnolia Park",
    why: "Genre blender — pop punk, nu-metal, R&B switches mid-song.",
  },
  {
    artist: "Hot Mulligan",
    why: "Midwest emo adjacent. Gang vocals you'll lose your voice to.",
  },
  {
    artist: "Spanish Love Songs",
    why: "Sad-bastard pop punk that hits like a chest punch.",
  },
  {
    artist: "Waterparks",
    why: "The neon, online-poisoned end of the spectrum. Awsten knows.",
  },
  {
    artist: "jxdn",
    why: "Travis Barker-produced, gen-z pop punk with the hooks turned up.",
  },
];

export default function PopPunkPage() {
  return (
    <main className="bg-black text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,114,182,0.25),transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <p className="text-xs uppercase tracking-[0.3em] text-pink-400">
            Channel 02
          </p>
          <h1 className="mt-3 text-4xl font-black uppercase tracking-tight sm:text-6xl">
            Pop Punk <span className="text-pink-500">{"//"}</span> Still Loud
          </h1>
          <p className="mt-4 max-w-2xl text-white/70">
            {"The 2000s class is back on tour, the new wave is brutal in the best way, and we're tracking all of it."}
          </p>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl font-black uppercase sm:text-3xl">
            Tour News
          </h2>
          <p className="mt-2 text-white/60">
            {"Who's on the road, who's about to be."}
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {tours.map((t) => (
              <article
                key={t.band}
                className="rounded-2xl border border-white/10 bg-gradient-to-br from-pink-500/10 to-transparent p-5 transition hover:border-pink-400/60"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.3em] text-pink-300">
                    {t.band}
                  </p>
                  <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-white/60">
                    {t.when}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-black uppercase">
                  {t.headline}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/70">{t.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-zinc-950 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl font-black uppercase sm:text-3xl">
            New Album News
          </h2>
          <p className="mt-2 text-white/60">
            Records, reissues, and the rumor mill.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {albums.map((a) => (
              <article
                key={a.band}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-pink-400/40 hover:bg-white/[0.05]"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-pink-300">
                  {a.band}
                </p>
                <h3 className="mt-2 text-lg font-black uppercase">
                  {a.headline}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/70">{a.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl font-black uppercase sm:text-3xl">
            New Musicians, Same Energy
          </h2>
          <p className="mt-2 text-white/60">
            The bands keeping the flag in the air right now.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {newWave.map((n) => (
              <div
                key={n.artist}
                className="rounded-2xl border border-white/10 bg-gradient-to-br from-pink-500/10 to-transparent p-5 transition hover:border-pink-400/60"
              >
                <h3 className="text-base font-black uppercase">{n.artist}</h3>
                <p className="mt-2 text-sm text-white/70">{n.why}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
