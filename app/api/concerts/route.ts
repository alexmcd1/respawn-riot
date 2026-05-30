import { NextResponse } from "next/server";

// Upcoming-concerts lookup. Same layered pattern as the food APIs:
//
//   1. PRIMARY: Ticketmaster Discovery API if TICKETMASTER_API_KEY is set.
//      Official, free tier 5k requests/day, strong coverage of mid/large
//      venues and festivals.
//   2. FALLBACK: Bandsintown's public events endpoint. No signup — they
//      accept any string for app_id. Stronger coverage of indie/club gigs
//      and DIY tours. Used only for the single-artist "no cities filter"
//      path because Bandsintown doesn't expose multi-city filtering.
//
// Both providers are normalized into ConcertResult so the UI doesn't
// have to know which fired. The provider tag is returned so the UI can
// show a "via X" badge.
//
// New filter knobs (all optional):
//   - cities[]       — fan out a parallel TM call per city, merge results
//   - genre          — classificationName (Rock, Pop, Hip-Hop, etc)
//   - startDate/end  — yyyy-mm-dd (we add the time component for TM)
//   - size           — TM page size, up to 200
//   - page           — TM page number, 0-indexed
//
// Multi-city is "fan out + merge" because Ticketmaster's `city` param
// is documented as single-value. Doing N parallel calls is simpler and
// works regardless of any quiet API quirks.

export const dynamic = "force-dynamic";

const UA = "respawn-riot/1.0 (+https://respawnriot.io)";
const TM_BASE = "https://app.ticketmaster.com/discovery/v2/events.json";
const BIT_APP_ID = "respawn-riot";

type Body = {
  artist?: unknown;            // string
  cities?: unknown;            // string[]
  genre?: unknown;             // string (TM classificationName)
  startDate?: unknown;         // yyyy-mm-dd
  endDate?: unknown;           // yyyy-mm-dd
  size?: unknown;              // page size per city, default 50, max 200
  page?: unknown;              // page number, 0-indexed, default 0
  limit?: unknown;             // legacy single-artist limit; ignored when cities present
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
  genre?: string;           // TM classification, when known
  source: "ticketmaster" | "bandsintown";
};

// ─── Provider 1: Ticketmaster Discovery ──────────────────────────────────

type TMVenue = {
  name?: string;
  city?: { name?: string };
  state?: { stateCode?: string; name?: string };
  country?: { countryCode?: string; name?: string };
};

type TMClassification = {
  segment?: { name?: string };
  genre?: { name?: string };
  subGenre?: { name?: string };
};

type TMEvent = {
  id: string;
  name: string;
  url?: string;
  dates?: {
    start?: { localDate?: string; localTime?: string; dateTime?: string };
  };
  classifications?: TMClassification[];
  _embedded?: { venues?: TMVenue[]; attractions?: Array<{ name?: string }> };
};

type TMResponse = {
  _embedded?: { events?: TMEvent[] };
  page?: { size?: number; totalElements?: number; totalPages?: number; number?: number };
};

// Single Ticketmaster call. Returns events + the page metadata.
// We pass any filter param defined by the caller — keyword (artist),
// city (single — caller fans out per city), classificationName (genre),
// startDateTime / endDateTime, size, page.
async function ticketmasterCall(args: {
  apiKey: string;
  keyword?: string;
  city?: string;
  classificationName?: string;
  startDateTime?: string;
  endDateTime?: string;
  size: number;
  page: number;
}): Promise<{ events: ConcertResult[]; totalPages: number } | null> {
  const params = new URLSearchParams({
    apikey: args.apiKey,
    classificationName: args.classificationName ?? "music",
    size: String(Math.min(200, Math.max(1, args.size))),
    page: String(Math.max(0, args.page)),
    sort: "date,asc",
  });
  if (args.keyword) params.set("keyword", args.keyword);
  if (args.city) params.set("city", args.city);
  if (args.startDateTime) params.set("startDateTime", args.startDateTime);
  if (args.endDateTime) params.set("endDateTime", args.endDateTime);

  try {
    const res = await fetch(`${TM_BASE}?${params}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "<no body>");
      console.warn(
        `[concerts] Ticketmaster HTTP ${res.status} — body: ${body.slice(0, 300)}`
      );
      return null;
    }
    const data = (await res.json()) as TMResponse;
    const raw = data._embedded?.events ?? [];
    const totalPages = data.page?.totalPages ?? 0;
    console.log(
      `[concerts] Ticketmaster OK — keyword="${args.keyword ?? ""}" city="${args.city ?? ""}" genre="${args.classificationName ?? "music"}" page=${args.page} got=${raw.length}/${totalPages}p`
    );

    const out: ConcertResult[] = [];
    const seen = new Set<string>();
    for (const e of raw) {
      const v = e._embedded?.venues?.[0];
      const date = e.dates?.start?.localDate;
      if (!v || !date) continue;
      const venue = v.name ?? "TBA";
      const city = v.city?.name ?? "";
      const dedupKey = `${date}|${venue}|${city}`.toLowerCase();
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);
      const artistName =
        e._embedded?.attractions?.[0]?.name?.trim() ||
        args.keyword ||
        e.name ||
        "TBA";
      const c0 = e.classifications?.[0];
      const genre = c0?.genre?.name && c0.genre.name !== "Undefined"
        ? c0.genre.name
        : c0?.segment?.name;
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
        genre,
        source: "ticketmaster",
      });
    }
    return { events: out, totalPages };
  } catch (err) {
    console.warn("[concerts] Ticketmaster fetch failed:", err);
    return null;
  }
}

// ─── Provider 2: Bandsintown (single-artist, no key) ─────────────────────

type BITEvent = {
  id?: string | number;
  datetime?: string;
  offers?: Array<{ url?: string; type?: string }>;
  url?: string;
  venue?: { name?: string; city?: string; region?: string; country?: string };
  lineup?: string[];
};

async function bandsintownSearch(
  artist: string,
  limit: number
): Promise<ConcertResult[] | null> {
  const safe = encodeURIComponent(artist.trim()).replace(/%2F/g, "%252F");
  const url = `https://rest.bandsintown.com/artists/${safe}/events?app_id=${BIT_APP_ID}&date=upcoming`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
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

// ─── Helpers ─────────────────────────────────────────────────────────────

function normStrings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Validate yyyy-mm-dd and return a full ISO 8601 in UTC at start/end of day,
// or undefined if the input is invalid/missing. TM rejects malformed dates.
function toTMDateTime(date: unknown, end: boolean): string | undefined {
  if (typeof date !== "string") return undefined;
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return undefined;
  return end ? `${date}T23:59:59Z` : `${date}T00:00:00Z`;
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
  const cities = normStrings(body.cities);
  const genre = typeof body.genre === "string" ? body.genre.trim() : "";
  const startDateTime = toTMDateTime(body.startDate, false);
  const endDateTime = toTMDateTime(body.endDate, true);
  const size = Math.min(
    Math.max(typeof body.size === "number" ? body.size : 50, 1),
    200
  );
  const page = Math.max(typeof body.page === "number" ? body.page : 0, 0);

  // Caller must pass SOMETHING to filter on, otherwise we'd return the
  // entire Ticketmaster catalog
  if (!artist && !genre) {
    return NextResponse.json(
      { ok: false, error: "Pick an artist or a genre" },
      { status: 400 }
    );
  }

  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    console.warn(
      "[concerts] TICKETMASTER_API_KEY is missing — env var not set, " +
      "wrong name, or set on a different environment than this deploy. " +
      `(NODE_ENV=${process.env.NODE_ENV}, VERCEL_ENV=${process.env.VERCEL_ENV ?? "n/a"})`
    );

    // Single-artist + no cities → can still try Bandsintown as a courtesy.
    // Anything with cities or a genre filter needs Ticketmaster.
    if (artist && cities.length === 0 && !genre) {
      const limit = Math.min(
        Math.max(typeof body.limit === "number" ? body.limit : 30, 1),
        50
      );
      const bit = await bandsintownSearch(artist, limit);
      if (bit === null) {
        return NextResponse.json({
          ok: true,
          source: "none",
          count: 0,
          totalPages: 0,
          page: 0,
          results: [],
        });
      }
      return NextResponse.json({
        ok: true,
        source: bit.length > 0 ? "bandsintown-fallback" : "none",
        count: bit.length,
        totalPages: 1,
        page: 0,
        results: bit,
      });
    }

    return NextResponse.json({
      ok: true,
      source: "none",
      count: 0,
      totalPages: 0,
      page: 0,
      results: [],
    });
  }

  // ── Ticketmaster path ────────────────────────────────────────────────

  const classificationName = genre || (artist ? "music" : "music");

  // Build the list of city calls. No cities → single call without a city
  // filter (national search).
  const cityList = cities.length > 0 ? cities : [undefined];
  const callArgs = cityList.map((city) => ({
    apiKey,
    keyword: artist || undefined,
    city,
    classificationName,
    startDateTime,
    endDateTime,
    size,
    page,
  }));

  const responses = await Promise.all(callArgs.map(ticketmasterCall));

  // Merge + dedupe across cities (same event can appear in adjacent metros)
  const merged: ConcertResult[] = [];
  const seenIds = new Set<string>();
  let maxTotalPages = 0;
  let anyFailed = false;
  for (const r of responses) {
    if (r === null) { anyFailed = true; continue; }
    if (r.totalPages > maxTotalPages) maxTotalPages = r.totalPages;
    for (const ev of r.events) {
      const k = `${ev.date}|${ev.venue.toLowerCase()}|${ev.city.toLowerCase()}`;
      if (seenIds.has(k)) continue;
      seenIds.add(k);
      merged.push(ev);
    }
  }
  merged.sort((a, b) => a.date.localeCompare(b.date));

  // If TM was reachable but every city returned 0 AND we're doing a
  // single-artist national search (no cities, no genre), try Bandsintown.
  if (
    merged.length === 0 &&
    !anyFailed &&
    artist &&
    cities.length === 0 &&
    !genre
  ) {
    const bit = await bandsintownSearch(artist, 30);
    if (bit && bit.length > 0) {
      return NextResponse.json({
        ok: true,
        source: "bandsintown",
        count: bit.length,
        totalPages: 1,
        page: 0,
        results: bit,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    source: "ticketmaster",
    count: merged.length,
    totalPages: maxTotalPages,
    page,
    results: merged,
  });
}
