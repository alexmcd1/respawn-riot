// Neon Postgres client + idempotent schema init.
//
// We use @neondatabase/serverless because it talks Postgres over HTTP/
// fetch — perfect fit for Vercel serverless functions (no persistent
// connections to manage, no warm-pool weirdness).
//
// Init: every route that needs the DB calls `ensureSchema()` once per
// process lifetime. CREATE TABLE IF NOT EXISTS makes it safe to run
// many times — only the first execution actually creates anything.

import { neon } from "@neondatabase/serverless";

// Lazy-init so we don't crash at import time when DATABASE_URL isn't
// set (e.g. during `next build` when env isn't loaded yet).
type SqlClient = ReturnType<typeof neon>;
let _sql: SqlClient | null = null;
let _schemaReady = false;

export function sql(): SqlClient {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to Vercel env vars (Production + Preview + Development)."
    );
  }
  _sql = neon(url);
  return _sql;
}

// Idempotent table creation. Runs the first time any route needs the
// DB; cached after that for the rest of the function's warm lifetime.
export async function ensureSchema(): Promise<void> {
  if (_schemaReady) return;
  const db = sql();
  // Each CREATE TABLE IF NOT EXISTS is its own statement — Neon's HTTP
  // driver doesn't multiplex DDL like a regular Postgres connection.
  await db`
    CREATE TABLE IF NOT EXISTS subscribers (
      id           SERIAL PRIMARY KEY,
      email        TEXT NOT NULL UNIQUE,
      unsub_token  TEXT NOT NULL UNIQUE,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS subscriber_artists (
      subscriber_id  INT NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
      artist         TEXT NOT NULL,
      PRIMARY KEY (subscriber_id, artist)
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS subscriber_cities (
      subscriber_id  INT NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
      city           TEXT NOT NULL,
      PRIMARY KEY (subscriber_id, city)
    )
  `;
  // sent_notifications keeps us from emailing the same show twice.
  // Composite PK = one row per (subscriber, event) pair.
  await db`
    CREATE TABLE IF NOT EXISTS sent_notifications (
      subscriber_id  INT NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
      event_id       TEXT NOT NULL,
      sent_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (subscriber_id, event_id)
    )
  `;
  // Index for cron-job hot path: "what have I already sent to subscriber X?"
  await db`
    CREATE INDEX IF NOT EXISTS sent_notifications_subscriber_idx
      ON sent_notifications (subscriber_id)
  `;
  _schemaReady = true;
}

// Email + token validators. Keep both server-side to defend against
// junk POSTs.
export function isValidEmail(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const trimmed = s.trim();
  // Pragmatic regex — covers ~all real emails without being too strict
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed) && trimmed.length <= 200;
}

export function isValidToken(s: unknown): s is string {
  return typeof s === "string" && /^[a-f0-9-]{20,80}$/i.test(s.trim());
}

// Type-safe row helpers — Neon's HTTP driver returns Record<string, unknown>[]
export type Subscriber = {
  id: number;
  email: string;
  unsub_token: string;
  created_at: string;
  updated_at: string;
};
