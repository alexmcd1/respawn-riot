// Universal Orlando live-rate client, powered by Browserless.io.
//
// Universal's booking API (api.universalparks.com) sits behind Akamai
// bot detection that rejects server-side requests. To get around it,
// we run a real Chrome instance via Browserless that:
//   1. Visits universalorlando.com/hotels/en/us/listing (gets Akamai
//      session cookies + passes any JS challenges)
//   2. Makes the priced-hotels fetch from within the page's context
//      (so it inherits cookies + real browser TLS fingerprint)
//   3. Returns the parsed response to us
//
// Same hotel-code → tier metadata mapping as the static catalog —
// reused for naming + sort order.

import { browserlessFunction } from "./browserless";
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

// What Browserless returns from our function (mirrors the structure of
// Universal's HTTP response, plus the status code so we can detect
// errors without throwing).
type BrowserlessResult = {
  status: number;
  body: string;
};

type RawPricedHotel = {
  id?: string;
  hotel_code?: string;
  from_price?: number;
  currency_code?: string;
};

const HOTEL_META_BY_CODE = new Map(
  UNIVERSAL_HOTELS.map((h) => [h.code, h])
);

const TIER_ORDER: Record<UniversalTier, number> = {
  Value: 0,
  "Prime Value": 1,
  Preferred: 2,
  Premier: 3,
};

// The Puppeteer function shipped to Browserless. Written as a string
// because Browserless serializes + re-evaluates it server-side.
//
// Browserless v2 expects ES module syntax (`export default async ...`).
// The older `module.exports = ...` returns "module is not defined".
//
// Important details:
//   - We navigate to the listing page first so Akamai gets to set
//     cookies and run any JS challenges.
//   - The actual rate fetch runs INSIDE page.evaluate so it inherits
//     the page's session (cookies, browser fingerprint, etc).
//   - We generate a fresh instance_id with crypto.randomUUID() — the
//     server seems to accept any UUID-shaped value as long as the
//     session + Akamai cookies are valid.
const FN_SOURCE = `
export default async function ({ page, context }) {
  const { checkIn, checkOut, adults, children, promoCode } = context;

  // Realistic UA — matches Browserless's Chrome version
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
  );

  // Visit the hotel listing — establishes Akamai session
  await page.goto('https://www.universalorlando.com/hotels/en/us/listing', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  // Give Akamai's JS challenges a chance to run
  await new Promise((r) => setTimeout(r, 2500));

  // Build the age_counts shape Universal expects
  const ageCounts = [{ age_group: 'adult', count: adults }];
  if (children > 0) ageCounts.push({ age_group: 'child', count: children });

  // Make the rate fetch from within the real browser's page context
  const result = await page.evaluate(async (args) => {
    const instanceId =
      (typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID()) ||
      ('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }));
    const body = {
      travel_groups: [{ age_counts: args.ageCounts }],
      travel_period: { from: args.checkIn, thru: args.checkOut },
      instance_id: instanceId,
    };
    if (args.promoCode) body.promo_code = args.promoCode;

    const res = await fetch(
      'https://api.universalparks.com/resort-areas/UOR/hotel-stay-search-request/priced-hotels',
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          accept: 'application/json, text/plain, */*',
          'content-type': 'application/json',
          'cache-control': 'NO-STORE,max-age=0',
          pragma: 'NO-CACHE',
          'x-ibm-client-id': 'e7c945ba-eeec-4384-b03d-601650677987',
          'x-instance-id': instanceId,
          'x-source-id': '1003002',
          'x-uniwebservice-apikey': 'WebApp',
          'x-uniwebservice-appversion': 'upr-web-hotels-1.0',
          'x-uniwebservice-device': 'Chrome',
          'x-uniwebservice-platform': 'Web',
        },
        body: JSON.stringify(body),
      }
    );
    const text = await res.text();
    return { status: res.status, body: text };
  }, { ageCounts, checkIn, checkOut, promoCode });

  return { data: result, type: 'application/json' };
}
`;

export async function fetchUniversalLiveRates(
  req: UniversalLiveRequest
): Promise<UniversalLiveOffer[]> {
  const result = await browserlessFunction<UniversalLiveRequest, BrowserlessResult>(
    FN_SOURCE,
    {
      checkIn: req.checkIn,
      checkOut: req.checkOut,
      adults: Math.max(1, Math.min(10, req.adults)),
      children: Math.max(0, Math.min(10, req.children)),
      promoCode: req.promoCode,
    }
  );

  if (result.status !== 200) {
    throw new Error(
      `Universal priced-hotels via Browserless HTTP ${result.status} — ${result.body.slice(0, 300)}`
    );
  }

  const data = JSON.parse(result.body) as RawPricedHotel[];
  if (!Array.isArray(data)) {
    throw new Error("Universal returned non-array response");
  }

  // Dedupe by hotel code (Universal returns one row per room type — keep cheapest)
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

  const out: UniversalLiveOffer[] = [];
  for (const [code, fromPrice] of cheapestByCode.entries()) {
    const meta = HOTEL_META_BY_CODE.get(code);
    out.push({
      hotelCode: code,
      name: meta?.name ?? `Universal Hotel ${code}`,
      tier: meta?.tier ?? "Preferred",
      fromPrice,
      url: meta?.url,
    });
  }
  out.sort((a, b) => {
    const oa = TIER_ORDER[a.tier];
    const ob = TIER_ORDER[b.tier];
    if (oa !== ob) return oa - ob;
    return a.fromPrice - b.fromPrice;
  });
  return out;
}
