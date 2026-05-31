// Sync wrapper for music favorite artists.

import { registerSyncedStore } from "../../_lib/syncedStore";
import {
  ARTISTS_EVENT,
  ARTISTS_KEY,
  loadFavoriteArtists,
} from "./concertFavorites";

registerSyncedStore<string[]>({
  kind: "music-artists",
  event: ARTISTS_EVENT,
  load: () => loadFavoriteArtists(),
  replaceAll: (value) => {
    if (typeof window === "undefined") return;
    try {
      // Same dedupe-by-lowercase logic the original lib uses internally
      const seen = new Map<string, string>();
      for (const a of value) {
        const k = a.trim().toLowerCase();
        if (!k) continue;
        seen.set(k, a.trim());
      }
      localStorage.setItem(ARTISTS_KEY, JSON.stringify([...seen.values()]));
      window.dispatchEvent(new CustomEvent(ARTISTS_EVENT));
    } catch {}
  },
  // Union by case-insensitive name. Most-recently-added artist (latest
  // in remote OR local) wins for casing.
  mergeWith: (remote) => {
    const local = loadFavoriteArtists();
    const seen = new Map<string, string>();
    // Remote first so local additions (more recent) overwrite
    for (const a of remote) {
      const k = a.trim().toLowerCase();
      if (!k) continue;
      seen.set(k, a.trim());
    }
    for (const a of local) {
      const k = a.trim().toLowerCase();
      if (!k) continue;
      seen.set(k, a.trim());
    }
    return [...seen.values()];
  },
});
