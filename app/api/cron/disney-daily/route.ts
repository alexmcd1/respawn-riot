import { NextResponse } from "next/server";
import { Resend } from "resend";
import { ensureSchema, sql } from "../../../_lib/db";
import { fetchAvailability } from "../../../_lib/disney";
import {
  fetchParkDeals,
  disneyDeals,
  universalDeals,
  type ParkDeal,
} from "../../../_lib/parkDeals";

// Daily Disney deal cron. Three jobs in one route (Vercel Hobby cap is
// 2 cron slots; concerts already uses one):
//
//   1. PRICE WATCH — for each subscriber with a disney_watches row,
//      call Disney's API with their config and compare to
//      disney_last_prices. Email a digest when prices drop OR a new
//      marketing offer is detected.
//
//   2. RSS — pull MouseSavers + Disney Tourist Blog + AllEars deal-
//      category feeds. Filter posts whose title mentions a discount
//      keyword. Email subscribers with the RSS alert option (currently
//      everyone with a Disney watch — they opted in already).
//
//   3. HEALTHCHECK — make a known-good Disney API call. Persist
//      pass/fail to disney_healthcheck so a silent breakage gets
//      logged. If failed N times in a row, set a flag the admin can
//      surface (future enhancement).
//
// Auth: protected by Vercel Cron's Authorization: Bearer ${CRON_SECRET}
// header. Same secret as the concerts cron.

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — plenty for current scale

// RSS feed list + keyword filter + park-tagging logic all live in
// app/_lib/parkDeals.ts so the cron and the Orlando page agree on
// what counts as a deal.

// ─── Email helpers (mirror the concerts cron pattern) ─────────────────────

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

// ─── Domain types ────────────────────────────────────────────────────────

type SubscriberRow = { id: number; email: string; unsub_token: string };
type WatchRow = {
  id: number;
  subscriber_id: number;
  name: string | null;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  child_ages: number[];
  resort_ids: string[];
  max_price: number | null;
  fl_resident: boolean;
  postal_code: string | null;
};

type PriceDrop = {
  resortId: string;
  resortName?: string;
  newPrice: number;
  oldPrice?: number;
  offerName?: string;
  packageName?: string;
  underThreshold: boolean;
};

type NewOffer = {
  resortId: string;
  resortName?: string;
  offerName: string;
  packageName?: string;
  price: number;
};

type RssDeal = {
  source: string;
  title: string;
  link: string;
  pubDate?: string;
};

// ─── Digest email composer ────────────────────────────────────────────────

function buildDigest(
  email: string,
  unsubToken: string,
  drops: PriceDrop[],
  newOffers: NewOffer[],
  rss: RssDeal[]
): { subject: string; html: string } {
  const origin = siteOrigin();
  const unsubUrl = `${origin}/api/unsubscribe?token=${unsubToken}`;

  // Build subject line — prefer concrete numbers if we have them
  let subject = "✦ Disney deal update";
  if (drops.length > 0) {
    const best = drops.reduce((a, b) => (a.newPrice <= b.newPrice ? a : b));
    subject = `✦ Disney: ${best.resortName ?? "a hotel"} at $${Math.round(best.newPrice)}/night`;
  } else if (newOffers.length > 0) {
    subject = `✦ New Disney offer: ${newOffers[0].offerName}`;
  } else if (rss.length > 0) {
    subject = `✦ ${rss.length} new Disney deal post${rss.length === 1 ? "" : "s"}`;
  }

  // Blocks of HTML — empty arrays just render nothing
  const dropsHtml = drops.length === 0
    ? ""
    : `
      <h2 style="color:#fb923c; font-size:13px; letter-spacing:0.2em; text-transform:uppercase; margin:24px 0 8px;">Price drops</h2>
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
        ${drops.map((d) => {
          const thresholdBadge = d.underThreshold
            ? `<span style="background:#10b981; color:#000; padding:2px 8px; border-radius:6px; font-size:10px; text-transform:uppercase; letter-spacing:0.15em; margin-left:6px;">under your threshold</span>`
            : "";
          const oldPrice = d.oldPrice
            ? `<span style="color:#888; text-decoration:line-through; margin-right:6px;">$${Math.round(d.oldPrice)}</span>`
            : "";
          return `
            <tr><td style="padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
              <div style="color:#fff; font-weight:600;">${d.resortName ?? `Resort ${d.resortId}`}${thresholdBadge}</div>
              <div style="color:#bbb; font-size:14px; margin-top:2px;">
                ${oldPrice}<strong style="color:#fb923c;">$${Math.round(d.newPrice)}/night</strong>
                ${d.offerName ? ` · ${d.offerName}` : ""}
              </div>
            </td></tr>`;
        }).join("")}
      </table>
    `;

  const newOffersHtml = newOffers.length === 0
    ? ""
    : `
      <h2 style="color:#fb923c; font-size:13px; letter-spacing:0.2em; text-transform:uppercase; margin:24px 0 8px;">New offers</h2>
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
        ${newOffers.map((o) => `
          <tr><td style="padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
            <div style="color:#fff; font-weight:600;">${o.offerName}</div>
            <div style="color:#bbb; font-size:14px; margin-top:2px;">
              ${o.resortName ?? `Resort ${o.resortId}`} · <strong style="color:#fb923c;">$${Math.round(o.price)}/night</strong>
            </div>
          </td></tr>`).join("")}
      </table>
    `;

  const rssHtml = rss.length === 0
    ? ""
    : `
      <h2 style="color:#fb923c; font-size:13px; letter-spacing:0.2em; text-transform:uppercase; margin:24px 0 8px;">From the Disney deal blogs</h2>
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
        ${rss.map((r) => `
          <tr><td style="padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
            <a href="${r.link}" style="color:#fff; text-decoration:none; font-weight:600;">${r.title}</a>
            <div style="color:#888; font-size:12px; margin-top:2px;">${r.source}</div>
          </td></tr>`).join("")}
      </table>
    `;

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0a0a0a; color: #f5f5f5;">
      <h1 style="color: #fb923c; font-size: 14px; margin: 0 0 4px; letter-spacing: 0.3em; text-transform: uppercase;">
        RESPAWN / RIOT — DISNEY DEAL ALERTS
      </h1>
      <p style="color:#bbb; margin: 0 0 16px;">
        ${drops.length + newOffers.length + rss.length} new ${drops.length + newOffers.length + rss.length === 1 ? "update" : "updates"} for your watch.
      </p>
      ${dropsHtml}
      ${newOffersHtml}
      ${rssHtml}
      <p style="margin-top: 32px; font-size: 12px; color: #666;">
        Don&apos;t want these? <a href="${unsubUrl}" style="color: #fb923c;">Unsubscribe</a>.
        Tweak your watch at <a href="${origin}/orlando?tab=disney-deals" style="color: #fb923c;">respawnriot.io/orlando</a>.
      </p>
    </div>
  `;
  return { subject, html };
}

// ─── Main handler ────────────────────────────────────────────────────────

export async function GET(request: Request) {
  // Cron auth — same secret as concerts
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  await ensureSchema();
  const db = sql();

  // ── 1. HEALTHCHECK ─────────────────────────────────────────────────────
  // Known-good query: 90 days out, 2 adults, no city/zip filtering.
  // If this comes back empty or errors, Disney's API shape may have
  // changed and the price-watch step will probably be wrong.
  const ninetyDaysOut = new Date(Date.now() + 90 * 86400_000)
    .toISOString()
    .slice(0, 10);
  const fourDaysLater = new Date(Date.now() + 94 * 86400_000)
    .toISOString()
    .slice(0, 10);
  let healthOk = false;
  let healthCount = 0;
  let healthErr: string | null = null;
  try {
    const r = await fetchAvailability({
      checkIn: ninetyDaysOut,
      checkOut: fourDaysLater,
      adults: 2,
      children: 0,
      flResident: false,
      postalCode: "32601",
    });
    healthCount = r.offers.filter((o) => !o.unavailable).length;
    healthOk = healthCount > 0;
  } catch (err) {
    healthErr = err instanceof Error ? err.message : String(err);
  }
  await db`
    INSERT INTO disney_healthcheck (api_ok, resorts_returned, error_msg)
    VALUES (${healthOk}, ${healthCount}, ${healthErr})
  `;
  console.log(`[cron/disney] healthcheck ok=${healthOk} resorts=${healthCount} err=${healthErr ?? "none"}`);

  // ── 2. RSS DEAL FEEDS ─────────────────────────────────────────────────
  // fetchParkDeals returns both Disney and Universal deal posts tagged
  // by park. For now this cron only emails subscribers with Disney
  // watches, so we narrow to disneyDeals() (which also includes posts
  // tagged "both" Disney + Universal — relevant to either audience).
  let parkRss: ParkDeal[] = [];
  let rssDeals: RssDeal[] = [];
  try {
    parkRss = await fetchParkDeals();
    rssDeals = disneyDeals(parkRss).map((i) => ({
      source: i.source,
      title: i.title,
      link: i.link,
      pubDate: i.pubDate,
    }));
  } catch (err) {
    console.warn("[cron/disney] RSS fetch failed:", err);
  }
  console.log(
    `[cron/disney] RSS deal posts — total=${parkRss.length} disney+both=${rssDeals.length} universal+both=${universalDeals(parkRss).length}`
  );

  // ── 3. SUBSCRIBERS LOOP ───────────────────────────────────────────────
  // Pull every subscriber with at least one Disney watch.
  const subs = (await db`
    SELECT DISTINCT s.id, s.email, s.unsub_token
    FROM subscribers s
    JOIN disney_watches w ON w.subscriber_id = s.id
  `) as SubscriberRow[];

  let emailsSent = 0;
  let totalDrops = 0;
  let totalNewOffers = 0;

  for (const sub of subs) {
    const watches = (await db`
      SELECT id, subscriber_id, name, check_in::text AS check_in, check_out::text AS check_out,
             adults, children, child_ages, resort_ids, max_price, fl_resident, postal_code
      FROM disney_watches WHERE subscriber_id = ${sub.id}
    `) as WatchRow[];
    if (watches.length === 0) continue;

    // Dedup set for RSS posts — by link
    const sentAlerts = (await db`
      SELECT alert_key FROM disney_sent_alerts WHERE subscriber_id = ${sub.id}
    `) as Array<{ alert_key: string }>;
    const sentSet = new Set(sentAlerts.map((a) => a.alert_key));

    const drops: PriceDrop[] = [];
    const newOffers: NewOffer[] = [];

    for (const w of watches) {
      let avail: Awaited<ReturnType<typeof fetchAvailability>>;
      try {
        avail = await fetchAvailability({
          checkIn: w.check_in,
          checkOut: w.check_out,
          adults: w.adults,
          children: w.children,
          // Required by Disney's API when children > 0 (FIELD_VALIDATION_ERRORS otherwise)
          childAges: Array.isArray(w.child_ages) ? w.child_ages : [],
          flResident: w.fl_resident,
          postalCode: w.postal_code ?? "32601",
        });
      } catch (err) {
        console.warn(`[cron/disney] availability failed for watch ${w.id}:`, err);
        continue;
      }

      // Filter offers to the watch's selected resorts (empty = all)
      const filtered = w.resort_ids.length === 0
        ? avail.offers
        : avail.offers.filter((o) => w.resort_ids.includes(o.resortId));

      // Load last-known prices for this watch
      const lastRows = (await db`
        SELECT resort_id, last_price, last_offer_id
        FROM disney_last_prices WHERE watch_id = ${w.id}
      `) as Array<{ resort_id: string; last_price: number; last_offer_id: string | null }>;
      const lastMap = new Map(
        lastRows.map((r) => [r.resort_id, { price: r.last_price, offerId: r.last_offer_id }])
      );

      for (const o of filtered) {
        if (o.unavailable) continue;
        if (typeof o.basePrice !== "number") continue;
        const prev = lastMap.get(o.resortId);
        const price = Math.round(o.basePrice);

        // Detect drops: price went down by at least $5 from last seen
        if (prev && price < prev.price - 4) {
          const dropKey = `drop:${w.id}:${o.resortId}:${price}`;
          if (!sentSet.has(dropKey)) {
            drops.push({
              resortId: o.resortId,
              newPrice: price,
              oldPrice: prev.price,
              offerName: o.offerName,
              packageName: o.packageName,
              underThreshold: w.max_price != null && price <= w.max_price,
            });
            sentSet.add(dropKey);
          }
        }
        // Detect new offers: marketingOfferId changed (or first ever)
        if (o.marketingOfferId && (!prev || prev.offerId !== o.marketingOfferId)) {
          const offerKey = `offer:${w.id}:${o.resortId}:${o.marketingOfferId}`;
          if (!sentSet.has(offerKey)) {
            if (o.offerName) {
              newOffers.push({
                resortId: o.resortId,
                offerName: o.offerName,
                packageName: o.packageName,
                price,
              });
              sentSet.add(offerKey);
            }
          }
        }

        // Update / insert last_prices
        await db`
          INSERT INTO disney_last_prices (watch_id, resort_id, last_price, last_offer_id, last_seen)
          VALUES (${w.id}, ${o.resortId}, ${price}, ${o.marketingOfferId ?? null}, NOW())
          ON CONFLICT (watch_id, resort_id) DO UPDATE
            SET last_price = EXCLUDED.last_price,
                last_offer_id = EXCLUDED.last_offer_id,
                last_seen = NOW()
        `;
      }
    }

    // Filter RSS to ones not yet sent to this subscriber
    const freshRss = rssDeals.filter((r) => !sentSet.has(`rss:${r.link}`)).slice(0, 8);

    const totalUpdates = drops.length + newOffers.length + freshRss.length;
    if (totalUpdates === 0) continue;

    // Send digest
    try {
      const { subject, html } = buildDigest(sub.email, sub.unsub_token, drops, newOffers, freshRss);
      await resend().emails.send({
        from: fromAddress(),
        to: sub.email,
        subject,
        html,
      });
      emailsSent++;
      totalDrops += drops.length;
      totalNewOffers += newOffers.length;

      // Record everything we just emailed so dedup works on the next run
      const toRecord: string[] = [
        ...drops.map((d) => `drop:${watches.find((w) => true)?.id}:${d.resortId}:${d.newPrice}`),
        ...newOffers.map((o) => {
          const w = watches[0];
          return `offer:${w.id}:${o.resortId}:${o.offerName}`;
        }),
        ...freshRss.map((r) => `rss:${r.link}`),
      ];
      for (const key of toRecord) {
        await db`
          INSERT INTO disney_sent_alerts (subscriber_id, alert_key)
          VALUES (${sub.id}, ${key})
          ON CONFLICT DO NOTHING
        `;
      }
    } catch (err) {
      console.warn(`[cron/disney] email send failed for ${sub.email}:`, err);
    }
  }

  console.log(
    `[cron/disney] DONE subscribers=${subs.length} emails=${emailsSent} drops=${totalDrops} newOffers=${totalNewOffers} rss=${rssDeals.length} health=${healthOk ? "OK" : "FAIL"}`
  );

  return NextResponse.json({
    ok: true,
    subscribers: subs.length,
    emailsSent,
    totalDrops,
    totalNewOffers,
    rssDealsFound: rssDeals.length,
    health: { ok: healthOk, resorts: healthCount, error: healthErr },
  });
}
