import { NextResponse } from "next/server";
import { Resend } from "resend";
import { ensureSchema, sql } from "../../../_lib/db";

// Daily concert-alerts cron.
//
// Flow per subscriber:
//   1. Load their favorite artists + saved cities
//   2. For each favorite artist, hit Ticketmaster ONCE (no city filter
//      — we get up to 50 upcoming national shows in one call)
//   3. Filter client-side to keep only shows in the subscriber's cities
//   4. Drop any event_id we've already emailed about (sent_notifications)
//   5. If anything is left, send one digest email + record sent_ids
//
// One TM call per (subscriber × artist) instead of per (subscriber ×
// artist × city). Easily fits the 5k/day free tier even with hundreds
// of subscribers and dozens of favorites each.
//
// Auth: protected by Vercel Cron's Authorization header
// (Bearer ${CRON_SECRET}). Manual invocations from a browser without
// that header are rejected.

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes — gives us headroom for many subscribers

const TM_BASE = "https://app.ticketmaster.com/discovery/v2/events.json";
const UA = "respawn-riot/1.0 (+https://respawnriot.io)";

type TMVenue = {
  name?: string;
  city?: { name?: string };
  state?: { stateCode?: string; name?: string };
};
type TMEvent = {
  id: string;
  name: string;
  url?: string;
  dates?: { start?: { localDate?: string; localTime?: string } };
  _embedded?: { venues?: TMVenue[]; attractions?: Array<{ name?: string }> };
};

type MatchedShow = {
  eventId: string;
  artist: string;
  date: string;
  time?: string;
  venue: string;
  city: string;
  region?: string;
  ticketUrl?: string;
};

// Lazy Resend client (RESEND_API_KEY may be missing in some envs)
let _resend: Resend | null = null;
function resend(): Resend {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  _resend = new Resend(key);
  return _resend;
}

function siteOrigin(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://respawnriot.io";
}

// See subscribe-alerts route — same EMAIL_FROM env var override path.
function fromAddress(): string {
  return (
    process.env.EMAIL_FROM ?? "Respawn Riot <onboarding@resend.dev>"
  );
}

async function tmShowsForArtist(
  artist: string,
  apiKey: string
): Promise<TMEvent[]> {
  const params = new URLSearchParams({
    apikey: apiKey,
    keyword: artist,
    classificationName: "music",
    size: "50",
    sort: "date,asc",
  });
  try {
    const res = await fetch(`${TM_BASE}?${params}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[cron] TM HTTP ${res.status} for "${artist}"`);
      return [];
    }
    const data = (await res.json()) as {
      _embedded?: { events?: TMEvent[] };
    };
    return data._embedded?.events ?? [];
  } catch (err) {
    console.warn(`[cron] TM fetch failed for "${artist}":`, err);
    return [];
  }
}

function buildDigestEmail(
  email: string,
  unsubToken: string,
  matches: MatchedShow[]
): { subject: string; html: string } {
  const origin = siteOrigin();
  const unsubUrl = `${origin}/api/unsubscribe?token=${unsubToken}`;

  // Group by artist for readability
  const byArtist = new Map<string, MatchedShow[]>();
  for (const m of matches) {
    const arr = byArtist.get(m.artist) ?? [];
    arr.push(m);
    byArtist.set(m.artist, arr);
  }

  const artistBlocks = [...byArtist.entries()]
    .map(([artist, shows]) => {
      const rows = shows
        .map((s) => {
          const loc = [s.city, s.region].filter(Boolean).join(", ");
          const time = s.time ? ` · ${s.time}` : "";
          const ticketBtn = s.ticketUrl
            ? `<a href="${s.ticketUrl}" style="display:inline-block; margin-top:6px; padding:6px 12px; background:#ff2eb3; color:#000; text-decoration:none; border-radius:6px; font-size:11px; font-weight:600; letter-spacing:0.15em; text-transform:uppercase;">↗ Tickets</a>`
            : "";
          return `
            <tr><td style="padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
              <div style="color:#f5f5f5; font-weight:600;">${s.date}${time}</div>
              <div style="color:#bbb; font-size:14px;">${s.venue} · ${loc}</div>
              ${ticketBtn}
            </td></tr>
          `;
        })
        .join("");
      return `
        <div style="margin: 24px 0 8px;">
          <h2 style="color:#ff2eb3; font-size:13px; letter-spacing:0.2em; text-transform:uppercase; margin:0 0 6px;">★ ${artist}</h2>
          <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">${rows}</table>
        </div>
      `;
    })
    .join("");

  const count = matches.length;
  const artistCount = byArtist.size;
  const subject =
    artistCount === 1
      ? `🎸 New show: ${[...byArtist.keys()][0]}`
      : `🎸 ${count} new shows from ${artistCount} of your favorites`;

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0a0a0a; color: #f5f5f5;">
      <h1 style="color: #ff2eb3; font-size: 14px; margin: 0 0 4px; letter-spacing: 0.3em; text-transform: uppercase;">
        RESPAWN / RIOT — CONCERT ALERTS
      </h1>
      <p style="color:#bbb; margin: 0 0 16px;">
        ${count} new ${count === 1 ? "show" : "shows"} matching your favorites in your saved cities.
      </p>
      ${artistBlocks}
      <p style="margin-top: 32px; font-size: 12px; color: #666;">
        Don't want these? <a href="${unsubUrl}" style="color: #ff2eb3;">Unsubscribe</a>.
        Manage your favorites at <a href="${origin}/music?tab=concerts" style="color: #ff2eb3;">respawnriot.io/music</a>.
      </p>
    </div>
  `;
  return { subject, html };
}

export async function GET(request: Request) {
  // Vercel Cron sends Authorization: Bearer ${CRON_SECRET}. Reject
  // anything that doesn't match so randoms can't trigger emails.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const tmKey = process.env.TICKETMASTER_API_KEY;
  if (!tmKey) {
    console.warn("[cron] TICKETMASTER_API_KEY missing — cannot check shows");
    return NextResponse.json({ ok: false, error: "No TM key" }, { status: 500 });
  }

  try {
    await ensureSchema();
    const db = sql();

    // Load all subscribers with their favorites + cities in one go.
    const subs = (await db`
      SELECT id, email, unsub_token FROM subscribers
    `) as Array<{ id: number; email: string; unsub_token: string }>;

    if (subs.length === 0) {
      return NextResponse.json({ ok: true, subscribers: 0, emailsSent: 0 });
    }

    let emailsSent = 0;
    let totalMatches = 0;
    let tmCallsMade = 0;

    for (const sub of subs) {
      const artists = (await db`
        SELECT artist FROM subscriber_artists WHERE subscriber_id = ${sub.id}
      `) as Array<{ artist: string }>;
      const cities = (await db`
        SELECT city FROM subscriber_cities WHERE subscriber_id = ${sub.id}
      `) as Array<{ city: string }>;
      const alreadySent = (await db`
        SELECT event_id FROM sent_notifications WHERE subscriber_id = ${sub.id}
      `) as Array<{ event_id: string }>;

      if (artists.length === 0) continue;

      const cityFilter = new Set(cities.map((c) => c.city.trim().toLowerCase()));
      const sentSet = new Set(alreadySent.map((s) => s.event_id));
      const matches: MatchedShow[] = [];

      // Fan out per-artist Ticketmaster calls in parallel
      const responses = await Promise.all(
        artists.map((a) => {
          tmCallsMade++;
          return tmShowsForArtist(a.artist, tmKey).then((events) => ({
            artist: a.artist,
            events,
          }));
        })
      );

      for (const { artist, events } of responses) {
        for (const ev of events) {
          const eventId = `tm/${ev.id}`;
          if (sentSet.has(eventId)) continue;
          const v = ev._embedded?.venues?.[0];
          const date = ev.dates?.start?.localDate;
          if (!v || !date) continue;
          const city = (v.city?.name ?? "").trim();
          // City filter: empty = nationwide; otherwise case-insensitive match
          if (cityFilter.size > 0 && !cityFilter.has(city.toLowerCase())) continue;

          matches.push({
            eventId,
            artist: ev._embedded?.attractions?.[0]?.name?.trim() || artist,
            date,
            time: ev.dates?.start?.localTime?.slice(0, 5),
            venue: v.name ?? "TBA",
            city,
            region: v.state?.stateCode || v.state?.name,
            ticketUrl: ev.url,
          });
        }
      }

      if (matches.length === 0) continue;

      // Send the digest
      try {
        const { subject, html } = buildDigestEmail(sub.email, sub.unsub_token, matches);
        await resend().emails.send({
          from: fromAddress(),
          to: sub.email,
          subject,
          html,
        });
        emailsSent++;
        totalMatches += matches.length;

        // Record what we sent so we don't email the same events again
        for (const m of matches) {
          await db`
            INSERT INTO sent_notifications (subscriber_id, event_id)
            VALUES (${sub.id}, ${m.eventId})
            ON CONFLICT DO NOTHING
          `;
        }
      } catch (err) {
        console.warn(`[cron] Failed to send/record for ${sub.email}:`, err);
      }
    }

    console.log(
      `[cron] check-favorites OK — subscribers=${subs.length} TMcalls=${tmCallsMade} emails=${emailsSent} matches=${totalMatches}`
    );
    return NextResponse.json({
      ok: true,
      subscribers: subs.length,
      tmCallsMade,
      emailsSent,
      totalMatches,
    });
  } catch (err) {
    console.error("[cron] check-favorites failed:", err);
    return NextResponse.json(
      { ok: false, error: "Cron job failed" },
      { status: 500 }
    );
  }
}
