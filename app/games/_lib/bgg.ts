// BoardGameGeek "hot games" fetcher with a curated fallback that
// always fires when BGG can't be reached.
//
// BGG publishes their currently-hot top-50 board games via a free,
// no-auth XML endpoint at xmlapi2/hot?type=boardgame. It's mostly
// reliable, but:
//   - their server 503s under load
//   - some requests come back with HTTP 200 + a "request queued"
//     XML body instead of game data
//   - Vercel edge fetches occasionally time out before BGG responds
//   - their WAF 403s some requests with missing User-Agents
//
// fetchBggHotWithFallback handles all of these and falls back to a
// hand-curated list (TABLETOP_FALLBACK, imported statically — using
// dynamic import here was the original cause of "tabletop never
// loads", since Next.js's static page generation doesn't reliably
// resolve `await import` inside server components, so the empty
// result was getting baked into the page and locked behind the
// daily revalidate).

import { TABLETOP_FALLBACK } from "./tabletopFallback";

const BGG_HOT_URL = "https://boardgamegeek.com/xmlapi2/hot?type=boardgame";
const CACHE_SECONDS = 60 * 60 * 4;     // 4h — the BGG hot list moves slowly
const FETCH_TIMEOUT_MS = 8_000;        // give BGG 8s before we give up

export type BggHotGame = {
  id: string;
  rank: number;
  name: string;
  yearPublished?: number;
  thumbnail?: string;
  /** Direct link to the BGG game page. */
  url: string;
};

// BGG's response is XML — small and predictable enough that a few
// regexes are a much smaller dependency than pulling in xml2js.
function parseBggHot(xml: string): BggHotGame[] {
  const items: BggHotGame[] = [];
  const itemRe = /<item\b([^>]*)>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const attrs = m[1];
    const body = m[2];
    const id = attrs.match(/\bid="(\d+)"/)?.[1];
    const rank = parseInt(attrs.match(/\brank="(\d+)"/)?.[1] ?? "0", 10);
    if (!id || !rank) continue;
    const name = body.match(/<name\s+value="([^"]+)"/)?.[1];
    if (!name) continue;
    const thumbnail = body.match(/<thumbnail\s+value="([^"]+)"/)?.[1];
    const yearRaw = body.match(/<yearpublished\s+value="(\d+)"/)?.[1];
    items.push({
      id,
      rank,
      name: name.replace(/&amp;/g, "&"),
      thumbnail,
      yearPublished: yearRaw ? parseInt(yearRaw, 10) : undefined,
      url: `https://boardgamegeek.com/boardgame/${id}`,
    });
  }
  return items.sort((a, b) => a.rank - b.rank);
}

/** Combined fetcher: tries live BGG first with a hard timeout, falls
 *  back to the curated TABLETOP_FALLBACK list if anything goes wrong.
 *  Always returns at least the fallback — the section can never be
 *  empty under normal operation. */
export async function fetchBggHotWithFallback(
  limit = 8
): Promise<{ games: BggHotGame[]; source: "live" | "fallback" }> {
  const live = await tryLiveBgg(limit);
  if (live && live.length > 0) {
    return { games: live, source: "live" };
  }
  // Belt-and-suspenders log so when this fires you can see why in
  // Vercel function logs (the earlier line will say what failed).
  console.warn(
    `[bgg] live fetch returned no games — falling back to ${TABLETOP_FALLBACK.length} curated entries`
  );
  return { games: TABLETOP_FALLBACK.slice(0, limit), source: "fallback" };
}

async function tryLiveBgg(limit: number): Promise<BggHotGame[] | null> {
  // AbortController with a hard timeout so a slow BGG response can't
  // hold up the page render forever during static generation.
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(BGG_HOT_URL, {
      next: { revalidate: CACHE_SECONDS },
      signal: ctrl.signal,
      headers: {
        accept: "application/xml,text/xml",
        // BGG's WAF 403s some requests without a UA. Identifying as a
        // browser-shaped agent gets us through reliably.
        "user-agent":
          "Mozilla/5.0 (compatible; respawn-riot/1.0; +https://respawnriot.io)",
      },
    });
    if (!res.ok) {
      console.warn(`[bgg] HTTP ${res.status} from ${BGG_HOT_URL}`);
      return null;
    }
    const xml = await res.text();
    // BGG sometimes returns 200 with a "request queued" body. Detect
    // those so we don't try to parse them as game data.
    if (xml.includes("<message>") || xml.includes("Request Throttled")) {
      console.warn("[bgg] response was a throttle/queue notice, not game data");
      return null;
    }
    const parsed = parseBggHot(xml);
    if (parsed.length === 0) {
      console.warn(
        `[bgg] parsed 0 games from ${xml.length} chars of response — XML shape may have changed`
      );
      return null;
    }
    return parsed.slice(0, limit);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      console.warn(`[bgg] fetch aborted after ${FETCH_TIMEOUT_MS}ms`);
    } else {
      console.warn(
        "[bgg] fetch threw:",
        err instanceof Error ? `${err.name}: ${err.message}` : String(err)
      );
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Legacy alias for code that only wants the games array. */
export async function fetchBggHot(limit = 8): Promise<BggHotGame[]> {
  const { games } = await fetchBggHotWithFallback(limit);
  return games;
}
