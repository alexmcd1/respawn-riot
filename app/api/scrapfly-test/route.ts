// TEMPORARY diagnostic route — confirms whether Scrapfly's `js`
// parameter can capture return values AT ALL on the current account
// tier. Hit GET /api/scrapfly-test → response tells us if a literal
// string expression comes back.
//
// Delete this file after we've answered the science question.

import { NextResponse } from "next/server";
import { _diagnoseScrapflyJs } from "../../_lib/universalLive";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await _diagnoseScrapflyJs();
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
