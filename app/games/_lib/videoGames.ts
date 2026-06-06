// Curated list of currently-active video games for the "Currently Hot"
// panel's video-game subsection. Each entry has its own per-game
// Google News query so the cards show recent headlines.
//
// Cover art comes from Steam's public Cloudflare CDN at the standard
// header.jpg URL format. Steam's CDN is designed for embedding /
// hot-linking from third-party sites (it's what every game review
// site uses) so the URLs are stable and don't 403 the way Wikipedia
// commons URLs do.
//
// To swap in totally custom art instead, drop a PNG at
// /public/games/covers/<slug>.png and set coverImg to that local path.

export type VideoGame = {
  name: string;
  /** Genre tag(s) shown on the card. */
  tag: string;
  /** Cover image URL. Steam CDN headers work great here. If unset or
   *  404s, the hot panel falls back to a themed gradient + title. */
  coverImg?: string;
  /** Where the card links to when there's no recent news article. */
  href: string;
  /** Short blurb. Shown when no recent news is found for the title. */
  blurb: string;
};

// Steam header URL pattern, 460x215. Convenient helper so the array
// below stays readable.
const steam = (appId: number) =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;

export const VIDEO_GAMES_HOT: VideoGame[] = [
  {
    name: "Helldivers 2",
    tag: "Co-op shooter",
    coverImg: steam(553850),
    href: "https://store.steampowered.com/app/553850/HELLDIVERS_2/",
    blurb: "Live-service squad shooter with a galaxy-wide community war meta. Patch cycles keep it in the news weekly.",
  },
  {
    name: "Elden Ring",
    tag: "Action RPG",
    coverImg: steam(1245620),
    href: "https://store.steampowered.com/app/1245620/ELDEN_RING/",
    blurb: "FromSoftware's open-world Souls. Shadow of the Erdtree DLC keeps the discourse alive.",
  },
  {
    name: "Baldur's Gate 3",
    tag: "CRPG",
    coverImg: steam(1086940),
    href: "https://store.steampowered.com/app/1086940/Baldurs_Gate_3/",
    blurb: "Larian's D&D-rules CRPG. Still pulling huge concurrent counts and steady patch coverage.",
  },
  {
    name: "Marvel Rivals",
    tag: "Hero shooter",
    coverImg: steam(2767030),
    href: "https://store.steampowered.com/app/2767030/Marvel_Rivals/",
    blurb: "Free-to-play 6v6 Marvel hero shooter. Season drops, hero balance, and meta debates every week.",
  },
  {
    name: "Black Myth: Wukong",
    tag: "Action RPG",
    coverImg: steam(2358720),
    href: "https://store.steampowered.com/app/2358720/Black_Myth_Wukong/",
    blurb: "Chinese mythology souls-like. Massive launch plus ongoing post-release content discourse.",
  },
  {
    name: "Path of Exile 2",
    tag: "ARPG",
    coverImg: steam(2694490),
    href: "https://store.steampowered.com/app/2694490/Path_of_Exile_2/",
    blurb: "GGG's sequel to the long-running ARPG. Endless build crafting plus league system news.",
  },
];
