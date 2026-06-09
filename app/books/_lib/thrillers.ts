// Curated psychological-thriller authors. One card per author with a
// per-author Google News headline so the cards stay live.

export type ThrillerAuthor = {
  name: string;
  blurb: string;
  /** Google News search query. */
  searchTopic: string;
  href: string;
  notable: string;
};

export const THRILLER_AUTHORS: ThrillerAuthor[] = [
  {
    name: "Gillian Flynn",
    blurb:
      "The benchmark. Unreliable narrators, ice-cold female leads, twists that recolor the whole book.",
    searchTopic: '"Gillian Flynn" book OR novel OR adaptation',
    href: "https://gillianflynn.com",
    notable: "Gone Girl · Sharp Objects · Dark Places",
  },
  {
    name: "Riley Sager",
    blurb:
      "Locked-room horror-thrillers with 80s slasher DNA. Twists land like a gut punch every single time.",
    searchTopic: '"Riley Sager" book OR novel OR release',
    href: "https://rileysagerbooks.com",
    notable: "Final Girls · Lock Every Door · The Only One Left",
  },
  {
    name: "Tana French",
    blurb:
      "Dublin Murder Squad and standalones. Less twist-driven, more atmospheric — Irish gloom done literary.",
    searchTopic: '"Tana French" book OR novel OR release',
    href: "https://www.tanafrench.com",
    notable: "In the Woods · The Likeness · The Searcher",
  },
  {
    name: "Karin Slaughter",
    blurb:
      "Procedural thrillers with real teeth. The Will Trent series is the bedrock; standalones get darker.",
    searchTopic: '"Karin Slaughter" book OR novel OR release',
    href: "https://karinslaughter.com",
    notable: "Will Trent series · Pretty Girls · Pieces of Her",
  },
  {
    name: "Mike Omer",
    blurb:
      "Profiler thrillers with great forensic procedural beats. Zoe Bentley books are the gateway.",
    searchTopic: '"Mike Omer" book OR novel OR release',
    href: "https://www.mikeomer.com",
    notable: "Zoe Bentley series · A Killer's Mind",
  },
  {
    name: "Jeneva Rose",
    blurb:
      "Tight, twisty, propulsive. The kind of psych thriller that gets passed around at book club.",
    searchTopic: '"Jeneva Rose" book OR novel OR release',
    href: "https://jenevarose.com",
    notable: "The Perfect Marriage · You Shouldn't Have Come Back",
  },
];
