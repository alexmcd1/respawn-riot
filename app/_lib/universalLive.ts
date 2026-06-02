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

// Investigation outcome (2026-06): Universal's hotel API is reachable
// (Scrapfly ASP bypasses Akamai cleanly), but Scrapfly's free tier
// does NOT capture JS return values from page evaluation. Verified
// with a literal-string test on a non-Akamai URL — same null/undefined
// result. Custom return-value capture is a paid feature ($30/mo+).
//
// The code below stays in place so that:
//   - If you ever upgrade Scrapfly, flip NEXT_PUBLIC_UNIVERSAL_LIVE_RATES=1
//     to re-enable the UI
//   - Or if Universal's API protections change, the request shape is
//     ready to test again
//
// Until then, the Universal section shows catalog + RSS + booking
// deeplinks (which honestly covers most of the practical need —
// MouseSavers catches FL Resident promo announcements within hours).

export async function fetchUniversalLiveRates(
  req: UniversalLiveRequest
): Promise<UniversalLiveOffer[]> {
  // Build the same body shape universalorlando.com sends from the
  // browser. age_counts always has adults; only includes a child
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

  // Approach: don't run our own JS at all. Load the listing page in
  // Scrapfly's headless browser; Universal's Angular app auto-fires
  // priced-hotels as part of page setup. Scrapfly's
  // browser_data.xhr_call captures every XHR the page made — we just
  // grep through it for the priced-hotels response.
  //
  // Tradeoff: we don't control the dates/promo this way — we get
  // whatever defaults Universal's page picks. But we'll find out
  // whether the mechanism works at all + see the data shape, which
  // tells us if it's worth building URL-param or form-fill control.
  //
  // Cost: ~10-15 credits (ASP + render_js, no extra actions).
  const result = await scrapfly({
    url: "https://www.universalorlando.com/hotels/en/us/listing",
    method: "GET",
    asp: true,
    country: "us",
    renderJs: true,
    jsScenario: [
      // Generous wait so the page's auto-fire XHR completes
      { wait: 6000 },
    ],
    tags: ["universal-rates", "xhr-capture"],
    timeoutMs: 90_000,
  });

  const calls = result.xhrCalls ?? [];
  if (calls.length === 0) {
    throw new Error(
      `Scrapfly returned no XHR captures. status=${result.status}, scenarioResult keys=${
        result.jsScenarioResult ? Object.keys(result.jsScenarioResult).join(",") : "(none)"
      }`
    );
  }

  // Find the priced-hotels response
  const pricedCall = calls.find((c) =>
    typeof c.url === "string" && c.url.includes("priced-hotels")
  );
  if (!pricedCall) {
    const urlSummary = calls
      .map((c) => `${c.method ?? "?"} ${c.url ?? "?"} → ${c.response?.status ?? "?"}`)
      .slice(0, 5)
      .join(" | ");
    throw new Error(
      `priced-hotels not in captured XHRs. Captured ${calls.length} calls: ${urlSummary}`
    );
  }

  const status = pricedCall.response?.status;
  const body = pricedCall.response?.body ?? "";
  if (status !== 200) {
    throw new Error(
      `priced-hotels via XHR capture HTTP ${status} — ${body.slice(0, 300)}`
    );
  }

  // We hit hotel data — but with the page's own date params. Log
  // those so we know what the page actually requested. Useful for
  // figuring out if we can override via URL params later.
  console.log(
    `[universalLive] XHR-capture success. request body: ${
      pricedCall.request?.body?.slice(0, 200) ?? "(none)"
    }`
  );

  // NOTE: req.checkIn / req.checkOut / req.promoCode aren't used here.
  // The page chose its own dates. If we ship this approach we need a
  // way to control them — see notes in the route handler.
  void req;

  let data: RawPricedHotel[];
  try {
    data = JSON.parse(body) as RawPricedHotel[];
  } catch {
    throw new Error(
      `priced-hotels XHR returned non-JSON — ${body.slice(0, 200)}`
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
