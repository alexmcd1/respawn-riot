// Curated trading card game lineup for the /games "Card Games" subsections
// of both News and Hot Now. Each entry seeds a per-title Google News search
// so cards stay current as expansions / banlists / tournaments drop.
//
// Edit this array to add or remove TCGs as the meta shifts — no other
// code changes needed.

export type CardGame = {
  name: string;
  /** Short publisher tag for the small tag line on each card. */
  publisher: string;
  /** Genre / format keyword. */
  tag: string;
  /** Where the ENTER button links to (official site). */
  href: string;
  /** Short blurb shown when no recent news is found. */
  blurb: string;
  /** Search keywords appended to the title for the per-game Google News
   *  query — fine-tuned per TCG so we don't grab unrelated noise. */
  searchTopic: string;
};

export const CARD_GAMES_HOT: CardGame[] = [
  {
    name: "Magic: The Gathering",
    publisher: "Wizards of the Coast",
    tag: "Trading Card Game",
    href: "https://magic.wizards.com/en",
    blurb: "Set rotations, Standard meta, Commander shake-ups. The original TCG never goes quiet.",
    searchTopic: "expansion OR set OR banlist OR tournament OR commander",
  },
  {
    name: "Pokémon TCG",
    publisher: "The Pokémon Company",
    tag: "Trading Card Game",
    href: "https://tcg.pokemon.com/en-us/",
    blurb: "Reprints, special sets, and tournament Championships keep the headline cycle constant.",
    searchTopic: "Pokemon TCG expansion OR set OR pull rates OR championship",
  },
  {
    name: "Disney Lorcana",
    publisher: "Ravensburger",
    tag: "Trading Card Game",
    href: "https://www.disneylorcana.com/",
    blurb: "Ravensburger's Disney TCG. Each chapter set is its own headline beat.",
    searchTopic: "Lorcana chapter OR set OR expansion OR reveal",
  },
  {
    name: "One Piece Card Game",
    publisher: "Bandai",
    tag: "Trading Card Game",
    href: "https://en.onepiece-cardgame.com/",
    blurb: "Bandai's One Piece TCG. New OP-numbered sets drop almost monthly internationally.",
    searchTopic: "One Piece card game OP set OR booster",
  },
  {
    name: "Dragon Ball Super Card Game",
    publisher: "Bandai",
    tag: "Trading Card Game",
    href: "https://www.dbs-cardgame.com/world/en/",
    blurb: "Bandai's flagship anime TCG outside Yu-Gi-Oh. Fusion World transition driving the news cycle.",
    searchTopic: "Dragon Ball Super Card Game OR Fusion World set OR booster",
  },
  {
    name: "Yu-Gi-Oh!",
    publisher: "Konami",
    tag: "Trading Card Game",
    href: "https://www.yugioh-card.com/en/",
    blurb: "Konami's evergreen TCG. Quarterly Forbidden & Limited list shifts the entire meta.",
    searchTopic: "Yu-Gi-Oh TCG banlist OR forbidden OR set OR archetype",
  },
];
