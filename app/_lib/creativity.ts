// Shared types + helpers for the Creativity Corner forum.
//
// Owned by /api/creativity/* routes + /creativity/* pages.

export type Sort = "fresh" | "live" | "signal";

export const SORT_OPTIONS: Array<{ id: Sort; label: string; blurb: string }> = [
  { id: "fresh",  label: "FRESH",  blurb: "Newest transmissions first" },
  { id: "live",   label: "LIVE",   blurb: "Hot right now — score / age decay" },
  { id: "signal", label: "SIGNAL", blurb: "All-time strongest signals" },
];

export const DEFAULT_SORT: Sort = "fresh";

export function isValidSort(v: unknown): v is Sort {
  return v === "fresh" || v === "live" || v === "signal";
}

// Length validators — keep both client + server in sync from one place.
export const POST_TITLE_MIN = 5;
export const POST_TITLE_MAX = 200;
export const POST_BODY_MIN = 10;
export const POST_BODY_MAX = 10_000;
export const COMMENT_BODY_MIN = 5;
export const COMMENT_BODY_MAX = 2_000;
export const TAG_MAX_LENGTH = 30;
export const MAX_TAGS_PER_POST = 5;

// Comment-depth cap. Beyond this the UI flattens further replies +
// shows a "continue thread" link so mobile doesn't run out of pixels.
export const MAX_COMMENT_DEPTH = 5;

// Rate-limit budgets (per user, sliding window). Enforced server-side.
export const POSTS_PER_HOUR = 5;
export const COMMENTS_PER_HOUR = 30;
export const AMPLIFY_PER_HOUR = 200;

// ─── Domain types ────────────────────────────────────────────────────────

export type PostListItem = {
  id: number;
  title: string;
  bodyExcerpt: string;        // first ~200 chars of body, plain text
  tags: string[];
  score: number;
  commentCount: number;
  authorName: string;
  createdAt: string;          // ISO
  viewerAmplified?: boolean;  // set if the requester is signed in
};

export type PostDetail = {
  id: number;
  title: string;
  body: string;               // full markdown
  tags: string[];
  score: number;
  commentCount: number;
  authorId: number;
  authorName: string;
  createdAt: string;
  viewerAmplified?: boolean;
  viewerCanDelete?: boolean;
  viewerIsAdmin?: boolean;    // shows extra mod tools when true
};

export type CommentNode = {
  id: number;
  postId: number;
  parentId: number | null;
  authorId: number;
  authorName: string;
  body: string;
  depth: number;
  createdAt: string;
  deletedAt: string | null;
  deletedByAdmin?: boolean;
  viewerCanDelete?: boolean;
  replies: CommentNode[];     // populated by threadComments() below
};

export type CommentRow = Omit<CommentNode, "replies">;

// ─── Helpers ─────────────────────────────────────────────────────────────

// Build the comment tree from a flat list. We fetch all comments for a
// post in one query (post_id index), then assemble the tree in memory.
// Stable order: replies sorted by created_at asc within each parent.
export function threadComments(flat: CommentRow[]): CommentNode[] {
  const byId = new Map<number, CommentNode>();
  const roots: CommentNode[] = [];
  for (const c of flat) {
    byId.set(c.id, { ...c, replies: [] });
  }
  for (const c of flat) {
    const node = byId.get(c.id)!;
    if (c.parentId == null) {
      roots.push(node);
    } else {
      const parent = byId.get(c.parentId);
      if (parent) parent.replies.push(node);
      else roots.push(node); // orphan (parent deleted) → promote to root
    }
  }
  // Sort: root by createdAt desc (newest top), replies by createdAt asc
  // (chronological within a thread is easier to follow)
  roots.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sortReplies = (nodes: CommentNode[]) => {
    for (const n of nodes) {
      n.replies.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      sortReplies(n.replies);
    }
  };
  sortReplies(roots);
  return roots;
}

// "Live" sort score — Reddit-style: log of score, slow time decay.
// Used in SQL: ORDER BY <this formula> DESC.
// We compute it in app code only when we need a fallback sort; the
// SQL uses a similar expression directly.
export function liveScore(score: number, ageHours: number): number {
  const sign = score < 0 ? -1 : score > 0 ? 1 : 0;
  const order = Math.log10(Math.max(Math.abs(score), 1));
  return sign * order - ageHours / 12;
}

// Plain-text excerpt of markdown body for the list view. Strips
// the heaviest markdown syntax for a clean preview.
export function bodyExcerpt(markdown: string, max = 200): string {
  const stripped = markdown
    .replace(/```[\s\S]*?```/g, "[code]")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_#>~`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped.length <= max) return stripped;
  return stripped.slice(0, max - 1).trimEnd() + "…";
}

// Format relative time. Borrows the rss.ts pattern but tighter for forum.
export function relativeTime(iso: string | undefined): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const ageS = (Date.now() - t) / 1000;
  if (ageS < 60) return "just now";
  if (ageS < 3600) return `${Math.round(ageS / 60)}m ago`;
  if (ageS < 86400) return `${Math.round(ageS / 3600)}h ago`;
  if (ageS < 86400 * 14) return `${Math.round(ageS / 86400)}d ago`;
  if (ageS < 86400 * 60) return `${Math.round(ageS / 86400 / 7)}w ago`;
  return `${Math.round(ageS / 86400 / 30)}mo ago`;
}

// Tag normalization — lowercase, no spaces, dash-separated, capped length.
export function normalizeTag(raw: string): string | null {
  const cleaned = raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  if (!cleaned) return null;
  return cleaned.slice(0, TAG_MAX_LENGTH);
}

export function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of raw) {
    if (typeof t !== "string") continue;
    const n = normalizeTag(t);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
    if (out.length >= MAX_TAGS_PER_POST) break;
  }
  return out;
}
