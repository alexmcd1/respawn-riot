// Spotify Web API — fetch high-res, auto-current artist photos.
//
// Uses the Client Credentials flow (no user auth) so we can hit the
// public artist endpoint server-side. Two env vars required:
//
//   SPOTIFY_CLIENT_ID
//   SPOTIFY_CLIENT_SECRET
//
// Both come from a free app you register at developer.spotify.com.
// When NOT configured, fetchArtistImage() returns null and callers
// fall back to their hand-picked Wikipedia URLs — the page still
// works, just less fresh.
//
// Results are cached per (artist name) via Next's fetch revalidate.
// Token cached in-process for its lifetime (~1h).

const ARTIST_IMAGE_REVALIDATE = 60 * 60 * 24 * 7; // 1 week
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const SEARCH_URL = "https://api.spotify.com/v1/search";

let _cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return null;

  // Reuse a still-valid token. Token usually lives 3600s; we expire it
  // a minute early so a request never sails into a freshly-expired token.
  const now = Date.now();
  if (_cachedToken && _cachedToken.expiresAt > now + 60_000) {
    return _cachedToken.value;
  }

  try {
    const basic = Buffer.from(`${id}:${secret}`).toString("base64");
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      // Spotify rotates tokens — DO NOT use Next's static cache for this
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[spotify] token request HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;
    _cachedToken = {
      value: data.access_token,
      expiresAt: now + (data.expires_in ?? 3600) * 1000,
    };
    return _cachedToken.value;
  } catch (err) {
    console.warn("[spotify] token fetch threw:", err);
    return null;
  }
}

/**
 * Best-match artist image URL for `name`, or null if not configured or
 * the search misses. The first image Spotify returns is always the
 * largest (typically 640x640).
 *
 * Cached for a week via Next's HTTP fetch cache (the search call's URL
 * is stable for a given artist + market).
 */
export async function fetchArtistImage(name: string): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const params = new URLSearchParams({
      q: name,
      type: "artist",
      limit: "1",
      market: "US",
    });
    const res = await fetch(`${SEARCH_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: ARTIST_IMAGE_REVALIDATE },
    });
    if (!res.ok) {
      // 401 means our cached token is bad — drop it so the next call
      // re-mints. We don't retry within this call to avoid loops.
      if (res.status === 401) _cachedToken = null;
      console.warn(`[spotify] search ${name} → HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json()) as {
      artists?: { items?: Array<{ name: string; images?: Array<{ url: string }> }> };
    };
    const first = data.artists?.items?.[0];
    if (!first) return null;
    // Spotify returns images sorted largest-first.
    const img = first.images?.[0]?.url;
    if (!img || !img.startsWith("https://")) return null;
    return img;
  } catch (err) {
    console.warn(`[spotify] search ${name} threw:`, err);
    return null;
  }
}

/** Whether Spotify credentials are configured. Lets pages render a
 *  small "configure Spotify for fresher art" hint when missing. */
export function isSpotifyConfigured(): boolean {
  return !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}
