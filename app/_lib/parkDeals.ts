// Shared helpers for the Disney + Universal RSS deal aggregator.
//
// Used by:
//   - /api/cron/disney-daily — daily digest emails to subscribers
//   - /orlando/page.tsx       — Park Deals tab's "latest" feed
//
// Same source feeds for both, same keyword filter, same park-tagging
// logic. Keeping it here means UI + email always agree on what counts
// as a deal post and which park it belongs to.

import { fetchManyRss, type Feed, type NewsItem } from "./rss";

export const DEAL_FEEDS: Feed[] = [
  { url: "https://www.mousesavers.com/feed/", source: "MouseSavers" },
  { url: "https://www.disneytouristblog.com/feed/", source: "Disney Tourist Blog" },
  { url: "https://allears.net/feed/", source: "AllEars" },
  { url: "https://wdwnt.com/feed/", source: "WDW News Today" },
  { url: "https://www.insideuniversal.net/feed/", source: "Inside Universal" },
  { url: "https://orlandoinformer.com/feed/", source: "Orlando Informer" },
];

// Anything that looks like a deal — permissive on purpose. False
// positives are cheap (one email mentioning a non-deal post is fine);
// false negatives mean missing the thing the user wants.
export const DEAL_KEYWORDS =
  /\b(deal|discount|sale|save|saving|offer|promo|promotion|special|bounce.?back|free dining|free.?night|florida resident|fl resident|annual passholder|ap discount|passholder|cast member discount|military discount|dvc discount|book.?early|early.?booking|teacher|nurse|stacked savings)\b/i;

// Park-tag keywords. A single post can be tagged both — e.g. an
// article comparing Disney vs Universal FL Resident deals.
export const DISNEY_KEYWORDS =
  /\b(disney|wdw|magic kingdom|epcot|hollywood studios|animal kingdom|disney world|disneyworld|pop century|all.?star|art of animation|saratoga|caribbean beach|coronado|port orleans|wilderness lodge|polynesian|grand floridian|contemporary|riviera|beach club|yacht club|boardwalk|animal kingdom lodge|fort wilderness|old key west)\b/i;

export const UNIVERSAL_KEYWORDS =
  /\b(universal|uor|cabana bay|portofino|hard rock|royal pacific|sapphire falls|aventura|endless summer|stella nova|terra luna|helios|epic universe|islands of adventure|volcano bay|express pass)\b/i;

export type ParkTag = "disney" | "universal" | "both" | "other";

export type ParkDeal = NewsItem & {
  parks: ParkTag;
};

function tagParks(title: string): ParkTag {
  const d = DISNEY_KEYWORDS.test(title);
  const u = UNIVERSAL_KEYWORDS.test(title);
  if (d && u) return "both";
  if (d) return "disney";
  if (u) return "universal";
  return "other";
}

// Fetch all park-deal RSS sources, filter to deal-keyword posts, tag
// each by park. Returns items sorted newest-first. Cached for 30 min
// at the fetch layer (rss.ts) so back-to-back calls are cheap.
export async function fetchParkDeals(): Promise<ParkDeal[]> {
  const items = await fetchManyRss(DEAL_FEEDS, {
    perFeedMax: 12,
    totalMax: 60,
  });

  const out: ParkDeal[] = [];
  for (const item of items) {
    if (!DEAL_KEYWORDS.test(item.title)) continue;
    const parks = tagParks(item.title);
    if (parks === "other") continue; // unrelated to either park — skip
    out.push({ ...item, parks });
  }
  return out;
}

// Filter helpers used by the UI. Disney-only filter excludes the
// "both" tag (caller can decide whether to show or not); Universal-
// only does the same. "All" returns everything.
export function disneyDeals(deals: ParkDeal[]): ParkDeal[] {
  return deals.filter((d) => d.parks === "disney" || d.parks === "both");
}

export function universalDeals(deals: ParkDeal[]): ParkDeal[] {
  return deals.filter((d) => d.parks === "universal" || d.parks === "both");
}
