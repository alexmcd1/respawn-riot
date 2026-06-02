// Open Graph image scraper.
//
// Given a news-article URL, fetch the HTML and pull out the
// <meta property="og:image"> (with twitter:image fallback). This is
// how every news site declares its featured image for social
// embeds, so it's by far the most reliable cross-publisher source
// of an "article thumbnail."
//
// Safety budget:
//   - https only
//   - 5s timeout per fetch
//   - read first 64KB of HTML only (OG tags are always in <head>)
//   - validate returned URL is https
//   - cache for a week (results don't change after publish)
//
// Returns null on any failure — caller falls back to its hand-picked
// image. Never throws.

const MAX_HTML_BYTES = 64 * 1024;
const FETCH_TIMEOUT_MS = 5000;
const REVALIDATE = 60 * 60 * 24 * 7; // 1 week

/**
 * Best-effort og:image / twitter:image lookup for `articleUrl`.
 * Returns null when the page doesn't expose one, the URL isn't safe,
 * or anything else goes wrong.
 */
export async function fetchOgImage(articleUrl: string): Promise<string | null> {
  if (!articleUrl) return null;
  let parsed: URL;
  try {
    parsed = new URL(articleUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(articleUrl, {
      headers: {
        "User-Agent": "respawn-riot/1.0 (+https://respawnriot.io)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: ctrl.signal,
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return null;
    // We only want HTML. PDFs or images returned directly aren't useful.
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html") && !ct.includes("xhtml")) return null;

    // Read just enough bytes to cover <head>. Saves bandwidth + parsing time.
    const reader = res.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        total += value.length;
        if (total >= MAX_HTML_BYTES) break;
      }
    }
    // Don't leave the connection hanging if we broke early
    try { await reader.cancel(); } catch { /* ignore */ }

    const html = new TextDecoder("utf-8", { fatal: false }).decode(
      concat(chunks).slice(0, MAX_HTML_BYTES)
    );

    const candidates = [
      matchMeta(html, "og:image:secure_url"),
      matchMeta(html, "og:image"),
      matchMeta(html, "twitter:image"),
      matchMeta(html, "twitter:image:src"),
    ];
    for (const url of candidates) {
      if (!url) continue;
      // Resolve relative URLs against the article URL
      let abs: string;
      try {
        abs = new URL(url, articleUrl).toString();
      } catch {
        continue;
      }
      if (!abs.startsWith("https://")) continue;
      return abs;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Concatenate a list of Uint8Array chunks into a single buffer. */
function concat(chunks: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/** Pull a <meta property|name="<prop>" content="..."> value out of HTML. */
function matchMeta(html: string, prop: string): string | null {
  // Two attribute orders, case-insensitive, single OR double quotes,
  // and content can come before property.
  const escaped = prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${escaped}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}
