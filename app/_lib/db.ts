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
//
// NOTE: Auth.js v5 (@auth/pg-adapter) needs its own four tables
// (users, accounts, sessions, verification_token). We create them
// here too so the very first sign-in attempt doesn't fail with
// "relation does not exist". Column names use Auth.js's quoted-
// camelCase spelling (e.g. "userId") because the adapter references
// them with double quotes.
export async function ensureSchema(): Promise<void> {
  if (_schemaReady) return;
  const db = sql();

  // ── Auth.js tables (must come before subscribers references below) ──
  await db`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      name          VARCHAR(255),
      email         VARCHAR(255),
      "emailVerified" TIMESTAMPTZ,
      image         TEXT
    )
  `;
  await db`
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique
      ON users (email)
  `;
  await db`
    CREATE TABLE IF NOT EXISTS accounts (
      id                  SERIAL PRIMARY KEY,
      "userId"            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type                VARCHAR(255) NOT NULL,
      provider            VARCHAR(255) NOT NULL,
      "providerAccountId" VARCHAR(255) NOT NULL,
      refresh_token       TEXT,
      access_token        TEXT,
      expires_at          BIGINT,
      id_token            TEXT,
      scope               TEXT,
      session_state       TEXT,
      token_type          TEXT
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS sessions (
      id             SERIAL PRIMARY KEY,
      "userId"       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires        TIMESTAMPTZ NOT NULL,
      "sessionToken" VARCHAR(255) NOT NULL
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS verification_token (
      identifier TEXT NOT NULL,
      expires    TIMESTAMPTZ NOT NULL,
      token      TEXT NOT NULL,
      PRIMARY KEY (identifier, token)
    )
  `;

  // ── user_data: the cross-device sync table.
  //    One row per (user_id, kind) — the value is a JSONB blob the UI
  //    layer interprets. Six kinds for now: recipes, restaurants,
  //    shopping, quests, music-artists, music-cities.
  await db`
    CREATE TABLE IF NOT EXISTS user_data (
      "userId"   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind       TEXT NOT NULL,
      value      JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY ("userId", kind)
    )
  `;

  // ── Disney resort deal watcher tables.
  //
  // disney_watches: one row per (subscriber, configured watch). A user
  //   can have multiple watches for different trip windows.
  // disney_last_prices: most-recent observed price per (watch, resort)
  //   so the cron can detect deltas instead of re-emailing the same
  //   price every run.
  // disney_sent_alerts: dedup table keyed by an arbitrary alert string
  //   so RSS posts and price drops never get sent twice.
  // disney_healthcheck: timeseries of API success — if disney_check
  //   stops returning offers, the cron writes a row so we can spot
  //   the silent failure.
  await db`
    CREATE TABLE IF NOT EXISTS disney_watches (
      id            SERIAL PRIMARY KEY,
      subscriber_id INT NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
      name          TEXT,
      check_in      DATE NOT NULL,
      check_out     DATE NOT NULL,
      adults        INT NOT NULL DEFAULT 2,
      children      INT NOT NULL DEFAULT 0,
      child_ages    INT[] NOT NULL DEFAULT '{}'::INT[],
      resort_ids    TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
      max_price     INT,
      fl_resident   BOOLEAN NOT NULL DEFAULT TRUE,
      postal_code   TEXT DEFAULT '32601',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  // Backfill column for installations that ran ensureSchema before
  // child_ages existed. IF NOT EXISTS makes this idempotent.
  await db`
    ALTER TABLE disney_watches
      ADD COLUMN IF NOT EXISTS child_ages INT[] NOT NULL DEFAULT '{}'::INT[]
  `;
  await db`
    CREATE INDEX IF NOT EXISTS disney_watches_subscriber_idx
      ON disney_watches (subscriber_id)
  `;
  await db`
    CREATE TABLE IF NOT EXISTS disney_last_prices (
      watch_id      INT NOT NULL REFERENCES disney_watches(id) ON DELETE CASCADE,
      resort_id     TEXT NOT NULL,
      last_price    INT NOT NULL,
      last_offer_id TEXT,
      last_seen     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (watch_id, resort_id)
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS disney_sent_alerts (
      subscriber_id INT NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
      alert_key     TEXT NOT NULL,
      sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (subscriber_id, alert_key)
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS disney_healthcheck (
      id               SERIAL PRIMARY KEY,
      checked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      api_ok           BOOLEAN NOT NULL,
      resorts_returned INT,
      error_msg        TEXT
    )
  `;

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

  // ── Creativity Corner — Reddit-style forum (channel 10).
  //
  // posts: top-level "TRANSMISSIONS" with title + markdown body + tags
  // comments: threaded via parent_id self-ref (null = top-level)
  // votes: one row per (user, post) for amplify-toggle
  //
  // Denormalized counts on posts (score, comment_count) so the list
  // view doesn't aggregate on every request. Mutation routes keep
  // them in sync.
  await db`
    CREATE TABLE IF NOT EXISTS creativity_posts (
      id            SERIAL PRIMARY KEY,
      "authorId"    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title         TEXT NOT NULL,
      body          TEXT NOT NULL,
      tags          TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
      score         INTEGER NOT NULL DEFAULT 0,
      comment_count INTEGER NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at    TIMESTAMPTZ
    )
  `;
  await db`
    CREATE INDEX IF NOT EXISTS creativity_posts_created_idx
      ON creativity_posts (created_at DESC) WHERE deleted_at IS NULL
  `;
  await db`
    CREATE INDEX IF NOT EXISTS creativity_posts_score_idx
      ON creativity_posts (score DESC) WHERE deleted_at IS NULL
  `;
  await db`
    CREATE TABLE IF NOT EXISTS creativity_comments (
      id          SERIAL PRIMARY KEY,
      post_id     INTEGER NOT NULL REFERENCES creativity_posts(id) ON DELETE CASCADE,
      parent_id   INTEGER REFERENCES creativity_comments(id) ON DELETE CASCADE,
      "authorId"  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body        TEXT NOT NULL,
      depth       INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at  TIMESTAMPTZ
    )
  `;
  await db`
    CREATE INDEX IF NOT EXISTS creativity_comments_post_idx
      ON creativity_comments (post_id, created_at)
  `;
  await db`
    CREATE TABLE IF NOT EXISTS creativity_votes (
      "userId"    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id     INTEGER NOT NULL REFERENCES creativity_posts(id) ON DELETE CASCADE,
      value       SMALLINT NOT NULL CHECK (value IN (-1, 1)),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY ("userId", post_id)
    )
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
