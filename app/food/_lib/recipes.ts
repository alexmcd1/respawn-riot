// localStorage-backed "My Recipes" store.
//
// Recipes can come from three places:
//   - URL parser (schema.org JSON-LD)
//   - Pasted text
//   - TheMealDB ingredient search
//
// We normalize all three into SavedRecipe. Upsert dedupes by sourceUrl
// when present, so re-saving the same URL keeps your rating + note.
//
// Cross-component sync: writers dispatch RECIPES_EVENT on window.
// MyRecipes listens and re-hydrates from localStorage. This keeps the
// UI in sync without a global store.

export const LS_KEY = "respawn.food.recipes.v1";
export const RECIPES_EVENT = "respawn:recipes-changed";

export type RecipeSource = "url" | "pasted" | "mealdb";

export type SavedRecipe = {
  id: string;            // stable id (timestamp or "mealdb:NNN" / "url:hash")
  name: string;
  source: RecipeSource;
  sourceUrl?: string;    // canonical URL of original (when applicable)
  image?: string;
  yield?: string;
  ingredients: string[]; // base scale, unconverted
  instructions: string[];
  stars: number;         // 0-10
  note?: string;
  tags: string[];        // user-added free-form tags
  savedAt: number;       // epoch ms
};

export function loadRecipes(): SavedRecipe[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as SavedRecipe[]).map((r) => ({
      ...r,
      tags: Array.isArray(r.tags) ? r.tags : [],
      ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
      instructions: Array.isArray(r.instructions) ? r.instructions : [],
      stars: typeof r.stars === "number" ? r.stars : 0,
    }));
  } catch {
    return [];
  }
}

function persist(recipes: SavedRecipe[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(recipes));
    window.dispatchEvent(new CustomEvent(RECIPES_EVENT));
  } catch {
    // quota exceeded or disabled — silently fail
  }
}

// Compute a stable id for a recipe from its source. Lets us upsert.
export function recipeIdFor(
  source: RecipeSource,
  sourceUrl?: string,
  fallbackName?: string
): string {
  if (source === "url" && sourceUrl) return `url:${hashString(sourceUrl)}`;
  if (source === "mealdb" && sourceUrl) {
    // sourceUrl in mealdb case is like "mealdb:52772"
    return sourceUrl;
  }
  // Pasted recipes: use name + timestamp to stay unique
  return `paste:${hashString((fallbackName ?? "recipe") + Date.now())}`;
}

// Tiny non-crypto string hash (djb2). Stable across loads — same input,
// same id, so URL upserts work.
function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

// Add or update a recipe by id. If an existing recipe has the same id,
// merge: keep the existing stars + note + tags + savedAt, replace the
// content fields with the new version (the source may have been updated).
export function upsertRecipe(input: Omit<SavedRecipe, "id" | "savedAt" | "stars" | "tags"> & {
  stars?: number;
  tags?: string[];
}): SavedRecipe {
  const all = loadRecipes();
  const id = recipeIdFor(input.source, input.sourceUrl, input.name);
  const existing = all.find((r) => r.id === id);
  const merged: SavedRecipe = existing
    ? {
        ...existing,
        name: input.name,
        image: input.image ?? existing.image,
        yield: input.yield ?? existing.yield,
        ingredients: input.ingredients,
        instructions: input.instructions,
        source: input.source,
        sourceUrl: input.sourceUrl ?? existing.sourceUrl,
        // Don't overwrite user-set fields unless the caller explicitly passed
        stars: input.stars ?? existing.stars,
        tags: input.tags ?? existing.tags,
      }
    : {
        id,
        name: input.name,
        source: input.source,
        sourceUrl: input.sourceUrl,
        image: input.image,
        yield: input.yield,
        ingredients: input.ingredients,
        instructions: input.instructions,
        stars: input.stars ?? 0,
        tags: input.tags ?? [],
        savedAt: Date.now(),
      };

  const next = existing
    ? all.map((r) => (r.id === id ? merged : r))
    : [merged, ...all];

  persist(next);
  return merged;
}

export function deleteRecipe(id: string) {
  const all = loadRecipes();
  persist(all.filter((r) => r.id !== id));
}

export function updateRecipe(id: string, patch: Partial<SavedRecipe>) {
  const all = loadRecipes();
  persist(all.map((r) => (r.id === id ? { ...r, ...patch } : r)));
}

export function isSaved(id: string): boolean {
  return loadRecipes().some((r) => r.id === id);
}
