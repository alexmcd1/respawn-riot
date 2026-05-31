// Sync wrapper for restaurant ratings.

import { registerSyncedStore } from "../../_lib/syncedStore";
import { RATINGS_EVENT, RATINGS_KEY, type Rating } from "./backup";

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

registerSyncedStore<Rating[]>({
  kind: "restaurants",
  event: RATINGS_EVENT,
  load: () => loadRatings(),
  replaceAll: (value) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(RATINGS_KEY, JSON.stringify(value));
      window.dispatchEvent(new CustomEvent(RATINGS_EVENT));
    } catch {}
  },
  // Dedupe by lowercase(name + cuisine). Same as backup.ts import logic
  // — keep the higher star count + prefer a non-empty note.
  mergeWith: (remote) => {
    const local = loadRatings();
    const keyOf = (r: Rating) =>
      `${r.name.trim().toLowerCase()}|${(r.cuisine ?? "").trim().toLowerCase()}`;
    const byKey = new Map<string, Rating>();
    for (const r of local) byKey.set(keyOf(r), r);
    for (const r of remote) {
      const k = keyOf(r);
      const existing = byKey.get(k);
      if (!existing) {
        byKey.set(k, r);
      } else {
        byKey.set(k, {
          ...existing,
          stars: Math.max(existing.stars ?? 0, r.stars ?? 0),
          note: existing.note || r.note,
          cuisine: existing.cuisine || r.cuisine,
        });
      }
    }
    return [...byKey.values()].sort((a, b) => (b.ratedAt ?? 0) - (a.ratedAt ?? 0));
  },
});
