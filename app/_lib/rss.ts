// Tiny RSS / Atom fetcher for the news sections.
//
// - Server-only. Imported by server components.
// - Caches each feed for 1 hour via Next.js revalidate, so visits don't
//   hammer the source and the page auto-refreshes its news every hour.
// - Fails open: a dead feed returns [] instead of throwing, so the rest
//   of the page renders fine.
// - Regex-based parser intentionally simple. It handles the mainstream
//   RSS 2.0 + Atom shapes used by all the feeds we wire up. If we ever
//   need to support weirder feeds (with namespaces, embedded HTML in
//   titles, etc.) swap to fast-xml-parser.

const REVALIDATE_SECONDS = 3600;

export type Feed = {
  url: string;
  source: string; // display name shown in the badge (e.g. "WDWMagic")
};

export type NewsItem = {
  title: string;
  link: string;
  source: string;
  pubDate?: string; // ISO 8601 if parseable
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
    .replace(/&amp;/g, "&");
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, "").trim();
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
    const title = stripTags(decodeHtmlEntities(titleRaw)).trim();
    const link = decodeHtmlEntities(linkRaw).trim();
    if (title && link) {
      items.push({ title, link, source, pubDate: toIso(pubRaw) });
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
      const title = stripTags(decodeHtmlEntities(titleRaw)).trim();
      if (title && link) {
        items.push({
          title,
          link: decodeHtmlEntities(link).trim(),
          source,
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
  perFeedMax = 8
): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "respawn-riot/1.0 (+https://respawnriot.io)",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseFeed(xml, source).slice(0, perFeedMax);
  } catch {
    return [];
  }
}

export async function fetchManyRss(
  feeds: Feed[],
  perFeedMax = 6,
  totalMax = 9
): Promise<NewsItem[]> {
  const results = await Promise.all(
    feeds.map((f) => fetchRss(f.url, f.source, perFeedMax))
  );
  const flat = results.flat();
  // Sort newest first (items without pubDate fall to the end)
  flat.sort((a, b) => {
    if (!a.pubDate && !b.pubDate) return 0;
    if (!a.pubDate) return 1;
    if (!b.pubDate) return -1;
    return b.pubDate.localeCompare(a.pubDate);
  });
  // De-dupe by title (sites often republish similar headlines)
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const item of flat) {
    const key = item.title.toLowerCase().slice(0, 120);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= totalMax) break;
  }
  return out;
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
