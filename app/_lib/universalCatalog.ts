// Static catalog of Universal Orlando's on-site resort hotels.
//
// Built from the hotel codes captured in our HAR analysis cross-
// referenced with Universal's published listing. We can't fetch live
// rates server-side (Universal's booking API is Akamai-protected) so
// the UI shows the catalog + booking deeplinks instead, paired with
// RSS deal-post coverage from MouseSavers/AllEars/Inside Universal.

export type UniversalTier =
  | "Value"
  | "Prime Value"
  | "Preferred"
  | "Premier";

export type UniversalHotel = {
  /** Internal Universal code (3-5 chars, from HAR) */
  code: string;
  name: string;
  tier: UniversalTier;
  /** What the tier means in practical terms */
  tierBlurb: string;
  /** Canonical Universal detail page */
  url: string;
  /** Brief flavor / what makes this hotel distinct */
  blurb?: string;
};

// Order: tier ascending, then alphabetical within tier.
// Express Pass behavior:
//   - Premier hotels include Unlimited Express Pass for all paid guests
//   - All on-site stays include early park admission
export const UNIVERSAL_HOTELS: UniversalHotel[] = [
  // ── Value (cheapest, no Express Pass)
  {
    code: "UEESS",
    name: "Universal's Endless Summer Resort – Surfside Inn & Suites",
    tier: "Value",
    tierBlurb: "Early park admission. No Express Pass.",
    url: "https://www.universalorlando.com/web/en/us/places-to-stay/universals-endless-summer-resort-surfside-inn-and-suites",
    blurb: "Two-room suites built for families. Surf shack vibe.",
  },
  {
    code: "UEESD",
    name: "Universal's Endless Summer Resort – Dockside Inn & Suites",
    tier: "Value",
    tierBlurb: "Early park admission. No Express Pass.",
    url: "https://www.universalorlando.com/web/en/us/places-to-stay/universals-endless-summer-resort-dockside-inn-and-suites",
    blurb: "Sister to Surfside. Marina theme, multiple pools.",
  },
  {
    code: "UESNR",
    name: "Universal Stella Nova Resort",
    tier: "Value",
    tierBlurb: "Early park admission. No Express Pass.",
    url: "https://www.universalorlando.com/web/en/us/places-to-stay/universal-stella-nova-resort",
    blurb: "Newer build near Epic Universe. Sleek modern rooms.",
  },
  {
    code: "UETLR",
    name: "Universal Terra Luna Resort",
    tier: "Value",
    tierBlurb: "Early park admission. No Express Pass.",
    url: "https://www.universalorlando.com/web/en/us/places-to-stay/universal-terra-luna-resort",
    blurb: "Twin of Stella Nova. Closer to Epic Universe than the rest.",
  },

  // ── Prime Value
  {
    code: "UECBB",
    name: "Universal's Cabana Bay Beach Resort",
    tier: "Prime Value",
    tierBlurb: "Early park admission. No Express Pass.",
    url: "https://www.universalorlando.com/web/en/us/places-to-stay/universals-cabana-bay-beach-resort",
    blurb: "Retro 60s motel theme. Bowling alley + lazy river on site.",
  },
  {
    code: "UEAVH",
    name: "Universal's Aventura Hotel",
    tier: "Prime Value",
    tierBlurb: "Early park admission. No Express Pass.",
    url: "https://www.universalorlando.com/web/en/us/places-to-stay/universals-aventura-hotel",
    blurb: "Modern glass tower next to Volcano Bay. Rooftop bar.",
  },

  // ── Preferred
  {
    code: "UESFR",
    name: "Loews Sapphire Falls Resort",
    tier: "Preferred",
    tierBlurb: "Early park admission. No Express Pass.",
    url: "https://www.universalorlando.com/web/en/us/places-to-stay/loews-sapphire-falls-resort",
    blurb: "Caribbean-themed, walkable to CityWalk via bridge.",
  },

  // ── Premier (free Unlimited Express Pass for paid guests)
  {
    code: "UERPR",
    name: "Loews Royal Pacific Resort",
    tier: "Premier",
    tierBlurb: "Includes Unlimited Express Pass + early park admission.",
    url: "https://www.universalorlando.com/web/en/us/places-to-stay/loews-royal-pacific-resort",
    blurb: "South Pacific theme. Closest Premier to Islands of Adventure.",
  },
  {
    code: "UEPBH",
    name: "Loews Portofino Bay Hotel",
    tier: "Premier",
    tierBlurb: "Includes Unlimited Express Pass + early park admission.",
    url: "https://www.universalorlando.com/web/en/us/places-to-stay/loews-portofino-bay-hotel",
    blurb: "Italian Riviera replica. Highest-rated Premier on TripAdvisor.",
  },
  {
    code: "UEHRH",
    name: "Hard Rock Hotel",
    tier: "Premier",
    tierBlurb: "Includes Unlimited Express Pass + early park admission.",
    url: "https://www.universalorlando.com/web/en/us/places-to-stay/hard-rock-hotel",
    blurb: "Music memorabilia + a sand-bottom pool with underwater speakers.",
  },
  {
    code: "UEHGH",
    name: "Helios Grand Hotel",
    tier: "Premier",
    tierBlurb: "Includes Unlimited Express Pass + early park admission.",
    url: "https://www.universalorlando.com/web/en/us/places-to-stay/helios-grand-hotel",
    blurb: "Inside Epic Universe. Brand new (2025). Greek-mythology theme.",
  },
];

export const UNIVERSAL_TIERS: UniversalTier[] = [
  "Value",
  "Prime Value",
  "Preferred",
  "Premier",
];

// Canonical link to Universal's Florida Resident hotel offers landing
// page. We push users here for booking since we can't apply FLO codes
// via deeplink directly — but their booking widget exposes the promo
// field on this page.
export const UNIVERSAL_FL_RESIDENT_URL =
  "https://www.universalorlando.com/web/en/us/places-to-stay/hotels/special-offers/fl-resident-rates";

export const UNIVERSAL_ALL_OFFERS_URL =
  "https://www.universalorlando.com/web/en/us/places-to-stay/hotels/special-offers";

export const UNIVERSAL_HOTEL_LISTING_URL =
  "https://www.universalorlando.com/hotels/en/us/listing";
