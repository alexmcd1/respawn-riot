// Default state, constants, types, level math, and achievement
// definitions for QuestList. Ported from public/games/questlist/index.html.
//
// State shape is preserved exactly so this native port can sync
// against the same /api/sync/questlist row used by the standalone
// /games/questlist/index.html iframe. Anyone who used the iframe app
// will see their data when they load the new native version.

export type Priority = "low" | "medium" | "high";

export type Task = {
  id: string;
  title: string;
  notes: string;
  priority: Priority;
  due: string; // ISO date or ''
  tags: string[];
  project: string;
  done: boolean;
  completedOn?: string | null;
  created: number;
  /** Set if the task came from an external source (e.g. Gmail). */
  source?: { type: string; id: string; threadId?: string; from?: string };
};

export type Player = {
  xp: number;
  coins: number;
  streak: number;
  bestStreak: number;
  lastCompleteDay: string | null;
  achievements: Record<string, number>; // id → completedAt
};

export type Settings = { soundOn: boolean; confettiOn: boolean };
export type Profile = { name: string; avatarDataUrl: string; friends: unknown[] };

// Gmail state is preserved in shape so the iframe and native versions
// share a row in the sync table — but the native version doesn't
// render any Gmail UI (yet). Treat the field as opaque storage.
export type GmailState = {
  accounts: unknown[];
  importedIds: Record<string, Record<string, string>>;
  clientId: string;
  defaults: {
    sourceMode: string;
    query: string;
    defaultProject: string;
    defaultPriority: string;
    autoTag: string;
  };
  schedule: { enabled: boolean; taskId: string | null; intervalMinutes: number };
};

export type QuestState = {
  tasks: Task[];
  projects: string[];
  player: Player;
  profile: Profile;
  settings: Settings;
  gmail: GmailState;
};

// ─── Constants ──────────────────────────────────────────────────────

export const PRIORITIES: Record<
  Priority,
  { xp: number; label: string; chipClass: string; dotClass: string }
> = {
  low: {
    xp: 5, label: "Low",
    chipClass: "border-white/15 bg-white/[0.03] text-white/65",
    dotClass: "bg-white/35",
  },
  medium: {
    xp: 12, label: "Medium",
    chipClass: "border-cyan-400/30 bg-cyan-500/[0.08] text-cyan-200",
    dotClass: "bg-cyan-400",
  },
  high: {
    xp: 25, label: "High",
    chipClass: "border-fuchsia-400/40 bg-fuchsia-500/[0.10] text-fuchsia-200",
    dotClass: "bg-fuchsia-400",
  },
};

export const STRIKE_MS = 650;

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const daysBetween = (a: string, b: string): number => {
  const da = new Date(a + "T00:00:00").getTime();
  const db = new Date(b + "T00:00:00").getTime();
  return Math.round((da - db) / 86400000);
};

// ─── Level math ─────────────────────────────────────────────────────

/** XP required to advance FROM level `lvl` TO `lvl+1`. */
export const LEVEL_XP = (lvl: number) => 80 + lvl * 40;

/** Compute the level and progress within it for a given total XP. */
export function levelForXP(xp: number): { level: number; inLevel: number; need: number } {
  let lvl = 1;
  let rem = xp;
  while (rem >= LEVEL_XP(lvl)) {
    rem -= LEVEL_XP(lvl);
    lvl++;
  }
  return { level: lvl, inLevel: rem, need: LEVEL_XP(lvl) };
}

// ─── Default state ──────────────────────────────────────────────────

export function makeDefaultState(): QuestState {
  const today = todayISO();
  const now = Date.now();
  return {
    tasks: [
      { id: uid(), title: "Welcome to QuestList!", notes: "Click the circle on the left to complete a task and earn XP.", priority: "medium", due: today, tags: ["getting-started"], project: "Inbox", done: false, created: now },
      { id: uid(), title: "Add your first custom task", notes: "", priority: "low", due: "", tags: [], project: "Inbox", done: false, created: now },
      { id: uid(), title: "Try checking this off", notes: "Feel that little dopamine hit? Good.", priority: "high", due: today, tags: ["demo"], project: "Inbox", done: false, created: now },
    ],
    projects: ["Inbox", "Work", "Personal", "Learning"],
    player: { xp: 0, coins: 0, streak: 0, bestStreak: 0, lastCompleteDay: null, achievements: {} },
    profile: { name: "", avatarDataUrl: "", friends: [] },
    settings: { soundOn: true, confettiOn: true },
    gmail: {
      accounts: [],
      importedIds: {},
      clientId: "",
      defaults: {
        sourceMode: "browser",
        query: "in:inbox -category:promotions newer_than:7d",
        defaultProject: "Inbox",
        defaultPriority: "auto",
        autoTag: "email",
      },
      schedule: { enabled: true, taskId: null, intervalMinutes: 15 },
    },
  };
}

// Migrate old-shape gmail state to new multi-account shape — preserved
// from the original so existing synced state is compatible.
export function migrateGmailState(g: unknown): GmailState {
  const def = makeDefaultState().gmail;
  if (!g || typeof g !== "object") return def;
  const gmail = g as Partial<GmailState> & {
    defaultProject?: string;
    defaultPriority?: string;
    autoTag?: string;
    query?: string;
    lastSync?: number | null;
  };
  if (Array.isArray(gmail.accounts) && gmail.defaults) {
    return {
      ...def, ...gmail,
      defaults: { ...def.defaults, ...(gmail.defaults || {}) },
      schedule: { ...def.schedule, ...(gmail.schedule || {}) },
    } as GmailState;
  }
  // Old single-account shape — drop into "no accounts" since the new
  // port doesn't render Gmail UI; users can still use the iframe app
  // for active syncs.
  return def;
}

// ─── Achievements ───────────────────────────────────────────────────

export type Achievement = {
  id: string;
  icon: string;
  label: string;
  desc: string;
  check: (
    player: Player,
    stats: { completedTotal: number; highDone: number },
  ) => boolean;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_task",  icon: "✓",  label: "First Quest",   desc: "Complete your first task", check: (_p, s) => s.completedTotal >= 1 },
  { id: "ten_tasks",   icon: "✓✓", label: "Getting Going", desc: "Complete 10 tasks",        check: (_p, s) => s.completedTotal >= 10 },
  { id: "fifty_tasks", icon: "★",  label: "Task Slayer",   desc: "Complete 50 tasks",        check: (_p, s) => s.completedTotal >= 50 },
  { id: "streak_3",    icon: "▲",  label: "On a Roll",     desc: "3-day streak",             check: (p) => p.streak >= 3 },
  { id: "streak_7",    icon: "◆",  label: "Week Warrior",  desc: "7-day streak",             check: (p) => p.streak >= 7 },
  { id: "streak_30",   icon: "✦",  label: "Unstoppable",   desc: "30-day streak",            check: (p) => p.streak >= 30 },
  { id: "level_5",     icon: "◇",  label: "Apprentice",    desc: "Reach level 5",            check: (p) => levelForXP(p.xp).level >= 5 },
  { id: "level_10",    icon: "❖",  label: "Adept",         desc: "Reach level 10",           check: (p) => levelForXP(p.xp).level >= 10 },
  { id: "high_prio_5", icon: "◉",  label: "Heavy Lifter",  desc: "Complete 5 high-priority tasks", check: (_p, s) => s.highDone >= 5 },
  { id: "coins_100",   icon: "$",  label: "Coin Hoarder",  desc: "Accumulate 100 coins",     check: (p) => p.coins >= 100 },
];
