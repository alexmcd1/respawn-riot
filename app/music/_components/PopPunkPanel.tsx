import Image from "next/image";
import Link from "next/link";
import {
  fetchManyRss,
  fetchTopGoogleNews,
  formatRelative,
  REVALIDATE_WEEKLY,
  type Feed,
  type NewsItem,
} from "../../_lib/rss";
import { fetchArtistImage, isSpotifyConfigured } from "../../_lib/spotifyArtist";
import { fetchOgImage } from "../../_lib/articleImage";

// Server component — fetches RSS feeds + per-band Google News results
// once per cache window and renders the pop-punk dashboard.
//
// Image strategy (in priority order):
//   1. OG image scraped from the live article URL (always fresh)
//   2. Spotify artist photo (auto-current, requires SPOTIFY_* env vars)
//   3. Hardcoded Wikipedia URL (last-resort fallback)
//
// News strategy:
//   - fetchTopGoogleNews now sorts by date + drops anything older than
//     180 days, so the per-band cards stop surfacing 2020-era articles
//   - the new "Breaking Now" hero strip leads the page with the 2-3
//     freshest items from the RSS feeds + their real article thumbnails

const POP_PUNK_FEEDS: Feed[] = [
  { url: "https://www.altpress.com/feed/", source: "Alternative Press" },
  { url: "https://www.punktastic.com/feed/", source: "Punktastic" },
  { url: "https://substreammagazine.com/feed/", source: "Substream" },
];

const POP_PUNK_FALLBACKS: Feed[] = [
  { url: "https://news.google.com/rss/search?q=pop+punk+tour+OR+album+when:30d&hl=en-US&gl=US&ceid=US:en", source: "Google News (pop punk)" },
];

/** Shared local placeholder used as a last-resort fallback for new
 *  bands and festivals that don't have a hardcoded Wikipedia photo.
 *  Spotify usually overrides this for bands; festivals fall through. */
const MUSIC_PLACEHOLDER = "/music/placeholder.svg";

type BandConfig = {
  name: string;
  /** Last-resort image when Spotify isn't configured and OG scraping
   *  doesn't run for this card (e.g. the band has no live article). */
  fallbackImg: string;
  fallbackHref: string;
  fallbackSource: string;
  fallbackHeadline: string;
  fallbackBlurb: string;
};

const TOUR_BANDS: BandConfig[] = [
  {
    name: "Blink-182",
    fallbackImg: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Blink-182_2025_%28cropped_2%29.jpg/330px-Blink-182_2025_%28cropped_2%29.jpg",
    fallbackHref: "https://www.songkick.com/artists/479410-blink182",
    fallbackSource: "Songkick",
    fallbackHeadline: "Tour dates rolling out",
    fallbackBlurb: "Check Songkick for the latest list of confirmed shows.",
  },
  {
    name: "Fall Out Boy",
    fallbackImg: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Fall_Out_Boy%2C_Heaven%2C_London_%2852755936394%29.jpg/330px-Fall_Out_Boy%2C_Heaven%2C_London_%2852755936394%29.jpg",
    fallbackHref: "https://www.vividseats.com/fall-out-boy-tickets/performer/5429",
    fallbackSource: "Vivid Seats",
    fallbackHeadline: "Festival circuit + tour dates",
    fallbackBlurb: "Vivid Seats has the rolling list as it expands.",
  },
  {
    name: "Green Day",
    fallbackImg: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/GreenDay_Isle_of_Wight_Montage.jpg/330px-GreenDay_Isle_of_Wight_Montage.jpg",
    fallbackHref: "https://www.greenday.com/tour",
    fallbackSource: "greenday.com",
    fallbackHeadline: "Saviors Tour rolls on",
    fallbackBlurb: "Full-album sets at select dates. Check the official tour page.",
  },
  {
    name: "Paramore",
    fallbackImg: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Paramore_2023.jpg/330px-Paramore_2023.jpg",
    fallbackHref: "https://www.paramore.net/",
    fallbackSource: "paramore.net",
    fallbackHeadline: "Watch this space",
    fallbackBlurb: "On a planned hiatus — Hayley Williams shows still surface.",
  },
  {
    name: "All Time Low",
    fallbackImg: MUSIC_PLACEHOLDER,
    fallbackHref: "https://www.alltimelow.com/",
    fallbackSource: "alltimelow.com",
    fallbackHeadline: "Tour rolls on",
    fallbackBlurb: "Check the official site for the latest dates.",
  },
  {
    name: "Mayday Parade",
    fallbackImg: MUSIC_PLACEHOLDER,
    fallbackHref: "https://www.maydayparade.com/",
    fallbackSource: "maydayparade.com",
    fallbackHeadline: "Anywhere But Here era + headliners",
    fallbackBlurb: "Steady touring and the occasional anniversary run.",
  },
  {
    name: "Avril Lavigne",
    fallbackImg: MUSIC_PLACEHOLDER,
    fallbackHref: "https://www.avrillavigne.com/",
    fallbackSource: "avrillavigne.com",
    fallbackHeadline: "Greatest hits tour",
    fallbackBlurb: "Hard-pop comeback era. Festival headliner shows.",
  },
  {
    name: "Pierce the Veil",
    fallbackImg: MUSIC_PLACEHOLDER,
    fallbackHref: "https://www.piercetheveil.net/",
    fallbackSource: "piercetheveil.net",
    fallbackHeadline: "The Jaws of Life tour cycle",
    fallbackBlurb: "Post-hardcore-leaning, but the choruses count.",
  },
];

const ALBUM_BANDS: BandConfig[] = [
  {
    name: "My Chemical Romance",
    fallbackImg: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/MCR820_%28cropped%29.jpg/330px-MCR820_%28cropped%29.jpg",
    fallbackHref: "https://www.mychemicalromance.com/",
    fallbackSource: "mychemicalromance.com",
    fallbackHeadline: "The album-five conversation continues",
    fallbackBlurb: "Black Parade revival keeps it hot. No release date confirmed.",
  },
  {
    name: "Sum 41",
    fallbackImg: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Sum_41_-_Southside_Festival_2024_-_DSC2886.jpg/330px-Sum_41_-_Southside_Festival_2024_-_DSC2886.jpg",
    fallbackHref: "https://en.wikipedia.org/wiki/Heaven_:x:_Hell",
    fallbackSource: "Wikipedia",
    fallbackHeadline: "Heaven :x: Hell — the farewell record",
    fallbackBlurb: "Pop punk + thrash double album, final tour wrapped.",
  },
  {
    name: "Yellowcard",
    fallbackImg: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Yellowcard_-_Southside_Festival_2025_-_DSC2157.jpg/330px-Yellowcard_-_Southside_Festival_2025_-_DSC2157.jpg",
    fallbackHref: "https://yellowcardrock.com/",
    fallbackSource: "yellowcardrock.com",
    fallbackHeadline: "Childhood Eyes era + new singles",
    fallbackBlurb: "Back from the dead and recording. The violin lives.",
  },
  {
    name: "New Found Glory",
    fallbackImg: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/NFG_SlamDunk_2019.jpg/330px-NFG_SlamDunk_2019.jpg",
    fallbackHref: "https://www.newfoundglory.com/",
    fallbackSource: "newfoundglory.com",
    fallbackHeadline: "Make The Most Of It deluxe pressings keep moving",
    fallbackBlurb: "Still touring the album that proved they never lost a step.",
  },
  {
    name: "Panic! at the Disco",
    fallbackImg: MUSIC_PLACEHOLDER,
    fallbackHref: "https://www.panicatthedisco.com/",
    fallbackSource: "panicatthedisco.com",
    fallbackHeadline: "Catalog era continues",
    fallbackBlurb: "Project wound down in 2023 — catalog news + Brendon Urie watch.",
  },
  {
    name: "Alkaline Trio",
    fallbackImg: MUSIC_PLACEHOLDER,
    fallbackHref: "https://www.alkalinetrio.com/",
    fallbackSource: "alkalinetrio.com",
    fallbackHeadline: "Blood, Hair, and Eyeballs cycle",
    fallbackBlurb: "Latest record + steady touring with the Black Sails-era lineup.",
  },
  {
    name: "Good Charlotte",
    fallbackImg: MUSIC_PLACEHOLDER,
    fallbackHref: "https://www.goodcharlotte.com/",
    fallbackSource: "goodcharlotte.com",
    fallbackHeadline: "Reunion era",
    fallbackBlurb: "Festival headliner shows + nostalgia run.",
  },
];

type ArtistConfig = {
  name: string;
  fallbackImg: string;
  fallbackHref: string;
  fallbackBlurb: string;
};

type FestivalConfig = {
  name: string;
  /** Compact name used for the band tag pill in the hero ("AFTERSHOCK"
   *  reads better than "Danny Wimmer Presents Aftershock"). */
  shortName?: string;
  fallbackImg: string;
  fallbackHref: string;
  fallbackSource: string;
  fallbackBlurb: string;
};

// Festivals — searched the same way per-band news is. Treated like
// bands for the FROM YOUR BANDS hero strip, so a freshly-announced
// lineup can lead the page.
const FESTIVALS: FestivalConfig[] = [
  {
    name: "Welcome to Rockville",
    shortName: "Rockville",
    fallbackImg: MUSIC_PLACEHOLDER,
    fallbackHref: "https://welcometorockvillefestival.com/",
    fallbackSource: "welcometorockvillefestival.com",
    fallbackBlurb: "Daytona Beach. Four days of rock + alt-heavy festivals each May.",
  },
  {
    name: "Louder Than Life",
    fallbackImg: MUSIC_PLACEHOLDER,
    fallbackHref: "https://louderthanlifefestival.com/",
    fallbackSource: "louderthanlifefestival.com",
    fallbackBlurb: "Louisville. Headlining rock & metal weekender every September.",
  },
  {
    name: "Sonic Temple",
    fallbackImg: MUSIC_PLACEHOLDER,
    fallbackHref: "https://sonictemplefestival.com/",
    fallbackSource: "sonictemplefestival.com",
    fallbackBlurb: "Columbus, OH. The spiritual successor to Rock on the Range.",
  },
  {
    name: "Shaky Knees",
    fallbackImg: MUSIC_PLACEHOLDER,
    fallbackHref: "https://shakykneesfestival.com/",
    fallbackSource: "shakykneesfestival.com",
    fallbackBlurb: "Atlanta. Indie-leaning festival with strong alt-rock lineups.",
  },
  {
    name: "Warped Tour",
    fallbackImg: MUSIC_PLACEHOLDER,
    fallbackHref: "https://vanswarpedtour.com/",
    fallbackSource: "vanswarpedtour.com",
    fallbackBlurb: "The return. Anniversary stops in DC, Long Beach & Orlando in 2025.",
  },
  {
    name: "Aftershock",
    fallbackImg: MUSIC_PLACEHOLDER,
    fallbackHref: "https://aftershockfestival.com/",
    fallbackSource: "aftershockfestival.com",
    fallbackBlurb: "Sacramento. October's heavy-rock weekender.",
  },
];

const NEW_WAVE_ARTISTS: ArtistConfig[] = [
  {
    name: "Meet Me @ The Altar",
    fallbackImg: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Meet_me_at_the_alter.jpg/330px-Meet_me_at_the_alter.jpg",
    fallbackHref: "https://meetmeatthealtarofficial.com/",
    fallbackBlurb: "Pop punk torch carriers. Massive hooks, three-piece firepower.",
  },
  {
    name: "Stand Atlantic",
    fallbackImg: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Stand_Atlantic.jpg/330px-Stand_Atlantic.jpg",
    fallbackHref: "https://www.standatlantic.com/",
    fallbackBlurb: "Australian crew bending pop punk into hyperpop and back.",
  },
  {
    name: "Pinkshift",
    fallbackImg: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Liberation_Weekend_2025-05-30_Pinkshift_03_cropped.jpg/330px-Liberation_Weekend_2025-05-30_Pinkshift_03_cropped.jpg",
    fallbackHref: "https://www.pinkshiftband.com/",
    fallbackBlurb: "Riot-grrrl roots, scream-it-in-the-pit choruses.",
  },
  {
    name: "Hot Mulligan",
    fallbackImg: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Hot_mulligan_2.jpg/330px-Hot_mulligan_2.jpg",
    fallbackHref: "https://hotmulligan.bandcamp.com/",
    fallbackBlurb: "Midwest emo adjacent. Gang vocals you'll lose your voice to.",
  },
  {
    name: "Spanish Love Songs",
    fallbackImg: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Spanish_Love_Songs_live.jpg/330px-Spanish_Love_Songs_live.jpg",
    fallbackHref: "https://spanishlovesongs.net/",
    fallbackBlurb: "Sad-bastard pop punk that hits like a chest punch.",
  },
  {
    name: "jxdn",
    fallbackImg: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Jaden_Hossler.jpg/330px-Jaden_Hossler.jpg",
    fallbackHref: "https://www.jxdn.com/",
    fallbackBlurb: "Travis Barker-produced, gen-z pop punk with the hooks turned up.",
  },
];

// ─── Per-band data wiring ─────────────────────────────────────────────────

// Recency floor for "this counts as live news". Anything older becomes
// a static fallback card. 60-day search window, 90-day hard cliff.
const FRESH_SEARCH_DAYS = 60;
const FRESH_MAX_AGE_DAYS = 90;

async function fetchBandHeadline(band: string, topic: string): Promise<NewsItem | null> {
  return fetchTopGoogleNews(`"${band}" ${topic}`, REVALIDATE_WEEKLY, {
    whenDays: FRESH_SEARCH_DAYS,
    maxAgeDays: FRESH_MAX_AGE_DAYS,
  });
}

/** True iff `iso` parses to a date within the last MAX_AGE_DAYS. */
function isFreshEnough(iso: string | undefined): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  const ageDays = (Date.now() - t) / (24 * 60 * 60 * 1000);
  return ageDays <= FRESH_MAX_AGE_DAYS;
}

type BandCardData = {
  name: string;
  /** May be an arbitrary CDN URL (OG-scraped) or our trusted i.scdn.co
   *  / upload.wikimedia.org list. Determines whether we use Next/Image
   *  (trusted hosts only) or a plain <img>. */
  img: string;
  imgIsTrusted: boolean;
  headline: string;
  blurb: string;
  href: string;
  source: string;
  pubDate?: string;
  isLive: boolean;
};

const TRUSTED_IMAGE_HOSTS = new Set(["upload.wikimedia.org", "i.scdn.co"]);

function isTrustedImageHost(url: string): boolean {
  // Local /public/ assets are always safe for Next/Image.
  if (url.startsWith("/")) return true;
  try {
    return TRUSTED_IMAGE_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Pick the first image URL in the chain that isn't already in `used`,
 *  add it to the set, and return it (with the trusted-host flag for
 *  SmartImage). If every candidate is already used or null, fall back
 *  to the shared placeholder.
 *
 *  This is the centerpiece of the "no duplicate band photos on the
 *  same page" rule — call this in order (hero first, then tiles top to
 *  bottom), passing the SAME set, and each call picks the freshest
 *  not-yet-used image from its candidates. */
function pickUnusedImage(
  candidates: ReadonlyArray<string | null | undefined>,
  used: Set<string>
): { url: string; trusted: boolean } {
  for (const c of candidates) {
    if (c && !used.has(c)) {
      used.add(c);
      return { url: c, trusted: isTrustedImageHost(c) };
    }
  }
  // Every candidate is null or already in use — fall through to the
  // local placeholder. (We don't add the placeholder to `used` so
  // multiple bands with exhausted candidates can all use it. Adding
  // variation to the placeholder per-band would be the next step if
  // this proves visually noisy.)
  return { url: MUSIC_PLACEHOLDER, trusted: true };
}

async function buildBandCard(
  cfg: BandConfig,
  item: NewsItem | null,
  usedImages: Set<string>
): Promise<BandCardData> {
  // Promote to live ONLY if pubDate is within FRESH_MAX_AGE_DAYS.
  // (We no longer skip the article when it's already featured in the
  // hero — repeating a band across sections is fine, the image-dedup
  // via pickUnusedImage makes sure the visual doesn't repeat.)
  const liveItem = item && isFreshEnough(item.pubDate) ? item : null;

  // Gather all image candidates in parallel.
  const [ogImg, spotifyImg] = await Promise.all([
    liveItem ? fetchOgImage(liveItem.link) : Promise.resolve(null),
    fetchArtistImage(cfg.name),
  ]);
  // Image-dedup: pick the first not-already-used option from the chain.
  // og:image is the freshest signal (current article), then Spotify
  // (auto-current artist photo), then the hardcoded Wikipedia fallback.
  // If they're ALL claimed by earlier cards, pickUnusedImage falls
  // through to the local /music/placeholder.svg.
  const choice = pickUnusedImage([ogImg, spotifyImg, cfg.fallbackImg], usedImages);

  if (liveItem) {
    return {
      name: cfg.name,
      img: choice.url,
      imgIsTrusted: choice.trusted,
      headline: liveItem.title,
      blurb: liveItem.description ?? `Latest mention via ${liveItem.publisher ?? "Google News"}.`,
      href: liveItem.link,
      source: liveItem.publisher ?? "Google News",
      pubDate: liveItem.pubDate,
      isLive: true,
    };
  }
  return {
    name: cfg.name,
    img: choice.url,
    imgIsTrusted: choice.trusted,
    headline: cfg.fallbackHeadline,
    blurb: cfg.fallbackBlurb,
    href: cfg.fallbackHref,
    source: cfg.fallbackSource,
    isLive: false,
  };
}

/** Festivals: like bands, but Spotify lookups don't help (festivals
 *  aren't artists) so the candidate chain is shorter: og:image →
 *  hardcoded fallback (usually the shared placeholder). */
async function buildFestivalCard(
  cfg: FestivalConfig,
  item: NewsItem | null,
  usedImages: Set<string>
): Promise<BandCardData> {
  const liveItem = item && isFreshEnough(item.pubDate) ? item : null;
  const ogImg = liveItem ? await fetchOgImage(liveItem.link) : null;
  const choice = pickUnusedImage([ogImg, cfg.fallbackImg], usedImages);

  if (liveItem) {
    return {
      name: cfg.shortName ?? cfg.name,
      img: choice.url,
      imgIsTrusted: choice.trusted,
      headline: liveItem.title,
      blurb: liveItem.description ?? `Latest mention via ${liveItem.publisher ?? "Google News"}.`,
      href: liveItem.link,
      source: liveItem.publisher ?? "Google News",
      pubDate: liveItem.pubDate,
      isLive: true,
    };
  }
  return {
    name: cfg.shortName ?? cfg.name,
    img: choice.url,
    imgIsTrusted: choice.trusted,
    headline: "Awaiting next announcement",
    blurb: cfg.fallbackBlurb,
    href: cfg.fallbackHref,
    source: cfg.fallbackSource,
    isLive: false,
  };
}

// ─── UI building blocks ──────────────────────────────────────────────────

/** Image that uses Next/Image for trusted hosts (Spotify, Wikipedia)
 *  and a plain <img> for everything else (OG-scraped article thumbs
 *  can be on any CDN). */
function SmartImage({
  src,
  alt,
  trusted,
  sizes,
  className,
}: {
  src: string;
  alt: string;
  trusted: boolean;
  sizes: string;
  className?: string;
}) {
  if (trusted) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={className}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`absolute inset-0 h-full w-full object-cover ${className ?? ""}`}
    />
  );
}

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
        <SmartImage
          src={data.img}
          alt={data.name}
          trusted={data.imgIsTrusted}
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
          <p className="text-xs uppercase tracking-[0.3em] text-pink-300">{data.name}</p>
          {rel && <span className="font-mono text-[10px] text-white/40">{rel}</span>}
        </div>
        <h3 className="mt-2 text-lg font-black uppercase leading-snug">{data.headline}</h3>
        <p className="mt-2 text-sm leading-6 text-white/70">{data.blurb}</p>
        <p className="mt-3 text-xs uppercase tracking-widest text-pink-300/80">
          {data.source} ↗
        </p>
      </div>
    </Link>
  );
}

// ─── BREAKING NOW hero strip ─────────────────────────────────────────────
//
// Sourced from the per-band Google News results (Tour + Album + New
// Wave), NOT generic alt-music feeds. Every story here is about a
// band that's already curated onto the page below — so the hero
// can never surface bands the visitor wouldn't listen to.
//
// Image fallback chain (so every hero card always has an image):
//   1. og:image scraped from the article (best quality when it works)
//   2. Spotify artist photo for the band the story is about
//   3. The band's hardcoded fallback image
// Google News RSS article URLs are JS-redirect wrappers (the link
// goes to news.google.com/rss/articles/... not the real publisher),
// so og:image scraping fails on a majority of them — without this
// chain the hero would render as empty gradient placeholders.

type HeroItem = {
  news: NewsItem;
  img: string;
  imgIsTrusted: boolean;
  band: string;   // which curated band this story is about
};

function BreakingHero({ items }: { items: HeroItem[] }) {
  if (items.length === 0) return null;
  const [lead, ...rest] = items;
  return (
    <section className="relative border-b border-pink-500/20 bg-gradient-to-br from-pink-500/15 via-fuchsia-500/10 to-transparent">
      <div className="pointer-events-none absolute inset-0 opacity-20 [background:repeating-linear-gradient(to_bottom,rgba(255,255,255,0.04)_0px,rgba(255,255,255,0.04)_1px,transparent_1px,transparent_3px)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-pink-400 shadow-[0_0_12px_rgba(244,114,182,0.8)]" />
            <h2 className="font-display text-[11px] tracking-[0.4em] text-pink-300">
              FROM YOUR BANDS
            </h2>
          </div>
          <p className="font-mono text-[10px] text-white/45">
            LAST {FRESH_MAX_AGE_DAYS}D · YOUR LINEUP ONLY
          </p>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          {/* Lead card — big, takes 2 columns on desktop */}
          <Link
            href={lead.news.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group lg:col-span-2 flex flex-col overflow-hidden rounded-2xl border border-pink-400/30 bg-black/60 transition hover:border-pink-400/70"
          >
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-black">
              <SmartImage
                src={lead.img}
                alt={lead.band}
                trusted={lead.imgIsTrusted}
                sizes="(min-width: 1024px) 66vw, 100vw"
                className="object-cover transition group-hover:scale-[1.02]"
              />
              <span className="absolute left-3 top-3 rounded border border-pink-400/60 bg-black/75 px-2 py-0.5 font-display text-[10px] tracking-[0.3em] text-pink-200">
                ◢ {lead.band.toUpperCase()}
              </span>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-5">
                <p className="font-display text-[10px] tracking-[0.3em] text-pink-300">
                  {lead.news.publisher ?? lead.news.source}
                  {lead.news.pubDate && (
                    <span className="ml-2 font-mono text-white/55">
                      · {formatRelative(lead.news.pubDate)}
                    </span>
                  )}
                </p>
                <h3 className="mt-2 text-xl font-black uppercase leading-tight text-white sm:text-2xl">
                  {lead.news.title}
                </h3>
              </div>
            </div>
          </Link>

          {/* Two stacked secondary cards on the right */}
          <div className="flex flex-col gap-5">
            {rest.slice(0, 2).map((item) => (
              <Link
                key={item.news.link}
                href={item.news.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/40 transition hover:border-pink-400/60"
              >
                <div className="relative aspect-square w-28 shrink-0 overflow-hidden bg-black sm:w-32">
                  <SmartImage
                    src={item.img}
                    alt={item.band}
                    trusted={item.imgIsTrusted}
                    sizes="128px"
                    className="object-cover transition group-hover:scale-105"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-3">
                  <p className="font-display text-[10px] tracking-[0.3em] text-pink-300">
                    ◢ {item.band.toUpperCase()}
                  </p>
                  <p className="font-mono text-[10px] text-white/45">
                    {item.news.publisher ?? item.news.source}
                    {item.news.pubDate && (
                      <span className="ml-1">
                        · {formatRelative(item.news.pubDate)}
                      </span>
                    )}
                  </p>
                  <h3 className="text-sm font-black uppercase leading-snug text-white line-clamp-3">
                    {item.news.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// (HeroPlaceholder removed — fallback chain in PopPunkPanel guarantees
//  every hero card resolves to a real image, so the placeholder no
//  longer fires. Restore from git history if a code path ever needs it.)

// ─── Main panel ─────────────────────────────────────────────────────────

export default async function PopPunkPanel() {
  const [
    rawHeadlines,
    tourResults,
    albumResults,
    newWaveResults,
    newWaveImages,
    festivalResults,
  ] = await Promise.all([
    fetchManyRss(POP_PUNK_FEEDS, {
      perFeedMax: 6,
      totalMax: 14,
      fallbacks: POP_PUNK_FALLBACKS,
      minBeforeFallback: 4,
    }),
    Promise.all(TOUR_BANDS.map((b) => fetchBandHeadline(b.name, "tour OR concert OR setlist"))),
    Promise.all(ALBUM_BANDS.map((b) => fetchBandHeadline(b.name, "album OR EP OR record OR single"))),
    Promise.all(NEW_WAVE_ARTISTS.map((a) => fetchBandHeadline(a.name, "tour OR album OR single"))),
    Promise.all(NEW_WAVE_ARTISTS.map((a) => fetchArtistImage(a.name))),
    Promise.all(
      FESTIVALS.map((f) =>
        fetchBandHeadline(f.name, "lineup OR announcement OR tickets OR 2025 OR 2026 OR set times")
      )
    ),
  ]);

  // ─── BREAKING NOW input ────────────────────────────────────────────────
  //
  // Union of the per-band + per-festival results, tagged with which
  // band/festival each item is about. Dedupe by URL, drop entries
  // outside the freshness window, sort newest-first, take top 3.
  //
  // Crucially: every story here is about a band or festival that
  // appears below (Tour News / Album News / Festival News / New Wave).
  // The hero can never surface bands the user wouldn't listen to.
  type Tagged = { news: NewsItem; band: string };
  const allBandNews: Tagged[] = [
    ...tourResults.map((n, i) => (n ? { news: n, band: TOUR_BANDS[i].name } : null)),
    ...albumResults.map((n, i) => (n ? { news: n, band: ALBUM_BANDS[i].name } : null)),
    ...newWaveResults.map((n, i) => (n ? { news: n, band: NEW_WAVE_ARTISTS[i].name } : null)),
    ...festivalResults.map((n, i) =>
      n ? { news: n, band: FESTIVALS[i].shortName ?? FESTIVALS[i].name } : null
    ),
  ].filter((x): x is Tagged => x != null && isFreshEnough(x.news.pubDate));

  const dedup = new Map<string, Tagged>();
  for (const t of allBandNews) {
    if (!dedup.has(t.news.link)) dedup.set(t.news.link, t);
  }
  const rankedBandNews = [...dedup.values()].sort((a, b) =>
    (b.news.pubDate || "").localeCompare(a.news.pubDate || "")
  );
  const heroPicks = rankedBandNews.slice(0, 3);

  // ─── Image dedup state ────────────────────────────────────────────────
  //
  // Single shared Set tracks every image URL used on the page so far.
  // pickUnusedImage() reads + writes it as each card is built — so two
  // cards never end up with the same photo even if they'd both prefer
  // it. The hero is built first (claiming its image slots), then tiles
  // in section order. When a band has only one good image and it's
  // already claimed, that band's tile falls through the chain to the
  // /music/placeholder.svg.
  const usedImages = new Set<string>();

  // Fallback map so the hero's pickUnusedImage chain can fall through
  // to each band's hand-picked photo.
  const bandFallbackImg = new Map<string, string>([
    ...TOUR_BANDS.map((b) => [b.name, b.fallbackImg] as const),
    ...ALBUM_BANDS.map((b) => [b.name, b.fallbackImg] as const),
    ...NEW_WAVE_ARTISTS.map((a) => [a.name, a.fallbackImg] as const),
    ...FESTIVALS.map((f) => [f.shortName ?? f.name, f.fallbackImg] as const),
  ]);

  // Hero candidates: gather every option in parallel, then sequentially
  // pick so the dedup-against-each-other works within the hero too.
  const heroCandidates = await Promise.all(
    heroPicks.map(async (t) => {
      const [og, spotify] = await Promise.all([
        fetchOgImage(t.news.link),
        fetchArtistImage(t.band),
      ]);
      return { og, spotify, fallback: bandFallbackImg.get(t.band) ?? "" };
    })
  );

  const heroItems: HeroItem[] = heroPicks.map((t, i) => {
    const cands = heroCandidates[i];
    const choice = pickUnusedImage(
      [cands.og, cands.spotify, cands.fallback],
      usedImages
    );
    return {
      news: t.news,
      img: choice.url,
      imgIsTrusted: choice.trusted,
      band: t.band,
    };
  });

  // ─── Tile cards: built sequentially so image picks don't race ─────────
  //
  // Each builder mutates `usedImages` as it picks. Doing this in a
  // for-loop (not Promise.all) keeps the picks deterministic and
  // ordered top-to-bottom on the page. The fetches INSIDE each builder
  // still run in parallel — and the relevant data is cached — so the
  // wall-clock impact is minimal.
  const tourCards: BandCardData[] = [];
  for (let i = 0; i < TOUR_BANDS.length; i++) {
    tourCards.push(await buildBandCard(TOUR_BANDS[i], tourResults[i], usedImages));
  }
  const albumCards: BandCardData[] = [];
  for (let i = 0; i < ALBUM_BANDS.length; i++) {
    albumCards.push(await buildBandCard(ALBUM_BANDS[i], albumResults[i], usedImages));
  }
  const festivalCards: BandCardData[] = [];
  for (let i = 0; i < FESTIVALS.length; i++) {
    festivalCards.push(await buildFestivalCard(FESTIVALS[i], festivalResults[i], usedImages));
  }

  // Same dedup for the New Wave artists (rendered inline below — we
  // build the choices here so the dedup state stays in one place).
  const newWaveChoices = NEW_WAVE_ARTISTS.map((cfg, i) => {
    const spot = newWaveImages[i];
    return pickUnusedImage([spot, cfg.fallbackImg], usedImages);
  });

  // Keep article-URL dedup for the Headlines list so we don't list the
  // same article twice on the page (independent of the image dedup).
  const usedLinks = new Set(heroItems.map((h) => h.news.link));

  // ─── Headlines list filter ─────────────────────────────────────────────
  //
  // Only show items whose title mentions one of the bands or festivals
  // curated for this page. Same principle as Breaking Now — keep the
  // visible content to the lineup the visitor cares about.
  const allCuratedNames = [
    ...TOUR_BANDS.map((b) => b.name),
    ...ALBUM_BANDS.map((b) => b.name),
    ...NEW_WAVE_ARTISTS.map((a) => a.name),
    ...FESTIVALS.map((f) => f.name),
    ...FESTIVALS.map((f) => f.shortName).filter((s): s is string => !!s),
  ];
  // Normalize both sides: lowercase, strip every non-alphanumeric to a
  // single space, then collapse runs. Catches all the messy cases —
  // "Blink-182" matches "blink 182", "Meet Me @ The Altar" matches
  // articles that write it with or without the @, possessives like
  // "Fall Out Boy's tour" still match "fall out boy", etc.
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  const curatedTokens = allCuratedNames.map(normalize);
  const mentionsCurated = (title: string) => {
    const t = normalize(title);
    return curatedTokens.some((b) => b.length > 2 && t.includes(b));
  };
  const freshHeadlines = rawHeadlines.filter(
    (h) => isFreshEnough(h.pubDate) && mentionsCurated(h.title)
  );
  const listHeadlines = freshHeadlines.filter((h) => !usedLinks.has(h.link));
  // Scrape OG thumbnails for the top 6 list entries.
  const listImages = await Promise.all(
    listHeadlines.slice(0, 6).map((n) => fetchOgImage(n.link))
  );

  const spotifyOff = !isSpotifyConfigured();

  return (
    <>
      {/* The new top of the page — replaces the old "Tour News leads"
          layout that put stale band tiles right at the top. */}
      <BreakingHero items={heroItems} />

      {/* Spotify configuration hint — only shown when env vars are
          missing. Disappears the moment Spotify is wired up. */}
      {spotifyOff && (
        <div className="border-b border-white/5 bg-zinc-950/60">
          <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6">
            <p className="font-mono text-[10px] text-white/35">
              ℹ Band tile photos auto-refresh via Spotify when{" "}
              <code className="text-pink-300/70">SPOTIFY_CLIENT_ID</code> +{" "}
              <code className="text-pink-300/70">SPOTIFY_CLIENT_SECRET</code> are set in Vercel.
              Currently falling back to fixed photos.
            </p>
          </div>
        </div>
      )}

      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-black uppercase sm:text-3xl">Tour News</h2>
            <span className="hidden font-display text-[10px] tracking-[0.3em] text-white/40 sm:block">
              LIVE · UPDATES WEEKLY
            </span>
          </div>
          <p className="mt-2 text-white/60">{"Who's on the road, who's about to be."}</p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {tourCards.map((c) => <BandCard key={c.name} {...c} />)}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-zinc-950 px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-black uppercase sm:text-3xl">Album News</h2>
            <span className="hidden font-display text-[10px] tracking-[0.3em] text-white/40 sm:block">
              LIVE · UPDATES WEEKLY
            </span>
          </div>
          <p className="mt-2 text-white/60">Records, reissues, and the rumor mill.</p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {albumCards.map((c) => <BandCard key={c.name} {...c} />)}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-black uppercase sm:text-3xl">Festival News</h2>
            <span className="hidden font-display text-[10px] tracking-[0.3em] text-white/40 sm:block">
              LIVE · UPDATES WEEKLY
            </span>
          </div>
          <p className="mt-2 text-white/60">
            Lineup announcements, ticket drops, and set times for the festivals you care about.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {festivalCards.map((c) => <BandCard key={c.name} {...c} />)}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-zinc-950 px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-black uppercase sm:text-3xl">New Musicians, Same Energy</h2>
            <span className="hidden font-display text-[10px] tracking-[0.3em] text-white/40 sm:block">
              LIVE · UPDATES WEEKLY
            </span>
          </div>
          <p className="mt-2 text-white/60">The bands keeping the flag in the air right now.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {NEW_WAVE_ARTISTS.map((cfg, i) => {
              const rawItem = newWaveResults[i];
              // Same article can repeat across sections; the image-dedup
              // (newWaveChoices, computed above against the page-wide
              // usedImages set) takes care of visual repetition.
              const item =
                rawItem && isFreshEnough(rawItem.pubDate) ? rawItem : null;
              const choice = newWaveChoices[i];
              const img = choice.url;
              const trusted = choice.trusted;
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
                    <SmartImage
                      src={img}
                      alt={cfg.name}
                      trusted={trusted}
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
                      <h3 className="text-base font-black uppercase">{cfg.name}</h3>
                      {rel && <span className="font-mono text-[10px] text-white/40">{rel}</span>}
                    </div>
                    {headline ? (
                      <p className="mt-2 text-sm leading-snug text-white/85">{headline}</p>
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

      <section className="border-t border-white/10 bg-zinc-950 px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-black uppercase sm:text-3xl">More From Your Bands</h2>
            <span className="hidden font-display text-[10px] tracking-[0.3em] text-white/40 sm:block">
              LAST {FRESH_MAX_AGE_DAYS}D · YOUR LINEUP ONLY
            </span>
          </div>
          <p className="mt-2 text-white/60">
            Stories from AltPress, Punktastic &amp; Substream — filtered to the bands listed above.
          </p>
          {listHeadlines.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/60">
              No fresh stories matched your lineup this week. Check back in a few days.
            </div>
          ) : (
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {listHeadlines.map((n, i) => {
                const rel = formatRelative(n.pubDate);
                const img = i < listImages.length ? listImages[i] : null;
                return (
                  <Link
                    key={n.link}
                    href={n.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-pink-400/50 hover:bg-white/[0.05]"
                  >
                    {img && (
                      <div className="relative aspect-square w-24 shrink-0 overflow-hidden bg-black sm:w-28">
                        <SmartImage
                          src={img}
                          alt={n.title}
                          trusted={isTrustedImageHost(img)}
                          sizes="112px"
                          className="object-cover transition group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs uppercase tracking-[0.25em] text-pink-300">{n.source}</p>
                        {rel && <span className="font-mono text-[10px] text-white/40">{rel}</span>}
                      </div>
                      <h3 className="text-base font-black uppercase leading-snug group-hover:text-white">
                        {n.title} ↗
                      </h3>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
