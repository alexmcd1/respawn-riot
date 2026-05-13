import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { fetchManyRss, formatRelative, type Feed } from "../_lib/rss";

export const metadata: Metadata = {
  title: "Pop Punk — Respawn Riot",
  description:
    "Tour news, comeback albums, and the new wave keeping the genre loud.",
};

// Auto-refresh news every hour
export const revalidate = 3600;

const POP_PUNK_FEEDS: Feed[] = [
  { url: "https://www.altpress.com/feed/", source: "Alternative Press" },
  { url: "https://www.punktastic.com/feed/", source: "Punktastic" },
  { url: "https://substreammagazine.com/feed/", source: "Substream" },
];

const bands = [
  {
    name: "Blink-182",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Blink-182_2025_%28cropped_2%29.jpg/330px-Blink-182_2025_%28cropped_2%29.jpg",
    headline: "Headlining Innings Festival Feb 22, 2026 in Tempe",
    blurb:
      "First confirmed 2026 date is the Innings Fest headline slot in Tempe, AZ. More tour dates pending.",
    href: "https://www.songkick.com/artists/479410-blink182",
    source: "Songkick",
  },
  {
    name: "Fall Out Boy",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Fall_Out_Boy%2C_Heaven%2C_London_%2852755936394%29.jpg/330px-Fall_Out_Boy%2C_Heaven%2C_London_%2852755936394%29.jpg",
    headline: "Innings Festival + Boston Calling on the 2026 calendar",
    blurb:
      "Festival circuit is the move this year. Vivid Seats lists the rolling tour as it expands.",
    href: "https://www.vividseats.com/fall-out-boy-tickets/performer/5429",
    source: "Vivid Seats",
  },
  {
    name: "Green Day",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/GreenDay_Isle_of_Wight_Montage.jpg/330px-GreenDay_Isle_of_Wight_Montage.jpg",
    headline: "Saviors Tour rolls on with full-album sets",
    blurb:
      "Playing Dookie and American Idiot front to back at select dates. Yes, all of it.",
    href: "https://www.greenday.com/tour",
    source: "greenday.com",
  },
  {
    name: "Paramore",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Paramore_2023.jpg/330px-Paramore_2023.jpg",
    headline: "On a planned hiatus — Hayley Williams shows still surface",
    blurb:
      "No new tour announced for the band, but the lead singer keeps surprising small venues.",
    href: "https://www.paramore.net/",
    source: "paramore.net",
  },
];

const albums = [
  {
    name: "My Chemical Romance",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/MCR820_%28cropped%29.jpg/330px-MCR820_%28cropped%29.jpg",
    headline: "Long Live The Black Parade tour rolls into 2026",
    blurb:
      "The Black Parade revival run keeps the album-five conversation hot. No release date confirmed.",
    href: "https://www.mychemicalromance.com/",
    source: "mychemicalromance.com",
  },
  {
    name: "Sum 41",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Sum_41_-_Southside_Festival_2024_-_DSC2886.jpg/330px-Sum_41_-_Southside_Festival_2024_-_DSC2886.jpg",
    headline: "Heaven :x: Hell was the farewell — and it slaps",
    blurb:
      "The double album closed the chapter with one half pop punk, one half thrash. Final tour wrapped.",
    href: "https://en.wikipedia.org/wiki/Heaven_:x:_Hell",
    source: "Wikipedia",
  },
  {
    name: "Yellowcard",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Yellowcard_-_Southside_Festival_2025_-_DSC2157.jpg/330px-Yellowcard_-_Southside_Festival_2025_-_DSC2157.jpg",
    headline: "Childhood Eyes era + new singles still coming",
    blurb: "Back from the dead and recording. The violin lives.",
    href: "https://yellowcardrock.com/",
    source: "yellowcardrock.com",
  },
  {
    name: "New Found Glory",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/NFG_SlamDunk_2019.jpg/330px-NFG_SlamDunk_2019.jpg",
    headline: "Make The Most Of It deluxe pressings keep moving",
    blurb: "Still touring the album that proved they never lost a step.",
    href: "https://www.newfoundglory.com/",
    source: "newfoundglory.com",
  },
];

const newWave = [
  {
    artist: "Meet Me @ The Altar",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Meet_me_at_the_alter.jpg/330px-Meet_me_at_the_alter.jpg",
    why: "Pop punk torch carriers. Massive hooks, three-piece firepower.",
    href: "https://meetmeatthealtarofficial.com/",
  },
  {
    artist: "Stand Atlantic",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Stand_Atlantic.jpg/330px-Stand_Atlantic.jpg",
    why: "Australian crew bending pop punk into hyperpop and back.",
    href: "https://www.standatlantic.com/",
  },
  {
    artist: "Pinkshift",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Liberation_Weekend_2025-05-30_Pinkshift_03_cropped.jpg/330px-Liberation_Weekend_2025-05-30_Pinkshift_03_cropped.jpg",
    why: "Riot-grrrl roots, scream-it-in-the-pit choruses.",
    href: "https://www.pinkshiftband.com/",
  },
  {
    artist: "Hot Mulligan",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Hot_mulligan_2.jpg/330px-Hot_mulligan_2.jpg",
    why: "Midwest emo adjacent. Gang vocals you'll lose your voice to.",
    href: "https://hotmulligan.bandcamp.com/",
  },
  {
    artist: "Spanish Love Songs",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Spanish_Love_Songs_live.jpg/330px-Spanish_Love_Songs_live.jpg",
    why: "Sad-bastard pop punk that hits like a chest punch.",
    href: "https://spanishlovesongs.net/",
  },
  {
    artist: "jxdn",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Jaden_Hossler.jpg/330px-Jaden_Hossler.jpg",
    why: "Travis Barker-produced, gen-z pop punk with the hooks turned up.",
    href: "https://www.jxdn.com/",
  },
];

function BandCard({
  name,
  img,
  headline,
  blurb,
  href,
  source,
}: {
  name: string;
  img: string;
  headline: string;
  blurb: string;
  href: string;
  source: string;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-pink-400/60 hover:bg-white/[0.05]"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-black">
        <Image
          src={img}
          alt={name}
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover opacity-90 transition group-hover:scale-105 group-hover:opacity-100"
        />
      </div>
      <div className="p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-pink-300">
          {name}
        </p>
        <h3 className="mt-2 text-lg font-black uppercase leading-snug">
          {headline}
        </h3>
        <p className="mt-2 text-sm leading-6 text-white/70">{blurb}</p>
        <p className="mt-3 text-xs uppercase tracking-widest text-pink-300/80">
          {source} ↗
        </p>
      </div>
    </Link>
  );
}

export default async function PopPunkPage() {
  const news = await fetchManyRss(POP_PUNK_FEEDS, 6, 8);
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

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {bands.map((b) => (
              <BandCard key={b.name} {...b} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-zinc-950 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl font-black uppercase sm:text-3xl">
            Album News
          </h2>
          <p className="mt-2 text-white/60">
            Records, reissues, and the rumor mill.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {albums.map((a) => (
              <BandCard key={a.name} {...a} />
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

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {newWave.map((n) => (
              <Link
                key={n.artist}
                href={n.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-pink-500/10 to-transparent transition hover:border-pink-400/60"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-black">
                  <Image
                    src={n.img}
                    alt={n.artist}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover opacity-90 transition group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-base font-black uppercase">
                    {n.artist}
                  </h3>
                  <p className="mt-2 text-sm text-white/70">{n.why}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-zinc-950 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-black uppercase sm:text-3xl">
              Headlines
            </h2>
            <span className="hidden font-display text-[10px] tracking-[0.3em] text-white/40 sm:block">
              LIVE · UPDATES HOURLY
            </span>
          </div>
          <p className="mt-2 text-white/60">
            Latest from Alternative Press, Punktastic, and Substream.
          </p>

          {news.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/60">
              {"Couldn't reach the feeds right now. Try refreshing in a bit."}
            </div>
          ) : (
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {news.map((n) => {
                const rel = formatRelative(n.pubDate);
                return (
                  <Link
                    key={n.link}
                    href={n.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-pink-400/50 hover:bg-white/[0.05]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs uppercase tracking-[0.25em] text-pink-300">
                        {n.source}
                      </p>
                      {rel && (
                        <span className="font-mono text-[10px] text-white/40">
                          {rel}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 text-base font-black uppercase leading-snug group-hover:text-white">
                      {n.title} ↗
                    </h3>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
