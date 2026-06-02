// Shared types + constants for the AIM-style buddy chat.
//
// Owned by /api/chat/* routes + /app/_components/chat/* UI.
//
// Channel 09 of the site. Floating buddy list + popup chat windows,
// mutual-consent friendships, polling-based real-time (3s for open
// conversations, 15s for the buddy list).

// ─── Presence ────────────────────────────────────────────────────────────

export type ChatStatus = "available" | "away" | "invisible";

export const STATUS_OPTIONS: Array<{
  id: ChatStatus;
  label: string;
  blurb: string;
  dotClass: string;   // tailwind color for the status dot
}> = [
  {
    id: "available",
    label: "AVAILABLE",
    blurb: "Online, ready to chat",
    dotClass: "bg-emerald-400",
  },
  {
    id: "away",
    label: "AWAY",
    blurb: "Signed in but not at the keyboard",
    dotClass: "bg-amber-400",
  },
  {
    id: "invisible",
    label: "INVISIBLE",
    blurb: "Buddies see you as offline. You can still chat.",
    dotClass: "bg-zinc-500",
  },
];

export const DEFAULT_STATUS: ChatStatus = "available";

export function isValidStatus(v: unknown): v is ChatStatus {
  return v === "available" || v === "away" || v === "invisible";
}

// Heartbeat cadence — every open tab pings presence at this rate so
// the buddy-list query knows you're still online. 30s is the AIM-like
// sweet spot: fast enough that going offline registers within a minute,
// slow enough that we don't hammer the DB.
export const PRESENCE_HEARTBEAT_MS = 30_000;

// Window for "online right now". Anyone last-seen within this window is
// considered online (unless they picked Invisible). Slightly larger than
// the heartbeat so a single missed ping doesn't flicker someone offline.
export const PRESENCE_ONLINE_WINDOW_SECONDS = 90;

// Polling cadences (client-side).
export const BUDDIES_POLL_MS = 15_000;     // buddy list refresh
export const MESSAGES_POLL_MS = 3_000;     // open chat window
export const TYPING_POLL_MS = 3_000;       // typing indicator
export const TYPING_FRESH_SECONDS = 6;     // "they're typing" if pinged within this window
export const TYPING_PING_DEBOUNCE_MS = 2_000; // don't ping the server more than once per N ms while typing

// ─── Limits ──────────────────────────────────────────────────────────────

export const MESSAGE_BODY_MIN = 1;
export const MESSAGE_BODY_MAX = 2_000;
export const AWAY_MESSAGE_MAX = 200;
export const PROFILE_MAX = 500;
export const MESSAGES_PER_MINUTE = 30;   // per sender, sliding window
export const FRIEND_REQUESTS_PER_HOUR = 20;
export const SEARCH_RESULTS_MAX = 20;

// ─── Domain types ────────────────────────────────────────────────────────

export type FriendshipStatus = "pending" | "accepted" | "declined" | "blocked";

/** How a friendship row relates to the current viewer. */
export type FriendshipDirection =
  | "outgoing"   // viewer sent the request
  | "incoming"   // viewer received it
  | "accepted";  // mutual

/** One buddy as the buddy list sees them. */
export type Buddy = {
  userId: number;
  username: string;          // display name (username → name → email → "anonymous")
  status: ChatStatus;        // their picked status
  presence: "online" | "offline"; // computed: status + last_seen window
  awayMessage: string | null;
  profile: string | null;
  lastSeenAt: string | null; // ISO
  unreadCount: number;       // unread messages FROM this buddy
};

/** Pending requests shown in the "buddy requests" sub-list. */
export type PendingRequest = {
  friendshipId: number;
  userId: number;            // the other person
  username: string;
  direction: "incoming" | "outgoing";
  createdAt: string;
};

/** A search hit when looking for someone by screenname. */
export type UserSearchResult = {
  userId: number;
  username: string;
  presence: "online" | "offline";
  // Relationship to the viewer — drives the button shown on each row.
  relation: "none" | "self" | "pending-out" | "pending-in" | "friends";
};

/** One DM. */
export type ChatMessage = {
  id: number;
  senderId: number;
  recipientId: number;
  body: string;
  createdAt: string;
  readAt: string | null;
};

/** What the buddy list endpoint returns. */
export type BuddiesPayload = {
  ok: true;
  me: {
    userId: number;
    username: string;
    status: ChatStatus;
    awayMessage: string | null;
    profile: string | null;
    soundEnabled: boolean;
  };
  buddies: Buddy[];
  pending: PendingRequest[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Format a relative timestamp for chat — leans on absolute time for
 *  recent messages ("3:42pm") and relative for older ones ("yesterday"). */
export function formatChatTime(iso: string | undefined): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const date = new Date(t);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  if (isYesterday) {
    return "yesterday " + date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Validate a message body before sending. */
export function validateMessageBody(raw: unknown):
  | { ok: true; body: string }
  | { ok: false; error: string } {
  if (typeof raw !== "string") {
    return { ok: false, error: "Message must be text." };
  }
  const trimmed = raw.trim();
  if (trimmed.length < MESSAGE_BODY_MIN) {
    return { ok: false, error: "Message is empty." };
  }
  if (trimmed.length > MESSAGE_BODY_MAX) {
    return { ok: false, error: `Message too long — max ${MESSAGE_BODY_MAX} characters.` };
  }
  return { ok: true, body: trimmed };
}

/** Same SQL fragment we use everywhere to compute display name. Kept as
 *  a const string so callers can spread it into a Neon tagged-template
 *  without losing the username → name → email → "anonymous" fallback. */
export const DISPLAY_NAME_SQL =
  `COALESCE(NULLIF(TRIM(u.username), ''), NULLIF(TRIM(u.name), ''), SPLIT_PART(u.email, '@', 1), 'anonymous')`;
