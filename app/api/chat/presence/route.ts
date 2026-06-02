import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { ensureSchema, sql } from "../../../_lib/db";
import {
  AWAY_MESSAGE_MAX,
  PROFILE_MAX,
  isValidStatus,
} from "../../../_lib/chat";

export const dynamic = "force-dynamic";

// ─── POST /api/chat/presence ──────────────────────────────────────────────
//
// Two responsibilities — the client uses this endpoint as both a
// keep-alive heartbeat (every 30s while a tab is open) AND as the
// settings-update endpoint when the user picks a new status / writes an
// away message / toggles the door sound.
//
// Body fields are all optional:
//   { status?, awayMessage?, profile?, soundEnabled? }
//
// Missing fields are left as-is. With no body at all this just bumps
// chat_last_seen_at — the bare heartbeat case.

type PresenceBody = {
  status?: unknown;
  awayMessage?: unknown;
  profile?: unknown;
  soundEnabled?: unknown;
};

export async function POST(request: Request) {
  await ensureSchema();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }
  const userId = parseInt(session.user.id, 10);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
  }

  // Body is optional — a heartbeat ping sends none.
  let body: PresenceBody = {};
  try {
    body = (await request.json()) as PresenceBody;
  } catch {
    // No body / invalid JSON → treat as pure heartbeat
  }

  // Validate each field individually so a bad value in one doesn't
  // block the heartbeat update.
  const db = sql();

  // Build the SET clause dynamically. Neon's tagged template doesn't let
  // us splice arbitrary SQL fragments, so we issue separate UPDATEs.
  // (Cheaper than it sounds — Neon's HTTP driver pipelines well.)
  await db`
    UPDATE users
    SET chat_last_seen_at = NOW()
    WHERE id = ${userId}
  `;

  if (body.status !== undefined) {
    if (!isValidStatus(body.status)) {
      return NextResponse.json(
        { ok: false, error: "Invalid status." },
        { status: 400 }
      );
    }
    await db`
      UPDATE users SET chat_status = ${body.status} WHERE id = ${userId}
    `;
  }
  if (body.awayMessage !== undefined) {
    const m =
      typeof body.awayMessage === "string"
        ? body.awayMessage.trim().slice(0, AWAY_MESSAGE_MAX)
        : null;
    await db`
      UPDATE users SET chat_away_message = ${m || null} WHERE id = ${userId}
    `;
  }
  if (body.profile !== undefined) {
    const p =
      typeof body.profile === "string"
        ? body.profile.trim().slice(0, PROFILE_MAX)
        : null;
    await db`
      UPDATE users SET chat_profile = ${p || null} WHERE id = ${userId}
    `;
  }
  if (body.soundEnabled !== undefined) {
    const on = body.soundEnabled === true;
    await db`
      UPDATE users SET chat_sound_enabled = ${on} WHERE id = ${userId}
    `;
  }

  return NextResponse.json({ ok: true });
}
