// Site-wide devlog posts.
//
// Was originally /gaming/_devlog.ts and scoped only to RC (Respawn
// Creatures). Promoted to its own top-level /devlog page so it can
// cover the WHOLE site — chat, sync infra, AI integrations, channel
// renames, banners, performance fixes, everything.
//
// TWO SOURCES, MERGED:
//   1. Manual entries (this file, MANUAL_POSTS below) — for richer
//      multi-paragraph posts written deliberately.
//   2. Auto entries from git history — pulled at build time by
//      scripts/build-devlog.mjs into _devlog-auto.json. Auto entries
//      cover any commit whose subject includes [devlog] or whose
//      diff touches a watched path. Skips [skip devlog].
//
// To add a manual entry: prepend to MANUAL_POSTS.
// To add an auto entry: write a good commit message and push.

import autoEntries from "./_devlog-auto.json";

export type DevlogPost = {
  date: string;       // ISO YYYY-MM-DD
  title: string;
  body: string[];     // paragraphs
  source: "manual" | "auto";
  /** Category badge — drives the colored pill on each entry. */
  category?: DevlogCategory;
  // Manual-only:
  issue?: string;
  tag?: string;
  // Auto-only:
  sha?: string;
  url?: string;
};

export type DevlogCategory =
  | "SITE"        // global / cross-page infra
  | "FOOD"
  | "MUSIC"
  | "GAMES"
  | "ANIME"
  | "CRAM"        // formerly math
  | "BUDDIES"     // chat
  | "CREATE"      // creativity corner
  | "ORLANDO"
  | "QUESTS"      // quest-list
  | "INFRA";      // db / auth / api / build

const MANUAL_POSTS: DevlogPost[] = [
  {
    source: "manual",
    issue: "20",
    date: "2026-06-06",
    title: "Channel banners across the four main channels",
    category: "SITE",
    tag: "ART",
    body: [
      "Food, Music, Games, and Anime each got a Kid Ghost-themed horizontal banner sitting under the global nav. Generated via ChatGPT/DALL-E with locked character spec so the mascot is consistent across the set. Anime banner gets the cel-shaded shonen-OP treatment.",
      "All four are served through next/image so the ~3MB source PNGs get auto-resized + WebP-converted per viewport. Mobile visitors download ~30-60KB instead of the full 3MB.",
    ],
  },
  {
    source: "manual",
    issue: "19",
    date: "2026-06-06",
    title: "Music page: 15-20s cold render → sub-second",
    category: "MUSIC",
    tag: "PERF",
    body: [
      "Three compounding causes traced and fixed. Page was force-dynamic with no ISR, the per-band OG-image scrapes were happening in a serial for-loop across 21 bands/festivals (each 1-3s of external HTML scraping), and the whole panel was inside a single Suspense boundary so the page shell waited for everything to resolve.",
      "Now: ISR with hourly background revalidation, OG fetches dropped from tile cards (only the hero strip does them), Spotify lookups batched into one Promise.all, and PopPunkPanel has its own Suspense skeleton so the page shell appears instantly on cold renders.",
    ],
  },
  {
    source: "manual",
    issue: "18",
    date: "2026-06-05",
    title: "Games hub: News / Hot Now / Now Playing tabs",
    category: "GAMES",
    tag: "FEATURE",
    body: [
      "Three tabbed sections on /games defaulting to News. Video game news from IGN / Polygon / Push Square / Eurogamer, tabletop news from Dicebreaker + BoardGameGeek. Card Games gets its own section with per-TCG news for Magic, Pokémon, Lorcana, One Piece, DBS, Yu-Gi-Oh.",
      "Hot Now surfaces curated video games (Helldivers 2, Elden Ring, etc.) with Steam Cloudflare CDN thumbnails and the latest news per title, card games with per-TCG brand-colored gradient covers (Magic = burnt red + swamp black, Pokémon = pokeball red + pikachu yellow, etc.), and tabletop from BoardGameGeek's hot list with a curated fallback when BGG's server hiccups.",
      "Now Playing pulls Creativity Corner posts tagged with anything in the games tag set (games, gaming, videogame, boardgame, cardgame, tabletop, tcg) — no new DB, just a filtered view of the existing forum.",
    ],
  },
  {
    source: "manual",
    issue: "17",
    date: "2026-06-05",
    title: "MiniAppNav rebuilt: square, channel-numbered, neon glow",
    category: "SITE",
    tag: "DESIGN",
    body: [
      "Pill-style tabs on /games, /music, /food, /orlando were too small and the active state too subtle to read at a glance. Rebuilt as squared-off rounded-md buttons with channel-numbered prefixes (01 / 02 / 03), 2x bigger padding on desktop, heavy neon glow + blinking dot on the active tab, color-themed hover.",
      "The strip itself gained scanline overlay + bottom-edge gradient so the row reads as part of the brand. One component change, every mini-app page upgrades.",
    ],
  },
  {
    source: "manual",
    issue: "16",
    date: "2026-06-04",
    title: "Anime page goes truly dynamic via AniList GraphQL",
    category: "ANIME",
    tag: "FEATURE",
    body: [
      "Replaced the hardcoded Top 5 + Characters sections with live AniList data. Trending Now (currently-airing top by AniList's real-time activity signal), Coming Soon (anticipated upcoming season), and Most-Favorited Characters all pull from AniList — free, no API key, hourly revalidation.",
      "Each fetch wraps in try/catch so a single failed query can't blank the page; a friendly 'couldn't reach AniList for this section' card appears instead.",
    ],
  },
  {
    source: "manual",
    issue: "15",
    date: "2026-06-04",
    title: "Recipe parser gains AI cleanup via Gemini Flash",
    category: "FOOD",
    tag: "FEATURE",
    body: [
      "The paste-mode heuristic was failing on any recipe with a title line, section headers, or footer metadata — it gave up on the first non-ingredient-shaped line and fell back to splitting everything in half.",
      "Replaced with a Gemini Flash call using forced function calling (tool_choice: ANY) for reliable structured output. Auto-fallback to the heuristic when AI fails so the button is never a dead-end. Strips titles, ignores 'Ingredients:'/'Directions:' headers, parses cooking time + calories from the footer.",
    ],
  },
  {
    source: "manual",
    issue: "14",
    date: "2026-06-03",
    title: "Shopping list: 1× / 2× / 3× / 4× batch picker for saved recipes",
    category: "FOOD",
    tag: "FEATURE",
    body: [
      "Adding ingredients from a saved recipe used to land at 1× only. Now each recipe row shows four buttons — pick a batch and the route scales every numeric quantity via the existing transformIngredient helper. '1¾ cups heavy cream' at 3× becomes '5¼ cups heavy cream', fractions and Unicode glyphs handled correctly.",
    ],
  },
  {
    source: "manual",
    issue: "13",
    date: "2026-06-03",
    title: "/math → /cram",
    category: "CRAM",
    tag: "RENAME",
    body: [
      "Renamed the math channel to Cram to support a broader future as an educational mini-app hub — vocab, chords, capitals, whatever lands next. /math still works as a redirect.",
      "Carries the late-night-pop-punk all-nighter energy without being subject-specific. Channel number, color, glow class all preserved.",
    ],
  },
  {
    source: "manual",
    issue: "12",
    date: "2026-06-02",
    title: "Kid Ghost dad joke skull + sponsor easter egg",
    category: "SITE",
    tag: "FEATURE",
    body: [
      "Punk skull mascot peeks in from the side of every page every 5-12 minutes, types out a dad joke (70 jokes in the pool, all clean bad puns), switches to a laughing face on the punchline with a body-shake animation.",
      "Hidden 'word from our sponsor' easter egg lives below the joke dismiss line — opens a glitch-themed 'MESSAGE FROM / OUR SPONSOR' modal with confetti particles and pop sounds. Discoverable but not noisy.",
    ],
  },
  {
    source: "manual",
    issue: "11",
    date: "2026-06-01",
    title: "QuestList syncs across devices",
    category: "QUESTS",
    tag: "INFRA",
    body: [
      "The /quest-list iframe was using its own isolated localStorage — tasks didn't follow users between devices even though every other store on the site already did via the user_data sync table.",
      "Wired the iframe to /api/sync/questlist directly. Same-origin fetch means the Auth.js session cookie rides along without postMessage plumbing. Server-wins-on-newer-timestamp conflict resolution, never auto-overwrites local data on first sync, snapshot of pre-sync state saved to localStorage as belt-and-suspenders insurance.",
    ],
  },
  {
    source: "manual",
    issue: "10",
    date: "2026-05-30",
    title: "AIM-style buddy chat (channel 09)",
    category: "BUDDIES",
    tag: "FEATURE",
    body: [
      "Full chat system in the AIM tradition. Search for users by screenname, send mutual buddy requests, see who's online via 3-tier presence (available / away / invisible), DM via popup chat windows that stack alongside a floating buddy list.",
      "Polling-based realtime (3s for open conversations, 15s for buddy list), debounced typing indicator, away messages + profile text, synthesized door-open chime via Web Audio when a buddy signs on. /buddies page for the full-size view.",
    ],
  },
  {
    source: "manual",
    issue: "09",
    date: "2026-05-28",
    title: "Creativity Corner forum (channel 08)",
    category: "CREATE",
    tag: "FEATURE",
    body: [
      "Reddit-style threaded forum at /creativity. Transmissions (posts) with markdown body + tags, AMPLIFY (one-tap upvote), threaded replies via comments table with self-referential parent_id, FRESH / LIVE / SIGNAL sort tabs.",
      "Live mode uses a Reddit-style hot score formula (log of score with time decay) computed directly in SQL. Admin moderation gated on ADMIN_EMAILS env var so deletes are declarative.",
    ],
  },
  {
    source: "manual",
    issue: "08",
    date: "2026-05-25",
    title: "Username system + /account settings page",
    category: "SITE",
    tag: "FEATURE",
    body: [
      "Magic-link auth needed actual usernames to power the forum + chat. Added the username column with case-insensitive uniqueness, reserved-word validation, and a fallback display chain (username → name → email split → 'anonymous').",
      "Username also mirrors to users.name so every Auth.js consumer (UserMenu chip, profile dropdowns) shows the chosen handle.",
    ],
  },
  {
    source: "manual",
    issue: "07",
    date: "2026-05-20",
    title: "Disney resort deal alerts",
    category: "ORLANDO",
    tag: "FEATURE",
    body: [
      "Daily cron checks Disney's resort availability API for the user's configured trip windows, detects price drops vs the last observed price, emails the subscriber if anything dropped. Includes the actual offer ID + savings amount.",
      "Healthcheck row written on every run so silent API failures are visible. Resort deal RSS scraped from MouseSavers + DisneyTouristBlog as a secondary signal.",
    ],
  },
  {
    source: "manual",
    issue: "06",
    date: "2026-05-10",
    title: "Auth.js v5 + magic-link sign-in via Resend",
    category: "INFRA",
    tag: "INFRA",
    body: [
      "No passwords. Email-only sign-in via Resend. Pg adapter for the verification_tokens / users / sessions tables, JWT session tokens (no DB hit per page load), trustHost for Vercel preview deploys.",
      "All the user-data sync (recipes, restaurants, quests, music artists/cities, questlist state, chat) hangs off this. No sign-in, no sync — the localStorage stays.",
    ],
  },
  {
    source: "manual",
    issue: "01",
    date: "2026-05-06",
    title: "RC: Respawn Creatures goes live at /game",
    category: "GAMES",
    tag: "MILESTONE",
    body: [
      "First playable version. Hatch, feed, train, fight. Three species (dino / water / lion) with six evolution stages each. World map has grass, forest, and a red zone with 75% encounter rate plus boss fights.",
      "Built in Phaser 4 with all art drawn programmatically — no sprite files. Means the look can shift fast as the design changes.",
    ],
  },
];

type RawAuto = {
  sha: string;
  date: string;
  title: string;
  body: string[];
  url: string;
};

const AUTO_POSTS: DevlogPost[] = (autoEntries as RawAuto[]).map((e) => ({
  source: "auto",
  date: e.date,
  title: e.title,
  body: e.body,
  sha: e.sha,
  url: e.url,
}));

// Merge + sort newest first. ISO date strings are lexicographically
// comparable so localeCompare works for the ordering.
export const devlogPosts: DevlogPost[] = [...MANUAL_POSTS, ...AUTO_POSTS].sort(
  (a, b) => b.date.localeCompare(a.date)
);

/** Color theme for each category badge. */
export const CATEGORY_COLORS: Record<DevlogCategory, { border: string; text: string; bg: string }> = {
  SITE:    { border: "border-fuchsia-400/40", text: "text-fuchsia-300", bg: "bg-fuchsia-500/15" },
  FOOD:    { border: "border-red-400/40",     text: "text-red-300",     bg: "bg-red-500/15" },
  MUSIC:   { border: "border-pink-400/40",    text: "text-pink-300",    bg: "bg-pink-500/15" },
  GAMES:   { border: "border-cyan-400/40",    text: "text-cyan-300",    bg: "bg-cyan-500/15" },
  ANIME:   { border: "border-fuchsia-400/40", text: "text-fuchsia-300", bg: "bg-fuchsia-500/15" },
  CRAM:    { border: "border-emerald-400/40", text: "text-emerald-300", bg: "bg-emerald-500/15" },
  BUDDIES: { border: "border-cyan-400/40",    text: "text-cyan-300",    bg: "bg-cyan-500/15" },
  CREATE:  { border: "border-fuchsia-400/40", text: "text-fuchsia-300", bg: "bg-fuchsia-500/15" },
  ORLANDO: { border: "border-orange-400/40",  text: "text-orange-300",  bg: "bg-orange-500/15" },
  QUESTS:  { border: "border-violet-400/40",  text: "text-violet-300",  bg: "bg-violet-500/15" },
  INFRA:   { border: "border-amber-400/40",   text: "text-amber-300",   bg: "bg-amber-500/15" },
};
