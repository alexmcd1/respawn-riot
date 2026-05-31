// Sync wrapper for shopping list items.

import { registerSyncedStore } from "../../_lib/syncedStore";
import {
  LS_KEY,
  SHOPPING_EVENT,
  loadShopping,
  type ShoppingItem,
} from "./shopping";

registerSyncedStore<ShoppingItem[]>({
  kind: "shopping",
  event: SHOPPING_EVENT,
  load: () => loadShopping(),
  replaceAll: (value) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(value));
      window.dispatchEvent(new CustomEvent(SHOPPING_EVENT));
    } catch {}
  },
  // Dedupe by id. Within a duplicate id, keep the "checked" state
  // from whichever side has the later addedAt — the most recent
  // physical interaction wins.
  mergeWith: (remote) => {
    const local = loadShopping();
    const byId = new Map<string, ShoppingItem>();
    for (const i of local) byId.set(i.id, i);
    for (const i of remote) {
      const existing = byId.get(i.id);
      if (!existing) {
        byId.set(i.id, i);
      } else if ((i.addedAt ?? 0) > (existing.addedAt ?? 0)) {
        byId.set(i.id, i);
      }
    }
    return [...byId.values()].sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
  },
});
