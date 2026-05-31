import { NextResponse } from "next/server";
import { Resend } from "resend";
import { ensureSchema, isValidEmail, sql } from "../../../_lib/db";

// Subscribe (or update) someone to Disney resort deal alerts.
//
// One subscriber row per email — reused across alert types (concerts,
// Disney) so the same person doesn't get multiple subscriber records.
// Each subscribe call appends/updates a disney_watches row tied to
// that subscriber.
//
// Currently supports ONE watch per subscriber (simplicity). A future
// iteration can let users manage multiple watches in the UI.

export const dynamic = "force-dynamic";

type WatchInput = {
  name?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
  resortIds?: string[];
  maxPrice?: number | null;
  flResident?: boolean;
  postalCode?: string;
};

type Body = {
  email?: unknown;
  watch?: WatchInput;
};

// Lazy Resend init — build-safe when RESEND_API_KEY is missing
let _resend: Resend | null = null;
function resend(): Resend {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  _resend = new Resend(key);
  return _resend;
}

function fromAddress(): string {
  return process.env.EMAIL_FROM ?? "Respawn Riot <onboarding@resend.dev>";
}

function siteOrigin(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://respawnriot.io";
}

function isValidDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request" },
      { status: 400 }
    );
  }

  if (!isValidEmail(body.email)) {
    return NextResponse.json(
      { ok: false, error: "Need a valid email address" },
      { status: 400 }
    );
  }
  const email = body.email.trim().toLowerCase();
  const w = body.watch ?? {};

  if (!isValidDate(w.checkIn) || !isValidDate(w.checkOut)) {
    return NextResponse.json(
      { ok: false, error: "Watch is missing valid checkIn/checkOut dates" },
      { status: 400 }
    );
  }
  if (w.checkIn! >= w.checkOut!) {
    return NextResponse.json(
      { ok: false, error: "checkOut must be after checkIn" },
      { status: 400 }
    );
  }

  const adults = typeof w.adults === "number" ? Math.max(1, Math.min(10, Math.floor(w.adults))) : 2;
  const children = typeof w.children === "number" ? Math.max(0, Math.min(10, Math.floor(w.children))) : 0;
  const resortIds = Array.isArray(w.resortIds)
    ? w.resortIds.filter((s): s is string => typeof s === "string").slice(0, 50)
    : [];
  const maxPrice =
    typeof w.maxPrice === "number" && Number.isFinite(w.maxPrice)
      ? Math.max(50, Math.min(2000, Math.round(w.maxPrice)))
      : null;
  const flResident = w.flResident !== false;
  const postalCode =
    typeof w.postalCode === "string" && /^\d{5}$/.test(w.postalCode)
      ? w.postalCode
      : "32601";
  const watchName = typeof w.name === "string" ? w.name.trim().slice(0, 100) : "";

  try {
    await ensureSchema();
    const db = sql();

    // Upsert subscriber. Same pattern as concert subscribe-alerts:
    // existing email re-uses the row; new email gets a fresh unsub_token.
    const token = crypto.randomUUID();
    const subRows = (await db`
      INSERT INTO subscribers (email, unsub_token)
      VALUES (${email}, ${token})
      ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
      RETURNING id, email, unsub_token, (xmax = 0) AS is_new
    `) as Array<{ id: number; email: string; unsub_token: string; is_new: boolean }>;

    const subscriber = subRows[0];
    if (!subscriber) {
      return NextResponse.json(
        { ok: false, error: "Couldn't save your subscription" },
        { status: 500 }
      );
    }

    // Replace this subscriber's watches with the single incoming one.
    // (Multiple watches per subscriber will need a different flow.)
    await db`DELETE FROM disney_watches WHERE subscriber_id = ${subscriber.id}`;
    const watchRows = (await db`
      INSERT INTO disney_watches (
        subscriber_id, name, check_in, check_out, adults, children,
        resort_ids, max_price, fl_resident, postal_code
      )
      VALUES (
        ${subscriber.id}, ${watchName || null}, ${w.checkIn!}, ${w.checkOut!},
        ${adults}, ${children}, ${resortIds}, ${maxPrice},
        ${flResident}, ${postalCode}
      )
      RETURNING id
    `) as Array<{ id: number }>;

    const watchId = watchRows[0]?.id;
    if (!watchId) {
      return NextResponse.json(
        { ok: false, error: "Couldn't save your watch" },
        { status: 500 }
      );
    }

    // Welcome email — best-effort
    if (subscriber.is_new && process.env.RESEND_API_KEY) {
      const unsubUrl = `${siteOrigin()}/api/unsubscribe?token=${subscriber.unsub_token}`;
      const hotelCount = resortIds.length === 0 ? "all Disney hotels" : `${resortIds.length} hotels`;
      const thresholdLine = maxPrice != null
        ? `<p style="margin: 8px 0 0; color:#bbb;">We'll email you when any drop below <strong style="color:#fff;">$${maxPrice}/night</strong>.</p>`
        : `<p style="margin: 8px 0 0; color:#bbb;">We'll email you any time prices drop or new offers land.</p>`;
      try {
        await resend().emails.send({
          from: fromAddress(),
          to: email,
          subject: "✦ Disney deal alerts are on",
          html: `
            <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0a0a0a; color: #f5f5f5;">
              <h1 style="color: #fb923c; font-size: 14px; letter-spacing: 0.3em; text-transform: uppercase; margin: 0 0 16px;">
                RESPAWN / RIOT — DISNEY DEAL ALERTS
              </h1>
              <p style="margin: 0 0 12px;">You're subscribed. Here's what we're watching:</p>
              <div style="background: #181818; border-left: 3px solid #fb923c; padding: 12px 16px; margin: 16px 0;">
                <p style="margin: 0;"><strong style="color:#fff;">${hotelCount}</strong></p>
                <p style="margin: 4px 0 0; color:#bbb;">Check-in <strong style="color:#fff;">${w.checkIn}</strong> · Check-out <strong style="color:#fff;">${w.checkOut}</strong></p>
                <p style="margin: 4px 0 0; color:#bbb;">${adults} adult${adults === 1 ? "" : "s"}${children > 0 ? `, ${children} child${children === 1 ? "" : "ren"}` : ""}${flResident ? ` · <span style="color:#fb923c;">FL Resident rates</span>` : ""}</p>
                ${thresholdLine}
              </div>
              <p style="font-size: 13px; color: #999;">
                Daily digest runs in the morning. You'll only hear from us when something changes.
              </p>
              <p style="margin-top: 32px; font-size: 12px; color: #666;">
                Change your mind? <a href="${unsubUrl}" style="color: #fb923c;">Unsubscribe in one click</a>.
              </p>
            </div>
          `,
        });
      } catch (err) {
        console.warn("[disney/subscribe-alerts] welcome email failed:", err);
      }
    }

    return NextResponse.json({
      ok: true,
      isNew: subscriber.is_new,
      watchId,
      message: subscriber.is_new
        ? "Subscribed — check your email for the welcome."
        : "Updated your Disney watch.",
    });
  } catch (err) {
    console.error("[disney/subscribe-alerts] DB error:", err);
    return NextResponse.json(
      { ok: false, error: "Database error — try again in a minute" },
      { status: 500 }
    );
  }
}
