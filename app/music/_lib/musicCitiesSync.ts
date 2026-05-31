// Sync wrapper for music saved cities.

import { registerSyncedStore } from "../../_lib/syncedStore";
import {
  CITIES_EVENT,
  CITIES_KEY,
  loadSavedCities,
} from "./concertFavorites";

registerSyncedStore<string[]>({
  kind: "music-cities",
  event: CITIES_EVENT,
  load: () => loadSavedCities(),
  replaceAll: (value) => {
    if (typeof window === "undefined") return;
    try {
      const seen = new Map<string, string>();
      for (const c of value) {
        const k = c.trim().toLowerCase();
        if (!k) continue;
        seen.set(k, c.trim());
      }
      localStorage.setItem(CITIES_KEY, JSON.stringify([...seen.values()]));
      window.dispatchEvent(new CustomEvent(CITIES_EVENT));
    } catch {}
  },
  mergeWith: (remote) => {
    const local = loadSavedCities();
    const seen = new Map<string, string>();
    for (const c of remote) {
      const k = c.trim().toLowerCase();
      if (!k) continue;
      seen.set(k, c.trim());
    }
    for (const c of local) {
      const k = c.trim().toLowerCase();
      if (!k) continue;
      seen.set(k, c.trim());
    }
    return [...seen.values()];
  },
});
