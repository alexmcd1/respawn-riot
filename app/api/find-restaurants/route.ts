import { NextResponse } from "next/server";

// Real in-page restaurant search powered by OpenStreetMap.
//
//   1. If `zip` was passed, geocode it via Nominatim → (lat, lon)
//   2. Query Overpass for restaurants near that point matching the
//      cuisine OR name (with case-insensitive regex on both `cuisine`
//      and `name` tags)
//   3. Normalize to a small shape the client can render
//
// Both services are free, no API key. Standard etiquette applies —
// we cache aggressively and send a real User-Agent.

export const dynamic = "force-dynamic";

const UA = "respawn-riot/1.0 (+https://respawnriot.io)";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const OVERPASS = "https://overpass-api.de/api/interpreter";
const FOOD_AMENITIES = "restaurant|fast_food|cafe|bar|pub|food_court|ice_cream";

type RestaurantResult = {
  id: string;
  name: string;
  cuisine?: string;
  address?: string;
  lat: number;
  lon: number;
  mapsUrl: string;
};

type Body = {
  mode?: "cuisine" | "name";
  query?: string;
  lat?: number;
  lon?: number;
  zip?: string;
  radiusMeters?: number; // default 5000
  limit?: number;        // default 30
};

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
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
      next: { revalidate: 86400 }, // a zip's coords don't change
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

// Escape user input for use inside an Overpass regex string literal
function escapeForOverpass(s: string): string {
  // Strip anything that could break out of the quoted regex; keep word chars + spaces
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

  // For cuisine mode, match either the cuisine tag OR the name (so "Pizza"
  // finds both [cuisine=pizza] and "Joe's Pizza"). For name mode, only match
  // the name tag.
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
  // OSM cuisines are often semicolon-separated, snake_case
  return c
    .split(";")[0]
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function dedupeAndNormalize(
  elements: OverpassElement[],
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
    // De-dupe by name + coarse coord (avoid showing the same chain twice)
    const key = `${name.toLowerCase()}|${lat.toFixed(3)}|${lon.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: `${e.type}/${e.id}`,
      name,
      cuisine: formatCuisine(tags.cuisine),
      address: formatAddress(tags),
      lat,
      lon,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${name} ${formatAddress(tags) ?? ""}`.trim()
      )}`,
    });
    if (out.length >= limit) break;
  }
  return out;
}

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

  // Resolve location
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
      return NextResponse.json({
        ok: false,
        error: "Couldn't find that zip code",
      });
    }
    lat = geo.lat;
    lon = geo.lon;
  }

  const radius = Math.min(Math.max(body.radiusMeters ?? 5000, 500), 30000);
  const limit = Math.min(Math.max(body.limit ?? 30, 5), 60);

  const elements = await queryOverpass(lat, lon, radius, mode, query);
  const results = dedupeAndNormalize(elements, limit);

  return NextResponse.json({
    ok: true,
    center: { lat, lon },
    radiusMeters: radius,
    count: results.length,
    results,
  });
}
