// Curated list of currently-active video games for the "Currently Hot"
// panel's video-game subsection. Each entry has its own per-game
// Google News query so the cards show recent headlines (similar to
// how the pop-punk page does per-band news). To swap games out as
// the meta shifts, edit this array — no other code changes needed.
//
// Cover URLs intentionally point at the canonical Wikipedia commons
// thumb for each game; they're stable, legal to hot-link, and don't
// require Steam/storefront API keys.

export type VideoGame = {
  name: string;
  /** Genre tag(s) shown on the card. */
  tag: string;
  /** Wikipedia commons thumb URL — stable, no key required. */
  coverImg: string;
  /** Where the ENTER button links to (official site / Steam / Bnet). */
  href: string;
  /** Short blurb. Shown when no recent news is found for the title. */
  blurb: string;
};

export const VIDEO_GAMES_HOT: VideoGame[] = [
  {
    name: "Helldivers 2",
    tag: "Co-op shooter",
    coverImg: "https://upload.wikimedia.org/wikipedia/en/thumb/2/2e/Helldivers_2_cover_art.png/220px-Helldivers_2_cover_art.png",
    href: "https://store.steampowered.com/app/553850/HELLDIVERS_2/",
    blurb: "Live-service squad shooter with a galaxy-wide community war meta. Patch cycles keep it in the news weekly.",
  },
  {
    name: "Elden Ring",
    tag: "Action RPG",
    coverImg: "https://upload.wikimedia.org/wikipedia/en/thumb/b/b9/Elden_Ring_Box_art.jpg/220px-Elden_Ring_Box_art.jpg",
    href: "https://en.bandainamcoent.eu/elden-ring/elden-ring",
    blurb: "FromSoftware's open-world Souls. Shadow of the Erdtree DLC keeps the discourse alive.",
  },
  {
    name: "Baldur's Gate 3",
    tag: "CRPG",
    coverImg: "https://upload.wikimedia.org/wikipedia/en/thumb/c/c5/Baldur%27s_Gate_3_cover_art.png/220px-Baldur%27s_Gate_3_cover_art.png",
    href: "https://baldursgate3.game/",
    blurb: "Larian's D&D-rules CRPG. Still pulling huge concurrent counts and steady patch coverage.",
  },
  {
    name: "Marvel Rivals",
    tag: "Hero shooter",
    coverImg: "https://upload.wikimedia.org/wikipedia/en/thumb/a/a8/Marvel_Rivals_keyart.jpg/220px-Marvel_Rivals_keyart.jpg",
    href: "https://www.marvelrivals.com/",
    blurb: "Free-to-play 6v6 Marvel hero shooter. Season drops, hero balance, and meta debates make news cycles weekly.",
  },
  {
    name: "Black Myth: Wukong",
    tag: "Action RPG",
    coverImg: "https://upload.wikimedia.org/wikipedia/en/thumb/b/b3/Black_Myth_Wukong_cover.jpg/220px-Black_Myth_Wukong_cover.jpg",
    href: "https://www.heishenhua.com/",
    blurb: "Chinese mythology souls-like. Massive launch + ongoing post-release content discourse.",
  },
  {
    name: "Path of Exile 2",
    tag: "ARPG",
    coverImg: "https://upload.wikimedia.org/wikipedia/en/thumb/3/35/Path_of_Exile_2_cover_art.jpg/220px-Path_of_Exile_2_cover_art.jpg",
    href: "https://www.pathofexile2.com/",
    blurb: "GGG's sequel to the long-running ARPG. Endless build crafting + league system news.",
  },
];
