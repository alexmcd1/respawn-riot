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

// What Browserless returns from our function. Includes diagnostics so
// we can see why fetches fail (page state, goto errors, etc).
type FetchResult =
  | { ok: true; status: number; body: string }
  | { ok: false; error: string; errorName: string | null };

type PageState = {
  url: string;
  title: string;
  cookieCount: number;
  bodyLen: number;
  bodyHead: string;
};

type BrowserlessResult = {
  fetchResult: FetchResult;
  pageState: PageState;
  gotoErr: string | null;
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

  // Step 1: try to land on the hotel listing. If Akamai serves a
  // challenge page, page.goto may "succeed" but land somewhere else.
  let gotoErr = null;
  try {
    await page.goto('https://www.universalorlando.com/hotels/en/us/listing', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
  } catch (e) {
    gotoErr = String(e && e.message || e);
  }

  // Give Akamai's JS challenges a chance to run
  await new Promise((r) => setTimeout(r, 3500));

  // Capture diagnostic info about where we actually landed
  const pageState = await page.evaluate(() => ({
    url: window.location.href,
    title: document.title,
    cookieCount: (document.cookie || '').split(';').filter(Boolean).length,
    bodyLen: document.body ? document.body.innerText.length : 0,
    bodyHead: document.body ? document.body.innerText.slice(0, 300) : '',
  }));

  // Build the age_counts shape Universal expects
  const ageCounts = [{ age_group: 'adult', count: adults }];
  if (children > 0) ageCounts.push({ age_group: 'child', count: children });

  // Make the rate fetch from within the real browser's page context.
  // Catch + return errors instead of throwing so we can diagnose.
  const fetchResult = await page.evaluate(async (args) => {
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

    try {
      const res = await fetch(
        'https://api.universalparks.com/resort-areas/UOR/hotel-stay-search-request/priced-hotels',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            accept: 'application/json, text/plain, */*',
            'content-type': 'application/json',
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
      return { ok: true, status: res.status, body: text };
    } catch (err) {
      return {
        ok: false,
        error: String(err && err.message || err),
        errorName: err && err.name ? err.name : null,
      };
    }
  }, { ageCounts, checkIn, checkOut, promoCode });

  return {
    data: { fetchResult, pageState, gotoErr },
    type: 'application/json',
  };
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
    },
    // Akamai detected un-stealthed Chrome and returned its "Access
    // Denied" challenge page. Stealth masks the automation flags;
    // humanlike adds mouse/scroll noise so behavior fingerprints look
    // human. Both are free on Browserless v2.
    { stealth: true, humanlike: true }
  );

  // Surface diagnostic info via the error message when something
  // goes wrong — makes Vercel logs immediately useful.
  if (!result.fetchResult.ok) {
    const ps = result.pageState;
    throw new Error(
      `Universal fetch failed inside browser — ${result.fetchResult.error} | ` +
      `goto=${result.gotoErr ?? 'ok'} | landed=${ps.url} | title="${ps.title}" | ` +
      `cookies=${ps.cookieCount} bodyLen=${ps.bodyLen} bodyHead="${ps.bodyHead.replace(/\n/g, ' ').slice(0, 200)}"`
    );
  }
  if (result.fetchResult.status !== 200) {
    throw new Error(
      `Universal priced-hotels HTTP ${result.fetchResult.status} — ${result.fetchResult.body.slice(0, 300)}`
    );
  }

  const data = JSON.parse(result.fetchResult.body) as RawPricedHotel[];
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
