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
// QuestList state lives inside an iframe (static HTML game at
// public/games/questlist/index.html). It syncs DIRECTLY from the
// iframe to /api/sync/questlist instead of going through this
// registry — postMessage plumbing turned out to be unnecessary since
// the iframe is same-origin and the Auth.js session cookie rides
// along on a normal fetch. See the "Cloud sync" block in the App
// component of that file for the implementation.
