// Client-side "synced store" helper.
//
// Each kind (recipes, restaurants, shopping, …) already has a
// localStorage-backed lib (load/save/event-fire). To add cross-device
// sync, those libs use:
//
//   registerSyncedStore(kind, { load, replaceAll, mergeWith, event })
//
// to opt in. Then this module:
//
//   1. On sign-in (or app boot when signed in):
//        - GET /api/sync/<kind>  → remote value
//        - mergeWith(remote)     → store calls back into the lib to
//                                  combine local + remote (de-dup etc)
//        - PUT /api/sync/<kind>  → push the merged result back
//
//   2. After every localStorage write (via the lib's <event> dispatch):
//        - Debounce 800ms
//        - PUT /api/sync/<kind>  with the current local data
//
// Stores work fine when not signed in — they just stop hitting the
// network. Sign-in is purely additive.

export type SyncKind =
  | "recipes"
  | "restaurants"
  | "shopping"
  | "quests"
  | "music-artists"
  | "music-cities";

export type SyncedStoreSpec<T> = {
  kind: SyncKind;
  // Called whenever we need the current local-state to push to the server
  load: () => T;
  // Called when the server returns a remote value and we need to
  // overwrite local. Implementation should write to localStorage and
  // fire its change event so live UI re-renders.
  replaceAll: (value: T) => void;
  // Called once on sign-in to merge remote with current local. The lib
  // controls the merge semantics (dedupe by id, etc). Returns the
  // merged result, which the syncer then PUTs back to the server.
  mergeWith: (remote: T) => T;
  // Event name the lib fires on every write (so we know to push)
  event: string;
};

const registry = new Map<SyncKind, SyncedStoreSpec<unknown>>();

export function registerSyncedStore<T>(spec: SyncedStoreSpec<T>) {
  registry.set(spec.kind, spec as SyncedStoreSpec<unknown>);
}

export function getRegistry(): ReadonlyMap<SyncKind, SyncedStoreSpec<unknown>> {
  return registry;
}

// Debounced PUT — same kind firing multiple times within 800ms only
// hits the server once with the latest value.
const debounceTimers = new Map<SyncKind, ReturnType<typeof setTimeout>>();

export async function pushToServer<T>(
  spec: SyncedStoreSpec<T>,
  value: T
): Promise<void> {
  try {
    const res = await fetch(`/api/sync/${spec.kind}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    if (!res.ok) {
      // 401 = not signed in (silently no-op). Anything else = log.
      if (res.status !== 401) {
        console.warn(`[sync] PUT ${spec.kind} → ${res.status}`);
      }
    }
  } catch (err) {
    console.warn(`[sync] PUT ${spec.kind} network err:`, err);
  }
}

export function schedulePush<T>(spec: SyncedStoreSpec<T>) {
  const existing = debounceTimers.get(spec.kind);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    debounceTimers.delete(spec.kind);
    void pushToServer(spec, spec.load());
  }, 800);
  debounceTimers.set(spec.kind, timer);
}

export async function pullFromServer<T>(
  spec: SyncedStoreSpec<T>
): Promise<T | null> {
  try {
    const res = await fetch(`/api/sync/${spec.kind}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean; value?: T | null };
    if (!data.ok) return null;
    return (data.value ?? null) as T | null;
  } catch {
    return null;
  }
}

// One-time merge on sign-in: pull, mergeWith, push.
export async function mergeOnSignIn<T>(spec: SyncedStoreSpec<T>) {
  const remote = await pullFromServer(spec);
  if (remote === null) {
    // Nothing on the server yet — just push current local
    await pushToServer(spec, spec.load());
    return;
  }
  const merged = spec.mergeWith(remote);
  spec.replaceAll(merged);
  await pushToServer(spec, merged);
}
