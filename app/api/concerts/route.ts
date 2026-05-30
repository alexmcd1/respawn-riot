import { NextResponse } from "next/server";

// Upcoming-concerts lookup. Same layered pattern as the food APIs:
//
//   1. PRIMARY: Ticketmaster Discovery API if TICKETMASTER_API_KEY is set.
//      Official, free tier 5k requests/day, strong coverage of mid/large
//      venues and festivals.
//   2. FALLBACK: Bandsintown's public events endpoint. No signup — they
//      accept any string for app_id. Stronger coverage of indie/club gigs
//      and DIY tours. Used when Ticketmaster is missing, errors, or 0.
//
// Both providers are normalized into ConcertResult so the UI doesn't
// have to know which fired. The provider tag is returned so the UI can
// show a "via X" badge.

export const dynamic = "force-dynamic";

const UA = "respawn-riot/1.0 (+https://respawnriot.io)";
const TM_BASE = "https://app.ticketmaster.com/discovery/v2/events.json";
// Bandsintown's public endpoint — any app_id string works.
const BIT_APP_ID = "respawn-riot";

type Body = {
  artist?: unknown;     // string — required
  limit?: unknown;      // number, default 12
};

export type ConcertResult = {
  id: string;
  artist: string;
  date: string;             // ISO yyyy-mm-dd
  time?: string;            // HH:MM (24h) when known
  venue: string;
  city: string;
  region?: string;
  country?: string;
  ticketUrl?: string;
  source: "ticketmaster" | "bandsintown";
};

// ─── Provider 1: Ticketmaster Discovery ──────────────────────────────────

type TMVenue = {
  name?: string;
  city?: { name?: string };
  state?: { stateCode?: string; name?: string };
  country?: { countryCode?: string; name?: string };
};

type TMEvent = {
  id: string;
  name: string;
  url?: string;
  dates?: {
    start?: { localDate?: string; localTime?: string; dateTime?: string };
  };
  _embedded?: { venues?: TMVenue[]; attractions?: Array<{ name?: string }> };
};

async function ticketmasterSearch(
  artist: string,
  limit: number
): Promise<ConcertResult[] | null> {
  const key = process.env.TICKETMASTER_API_KEY;
  if (!key) {
    // Log explicitly so a missing/misnamed env var is visible in Vercel
    // logs (otherwise the route just silently falls back to Bandsintown
    // with no breadcrumb).
    console.warn(
      "[concerts] TICKETMASTER_API_KEY is missing — env var not set, " +
      "wrong name, or set on a different environment than this deploy. " +
      `(NODE_ENV=${process.env.NODE_ENV}, VERCEL_ENV=${process.env.VERCEL_ENV ?? "n/a"})`
    );
    return null;
  }

  const params = new URLSearchParams({
    apikey: key,
    keyword: artist,
    classificationName: "music",
    size: String(Math.min(50, Math.max(1, limit))),
    sort: "date,asc",
  });

  try {
    const res = await fetch(`${TM_BASE}?${params}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[concerts] Ticketmaster HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json()) as {
      _embedded?: { events?: TMEvent[] };
    };
    const events = data._embedded?.events ?? [];
    console.log(
      `[concerts] Ticketmaster OK — artist="${artist}" returned ${events.length} events`
    );
    if (events.length === 0) return null;

    const out: ConcertResult[] = [];
    const seen = new Set<string>(); // dedup repeated dates with multi-listings
    for (const e of events) {
      const v = e._embedded?.venues?.[0];
      const date = e.dates?.start?.localDate;
      if (!v || !date) continue;
      const venue = v.name ?? "TBA";
      const city = v.city?.name ?? "";
      const key = `${date}|${venue}|${city}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      // Ticketmaster's `name` often includes both the artist and a tour
      // name. Prefer the first attraction name when present (cleaner).
      const artistName =
        e._embedded?.attractions?.[0]?.name?.trim() || artist;
      out.push({
        id: `tm/${e.id}`,
        artist: artistName,
        date,
        time: e.dates?.start?.localTime?.slice(0, 5),
        venue,
        city,
        region: v.state?.stateCode || v.state?.name,
        country: v.country?.countryCode || v.country?.name,
        ticketUrl: e.url,
        source: "ticketmaster",
      });
    }
    return out;
  } catch (err) {
    console.warn("[concerts] Ticketmaster fetch failed:", err);
    return null;
  }
}

// ─── Provider 2: Bandsintown (public, no key) ────────────────────────────

type BITEvent = {
  id?: string | number;
  datetime?: string;
  offers?: Array<{ url?: string; type?: string }>;
  url?: string;
  venue?: {
    name?: string;
    city?: string;
    region?: string;
    country?: string;
  };
  lineup?: string[];
};

// Returns null if the provider was unreachable (so the caller can
// distinguish "no shows" from "couldn't reach Bandsintown"). Returns
// [] only when the call succeeded but the artist genuinely has no
// upcoming dates.
async function bandsintownSearch(
  artist: string,
  limit: number
): Promise<ConcertResult[] | null> {
  // Bandsintown URL-encodes the name and treats "/" specially.
  const safe = encodeURIComponent(artist.trim()).replace(/%2F/g, "%252F");
  const url = `https://rest.bandsintown.com/artists/${safe}/events?app_id=${BIT_APP_ID}&date=upcoming`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      // 403 = Bandsintown blocked our app_id (they tightened the public
      // endpoint). Return null so the route knows the provider didn't
      // produce real data.
      console.warn(`[concerts] Bandsintown HTTP ${res.status} for "${artist}"`);
      return null;
    }
    const data = (await res.json()) as BITEvent[] | { errors?: string[] };
    const events = Array.isArray(data) ? data : [];
    console.log(
      `[concerts] Bandsintown OK — artist="${artist}" returned ${events.length} events`
    );

    const out: ConcertResult[] = [];
    for (const e of events) {
      const dt = e.datetime;
      const v = e.venue;
      if (!dt || !v?.name) continue;
      const date = dt.slice(0, 10);
      const time = dt.length >= 16 ? dt.slice(11, 16) : undefined;
      const tickets =
        e.offers?.find((o) => o.type?.toLowerCase() === "tickets")?.url ??
        e.offers?.[0]?.url ??
        e.url;
      out.push({
        id: `bit/${e.id ?? `${date}-${v.name}`}`,
        artist: e.lineup?.[0] ?? artist,
        date,
        time,
        venue: v.name,
        city: v.city ?? "",
        region: v.region,
        country: v.country,
        ticketUrl: tickets,
        source: "bandsintown",
      });
      if (out.length >= limit) break;
    }
    return out;
  } catch (err) {
    console.warn("[concerts] Bandsintown fetch failed:", err);
    return null;
  }
}

// ─── Route handler ────────────────────────────────────────────────────────

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request" },
      { status: 400 }
    );
  }

  const artist = typeof body.artist === "string" ? body.artist.trim() : "";
  if (!artist) {
    return NextResponse.json(
      { ok: false, error: "Need an artist name" },
      { status: 400 }
    );
  }
  const limit = Math.min(
    Math.max(typeof body.limit === "number" ? body.limit : 12, 1),
    30
  );

  // Try Ticketmaster first.
  //   null      → no key / API error → fall back to Bandsintown
  //   []        → API worked, no dates → still try Bandsintown in case
  //                it has better coverage for indie/club gigs
  //   [results] → done
  const tmResults = await ticketmasterSearch(artist, limit);
  let results: ConcertResult[] = tmResults ?? [];
  let source:
    | "ticketmaster"
    | "bandsintown"
    | "bandsintown-fallback"
    | "none" = "ticketmaster";

  if (results.length === 0) {
    source = tmResults === null ? "bandsintown-fallback" : "bandsintown";
    const bitResults = await bandsintownSearch(artist, limit);
    if (bitResults === null) {
      // Both providers failed (no Ticketmaster key + Bandsintown blocked).
      // Be honest with the UI so it can show "no providers configured"
      // instead of "this band isn't touring".
      source = "none";
      results = [];
    } else {
      results = bitResults;
    }
  }

  return NextResponse.json({
    ok: true,
    source,
    artist,
    count: results.length,
    results,
  });
}
