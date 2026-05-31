import { NextResponse } from "next/server";
import { fetchAvailability } from "../../../_lib/disney";

// Live Disney World resort rate lookup. Proxies the user's filter
// inputs to Disney's internal API. Returns normalized {offers,
// marketingOffers} so the UI can render without knowing the wire
// format Disney uses.
//
// The interesting bit: passing flResident=true sends
// affiliations:["STD_GST","FL_RESIDENT"] to Disney, which returns
// Florida-resident-only rates without requiring a logged-in Disney
// account.

export const dynamic = "force-dynamic";

type Body = {
  checkIn?: unknown;
  checkOut?: unknown;
  adults?: unknown;
  children?: unknown;
  childAges?: unknown;
  flResident?: unknown;
  postalCode?: unknown;
};

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
  // Disney's API requires nonAdultAges to be the same length as childCount.
  // If the caller passed fewer ages than children (or none), pad with
  // age=8 (Disney prices 3-9 as "child"; 8 is a safe middle).
  const rawAges = Array.isArray(body.childAges)
    ? body.childAges.filter((a): a is number => typeof a === "number" && a >= 0 && a < 18)
    : [];
  const childAges: number[] = [];
  for (let i = 0; i < children; i++) {
    childAges.push(typeof rawAges[i] === "number" ? Math.floor(rawAges[i]) : 8);
  }
  const flResident = body.flResident === true;
  const postalCode =
    typeof body.postalCode === "string" && /^\d{5}$/.test(body.postalCode)
      ? body.postalCode
      : "32601";

  try {
    const result = await fetchAvailability({
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      adults,
      children,
      childAges,
      flResident,
      postalCode,
    });

    console.log(
      `[disney/availability] OK — checkIn=${body.checkIn} flRes=${flResident} resorts=${result.offers.length} offers=${result.offers.filter((o) => !o.unavailable).length}`
    );

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Availability fetch failed";
    console.warn("[disney/availability]", msg);
    return NextResponse.json(
      { ok: false, error: msg },
      { status: 502 }
    );
  }
}
