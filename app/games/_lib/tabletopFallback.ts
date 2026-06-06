// Curated tabletop fallback list — surfaced by the Hot Now panel when
// BoardGameGeek's XML hot endpoint can't be reached (their server
// rate-limits / 503s under load and Vercel edge fetches occasionally
// time out). Acts as a safety net so the Tabletop section is never
// empty, even if BGG is down.
//
// IDs match BGG game IDs so the link URLs work the same as live
// hot-list entries.

import type { BggHotGame } from "./bgg";

export const TABLETOP_FALLBACK: BggHotGame[] = [
  {
    id: "224517",
    rank: 1,
    name: "Brass: Birmingham",
    yearPublished: 2018,
    url: "https://boardgamegeek.com/boardgame/224517",
  },
  {
    id: "266192",
    rank: 2,
    name: "Wingspan",
    yearPublished: 2019,
    url: "https://boardgamegeek.com/boardgame/266192",
  },
  {
    id: "162886",
    rank: 3,
    name: "Spirit Island",
    yearPublished: 2017,
    url: "https://boardgamegeek.com/boardgame/162886",
  },
  {
    id: "174430",
    rank: 4,
    name: "Gloomhaven",
    yearPublished: 2017,
    url: "https://boardgamegeek.com/boardgame/174430",
  },
  {
    id: "316554",
    rank: 5,
    name: "Dune: Imperium",
    yearPublished: 2020,
    url: "https://boardgamegeek.com/boardgame/316554",
  },
  {
    id: "167791",
    rank: 6,
    name: "Terraforming Mars",
    yearPublished: 2016,
    url: "https://boardgamegeek.com/boardgame/167791",
  },
  {
    id: "13",
    rank: 7,
    name: "Catan",
    yearPublished: 1995,
    url: "https://boardgamegeek.com/boardgame/13",
  },
  {
    id: "9209",
    rank: 8,
    name: "Ticket to Ride",
    yearPublished: 2004,
    url: "https://boardgamegeek.com/boardgame/9209",
  },
];
