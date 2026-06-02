import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { ensureSchema, sql } from "../../../../_lib/db";

export const dynamic = "force-dynamic";

// Actions on a specific friendship row.
//
//   POST   /api/chat/friends/[id]?action=accept   — addressee accepts
//   POST   /api/chat/friends/[id]?action=decline  — addressee declines
//   DELETE /api/chat/friends/[id]                 — remove buddy / cancel sent request
//
// Only the requester can cancel a pending outgoing request; only the
// addressee can accept/decline. Either side can DELETE an accepted
// friendship to un-buddy.

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  await ensureSchema();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }
  const userId = parseInt(session.user.id, 10);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
  }

  const { id: rawId } = await ctx.params;
  const id = parseInt(rawId, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  if (action !== "accept" && action !== "decline") {
    return NextResponse.json(
      { ok: false, error: "action must be 'accept' or 'decline'" },
      { status: 400 }
    );
  }

  const db = sql();
  const rows = (await db`
    SELECT id, requester_id, addressee_id, status
    FROM chat_friendships
    WHERE id = ${id}
    LIMIT 1
  `) as Array<{
    id: number;
    requester_id: number;
    addressee_id: number;
    status: string;
  }>;
  const row = rows[0];
  if (!row) {
    return NextResponse.json({ ok: false, error: "Request not found" }, { status: 404 });
  }
  // Only the person on the receiving end can accept/decline.
  if (row.addressee_id !== userId) {
    return NextResponse.json({ ok: false, error: "Not your request to act on." }, { status: 403 });
  }
  if (row.status !== "pending") {
    return NextResponse.json({ ok: false, error: "Already handled." }, { status: 409 });
  }

  if (action === "accept") {
    await db`
      UPDATE chat_friendships
      SET status = 'accepted', accepted_at = NOW()
      WHERE id = ${id}
    `;
    return NextResponse.json({ ok: true, state: "friends" });
  }
  // decline
  await db`
    UPDATE chat_friendships SET status = 'declined' WHERE id = ${id}
  `;
  return NextResponse.json({ ok: true, state: "declined" });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  await ensureSchema();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }
  const userId = parseInt(session.user.id, 10);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
  }
  const { id: rawId } = await ctx.params;
  const id = parseInt(rawId, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  const db = sql();
  const rows = (await db`
    SELECT id, requester_id, addressee_id, status
    FROM chat_friendships
    WHERE id = ${id}
    LIMIT 1
  `) as Array<{
    id: number;
    requester_id: number;
    addressee_id: number;
    status: string;
  }>;
  const row = rows[0];
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  // Either side can delete an accepted friendship OR cancel a pending request
  // they themselves sent. (Decline is via POST?action=decline.)
  const isParticipant = row.requester_id === userId || row.addressee_id === userId;
  if (!isParticipant) {
    return NextResponse.json({ ok: false, error: "Not yours" }, { status: 403 });
  }
  if (row.status === "pending" && row.requester_id !== userId) {
    return NextResponse.json(
      { ok: false, error: "Use action=decline to reject an incoming request." },
      { status: 400 }
    );
  }
  await db`DELETE FROM chat_friendships WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
