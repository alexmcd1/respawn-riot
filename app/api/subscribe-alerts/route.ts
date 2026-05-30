import { NextResponse } from "next/server";
import { Resend } from "resend";
import { ensureSchema, isValidEmail, sql } from "../../_lib/db";

// Subscribe (or update) someone to concert alerts. Replaces their saved
// artists + cities every call — the UI sends the current full
// localStorage state, so this stays a simple "sync now" endpoint rather
// than a finer-grained add/remove API.
//
// On first subscribe we generate an unsub_token and send a welcome
// email with the unsubscribe link. On re-subscribe (existing email) we
// re-use the existing token + skip the welcome.

export const dynamic = "force-dynamic";

type Body = {
  email?: unknown;
  artists?: unknown;   // string[]
  cities?: unknown;    // string[]
};

// Lazy Resend init — same pattern as the newsletter route so build-time
// doesn't crash when RESEND_API_KEY is missing.
let _resend: Resend | null = null;
function resend(): Resend {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  _resend = new Resend(key);
  return _resend;
}

function normStrings(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  const seen = new Map<string, string>();
  for (const item of v) {
    if (typeof item !== "string") continue;
    const clean = item.trim();
    if (!clean) continue;
    if (clean.length > 200) continue;
    const k = clean.toLowerCase();
    if (seen.has(k)) continue;
    seen.set(k, clean);
    if (seen.size >= max) break;
  }
  return [...seen.values()];
}

// Lightweight UUID — Web Crypto is available in Vercel runtime
function newToken(): string {
  return crypto.randomUUID();
}

// Site origin for unsub links. Prefer NEXT_PUBLIC_SITE_URL if set;
// fall back to Vercel's auto-injected VERCEL_URL; final fallback to
// the prod domain so local-dev emails still have a clickable link.
function siteOrigin(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://respawnriot.io";
}

// Sender. Defaults to Resend's sandbox (works without domain verification
// but only delivers to the Resend account holder's own email). Override
// with EMAIL_FROM="Respawn Riot <noreply@respawnriot.io>" once the
// respawnriot.io domain is verified at resend.com/domains.
function fromAddress(): string {
  return (
    process.env.EMAIL_FROM ?? "Respawn Riot <onboarding@resend.dev>"
  );
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
  const artists = normStrings(body.artists, 100);
  const cities = normStrings(body.cities, 50);

  if (artists.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Add at least one favorite artist before subscribing" },
      { status: 400 }
    );
  }

  try {
    await ensureSchema();
    const db = sql();

    // Upsert subscriber, return the row (existing or newly created)
    const token = newToken();
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

    // Replace artist + city sets. Simpler than diffing — the UI sends
    // the current authoritative list every call.
    await db`DELETE FROM subscriber_artists WHERE subscriber_id = ${subscriber.id}`;
    if (artists.length > 0) {
      // Multi-row insert via VALUES list. Neon's HTTP driver doesn't
      // support array params for VALUES, so we loop. Each is cheap.
      for (const a of artists) {
        await db`
          INSERT INTO subscriber_artists (subscriber_id, artist)
          VALUES (${subscriber.id}, ${a})
          ON CONFLICT DO NOTHING
        `;
      }
    }
    await db`DELETE FROM subscriber_cities WHERE subscriber_id = ${subscriber.id}`;
    for (const c of cities) {
      await db`
        INSERT INTO subscriber_cities (subscriber_id, city)
        VALUES (${subscriber.id}, ${c})
        ON CONFLICT DO NOTHING
      `;
    }

    // Welcome email on first subscribe only (re-subscribes are a quiet
    // update). Best-effort — DB write already succeeded.
    if (subscriber.is_new && process.env.RESEND_API_KEY) {
      const unsubUrl = `${siteOrigin()}/api/unsubscribe?token=${subscriber.unsub_token}`;
      const artistList = artists.slice(0, 10).join(", ") +
        (artists.length > 10 ? `, +${artists.length - 10} more` : "");
      const cityList = cities.length > 0
        ? cities.join(", ")
        : "nationwide";
      try {
        await resend().emails.send({
          from: fromAddress(),
          to: email,
          subject: "🎸 You're on the list — concert alerts active",
          html: `
            <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0a0a0a; color: #f5f5f5;">
              <h1 style="color: #ff2eb3; font-size: 24px; margin: 0 0 16px; letter-spacing: 0.05em;">
                RESPAWN / RIOT — CONCERT ALERTS
              </h1>
              <p>You're subscribed. We'll email you when any of your favorite artists announce shows in your saved cities.</p>
              <div style="background: #181818; border-left: 3px solid #ff2eb3; padding: 12px 16px; margin: 16px 0;">
                <p style="margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; color: #ff2eb3;">Watching</p>
                <p style="margin: 0; color: #f5f5f5;">${artistList}</p>
                <p style="margin: 12px 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; color: #ff2eb3;">Cities</p>
                <p style="margin: 0; color: #f5f5f5;">${cityList}</p>
              </div>
              <p style="font-size: 13px; color: #999;">
                Digest runs daily. You'll only get an email when there's actually a new show — no daily noise.
              </p>
              <p style="margin-top: 32px; font-size: 12px; color: #666;">
                Change your mind? <a href="${unsubUrl}" style="color: #ff2eb3;">Unsubscribe in one click</a>.
              </p>
            </div>
          `,
        });
      } catch (err) {
        // Don't fail the request — the subscription is saved either way.
        console.warn("[subscribe-alerts] welcome email failed:", err);
      }
    }

    return NextResponse.json({
      ok: true,
      isNew: subscriber.is_new,
      message: subscriber.is_new
        ? "Subscribed — check your email for a confirmation."
        : "Updated your favorites and cities.",
      artistCount: artists.length,
      cityCount: cities.length,
    });
  } catch (err) {
    console.error("[subscribe-alerts] DB error:", err);
    return NextResponse.json(
      { ok: false, error: "Database error — try again in a minute" },
      { status: 500 }
    );
  }
}
