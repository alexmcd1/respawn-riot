// localStorage-backed concert preferences:
//
//   - Favorite artists  → quick re-search + (future) notification list
//   - Saved cities      → multi-city filter chips you don't have to retype
//
// Phase 1 — UI only. The "alert me when X is playing within Y miles"
// piece lives in Phase 2 (database + cron) and will read these favorites
// as its seed list.

export const ARTISTS_KEY = "respawn.music.favoriteArtists.v1";
export const CITIES_KEY = "respawn.music.savedCities.v1";
export const ARTISTS_EVENT = "respawn:favorite-artists-changed";
export const CITIES_EVENT = "respawn:saved-cities-changed";

// ─── Favorite artists ────────────────────────────────────────────────────

export function loadFavoriteArtists(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ARTISTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((s): s is string => typeof s === "string")
      : [];
  } catch {
    return [];
  }
}

function saveFavoriteArtists(list: string[]) {
  try {
    // Dedupe case-insensitively but preserve the most recent casing
    const seen = new Map<string, string>();
    for (const a of list) {
      const k = a.trim().toLowerCase();
      if (!k) continue;
      seen.set(k, a.trim());
    }
    localStorage.setItem(ARTISTS_KEY, JSON.stringify([...seen.values()]));
    window.dispatchEvent(new CustomEvent(ARTISTS_EVENT));
  } catch {
    // quota or disabled — silently fail
  }
}

export function addFavoriteArtist(name: string) {
  const clean = name.trim();
  if (!clean) return;
  const cur = loadFavoriteArtists();
  // Push to top so the most recently favorited shows first
  const filtered = cur.filter((a) => a.toLowerCase() !== clean.toLowerCase());
  saveFavoriteArtists([clean, ...filtered]);
}

export function removeFavoriteArtist(name: string) {
  const clean = name.trim().toLowerCase();
  if (!clean) return;
  saveFavoriteArtists(loadFavoriteArtists().filter((a) => a.toLowerCase() !== clean));
}

export function isFavoriteArtist(name: string): boolean {
  const clean = name.trim().toLowerCase();
  if (!clean) return false;
  return loadFavoriteArtists().some((a) => a.toLowerCase() === clean);
}

// ─── Saved cities ────────────────────────────────────────────────────────

export function loadSavedCities(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CITIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((s): s is string => typeof s === "string")
      : [];
  } catch {
    return [];
  }
}

function saveSavedCities(list: string[]) {
  try {
    const seen = new Map<string, string>();
    for (const c of list) {
      const k = c.trim().toLowerCase();
      if (!k) continue;
      seen.set(k, c.trim());
    }
    localStorage.setItem(CITIES_KEY, JSON.stringify([...seen.values()]));
    window.dispatchEvent(new CustomEvent(CITIES_EVENT));
  } catch {
    // ignore
  }
}

export function addSavedCity(name: string) {
  const clean = name.trim();
  if (!clean) return;
  const cur = loadSavedCities();
  if (cur.some((c) => c.toLowerCase() === clean.toLowerCase())) return;
  saveSavedCities([...cur, clean]);
}

export function removeSavedCity(name: string) {
  const clean = name.trim().toLowerCase();
  if (!clean) return;
  saveSavedCities(loadSavedCities().filter((c) => c.toLowerCase() !== clean));
}
