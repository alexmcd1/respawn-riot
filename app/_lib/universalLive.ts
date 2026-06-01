// Universal Orlando live-rate client, powered by Scrapfly's
// Anti Scraping Protection (residential proxies + TLS fingerprint
// matching + JS challenge handling).
//
// Why not just curl Universal's API? Their booking endpoint
// (api.universalparks.com) sits behind Akamai bot detection that
// rejects data-center IPs. We tried Browserless first; stealth
// bypassed the JS fingerprinting layer but Akamai still IP-blocked
// the data-center pool. Scrapfly's ASP rotates through residential
// IPs which Akamai allow-lists.
//
// Costs ~5 Scrapfly credits per call (free tier: 1,000 credits/mo →
// ~200 free rate checks).

import { scrapfly } from "./scrapfly";
import {
  UNIVERSAL_HOTELS,
  type UniversalTier,
} from "./universalCatalog";

export type UniversalLiveRequest = {
  checkIn: string;         // yyyy-mm-dd
  checkOut: string;        // yyyy-mm-dd
  adults: number;
  children: number;
  /** "FLO" = Florida Resident discount, undefined = standard rate */
  promoCode?: "FLO" | "AAA" | "AP" | "MIL";
};

export type UniversalLiveOffer = {
  hotelCode: string;
  name: string;
  tier: UniversalTier;
  fromPrice: number;
  url?: string;
};

// Raw shape Universal returns per priced-hotel entry
type RawPricedHotel = {
  id?: string;
  hotel_code?: string;
  from_price?: number;
  currency_code?: string;
};

// Public IBM API key from Universal's JS bundle. Anyone visiting
// universalorlando.com can read it from the page source — it's not
// a secret. Universal's actual auth gate is Akamai's IP/fingerprint
// check, which Scrapfly bypasses with residential proxies.
const IBM_CLIENT_ID = "e7c945ba-eeec-4384-b03d-601650677987";

// FIXED instance_id used by Universal's hotels SPA. Verified by
// comparing two HAR captures from different browser sessions days
// apart — same value both times, so it's the app's identifier, not
// a per-session token. Random UUIDs trigger 401. Using the real value
// is what Universal's own JS does.
const APP_INSTANCE_ID = "0f0062d5-1e7c-4920-9886-ba14ff32ed19";

const UNIVERSAL_API =
  "https://api.universalparks.com/resort-areas/UOR/hotel-stay-search-request/priced-hotels";

// Helper for the catalog lookup (name + tier + canonical URL) so the
// route returns rich data the UI doesn't have to reconstruct.
const META_BY_CODE = new Map(UNIVERSAL_HOTELS.map((h) => [h.code, h]));

const TIER_ORDER: Record<UniversalTier, number> = {
  Value: 0,
  "Prime Value": 1,
  Preferred: 2,
  Premier: 3,
};

export async function fetchUniversalLiveRates(
  req: UniversalLiveRequest
): Promise<UniversalLiveOffer[]> {
  // Build the same body shape that universalorlando.com sends from
  // the browser. age_counts always has adults; only includes a child
  // entry when there are kids on the trip.
  const ageCounts: Array<{ age_group: string; count: number }> = [
    { age_group: "adult", count: Math.max(1, Math.min(10, req.adults)) },
  ];
  if (req.children > 0) {
    ageCounts.push({ age_group: "child", count: Math.min(10, req.children) });
  }
  const targetBody: Record<string, unknown> = {
    travel_groups: [{ age_counts: ageCounts }],
    travel_period: { from: req.checkIn, thru: req.checkOut },
    instance_id: APP_INSTANCE_ID,
  };
  if (req.promoCode) targetBody.promo_code = req.promoCode;

  // Single Scrapfly call with ASP (Akamai bypass). Forward the FULL
  // header set a real browser sends — Universal's IBM gateway 401s
  // when minimal headers are sent, so we replicate the browser
  // fingerprint as closely as Scrapfly will let us.
  // Cost: ~5 credits per call. Free tier (1k credits) → ~200/mo.
  const result = await scrapfly({
    url: UNIVERSAL_API,
    method: "POST",
    body: JSON.stringify(targetBody),
    headers: {
      accept: "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "NO-STORE,max-age=0",
      "content-type": "application/json",
      origin: "https://www.universalorlando.com",
      pragma: "NO-CACHE",
      referer: "https://www.universalorlando.com/",
      "x-ibm-client-id": IBM_CLIENT_ID,
      "x-instance-id": APP_INSTANCE_ID,
      "x-source-id": "1003002",
      "x-uniwebservice-apikey": "WebApp",
      "x-uniwebservice-appversion": "upr-web-hotels-1.0",
      "x-uniwebservice-device": "Chrome",
      "x-uniwebservice-platform": "Web",
    },
    asp: true,
    country: "us",
    tags: ["universal-rates"],
  });

  if (result.status !== 200) {
    throw new Error(
      `Universal priced-hotels HTTP ${result.status} via Scrapfly — ${result.body.slice(0, 300)}`
    );
  }

  let data: RawPricedHotel[];
  try {
    data = JSON.parse(result.body) as RawPricedHotel[];
  } catch {
    throw new Error(
      `Universal returned non-JSON via Scrapfly — ${result.body.slice(0, 200)}`
    );
  }
  if (!Array.isArray(data)) {
    throw new Error("Universal returned non-array response");
  }

  // Dedupe: API returns one row per (hotel × room type). Keep the
  // cheapest per hotel so the UI shows the from-price.
  const cheapestByCode = new Map<string, number>();
  for (const item of data) {
    const code = item.hotel_code;
    const price = item.from_price;
    if (typeof code !== "string" || typeof price !== "number") continue;
    const existing = cheapestByCode.get(code);
    if (existing === undefined || price < existing) {
      cheapestByCode.set(code, price);
    }
  }

  const offers: UniversalLiveOffer[] = [];
  for (const [code, fromPrice] of cheapestByCode.entries()) {
    const meta = META_BY_CODE.get(code);
    offers.push({
      hotelCode: code,
      name: meta?.name ?? `Universal Hotel ${code}`,
      tier: meta?.tier ?? "Preferred",
      fromPrice,
      url: meta?.url,
    });
  }
  offers.sort((a, b) => {
    const oa = TIER_ORDER[a.tier];
    const ob = TIER_ORDER[b.tier];
    if (oa !== ob) return oa - ob;
    return a.fromPrice - b.fromPrice;
  });
  return offers;
}
