import { NextResponse } from "next/server";

// In-page restaurant search. Layered strategy:
//
//   1. PRIMARY: Google Places API (New) text search if GOOGLE_PLACES_API_KEY
//      is set. Returns the canonical restaurant data (Google ratings,
//      price level, open/closed, formatted address).
//   2. FALLBACK: OpenStreetMap via Overpass (free, no key). Used when the
//      Google key is missing, Google errors, or Google returns 0 results.
//   3. Zip → coords via Nominatim (same as before, free).
//
// All free-tier APIs send a real User-Agent. Google requires a field mask
// to control cost — we request only fields we'll actually render.

export const dynamic = "force-dynamic";

const UA = "respawn-riot/1.0 (+https://respawnriot.io)";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const OVERPASS = "https://overpass-api.de/api/interpreter";
const GOOGLE_PLACES_TEXT_SEARCH = "https://places.googleapis.com/v1/places:searchText";
const FOOD_AMENITIES = "restaurant|fast_food|cafe|bar|pub|food_court|ice_cream";

type RestaurantResult = {
  id: string;
  name: string;
  cuisine?: string;
  address?: string;
  distanceMeters?: number;
  lat: number;
  lon: number;
  mapsUrl: string;
  // New, optional, Google-only fields (UI shows them when present)
  rating?: number;        // 1.0–5.0
  ratingCount?: number;   // number of Google reviews
  priceLevel?: number;    // 1–4 ($–$$$$)
  openNow?: boolean | null;
  source: "google" | "osm";
};

// ─── Helpers shared by both providers ─────────────────────────────────────

function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

type Body = {
  mode?: "cuisine" | "name";
  query?: string;
  lat?: number;
  lon?: number;
  zip?: string;
  radiusMeters?: number;
  limit?: number;
};

async function geocodeZip(zip: string): Promise<{ lat: number; lon: number } | null> {
  const params = new URLSearchParams({
    postalcode: zip,
    country: "US",
    format: "json",
    limit: "1",
  });
  try {
    const res = await fetch(`${NOMINATIM}?${params}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    const first = data[0];
    if (!first) return null;
    return { lat: parseFloat(first.lat), lon: parseFloat(first.lon) };
  } catch {
    return null;
  }
}

// ─── Provider 1: Google Places API (New) ─────────────────────────────────

type GooglePlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?:
    | "PRICE_LEVEL_FREE"
    | "PRICE_LEVEL_INEXPENSIVE"
    | "PRICE_LEVEL_MODERATE"
    | "PRICE_LEVEL_EXPENSIVE"
    | "PRICE_LEVEL_VERY_EXPENSIVE";
  currentOpeningHours?: { openNow?: boolean };
  primaryTypeDisplayName?: { text?: string };
  googleMapsUri?: string;
};

function priceLevelToNumber(p?: GooglePlace["priceLevel"]): number | undefined {
  if (!p) return undefined;
  switch (p) {
    case "PRICE_LEVEL_FREE": return 0;
    case "PRICE_LEVEL_INEXPENSIVE": return 1;
    case "PRICE_LEVEL_MODERATE": return 2;
    case "PRICE_LEVEL_EXPENSIVE": return 3;
    case "PRICE_LEVEL_VERY_EXPENSIVE": return 4;
    default: return undefined;
  }
}

async function googlePlacesSearch(
  query: string,
  mode: "cuisine" | "name",
  center: { lat: number; lon: number },
  radiusMeters: number,
  limit: number
): Promise<RestaurantResult[] | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;

  // For cuisine mode, append "restaurants" so we bias toward eateries even
  // if the cuisine word is generic (e.g. "Pizza" alone might return shops).
  // For name mode, the user is searching for a specific place — pass as-is.
  const textQuery = mode === "cuisine" ? `${query} restaurants` : query;

  // Field mask — Google charges per field. Only request what we render.
  const fieldMask = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.location",
    "places.rating",
    "places.userRatingCount",
    "places.priceLevel",
    "places.currentOpeningHours",
    "places.primaryTypeDisplayName",
    "places.googleMapsUri",
  ].join(",");

  try {
    const res = await fetch(GOOGLE_PLACES_TEXT_SEARCH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify({
        textQuery,
        maxResultCount: Math.min(20, limit), // Google caps at 20 per call
        locationBias: {
          circle: {
            center: { latitude: center.lat, longitude: center.lon },
            radius: Math.min(radiusMeters, 50000), // Google caps at 50km
          },
        },
      }),
      // Don't cache — Google's "open now" + ratings should be fresh per call
      cache: "no-store",
    });

    if (!res.ok) {
      // Read the body so we can see Google's error message — usually
      // tells us exactly what's wrong (API not enabled, billing missing,
      // key restricted, etc).
      const errText = await res.text().catch(() => "<no body>");
      console.warn(
        `[find-restaurants] Google Places HTTP ${res.status} — body: ${errText.slice(0, 500)}`
      );
      return null;
    }

    const data = (await res.json()) as { places?: GooglePlace[] };
    const places = Array.isArray(data.places) ? data.places : [];
    console.log(
      `[find-restaurants] Google Places OK — query="${textQuery}" returned ${places.length} places`
    );
    if (places.length === 0) return null; // Trigger fallback

    const out: RestaurantResult[] = [];
    for (const p of places) {
      const name = p.displayName?.text;
      const loc = p.location;
      if (!name || !loc) continue;
      out.push({
        id: `g/${p.id}`,
        name,
        cuisine: p.primaryTypeDisplayName?.text
          ?.replace(/_/g, " ")
          .replace(/\b\w/g, (m) => m.toUpperCase()),
        address: p.formattedAddress,
        distanceMeters: haversine(center, { lat: loc.latitude, lon: loc.longitude }),
        lat: loc.latitude,
        lon: loc.longitude,
        mapsUrl: p.googleMapsUri ??
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${p.formattedAddress ?? ""}`.trim())}`,
        rating: typeof p.rating === "number" ? p.rating : undefined,
        ratingCount: typeof p.userRatingCount === "number" ? p.userRatingCount : undefined,
        priceLevel: priceLevelToNumber(p.priceLevel),
        openNow: p.currentOpeningHours?.openNow ?? null,
        source: "google",
      });
    }
    out.sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
    return out.slice(0, limit);
  } catch (err) {
    console.warn("[find-restaurants] Google Places fetch failed:", err);
    return null;
  }
}

// ─── Provider 2: OpenStreetMap (Overpass) — fallback ─────────────────────

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function escapeForOverpass(s: string): string {
  return s.replace(/["\\\n\r]/g, "").trim();
}

async function queryOverpass(
  lat: number,
  lon: number,
  radius: number,
  mode: "cuisine" | "name",
  query: string
): Promise<OverpassElement[]> {
  const safe = escapeForOverpass(query);
  if (!safe) return [];
  const filters =
    mode === "cuisine"
      ? `
    nwr["amenity"~"${FOOD_AMENITIES}"]["cuisine"~"${safe}",i](around:${radius},${lat},${lon});
    nwr["amenity"~"${FOOD_AMENITIES}"]["name"~"${safe}",i](around:${radius},${lat},${lon});
      `.trim()
      : `
    nwr["amenity"~"${FOOD_AMENITIES}"]["name"~"${safe}",i](around:${radius},${lat},${lon});
      `.trim();
  const ql = `[out:json][timeout:25];(${filters});out tags center 60;`;
  try {
    const res = await fetch(OVERPASS, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": UA,
      },
      body: `data=${encodeURIComponent(ql)}`,
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { elements?: OverpassElement[] };
    return Array.isArray(data.elements) ? data.elements : [];
  } catch {
    return [];
  }
}

function formatAddress(tags: Record<string, string>): string | undefined {
  const num = tags["addr:housenumber"];
  const street = tags["addr:street"];
  const city = tags["addr:city"];
  const parts: string[] = [];
  if (num && street) parts.push(`${num} ${street}`);
  else if (street) parts.push(street);
  if (city) parts.push(city);
  return parts.length ? parts.join(", ") : undefined;
}

function formatCuisine(c: string | undefined): string | undefined {
  if (!c) return undefined;
  return c
    .split(";")[0]
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function osmResultsFromElements(
  elements: OverpassElement[],
  center: { lat: number; lon: number },
  limit: number
): RestaurantResult[] {
  const seen = new Set<string>();
  const out: RestaurantResult[] = [];
  for (const e of elements) {
    const tags = e.tags ?? {};
    const name = tags.name;
    if (!name) continue;
    const lat = e.lat ?? e.center?.lat;
    const lon = e.lon ?? e.center?.lon;
    if (typeof lat !== "number" || typeof lon !== "number") continue;
    const key = `${name.toLowerCase()}|${lat.toFixed(3)}|${lon.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const address = formatAddress(tags);
    out.push({
      id: `osm/${e.type}/${e.id}`,
      name,
      cuisine: formatCuisine(tags.cuisine),
      address,
      distanceMeters: haversine(center, { lat, lon }),
      lat,
      lon,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address ?? ""}`.trim())}`,
      source: "osm",
    });
  }
  out.sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
  return out.slice(0, limit);
}

// ─── Route handler ────────────────────────────────────────────────────────

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const mode = body.mode === "name" ? "name" : "cuisine";
  const query = (body.query ?? "").trim();
  if (!query) {
    return NextResponse.json({ ok: false, error: "Missing query" }, { status: 400 });
  }

  let lat = typeof body.lat === "number" ? body.lat : undefined;
  let lon = typeof body.lon === "number" ? body.lon : undefined;
  if (lat === undefined || lon === undefined) {
    const zip = (body.zip ?? "").trim();
    if (!zip) {
      return NextResponse.json(
        { ok: false, error: "Need a location (zip or coordinates)" },
        { status: 400 }
      );
    }
    const geo = await geocodeZip(zip);
    if (!geo) {
      return NextResponse.json({ ok: false, error: "Couldn't find that zip code" });
    }
    lat = geo.lat;
    lon = geo.lon;
  }

  const radius = Math.min(Math.max(body.radiusMeters ?? 5000, 500), 30000);
  const limit = Math.min(Math.max(body.limit ?? 30, 5), 60);
  const center = { lat, lon };

  // Try Google Places first — returns null on missing key, error, or zero results
  let results = await googlePlacesSearch(query, mode, center, radius, limit);
  let source: "google" | "osm" | "osm-fallback" = "google";

  if (!results || results.length === 0) {
    source = results === null ? "osm-fallback" : "osm";
    const elements = await queryOverpass(lat, lon, radius, mode, query);
    results = osmResultsFromElements(elements, center, limit);
  }

  return NextResponse.json({
    ok: true,
    source, // "google" | "osm" | "osm-fallback"
    center,
    radiusMeters: radius,
    count: results.length,
    results,
    fallbackMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${query} near ${lat.toFixed(4)},${lon.toFixed(4)}`)}`,
  });
}
