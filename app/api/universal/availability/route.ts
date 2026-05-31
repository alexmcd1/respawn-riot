import { NextResponse } from "next/server";
import { fetchUniversalLiveRates } from "../../../_lib/universalLive";

// Live Universal Orlando hotel rates via Browserless.io.
//
// Universal's booking API blocks server-side requests with Akamai bot
// detection. This route uses Browserless to spin up a real Chrome
// instance, visit universalorlando.com to establish a session, and
// make the rate fetch from within the page context. Slower (3-8s vs
// Disney's ~1s) but reliably bypasses the bot wall.
//
// Returns the same shape as Disney's availability route so the UI can
// treat them similarly.

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Browserless can take 10-30s

type Body = {
  checkIn?: unknown;
  checkOut?: unknown;
  adults?: unknown;
  children?: unknown;
  promoCode?: unknown;
};

function isValidDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

const VALID_PROMOS = new Set(["FLO", "AAA", "AP", "MIL"]);

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

  if (!isValidDate(body.checkIn) || !isValidDate(body.checkOut)) {
    return NextResponse.json(
      { ok: false, error: "checkIn and checkOut must be yyyy-mm-dd" },
      { status: 400 }
    );
  }
  if (body.checkIn >= body.checkOut) {
    return NextResponse.json(
      { ok: false, error: "checkOut must be after checkIn" },
      { status: 400 }
    );
  }

  const adults =
    typeof body.adults === "number" && body.adults >= 1
      ? Math.min(10, Math.floor(body.adults))
      : 2;
  const children =
    typeof body.children === "number" && body.children >= 0
      ? Math.min(10, Math.floor(body.children))
      : 0;
  const promoCode =
    typeof body.promoCode === "string" && VALID_PROMOS.has(body.promoCode)
      ? (body.promoCode as "FLO" | "AAA" | "AP" | "MIL")
      : undefined;

  const startedAt = Date.now();
  try {
    const offers = await fetchUniversalLiveRates({
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      adults,
      children,
      promoCode,
    });
    const ms = Date.now() - startedAt;
    console.log(
      `[universal/availability] OK in ${ms}ms — promo=${promoCode ?? "none"} hotels=${offers.length}`
    );
    return NextResponse.json({ ok: true, offers, fetchedInMs: ms });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Browserless fetch failed";
    const ms = Date.now() - startedAt;
    console.warn(`[universal/availability] FAILED in ${ms}ms — ${msg}`);
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
