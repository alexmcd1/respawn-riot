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

  // Previous attempt used Scrapfly's simple `js` param, which runs the
  // script but doesn't await Promises — our IIFE returned a Promise
  // and Scrapfly captured the unresolved Promise as null.
  //
  // js_scenario is the multi-step version. `execute` actions properly
  // await async functions. We add an explicit `wait` first to let
  // Akamai's JS challenges complete after navigation.
  //
  // Cost: ~20-25 credits per call. Free tier (1k credits) → ~40 fetches.
  const executeScript = `async () => {
    try {
      const res = await fetch(${JSON.stringify(UNIVERSAL_API)}, {
        method: "POST",
        credentials: "include",
        headers: {
          accept: "application/json, text/plain, */*",
          "content-type": "application/json",
          "x-ibm-client-id": ${JSON.stringify(IBM_CLIENT_ID)},
          "x-instance-id": ${JSON.stringify(APP_INSTANCE_ID)},
          "x-source-id": "1003002",
          "x-uniwebservice-apikey": "WebApp",
          "x-uniwebservice-appversion": "upr-web-hotels-1.0",
          "x-uniwebservice-device": "Chrome",
          "x-uniwebservice-platform": "Web",
        },
        body: ${JSON.stringify(JSON.stringify(targetBody))},
      });
      return JSON.stringify({
        ok: true,
        status: res.status,
        body: await res.text(),
      });
    } catch (e) {
      return JSON.stringify({
        ok: false,
        error: String(e && e.message || e),
      });
    }
  }`;

  const result = await scrapfly({
    url: "https://www.universalorlando.com/hotels/en/us/listing",
    method: "GET",
    asp: true,
    country: "us",
    renderJs: true,
    jsScenario: [
      // Scrapfly format: plain integer for wait (ms), plain string
      // for execute. Nested {timeout: N} / {script: "..."} 400s.
      { wait: 3000 },
      { execute: executeScript },
    ],
    tags: ["universal-rates", "js-scenario"],
    timeoutMs: 90_000,
  });

  // js_scenario response shape: { response: [{ name, result, duration, ... }, ...] }
  const scenario = result.jsScenarioResult;
  if (!scenario) {
    throw new Error(
      `Scrapfly returned no js_scenario result — landed status=${result.status}. ` +
      `First 200 of page body: ${result.body.slice(0, 200)}`
    );
  }
  // Find the execute action's return value. Try a few possible shapes
  // since Scrapfly's docs have shifted across versions.
  const responses = (scenario.response ?? scenario.responses) as
    | Array<{ name?: string; result?: unknown }> | undefined;
  const executeRes = responses?.find((a) => a.name === "execute");
  const executeResult = executeRes?.result;
  if (typeof executeResult !== "string") {
    console.warn(
      `[universalLive] js_scenario unexpected shape — scenario keys: ${Object.keys(scenario).join(",")} | responses len: ${responses?.length ?? 0} | execute result type: ${typeof executeResult}`
    );
    throw new Error(
      `js_scenario execute returned no string result. Scenario keys: ${Object.keys(scenario).join(",")}. ` +
      `Full scenario: ${JSON.stringify(scenario).slice(0, 400)}`
    );
  }

  let inner: { ok: boolean; status?: number; body?: string; error?: string };
  try {
    inner = JSON.parse(executeResult);
  } catch {
    throw new Error(
      `js_scenario execute returned non-JSON: ${executeResult.slice(0, 200)}`
    );
  }

  if (!inner.ok) {
    throw new Error(
      `Universal fetch failed inside Scrapfly browser — ${inner.error ?? "unknown"}`
    );
  }
  if (inner.status !== 200) {
    throw new Error(
      `Universal priced-hotels HTTP ${inner.status} via Scrapfly browser — ${(inner.body ?? "").slice(0, 300)}`
    );
  }

  let data: RawPricedHotel[];
  try {
    data = JSON.parse(inner.body ?? "[]") as RawPricedHotel[];
  } catch {
    throw new Error(
      `Universal returned non-JSON inside Scrapfly browser — ${(inner.body ?? "").slice(0, 200)}`
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
