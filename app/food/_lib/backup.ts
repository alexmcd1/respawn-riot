// Export / import the food channel's local data (saved recipes +
// restaurant ratings) as a single JSON file. Used as a poor man's
// cross-device sync until we have a real backend.
//
// The on-disk shape is versioned so when we eventually migrate to a
// database, the same JSON can be re-imported by a server route.

import {
  RECIPES_EVENT,
  loadRecipes,
  upsertRecipe,
  type SavedRecipe,
} from "./recipes";

// Ratings are stored by RestaurantFinder under this key + event.
// Hard-coded here so backup.ts is the one place that knows about
// both shapes; the components fire/listen to these events.
export const RATINGS_KEY = "respawn.food.ratings.v1";
export const RATINGS_EVENT = "respawn:ratings-changed";

export type Rating = {
  id: string;
  name: string;
  cuisine?: string;
  stars: number;
  note?: string;
  ratedAt: number;
};

export type BackupFile = {
  app: "respawn-riot/food";
  version: 1;
  exportedAt: string;       // ISO timestamp
  recipes: SavedRecipe[];
  ratings: Rating[];
};

function loadRatings(): Rating[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RATINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Rating[]) : [];
  } catch {
    return [];
  }
}

function saveRatings(ratings: Rating[]) {
  try {
    localStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
    window.dispatchEvent(new CustomEvent(RATINGS_EVENT));
  } catch {
    // quota exceeded — fail silently
  }
}

// ─── Export
export function buildBackup(): BackupFile {
  return {
    app: "respawn-riot/food",
    version: 1,
    exportedAt: new Date().toISOString(),
    recipes: loadRecipes(),
    ratings: loadRatings(),
  };
}

export function downloadBackup() {
  const data = buildBackup();
  const stamp = data.exportedAt.replace(/[:.]/g, "-").slice(0, 19);
  const filename = `respawn-food-backup-${stamp}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a tick so Safari has time to start the download
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { filename, recipes: data.recipes.length, ratings: data.ratings.length };
}

// ─── Import
export type ImportResult = {
  ok: boolean;
  error?: string;
  recipesAdded?: number;
  recipesUpdated?: number;
  ratingsAdded?: number;
};

function validateBackup(raw: unknown): BackupFile | string {
  if (!raw || typeof raw !== "object") return "Not a JSON object";
  const obj = raw as Record<string, unknown>;
  if (obj.app !== "respawn-riot/food") return "Not a Respawn Riot food backup";
  if (obj.version !== 1) return `Unsupported backup version: ${String(obj.version)}`;
  if (!Array.isArray(obj.recipes)) return "Missing 'recipes' array";
  if (!Array.isArray(obj.ratings)) return "Missing 'ratings' array";
  return obj as unknown as BackupFile;
}

/**
 * Merge an exported file into local storage.
 *   - Recipes use stable ids (upsertRecipe dedupes URL/mealdb sources;
 *     pasted ones get fresh ids).
 *   - Ratings dedupe by (name + cuisine) — same restaurant from another
 *     device merges into one entry, keeping the higher star count.
 */
export async function importFromFile(file: File): Promise<ImportResult> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, error: "Couldn't read that file" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "File isn't valid JSON" };
  }

  const validated = validateBackup(parsed);
  if (typeof validated === "string") {
    return { ok: false, error: validated };
  }

  // Recipes — upsert each one. upsertRecipe handles id collisions.
  const beforeRecipes = loadRecipes();
  const beforeIds = new Set(beforeRecipes.map((r) => r.id));
  let recipesAdded = 0;
  let recipesUpdated = 0;
  for (const r of validated.recipes) {
    if (!r || typeof r !== "object") continue;
    const incoming = r as SavedRecipe;
    if (!incoming.name) continue;
    upsertRecipe({
      name: incoming.name,
      source: incoming.source,
      sourceUrl: incoming.sourceUrl,
      image: incoming.image,
      yield: incoming.yield,
      ingredients: Array.isArray(incoming.ingredients) ? incoming.ingredients : [],
      instructions: Array.isArray(incoming.instructions) ? incoming.instructions : [],
      stars: typeof incoming.stars === "number" ? incoming.stars : 0,
      tags: Array.isArray(incoming.tags) ? incoming.tags : [],
    });
    if (beforeIds.has(incoming.id)) recipesUpdated++;
    else recipesAdded++;
  }

  // Ratings — dedupe by lowercase(name + cuisine). When merging, keep
  // the higher star count and concat unique notes.
  const existingRatings = loadRatings();
  const keyOf = (r: Rating) => `${r.name.trim().toLowerCase()}|${(r.cuisine ?? "").trim().toLowerCase()}`;
  const byKey = new Map<string, Rating>();
  for (const r of existingRatings) byKey.set(keyOf(r), r);
  let ratingsAdded = 0;
  for (const r of validated.ratings) {
    if (!r || typeof r !== "object") continue;
    const incoming = r as Rating;
    if (!incoming.name || typeof incoming.stars !== "number") continue;
    const k = keyOf(incoming);
    const existing = byKey.get(k);
    if (!existing) {
      byKey.set(k, {
        id: String(incoming.id ?? Date.now() + Math.random().toString(36).slice(2)),
        name: incoming.name,
        cuisine: incoming.cuisine,
        stars: Math.max(0, Math.min(10, incoming.stars)),
        note: incoming.note,
        ratedAt: typeof incoming.ratedAt === "number" ? incoming.ratedAt : Date.now(),
      });
      ratingsAdded++;
    } else {
      // Merge: keep higher stars, prefer non-empty note
      const merged: Rating = {
        ...existing,
        stars: Math.max(existing.stars, incoming.stars ?? 0),
        note: existing.note || incoming.note,
        cuisine: existing.cuisine || incoming.cuisine,
      };
      byKey.set(k, merged);
    }
  }
  saveRatings([...byKey.values()]);

  // Notify recipe listeners too (upsertRecipe already fires its event
  // per call, but make extra sure My Recipes hydrates fresh)
  try {
    window.dispatchEvent(new CustomEvent(RECIPES_EVENT));
  } catch {
    // ignore
  }

  return {
    ok: true,
    recipesAdded,
    recipesUpdated,
    ratingsAdded,
  };
}
