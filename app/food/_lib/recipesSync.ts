// Sync wrapper for the "recipes" store. Imported once via the
// syncedStoreRegistry barrel.

import { registerSyncedStore } from "../../_lib/syncedStore";
import {
  LS_KEY,
  RECIPES_EVENT,
  loadRecipes,
  type SavedRecipe,
} from "./recipes";

registerSyncedStore<SavedRecipe[]>({
  kind: "recipes",
  event: RECIPES_EVENT,
  load: () => loadRecipes(),
  replaceAll: (value) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(value));
      window.dispatchEvent(new CustomEvent(RECIPES_EVENT));
    } catch {
      // quota or disabled — silently fail
    }
  },
  // Merge by stable id. When the same id appears in both, keep
  // whichever was saved more recently (savedAt epoch).
  mergeWith: (remote) => {
    const local = loadRecipes();
    const byId = new Map<string, SavedRecipe>();
    for (const r of local) byId.set(r.id, r);
    for (const r of remote) {
      const existing = byId.get(r.id);
      if (!existing || (r.savedAt ?? 0) > (existing.savedAt ?? 0)) {
        byId.set(r.id, r);
      }
    }
    return [...byId.values()].sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
  },
});
