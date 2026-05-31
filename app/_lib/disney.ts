// Disney World deal-tracker client.
//
// Calls Disney's UNDOCUMENTED but unauthenticated JSON API that their
// Angular booking app uses internally. Discovered by HAR-capturing a
// browser session at disneyworld.disney.go.com. Endpoints used:
//
//   GET  /wdpr-resorts-list-api/api/v1/resorts
//        — full resort catalog (name, category, images)
//   POST /wdpr-resorts-list-api/api/v1/resort-availability
//        — availability + best rate per resort for a given date/party/
//          affiliation. Critically, "FL_RESIDENT" in the affiliations
//          array returns Florida-resident-only rates WITHOUT requiring
//          a Disney account login.
//
// Stability caveat: this API is internal. The shape can change without
// notice. /api/cron/disney-healthcheck monitors response integrity and
// alerts when it stops matching expectations.

const BASE = "https://disneyworld.disney.go.com/wdpr-resorts-list-api/api/v1";

// Headers the Angular SPA sends. Mostly feature-flag opt-ins. Whether
// they're STRICTLY required by the server isn't clear, but sending what
// the real browser sends minimizes the chance of unexpected fallback
// behavior on Disney's side.
const COMMON_HEADERS: Record<string, string> = {
  accept: "application/json, text/plain, */*",
  "content-type": "application/json",
  deltapackages: "true",
  origin: "https://disneyworld.disney.go.com",
  referer: "https://disneyworld.disney.go.com/resorts/",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "x-disney-internal-collector-mapping": "true",
  "x-disney-internal-core-api-mods-checkout": "true",
  "x-disney-internal-core-api-quote-checkout": "true",
  "x-disney-internal-core-api-quote-checkout-mods": "true",
  "x-disney-internal-core-api-quote-checkout-ta": "true",
  "x-disney-internal-core-api-quote-checkout-ta-mods": "true",
  "x-disney-internal-core-api-reservation-va": "true",
  "x-disney-internal-core-api-reservation-va-ta": "true",
  "x-disney-internal-core-api-resort-package": "true",
  "x-disney-internal-default-ticket-availability": "true",
  "x-enable-peach-lodging": "true",
  "x-enable-uplift": "true",
};

// ─── Catalog ──────────────────────────────────────────────────────────────

export type DisneyResortSummary = {
  id: string;
  name: string;
  category: string;     // "Deluxe", "Moderate", "Value", "Deluxe Villas", etc.
  image?: string;
  url?: string;         // canonical resort detail page
};

type RawResortCatalog = {
  resorts: Record<string, RawResort>;
};

type RawResort = {
  disneyOwned?: boolean;
  name?: string;            // canonical name, e.g. "Disney's Pop Century Resort"
  urlFriendlyId?: string;
  facets?: {
    resortCategory?: Array<{ value?: string; urlFriendlyId?: string }>;
  };
  media?: Record<string, { url?: string; alt?: string; title?: string }>;
  webLinks?: {
    wdwDetail?: { href?: string };
    wdwDetailResortOverview?: { href?: string };
  };
};

export async function fetchResortCatalog(): Promise<DisneyResortSummary[]> {
  const url = `${BASE}/resorts?storeId=wdw&resortGroup=CORE&region=us`;
  const res = await fetch(url, {
    headers: COMMON_HEADERS,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Disney /resorts HTTP ${res.status}`);
  }
  const data = (await res.json()) as RawResortCatalog;
  const out: DisneyResortSummary[] = [];
  for (const [id, r] of Object.entries(data.resorts ?? {})) {
    if (!r.disneyOwned) continue;
    if (!r.name) continue;
    const category = r.facets?.resortCategory?.[0]?.value ?? "Other";
    // Pick a small finder thumbnail for the chip UI. These keys come
    // ordered by Disney's preference for grid display.
    const m = r.media ?? {};
    const image =
      m.finderStandardThumb?.url ??
      m.mapBubbleThumbLarge?.url ??
      m.finderListMobileSquare?.url ??
      m.resortCompareSquare?.url;
    const href = r.webLinks?.wdwDetail?.href ?? r.webLinks?.wdwDetailResortOverview?.href;
    out.push({
      id,
      name: r.name,
      category,
      image,
      url: href ? `https://disneyworld.disney.go.com${href}` : undefined,
    });
  }
  // Sort: Value → Moderate → Deluxe → Deluxe Villas → Campgrounds, then alpha.
  // Disney's category strings include "Hotels"/"Villas" suffixes so we match
  // on a substring rather than equality.
  const tierFor = (cat: string): number => {
    const c = cat.toLowerCase();
    if (c.includes("value")) return 0;
    if (c.includes("moderate")) return 1;
    if (c.includes("deluxe") && !c.includes("villa")) return 2;
    if (c.includes("villa")) return 3;
    if (c.includes("campground")) return 4;
    return 99;
  };
  out.sort((a, b) => {
    const oa = tierFor(a.category);
    const ob = tierFor(b.category);
    if (oa !== ob) return oa - ob;
    return a.name.localeCompare(b.name);
  });
  return out;
}

// ─── Availability + rates ────────────────────────────────────────────────

export type AvailabilityRequest = {
  checkIn: string;         // yyyy-mm-dd
  checkOut: string;        // yyyy-mm-dd
  adults: number;          // 1-10
  children: number;        // 0-10
  childAges?: number[];    // required by Disney when children > 0
  flResident: boolean;     // toggles FL_RESIDENT affiliation
  postalCode?: string;     // optional, but FL Resident rates expect it
};

export type DisneyOffer = {
  resortId: string;
  basePrice: number;       // averagePricePerNight, subtotal USD
  sidePrice?: number;      // strike-through "standard" rate
  savings?: number;        // sidePrice.total - basePrice computed
  packageName?: string;    // "Q3 FL Res Room Only" etc.
  marketingOfferId?: string;
  offerName?: string;      // resolved from marketingOffers map
  offerCategory?: string;  // "specialOffer" | undefined
  unavailable?: string;    // reason code when no offer
};

type RawAvailability = {
  resorts: Record<string, RawResortAvailability>;
  marketingOffers?: Record<string, RawMarketingOffer>;
};

type RawResortAvailability = {
  displaySequence?: number;
  reasonsUnavailable?: Array<{ reasonCode?: string }>;
  offers?: {
    best?: {
      displayPrice?: {
        basePrice?: { subtotal?: number };
        sidePrice?: { total?: number; subtotal?: number };
        delta?: string | number;
      };
      resortPackageName?: string;
      marketingOfferId?: string;
    };
  };
};

type RawMarketingOffer = {
  id?: string;
  names?: {
    standardName?: string;
    displayName?: string;
    shortName?: string;
  };
  category?: string;
};

export async function fetchAvailability(req: AvailabilityRequest): Promise<{
  offers: DisneyOffer[];
  marketingOffers: Record<string, { name: string; category?: string }>;
}> {
  const affiliations: string[] = ["STD_GST"];
  if (req.flResident) affiliations.push("FL_RESIDENT");

  // Disney's API expects nonAdultAges as a list of PartyMixAgeResource
  // objects ({age: N}), not raw integers. Sending [5, 11] returns:
  //   "JSON parse error: Cannot construct instance of `PartyMixAgeResource`
  //    ... no int/Int-argument constructor/factory method to deserialize
  //    from Number value (5)"
  // The wrapper objects make Jackson happy.
  const nonAdultAges = (req.childAges ?? []).map((age) => ({ age }));

  const body = {
    storeId: "wdw",
    checkInDate: req.checkIn,
    checkOutDate: req.checkOut,
    partyMix: {
      adultCount: Math.max(1, Math.min(10, req.adults)),
      childCount: Math.max(0, Math.min(10, req.children)),
      nonAdultAges,
    },
    accessible: false,
    region: "us",
    resortGroup: "CORE",
    affiliations,
    postalCode: req.postalCode ?? "32601",
  };

  const res = await fetch(`${BASE}/resort-availability`, {
    method: "POST",
    headers: COMMON_HEADERS,
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "<no body>");
    throw new Error(
      `Disney /resort-availability HTTP ${res.status} — ${text.slice(0, 800)}`
    );
  }
  const data = (await res.json()) as RawAvailability;

  // Normalize the marketingOffers map for cheap lookup
  const offerMap: Record<string, { name: string; category?: string }> = {};
  for (const [oid, mo] of Object.entries(data.marketingOffers ?? {})) {
    offerMap[oid] = {
      name:
        mo.names?.displayName ??
        mo.names?.standardName ??
        mo.names?.shortName ??
        oid,
      category: mo.category,
    };
  }

  const offers: DisneyOffer[] = [];
  for (const [resortId, info] of Object.entries(data.resorts ?? {})) {
    const best = info.offers?.best;
    if (!best) {
      // Unavailable — record reason so the UI can surface "sold out"
      const reason = info.reasonsUnavailable?.[0]?.reasonCode;
      offers.push({ resortId, basePrice: 0, unavailable: reason ?? "UNAVAILABLE" });
      continue;
    }
    const base = best.displayPrice?.basePrice?.subtotal;
    if (typeof base !== "number") continue;
    const side = best.displayPrice?.sidePrice?.total;
    const moId = best.marketingOfferId;
    const moInfo = moId ? offerMap[moId] : undefined;
    offers.push({
      resortId,
      basePrice: base,
      sidePrice: typeof side === "number" ? side : undefined,
      savings: typeof side === "number" ? Math.max(0, side - base) : undefined,
      packageName: best.resortPackageName,
      marketingOfferId: moId,
      offerName: moInfo?.name,
      offerCategory: moInfo?.category,
    });
  }
  return { offers, marketingOffers: offerMap };
}
