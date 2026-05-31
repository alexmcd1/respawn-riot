// Registry barrel. Imports each lib that calls registerSyncedStore()
// at module top-level so the registry is fully populated before
// SyncController runs.
//
// Stores are added one by one as we wire them. Each import has a side
// effect (registers itself).

import "../food/_lib/recipesSync";
import "../food/_lib/ratingsSync";
import "../food/_lib/shoppingSync";
import "../music/_lib/musicArtistsSync";
import "../music/_lib/musicCitiesSync";
// NOTE: quest-list state lives inside an iframe (static HTML game) —
// syncing it needs postMessage plumbing in the iframe HTML. Wired in
// a follow-up commit. For now, quests stay localStorage-only inside
// the iframe origin.
