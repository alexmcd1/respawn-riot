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

  // Approach: load listing page, run a DOM-manipulation script that
  // fills the date inputs and clicks the search button. We don't need
  // the script to return anything — Scrapfly's execute action runs
  // side effects fine even when return capture is broken. The search
  // button click triggers the page's own priced-hotels XHR which
  // browser_data.xhr_call captures (xhr_call mechanism IS reliable
  // on free tier, verified earlier).
  //
  // Self-discovering script: searches by aria-label / placeholder
  // / type attributes rather than guessing exact selectors, since
  // Universal's Angular class names may change.
  //
  // Cost: ~20 credits (ASP + render_js + js_scenario).
  const fillAndClickScript = `(() => {
    const log = [];
    const setVal = (el, v) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new Event("blur", { bubbles: true }));
    };

    // Find date inputs by aria-label / placeholder / type
    const allInputs = Array.from(document.querySelectorAll("input"));
    const checkInInput = allInputs.find((el) => {
      const aria = (el.getAttribute("aria-label") || "").toLowerCase();
      const ph = (el.getAttribute("placeholder") || "").toLowerCase();
      return aria.includes("check in") || aria.includes("check-in") || aria.includes("arrival") || ph.includes("check in");
    });
    const checkOutInput = allInputs.find((el) => {
      const aria = (el.getAttribute("aria-label") || "").toLowerCase();
      const ph = (el.getAttribute("placeholder") || "").toLowerCase();
      return aria.includes("check out") || aria.includes("check-out") || aria.includes("departure") || ph.includes("check out");
    });

    if (checkInInput) { setVal(checkInInput, ${JSON.stringify(req.checkIn)}); log.push("filled checkIn"); }
    else log.push("checkIn NOT FOUND");
    if (checkOutInput) { setVal(checkOutInput, ${JSON.stringify(req.checkOut)}); log.push("filled checkOut"); }
    else log.push("checkOut NOT FOUND");

    // Find the search button by text content
    const allButtons = Array.from(document.querySelectorAll("button, [role=button], input[type=submit]"));
    const searchBtn = allButtons.find((el) => {
      const text = (el.textContent || el.value || "").toLowerCase();
      return text.includes("search hotels") || text.includes("get started") || text.includes("find hotels");
    });

    if (searchBtn) { searchBtn.click(); log.push("clicked search"); }
    else log.push("search button NOT FOUND");

    // Store diagnostics on document.title so they survive into the
    // rendered HTML Scrapfly returns (Scrapfly's execute can't return
    // values, but it CAN mutate the DOM and we get the post-mutation
    // body back).
    document.title = "__RR_LOG__:" + log.join(";") + ":__END__";
  })()`;

  const result = await scrapfly({
    url: "https://www.universalorlando.com/hotels/en/us/listing",
    method: "GET",
    asp: true,
    country: "us",
    renderJs: true,
    jsScenario: [
      { wait: 3000 },                 // page hydration
      { execute: fillAndClickScript }, // fill + click (side effects)
      { wait: 6000 },                 // priced-hotels XHR completes
    ],
    tags: ["universal-rates", "form-fill"],
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
    // Dump every captured XHR to Vercel logs
    const allCalls = calls.map((c, i) => {
      const bodyHead = (c.response?.body ?? "").slice(0, 250).replace(/\s+/g, " ");
      return `[${i}] ${c.method ?? "?"} ${c.url ?? "?"} → ${c.response?.status ?? "?"} | body: ${bodyHead}`;
    });
    console.log(`[universalLive] full XHR dump:\n${allCalls.join("\n")}`);

    // Extract our embedded diagnostic log from the page title
    // (set by the execute action — visible since execute side effects
    // mutate the DOM that Scrapfly returns in result.body)
    const titleMatch = result.body.match(/__RR_LOG__:([^]*?):__END__/);
    const fillClickLog = titleMatch ? titleMatch[1] : "(no log marker found)";

    throw new Error(
      `priced-hotels not in captured XHRs. Form-fill log: [${fillClickLog}]. ` +
      `Captured ${calls.length} XHRs (full dump in Vercel logs).`
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
