// Tiny RSS / Atom fetcher for the news sections.
//
// - Server-only. Imported by server components.
// - Per-call revalidate so each section can pick its own freshness
//   (1 hour for headline streams, 1 week for per-band searches).
// - Fails open: a dead feed returns [] instead of throwing, so the
//   rest of the page renders fine.
// - Primary/fallback support: fetchManyRss optionally accepts a
//   fallback list and switches if the primaries return too few items.
// - Regex-based parser intentionally simple. Handles the mainstream
//   RSS 2.0 + Atom shapes used by every feed we wire up. Swap to
//   fast-xml-parser if we ever need to support weirder feeds.

const HOUR = 3600;
export const REVALIDATE_HOURLY = HOUR;
export const REVALIDATE_DAILY = 24 * HOUR;
export const REVALIDATE_WEEKLY = 7 * 24 * HOUR;

export type Feed = {
  url: string;
  source: string; // display name shown in the badge (e.g. "WDWMagic")
};

export type NewsItem = {
  title: string;
  link: string;
  source: string;          // our label
  publisher?: string;      // <source> text (Google News fills this)
  description?: string;    // plaintext, truncated
  pubDate?: string;        // ISO 8601 if parseable
};

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&hellip;/g, "…")
    .replace(/&amp;/g, "&");
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function toIso(d: string | undefined): string | undefined {
  if (!d) return undefined;
  const t = Date.parse(d);
  if (isNaN(t)) return undefined;
  return new Date(t).toISOString();
}

function parseFeed(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];

  // RSS 2.0 (also covers most "RDF" feeds since they use <item>)
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const titleRaw = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
    const linkRaw =
      block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ??
      block.match(/<link[^>]*\bhref="([^"]+)"/i)?.[1] ??
      "";
    const pubRaw = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1];
    const descRaw = block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1];
    const sourceRaw = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1];
    const title = stripTags(decodeHtmlEntities(titleRaw)).trim();
    const link = decodeHtmlEntities(linkRaw).trim();
    if (title && link) {
      const desc = descRaw ? stripTags(decodeHtmlEntities(descRaw)).slice(0, 220) : undefined;
      const publisher = sourceRaw ? stripTags(decodeHtmlEntities(sourceRaw)) : undefined;
      items.push({
        title,
        link,
        source,
        publisher: publisher && publisher.length > 0 ? publisher : undefined,
        description: desc && desc.length > 0 ? desc : undefined,
        pubDate: toIso(pubRaw),
      });
    }
  }

  // Atom <entry> (only if RSS items returned nothing)
  if (items.length === 0) {
    const entryRe = /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi;
    while ((m = entryRe.exec(xml)) !== null) {
      const block = m[1];
      const titleRaw =
        block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
      // Atom: prefer rel="alternate" link, fall back to first href
      const link =
        block.match(
          /<link[^>]*\brel=["']alternate["'][^>]*\bhref=["']([^"']+)["']/i
        )?.[1] ??
        block.match(/<link[^>]*\bhref=["']([^"']+)["']/i)?.[1] ??
        "";
      const pubRaw =
        block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1] ??
        block.match(/<published[^>]*>([\s\S]*?)<\/published>/i)?.[1];
      const descRaw =
        block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1] ??
        block.match(/<content[^>]*>([\s\S]*?)<\/content>/i)?.[1];
      const title = stripTags(decodeHtmlEntities(titleRaw)).trim();
      if (title && link) {
        items.push({
          title,
          link: decodeHtmlEntities(link).trim(),
          source,
          description: descRaw ? stripTags(decodeHtmlEntities(descRaw)).slice(0, 220) : undefined,
          pubDate: toIso(pubRaw),
        });
      }
    }
  }

  return items;
}

export async function fetchRss(
  url: string,
  source: string,
  perFeedMax = 8,
  revalidate = REVALIDATE_HOURLY
): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "respawn-riot/1.0 (+https://respawnriot.io)",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      next: { revalidate },
    });
    if (!res.ok) {
      console.warn(`[rss] ${source} returned HTTP ${res.status}: ${url}`);
      return [];
    }
    const xml = await res.text();
    const items = parseFeed(xml, source).slice(0, perFeedMax);
    if (items.length === 0) {
      console.warn(`[rss] ${source} returned 0 parseable items: ${url}`);
    }
    return items;
  } catch (err) {
    console.warn(`[rss] ${source} fetch failed: ${url}`, err);
    return [];
  }
}

type FetchManyOptions = {
  perFeedMax?: number;
  totalMax?: number;
  revalidate?: number;
  /** If primary feeds return fewer than this, fallbacks are tried. */
  minBeforeFallback?: number;
  fallbacks?: Feed[];
};

export async function fetchManyRss(
  feeds: Feed[],
  opts: FetchManyOptions = {}
): Promise<NewsItem[]> {
  const {
    perFeedMax = 6,
    totalMax = 9,
    revalidate = REVALIDATE_HOURLY,
    minBeforeFallback = 3,
    fallbacks = [],
  } = opts;

  const dedupeSort = (items: NewsItem[]) => {
    items.sort((a, b) => {
      if (!a.pubDate && !b.pubDate) return 0;
      if (!a.pubDate) return 1;
      if (!b.pubDate) return -1;
      return b.pubDate.localeCompare(a.pubDate);
    });
    const seen = new Set<string>();
    const out: NewsItem[] = [];
    for (const item of items) {
      const key = item.title.toLowerCase().slice(0, 120);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
      if (out.length >= totalMax) break;
    }
    return out;
  };

  const primary = await Promise.all(
    feeds.map((f) => fetchRss(f.url, f.source, perFeedMax, revalidate))
  );
  let merged = dedupeSort(primary.flat());

  if (merged.length < minBeforeFallback && fallbacks.length > 0) {
    console.warn(
      `[rss] only ${merged.length} primary items (need ${minBeforeFallback}); trying ${fallbacks.length} fallback(s)`
    );
    const fb = await Promise.all(
      fallbacks.map((f) => fetchRss(f.url, f.source, perFeedMax, revalidate))
    );
    merged = dedupeSort([...primary.flat(), ...fb.flat()]);
  }

  return merged;
}

/**
 * Build a Google News RSS search URL.
 * Returns the FIRST result for the query, or null. Cache: 1 week.
 */
export async function fetchTopGoogleNews(
  query: string,
  revalidate = REVALIDATE_WEEKLY
): Promise<NewsItem | null> {
  const params = new URLSearchParams({
    q: query,
    hl: "en-US",
    gl: "US",
    ceid: "US:en",
  });
  const url = `https://news.google.com/rss/search?${params.toString()}`;
  const items = await fetchRss(url, "Google News", 5, revalidate);
  return items[0] ?? null;
}

export function formatRelative(iso: string | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (isNaN(t)) return null;
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
