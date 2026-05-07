// RC (Respawn Creatures) devlog posts.
//
// TWO SOURCES, MERGED:
//   1. Manual entries (this file, MANUAL_POSTS below) — for richer
//      multi-paragraph posts you write deliberately.
//   2. Auto entries from git history — pulled at build time by
//      scripts/build-devlog.mjs into _devlog-auto.json.
//      Includes commits that touched app/game/** or public/games/**,
//      OR have [devlog] in the subject. Skips [skip devlog].
//
// To add a manual entry: prepend to MANUAL_POSTS.
// To add an auto entry: write a good commit message and push.

import autoEntries from "./_devlog-auto.json";

export type DevlogPost = {
  date: string;       // ISO YYYY-MM-DD
  title: string;
  body: string[];     // paragraphs
  source: "manual" | "auto";
  // Manual-only:
  issue?: string;
  tag?: string;
  // Auto-only:
  sha?: string;
  url?: string;
};

const MANUAL_POSTS: DevlogPost[] = [
  {
    source: "manual",
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
    source: "manual",
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

// Merge + sort newest first. Manual entries with no time component sort
// alongside auto by date string (ISO-comparable).
export const devlogPosts: DevlogPost[] = [...MANUAL_POSTS, ...AUTO_POSTS].sort(
  (a, b) => b.date.localeCompare(a.date)
);
