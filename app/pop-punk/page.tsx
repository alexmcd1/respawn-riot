import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  fetchManyRss,
  fetchTopGoogleNews,
  formatRelative,
  REVALIDATE_WEEKLY,
  type Feed,
  type NewsItem,
} from "../_lib/rss";

export const metadata: Metadata = {
  title: "Pop Punk — Respawn Riot",
  description:
    "Tour news, comeback albums, and the new wave keeping the genre loud.",
};

// Page-level revalidate matches the SHORTEST cadence anything on the
// page uses (the headlines feed, 1 hour). Per-band Google News results
// have their own 1-week revalidate set on the fetch.
// NOTE: Next.js requires this to be a literal number, not an imported
// constant — its segment-config parser is statically analyzed.
export const revalidate = 3600;

const POP_PUNK_FEEDS: Feed[] = [
  { url: "https://www.altpress.com/feed/", source: "Alternative Press" },
  { url: "https://www.punktastic.com/feed/", source: "Punktastic" },
  { url: "https://substreammagazine.com/feed/", source: "Substream" },
];

const POP_PUNK_FALLBACKS: Feed[] = [
  { url: "https://news.google.com/rss/search?q=pop+punk+tour+OR+album&hl=en-US&gl=US&ceid=US:en", source: "Google News (pop punk)" },
];

// ─── Static config — names, photos, official sites, and a fallback
//     blurb shown if Google News has nothing fresh for the band.
//     Auto-curation runs once a week per band via the Google News
//     RSS search. Tour cards search "<band> tour", album cards search
//     "<band> album", new-wave cards search "<band>".

type BandConfig = {
  name: string;
  img: string;
  fallbackHref: string;
  fallbackSource: string;
  fallbackHeadline: string;
  fallbackBlurb: string;
};

const TOUR_BANDS: BandConfig[] = [
  {
    name: "Blink-182",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Blink-182_2025_%28cropped_2%29.jpg/330px-Blink-182_2025_%28cropped_2%29.jpg",
    fallbackHref: "https://www.songkick.com/artists/479410-blink182",
    fallbackSource: "Songkick",
    fallbackHeadline: "Tour dates rolling out",
    fallbackBlurb: "Check Songkick for the latest list of confirmed shows.",
  },
  {
    name: "Fall Out Boy",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Fall_Out_Boy%2C_Heaven%2C_London_%2852755936394%29.jpg/330px-Fall_Out_Boy%2C_Heaven%2C_London_%2852755936394%29.jpg",
    fallbackHref: "https://www.vividseats.com/fall-out-boy-tickets/performer/5429",
    fallbackSource: "Vivid Seats",
    fallbackHeadline: "Festival circuit + tour dates",
    fallbackBlurb: "Vivid Seats has the rolling list as it expands.",
  },
  {
    name: "Green Day",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/GreenDay_Isle_of_Wight_Montage.jpg/330px-GreenDay_Isle_of_Wight_Montage.jpg",
    fallbackHref: "https://www.greenday.com/tour",
    fallbackSource: "greenday.com",
    fallbackHeadline: "Saviors Tour rolls on",
    fallbackBlurb: "Full-album sets at select dates. Check the official tour page.",
  },
  {
    name: "Paramore",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Paramore_2023.jpg/330px-Paramore_2023.jpg",
    fallbackHref: "https://www.paramore.net/",
    fallbackSource: "paramore.net",
    fallbackHeadline: "Watch this space",
    fallbackBlurb: "On a planned hiatus — Hayley Williams shows still surface.",
  },
];

const ALBUM_BANDS: BandConfig[] = [
  {
    name: "My Chemical Romance",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/MCR820_%28cropped%29.jpg/330px-MCR820_%28cropped%29.jpg",
    fallbackHref: "https://www.mychemicalromance.com/",
    fallbackSource: "mychemicalromance.com",
    fallbackHeadline: "The album-five conversation continues",
    fallbackBlurb: "Black Parade revival keeps it hot. No release date confirmed.",
  },
  {
    name: "Sum 41",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Sum_41_-_Southside_Festival_2024_-_DSC2886.jpg/330px-Sum_41_-_Southside_Festival_2024_-_DSC2886.jpg",
    fallbackHref: "https://en.wikipedia.org/wiki/Heaven_:x:_Hell",
    fallbackSource: "Wikipedia",
    fallbackHeadline: "Heaven :x: Hell — the farewell record",
    fallbackBlurb: "Pop punk + thrash double album, final tour wrapped.",
  },
  {
    name: "Yellowcard",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Yellowcard_-_Southside_Festival_2025_-_DSC2157.jpg/330px-Yellowcard_-_Southside_Festival_2025_-_DSC2157.jpg",
    fallbackHref: "https://yellowcardrock.com/",
    fallbackSource: "yellowcardrock.com",
    fallbackHeadline: "Childhood Eyes era + new singles",
    fallbackBlurb: "Back from the dead and recording. The violin lives.",
  },
  {
    name: "New Found Glory",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/NFG_SlamDunk_2019.jpg/330px-NFG_SlamDunk_2019.jpg",
    fallbackHref: "https://www.newfoundglory.com/",
    fallbackSource: "newfoundglory.com",
    fallbackHeadline: "Make The Most Of It deluxe pressings keep moving",
    fallbackBlurb: "Still touring the album that proved they never lost a step.",
  },
];

type ArtistConfig = {
  name: string;
  img: string;
  fallbackHref: string;
  fallbackBlurb: string;
};

const NEW_WAVE_ARTISTS: ArtistConfig[] = [
  {
    name: "Meet Me @ The Altar",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Meet_me_at_the_alter.jpg/330px-Meet_me_at_the_alter.jpg",
    fallbackHref: "https://meetmeatthealtarofficial.com/",
    fallbackBlurb: "Pop punk torch carriers. Massive hooks, three-piece firepower.",
  },
  {
    name: "Stand Atlantic",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Stand_Atlantic.jpg/330px-Stand_Atlantic.jpg",
    fallbackHref: "https://www.standatlantic.com/",
    fallbackBlurb: "Australian crew bending pop punk into hyperpop and back.",
  },
  {
    name: "Pinkshift",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Liberation_Weekend_2025-05-30_Pinkshift_03_cropped.jpg/330px-Liberation_Weekend_2025-05-30_Pinkshift_03_cropped.jpg",
    fallbackHref: "https://www.pinkshiftband.com/",
    fallbackBlurb: "Riot-grrrl roots, scream-it-in-the-pit choruses.",
  },
  {
    name: "Hot Mulligan",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Hot_mulligan_2.jpg/330px-Hot_mulligan_2.jpg",
    fallbackHref: "https://hotmulligan.bandcamp.com/",
    fallbackBlurb: "Midwest emo adjacent. Gang vocals you'll lose your voice to.",
  },
  {
    name: "Spanish Love Songs",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Spanish_Love_Songs_live.jpg/330px-Spanish_Love_Songs_live.jpg",
    fallbackHref: "https://spanishlovesongs.net/",
    fallbackBlurb: "Sad-bastard pop punk that hits like a chest punch.",
  },
  {
    name: "jxdn",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Jaden_Hossler.jpg/330px-Jaden_Hossler.jpg",
    fallbackHref: "https://www.jxdn.com/",
    fallbackBlurb: "Travis Barker-produced, gen-z pop punk with the hooks turned up.",
  },
];

// ─── Per-band fetch helper. Builds a Google News query, returns the
//     top result with its publication name, or null. Caches for a week
//     per band — one fetch, one slot, no API key.

async function fetchBandHeadline(
  band: string,
  topic: string
): Promise<NewsItem | null> {
  // Quote the band name so multi-word bands don't fragment the search.
  return fetchTopGoogleNews(`"${band}" ${topic}`, REVALIDATE_WEEKLY);
}

// ─── Card components

type BandCardData = {
  name: string;
  img: string;
  headline: string;
  blurb: string;
  href: string;
  source: string;
  pubDate?: string;
  isLive: boolean;
};

function BandCard(data: BandCardData) {
  const rel = formatRelative(data.pubDate);
  return (
    <Link
      href={data.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-pink-400/60 hover:bg-white/[0.05]"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-black">
        <Image
          src={data.img}
          alt={data.name}
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover opacity-90 transition group-hover:scale-105 group-hover:opacity-100"
        />
        {data.isLive && (
          <span className="absolute right-2 top-2 rounded border border-pink-400/50 bg-black/70 px-2 py-0.5 font-display text-[9px] tracking-[0.3em] text-pink-300">
            LIVE
          </span>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.3em] text-pink-300">
            {data.name}
          </p>
          {rel && (
            <span className="font-mono text-[10px] text-white/40">{rel}</span>
          )}
        </div>
        <h3 className="mt-2 text-lg font-black uppercase leading-snug">
          {data.headline}
        </h3>
        <p className="mt-2 text-sm leading-6 text-white/70">{data.blurb}</p>
        <p className="mt-3 text-xs uppercase tracking-widest text-pink-300/80">
          {data.source} ↗
        </p>
      </div>
    </Link>
  );
}

function buildBandCard(cfg: BandConfig, item: NewsItem | null): BandCardData {
  if (item) {
    return {
      name: cfg.name,
      img: cfg.img,
      headline: item.title,
      blurb: item.description ?? `Latest mention via ${item.publisher ?? "Google News"}.`,
      href: item.link,
      source: item.publisher ?? "Google News",
      pubDate: item.pubDate,
      isLive: true,
    };
  }
  return {
    name: cfg.name,
    img: cfg.img,
    headline: cfg.fallbackHeadline,
    blurb: cfg.fallbackBlurb,
    href: cfg.fallbackHref,
    source: cfg.fallbackSource,
    isLive: false,
  };
}

export default async function PopPunkPage() {
  // Fire all per-band searches + the headlines feed in parallel.
  const [
    headlines,
    tourResults,
    albumResults,
    newWaveResults,
  ] = await Promise.all([
    fetchManyRss(POP_PUNK_FEEDS, {
      perFeedMax: 6,
      totalMax: 8,
      fallbacks: POP_PUNK_FALLBACKS,
      minBeforeFallback: 4,
    }),
    Promise.all(TOUR_BANDS.map((b) => fetchBandHeadline(b.name, "tour OR concert OR setlist"))),
    Promise.all(ALBUM_BANDS.map((b) => fetchBandHeadline(b.name, "album OR EP OR record OR single"))),
    Promise.all(NEW_WAVE_ARTISTS.map((a) => fetchBandHeadline(a.name, "tour OR album OR single"))),
  ]);

  const tourCards = TOUR_BANDS.map((cfg, i) => buildBandCard(cfg, tourResults[i]));
  const albumCards = ALBUM_BANDS.map((cfg, i) => buildBandCard(cfg, albumResults[i]));

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
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-black uppercase sm:text-3xl">
              Tour News
            </h2>
            <span className="hidden font-display text-[10px] tracking-[0.3em] text-white/40 sm:block">
              LIVE · UPDATES WEEKLY
            </span>
          </div>
          <p className="mt-2 text-white/60">
            {"Who's on the road, who's about to be."}
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {tourCards.map((c) => (
              <BandCard key={c.name} {...c} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-zinc-950 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-black uppercase sm:text-3xl">
              Album News
            </h2>
            <span className="hidden font-display text-[10px] tracking-[0.3em] text-white/40 sm:block">
              LIVE · UPDATES WEEKLY
            </span>
          </div>
          <p className="mt-2 text-white/60">
            Records, reissues, and the rumor mill.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {albumCards.map((c) => (
              <BandCard key={c.name} {...c} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-black uppercase sm:text-3xl">
              New Musicians, Same Energy
            </h2>
            <span className="hidden font-display text-[10px] tracking-[0.3em] text-white/40 sm:block">
              LIVE · UPDATES WEEKLY
            </span>
          </div>
          <p className="mt-2 text-white/60">
            The bands keeping the flag in the air right now.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {NEW_WAVE_ARTISTS.map((cfg, i) => {
              const item = newWaveResults[i];
              const href = item?.link ?? cfg.fallbackHref;
              const headline = item?.title;
              const rel = formatRelative(item?.pubDate);
              return (
                <Link
                  key={cfg.name}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-pink-500/10 to-transparent transition hover:border-pink-400/60"
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-black">
                    <Image
                      src={cfg.img}
                      alt={cfg.name}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover opacity-90 transition group-hover:scale-105"
                    />
                    {item && (
                      <span className="absolute right-2 top-2 rounded border border-pink-400/50 bg-black/70 px-2 py-0.5 font-display text-[9px] tracking-[0.3em] text-pink-300">
                        LIVE
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-black uppercase">
                        {cfg.name}
                      </h3>
                      {rel && (
                        <span className="font-mono text-[10px] text-white/40">
                          {rel}
                        </span>
                      )}
                    </div>
                    {headline ? (
                      <p className="mt-2 text-sm leading-snug text-white/85">
                        {headline}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-white/70">{cfg.fallbackBlurb}</p>
                    )}
                  </div>
                </Link>
              );
            })}
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

          {headlines.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/60">
              {"Couldn't reach the feeds right now. Try refreshing in a bit."}
            </div>
          ) : (
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {headlines.map((n) => {
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
