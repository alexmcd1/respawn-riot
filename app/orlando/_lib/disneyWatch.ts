// localStorage-backed Disney deal watcher preferences.
// One "watch" = a configured search (hotels + dates + party + threshold).
//
// We start with a single active watch (the simple case). The DB
// supports multiple watches per subscriber, so a future iteration can
// let users manage several at once.

export const WATCH_KEY = "respawn.orlando.disneyWatch.v1";
export const WATCH_EVENT = "respawn:disney-watch-changed";

export type DisneyWatch = {
  resortIds: string[];      // empty = all Disney-operated resorts
  checkIn: string;          // yyyy-mm-dd
  checkOut: string;         // yyyy-mm-dd
  adults: number;
  children: number;
  childAges: number[];      // age per child (0-17); length must match children
  flResident: boolean;
  postalCode: string;
  maxPrice: number | null;  // alert threshold; null = any price
  watchName: string;        // optional friendly name
};

const DEFAULT_WATCH: DisneyWatch = {
  resortIds: [],
  checkIn: "",
  checkOut: "",
  adults: 2,
  children: 0,
  childAges: [],
  flResident: true,
  postalCode: "32601",
  maxPrice: null,
  watchName: "",
};

export function loadWatch(): DisneyWatch {
  if (typeof window === "undefined") return DEFAULT_WATCH;
  try {
    const raw = localStorage.getItem(WATCH_KEY);
    if (!raw) return DEFAULT_WATCH;
    const parsed = JSON.parse(raw) as Partial<DisneyWatch>;
    return {
      ...DEFAULT_WATCH,
      ...parsed,
      resortIds: Array.isArray(parsed.resortIds)
        ? parsed.resortIds.filter((s): s is string => typeof s === "string")
        : [],
      childAges: Array.isArray(parsed.childAges)
        ? parsed.childAges.filter((n): n is number => typeof n === "number" && n >= 0 && n < 18)
        : [],
    };
  } catch {
    return DEFAULT_WATCH;
  }
}

export function saveWatch(w: DisneyWatch) {
  try {
    localStorage.setItem(WATCH_KEY, JSON.stringify(w));
    window.dispatchEvent(new CustomEvent(WATCH_EVENT));
  } catch {
    // quota — silently fail
  }
}
