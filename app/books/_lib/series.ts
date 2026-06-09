// Curated sci-fi & fantasy book series. Each entry drives one card on
// the Books → Sci-Fi & Fantasy tab. The card pulls a per-series Google
// News headline via fetchTopGoogleNews(searchQuery) so people can see
// what's actually fresh (new books announced, adaptations, etc.).
//
// Adding a series: add an entry below, pick an accent color from the
// existing palette so the cards stay on-theme.

export type BookSeries = {
  /** Display title. */
  name: string;
  /** Series author or curator (e.g. "Lucasfilm" for the SW publishing line). */
  author: string;
  /** Short blurb shown on the card. Keep tight (<140 chars). */
  blurb: string;
  /** Google News search query — usually `"<series>" book OR novel OR release`. */
  searchTopic: string;
  /** Where to go if no fresh news (publisher page, Goodreads, etc.). */
  href: string;
  /** Tag chips shown above the title. */
  tags: string[];
  /** Accent — controls border tint. */
  accent: "fuchsia" | "cyan" | "amber" | "lime" | "violet" | "rose" | "emerald";
};

export const SCIFI_FANTASY: BookSeries[] = [
  {
    name: "Star Wars (Canon)",
    author: "Lucasfilm Publishing",
    blurb:
      "The current canon novel line — High Republic, Thrawn Ascendancy, Skywalker-era reissues, and the new wave of adult novels.",
    searchTopic: '"Star Wars" novel OR book release OR announces',
    href: "https://www.starwars.com/news/category/books-and-comics",
    tags: ["Space Opera", "Canon"],
    accent: "amber",
  },
  {
    name: "The Dresden Files",
    author: "Jim Butcher",
    blurb:
      "Chicago's only wizard PI. Modern urban fantasy that just keeps getting darker. Waiting on Mirror Mirror and the back half of the apocalyptic finale arc.",
    searchTopic: '"Dresden Files" OR "Jim Butcher" book release OR announces',
    href: "https://www.jim-butcher.com/books",
    tags: ["Urban Fantasy", "Long-Run"],
    accent: "violet",
  },
  {
    name: "A Song of Ice and Fire",
    author: "George R.R. Martin",
    blurb:
      "We are still waiting on The Winds of Winter. Track the writing updates, side projects (Fire & Blood / Dunk & Egg), and the perpetual rumor mill.",
    searchTopic: '"Winds of Winter" OR "George R.R. Martin" book',
    href: "https://georgerrmartin.com/notablog/",
    tags: ["Epic Fantasy", "Forever Coming"],
    accent: "rose",
  },
  {
    name: "Ready Player One series",
    author: "Ernest Cline",
    blurb:
      "RPO + Ready Player Two. The third book (working title Ready Player Three) keeps getting hinted at. We're watching.",
    searchTopic: '"Ernest Cline" OR "Ready Player" book',
    href: "https://en.wikipedia.org/wiki/Ernest_Cline",
    tags: ["80s Pop", "VR Quest"],
    accent: "cyan",
  },
  {
    name: "Dungeon Crawler Carl",
    author: "Matt Dinniman",
    blurb:
      "LitRPG that absolutely owns. Carl, his ex-wife's cat Princess Donut, and the apocalypse dungeon game show. Book 8+ steadily landing.",
    searchTopic: '"Dungeon Crawler Carl" OR "Matt Dinniman" book',
    href: "https://www.dinniman.com",
    tags: ["LitRPG", "Comedy"],
    accent: "lime",
  },
  {
    name: "The Stormlight Archive",
    author: "Brandon Sanderson",
    blurb:
      "Cosmere flagship. Wind and Truth closed out Arc 1 — now the wait for Arc 2 begins. Also worth watching: Sanderson's annual surprise drops.",
    searchTopic: '"Brandon Sanderson" OR "Stormlight" book release',
    href: "https://www.brandonsanderson.com/",
    tags: ["Cosmere", "Epic Fantasy"],
    accent: "fuchsia",
  },
  {
    name: "The Expanse",
    author: "James S.A. Corey",
    blurb:
      "Main series wrapped with Leviathan Falls but the universe keeps expanding — novellas, the Memory's Legion collection, and post-series spinoffs.",
    searchTopic: '"James S.A. Corey" OR "The Expanse" book',
    href: "https://www.jamessacorey.com",
    tags: ["Hard SF", "Space"],
    accent: "emerald",
  },
];
