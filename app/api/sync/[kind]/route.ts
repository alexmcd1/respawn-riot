import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { ensureSchema, sql } from "../../../_lib/db";

// Per-user data sync. One row per (userId, kind) in user_data.
//
// GET  /api/sync/<kind>   → { ok, value: <JSONB>|null, updated_at }
// PUT  /api/sync/<kind>   → upsert { value } from body
//
// Kinds are an allowlist so the UI can't write arbitrary keys to the
// db (and so we can evolve the on-disk JSONB shape per kind without a
// migration). Caller is responsible for the shape — server stores
// it verbatim.

export const dynamic = "force-dynamic";

const ALLOWED_KINDS = new Set([
  "recipes",          // SavedRecipe[]
  "restaurants",      // Rating[]
  "shopping",         // ShoppingItem[]
  "quests",           // Quest[]            (the simple shared "quest-list" sidebar lib)
  "music-artists",    // string[]
  "music-cities",     // string[]
  "questlist",        // Full /quest-list iframe app state (tasks, XP, projects,
                      // settings, etc.). Pushed/pulled directly from inside the
                      // iframe at public/games/questlist/index.html — same origin
                      // so the Auth.js session cookie rides along.
]);

function badRequest(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

async function requireSession() {
  const session = await auth();
  const userIdRaw = session?.user?.id;
  if (!userIdRaw) return null;
  const userId = parseInt(userIdRaw, 10);
  if (Number.isNaN(userId)) return null;
  return userId;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ kind: string }> }
) {
  const { kind } = await context.params;
  if (!ALLOWED_KINDS.has(kind)) return badRequest("Unknown sync kind");

  const userId = await requireSession();
  if (userId === null) return badRequest("Not signed in", 401);

  try {
    await ensureSchema();
    const db = sql();
    const rows = (await db`
      SELECT value, updated_at
      FROM user_data
      WHERE "userId" = ${userId} AND kind = ${kind}
      LIMIT 1
    `) as Array<{ value: unknown; updated_at: string }>;
    const row = rows[0];
    if (!row) {
      return NextResponse.json({ ok: true, value: null, updated_at: null });
    }
    return NextResponse.json({
      ok: true,
      value: row.value,
      updated_at: row.updated_at,
    });
  } catch (err) {
    console.error("[sync GET]", kind, err);
    return badRequest("Database error", 500);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ kind: string }> }
) {
  const { kind } = await context.params;
  if (!ALLOWED_KINDS.has(kind)) return badRequest("Unknown sync kind");

  const userId = await requireSession();
  if (userId === null) return badRequest("Not signed in", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  if (!body || typeof body !== "object" || !("value" in body)) {
    return badRequest('Body must be { "value": <data> }');
  }
  const value = (body as { value: unknown }).value;

  // Cheap size guard — JSONB rows shouldn't be huge. 1MB is plenty
  // for any of our kinds (recipes are biggest at maybe ~500 bytes each).
  const sizeBytes = JSON.stringify(value).length;
  if (sizeBytes > 1024 * 1024) {
    return badRequest("Payload too large (>1MB)", 413);
  }

  try {
    await ensureSchema();
    const db = sql();
    const rows = (await db`
      INSERT INTO user_data ("userId", kind, value, updated_at)
      VALUES (${userId}, ${kind}, ${JSON.stringify(value)}::jsonb, NOW())
      ON CONFLICT ("userId", kind) DO UPDATE
        SET value = EXCLUDED.value, updated_at = NOW()
      RETURNING updated_at
    `) as Array<{ updated_at: string }>;
    return NextResponse.json({
      ok: true,
      updated_at: rows[0]?.updated_at ?? new Date().toISOString(),
      sizeBytes,
    });
  } catch (err) {
    console.error("[sync PUT]", kind, err);
    return badRequest("Database error", 500);
  }
}
