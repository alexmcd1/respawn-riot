// RC (Respawn Creatures) devlog posts.
// To add a new entry: prepend a new object to the array (newest first).
// `body` is an array of paragraphs — keep them short and punchy.
// Tags are free-form; common ones: FEATURE, FIX, ART, BALANCE, MILESTONE.

export type DevlogPost = {
  issue: string;        // "01", "02", "03"...
  date: string;         // ISO YYYY-MM-DD
  title: string;
  tag: string;
  body: string[];       // paragraphs
};

export const devlogPosts: DevlogPost[] = [
  {
    issue: "02",
    date: "2026-05-07",
    title: "Species rework — three lineages, six stages each",
    tag: "FEATURE",
    body: [
      "Dropped the original Lumling lineage in favor of three picks at hatch: dino (Nubclaw → Goraxis), water (Tadrake → Abyssarus), and lion-shell (Cubshell → World Turtle).",
      "Six stages each — egg + five evolutions. Pick a path, commit, watch it grow.",
      "Battle stats now scale per species, so a Goraxis hits harder than a World Turtle but eats more between fights.",
    ],
  },
  {
    issue: "01",
    date: "2026-05-06",
    title: "RC is live at /game",
    tag: "MILESTONE",
    body: [
      "First playable version is up. Hatch, feed, train, fight. The world map has grass, forest, and a red zone with a 75% encounter rate plus boss fights.",
      "Built in Phaser 4 — all art is drawn programmatically so there are no sprite files to manage. Means the look can shift fast as the design changes.",
      "Save state lives in memory only for now. Localstorage save coming in a future drop.",
    ],
  },
];
