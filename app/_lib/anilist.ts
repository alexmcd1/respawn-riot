// AniList GraphQL client — small helper around https://graphql.anilist.co
// for pulling currently-trending / top-rated / upcoming anime and
// most-favorited characters.
//
// Why AniList: free, no API key required, no auth needed for read-only
// queries, generous rate limits (90 req/min) that we'll never hit, and
// the data shape is much richer than Jikan/MyAnimeList for less
// painful caching. Their CORS-friendly endpoint also means we COULD
// call this client-side if we ever wanted to, though here we use it
// server-side so the responses get Next's fetch cache benefits.
//
// Every fetch wraps in try/catch and returns an empty array on
// failure so the page stays renderable when AniList is down (or any
// individual query fails — pages with a partial result still beat a
// blank page).

const ANILIST_URL = "https://graphql.anilist.co";
const CACHE_SECONDS = 60 * 60; // 1 hour — AniList recommends at least 5 minutes

// ─── Types — only the fields we actually use ───────────────────────────

export type AnilistMedia = {
  id: number;
  title: { romaji?: string | null; english?: string | null };
  averageScore: number | null;
  meanScore: number | null;
  popularity: number | null;
  coverImage: {
    extraLarge?: string | null;
    large?: string | null;
    color?: string | null;
  };
  bannerImage?: string | null;
  siteUrl: string;
  genres: string[];
  description?: string | null;
  // Anime-only:
  episodes: number | null;
  season?: string | null;        // "SPRING" | "SUMMER" | "FALL" | "WINTER"
  seasonYear?: number | null;
  // Manga-only (null on anime, populated on manga queries):
  chapters?: number | null;
  volumes?: number | null;
  status?: string | null;
};

export type AnilistCharacter = {
  id: number;
  name: { full: string };
  image: { large?: string | null };
  siteUrl: string;
  favourites: number;
  media: { nodes: Array<{ title: { romaji?: string | null; english?: string | null } }> };
};

// ─── Generic GraphQL POST ──────────────────────────────────────────────

async function anilistQuery<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T | null> {
  try {
    const res = await fetch(ANILIST_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ query, variables }),
      // Next's fetch cache — AniList responses are stable enough that
      // hourly revalidation is plenty fresh for "what's hot" data.
      next: { revalidate: CACHE_SECONDS },
    });
    if (!res.ok) {
      console.warn(`[anilist] HTTP ${res.status} on query`);
      return null;
    }
    const json = (await res.json()) as { data?: T; errors?: unknown };
    if (json.errors) {
      console.warn("[anilist] GraphQL errors:", JSON.stringify(json.errors).slice(0, 300));
      return null;
    }
    return json.data ?? null;
  } catch (err) {
    console.warn("[anilist] fetch threw:", err);
    return null;
  }
}

// ─── Public functions ─────────────────────────────────────────────────

const MEDIA_FRAGMENT = `
  id
  title { romaji english }
  averageScore
  meanScore
  popularity
  coverImage { extraLarge large color }
  bannerImage
  siteUrl
  genres
  description(asHtml: false)
  episodes
  season
  seasonYear
  chapters
  volumes
  status
`;

/** Top trending anime currently airing — drives the "what's everyone
 *  watching this week" section. Trending is AniList's own "buzzed-about
 *  right now" sort, which weighs recent activity higher than raw score. */
export async function fetchTrendingAiringAnime(limit = 5): Promise<AnilistMedia[]> {
  const data = await anilistQuery<{ Page: { media: AnilistMedia[] } }>(
    `query ($perPage: Int!) {
       Page(perPage: $perPage) {
         media(type: ANIME, sort: TRENDING_DESC, status: RELEASING) {
           ${MEDIA_FRAGMENT}
         }
       }
     }`,
    { perPage: limit }
  );
  return data?.Page.media ?? [];
}

/** Highly-rated anime that haven't aired yet — drives the "coming soon"
 *  section. Sorted by popularity so we surface buzz, not obscure picks. */
export async function fetchUpcomingAnime(limit = 6): Promise<AnilistMedia[]> {
  const data = await anilistQuery<{ Page: { media: AnilistMedia[] } }>(
    `query ($perPage: Int!) {
       Page(perPage: $perPage) {
         media(type: ANIME, sort: POPULARITY_DESC, status: NOT_YET_RELEASED) {
           ${MEDIA_FRAGMENT}
         }
       }
     }`,
    { perPage: limit }
  );
  return data?.Page.media ?? [];
}

/** Currently-serializing manga sorted by AniList's real-time trending
 *  signal — drives the "Manga Updates" section. We include HIATUS in
 *  the status filter so flagships like Hunter x Hunter / Berserk / etc.
 *  on temporary breaks aren't excluded just because the author is
 *  catching their breath. */
export async function fetchTrendingManga(limit = 6): Promise<AnilistMedia[]> {
  const data = await anilistQuery<{ Page: { media: AnilistMedia[] } }>(
    `query ($perPage: Int!) {
       Page(perPage: $perPage) {
         media(type: MANGA, sort: TRENDING_DESC, status_in: [RELEASING, HIATUS]) {
           ${MEDIA_FRAGMENT}
         }
       }
     }`,
    { perPage: limit }
  );
  return data?.Page.media ?? [];
}

/** Most-favorited characters across all of anime. This is a stable-ish
 *  list (changes slowly) — Gojo, Levi, etc. tend to stay near the top.
 *  Not "trending right now" but "the characters every anime fan knows". */
export async function fetchTopCharacters(limit = 8): Promise<AnilistCharacter[]> {
  const data = await anilistQuery<{ Page: { characters: AnilistCharacter[] } }>(
    `query ($perPage: Int!) {
       Page(perPage: $perPage) {
         characters(sort: FAVOURITES_DESC) {
           id
           name { full }
           image { large }
           siteUrl
           favourites
           media(perPage: 1, sort: POPULARITY_DESC) {
             nodes { title { romaji english } }
           }
         }
       }
     }`,
    { perPage: limit }
  );
  return data?.Page.characters ?? [];
}

// ─── Display helpers ───────────────────────────────────────────────────

/** Prefer English title when available — most of our visitors will
 *  recognize it. Falls back to romaji. */
export function displayTitle(t: { romaji?: string | null; english?: string | null }): string {
  return (t.english?.trim() || t.romaji?.trim() || "Untitled").trim();
}

/** AniList descriptions can contain HTML tags + <br> linebreaks even
 *  when asHtml:false — strip them, then take the first sentence or
 *  ~180 chars whichever comes first. */
export function shortDescription(raw: string | null | undefined, max = 200): string {
  if (!raw) return "";
  const stripped = raw
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped.length <= max) return stripped;
  // Cut at the last sentence boundary within `max` if possible.
  const slice = stripped.slice(0, max);
  const lastDot = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("! "), slice.lastIndexOf("? "));
  if (lastDot > max * 0.5) return slice.slice(0, lastDot + 1);
  return slice.trimEnd() + "…";
}

/** Format a season + year ("Summer 2026"). */
export function formatSeason(season: string | null | undefined, year: number | null | undefined): string {
  if (!season || !year) return "";
  const pretty = season.charAt(0) + season.slice(1).toLowerCase();
  return `${pretty} ${year}`;
}
