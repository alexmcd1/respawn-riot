// Curated list of currently-active video games for the "Currently Hot"
// panel's video-game subsection. Each entry has its own per-game
// Google News query so the cards show recent headlines.
//
// coverImg is intentionally OFF by default — the previous Wikipedia
// commons URLs were unreliable (hot-link 403s + filename rot). The
// hot-panel renderer now draws a themed gradient + the game name as
// the default cover, which always works. To use real cover art for
// a title, drop a square or 16:9 PNG at /public/games/covers/<slug>.png
// and set coverImg to that path.

export type VideoGame = {
  name: string;
  /** Genre tag(s) shown on the card. */
  tag: string;
  /** Optional. If set, used as the cover image. If unset or 404s, the
   *  hot panel falls back to a themed gradient + title. */
  coverImg?: string;
  /** Where the card links to when there's no recent news article. */
  href: string;
  /** Short blurb. Shown when no recent news is found for the title. */
  blurb: string;
};

export const VIDEO_GAMES_HOT: VideoGame[] = [
  {
    name: "Helldivers 2",
    tag: "Co-op shooter",
    href: "https://store.steampowered.com/app/553850/HELLDIVERS_2/",
    blurb: "Live-service squad shooter with a galaxy-wide community war meta. Patch cycles keep it in the news weekly.",
  },
  {
    name: "Elden Ring",
    tag: "Action RPG",
    href: "https://en.bandainamcoent.eu/elden-ring/elden-ring",
    blurb: "FromSoftware's open-world Souls. Shadow of the Erdtree DLC keeps the discourse alive.",
  },
  {
    name: "Baldur's Gate 3",
    tag: "CRPG",
    href: "https://baldursgate3.game/",
    blurb: "Larian's D&D-rules CRPG. Still pulling huge concurrent counts and steady patch coverage.",
  },
  {
    name: "Marvel Rivals",
    tag: "Hero shooter",
    href: "https://www.marvelrivals.com/",
    blurb: "Free-to-play 6v6 Marvel hero shooter. Season drops, hero balance, and meta debates every week.",
  },
  {
    name: "Black Myth: Wukong",
    tag: "Action RPG",
    href: "https://www.heishenhua.com/",
    blurb: "Chinese mythology souls-like. Massive launch plus ongoing post-release content discourse.",
  },
  {
    name: "Path of Exile 2",
    tag: "ARPG",
    href: "https://www.pathofexile2.com/",
    blurb: "GGG's sequel to the long-running ARPG. Endless build crafting plus league system news.",
  },
];
