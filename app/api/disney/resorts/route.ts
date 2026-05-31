import { NextResponse } from "next/server";
import { fetchResortCatalog } from "../../../_lib/disney";

// Disney resort catalog — names + categories + thumbnail images.
// Cached for an hour because the catalog changes maybe once a year.

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET() {
  try {
    const resorts = await fetchResortCatalog();
    return NextResponse.json({
      ok: true,
      count: resorts.length,
      resorts,
    });
  } catch (err) {
    console.warn("[disney/resorts] catalog fetch failed:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Catalog fetch failed",
      },
      { status: 502 }
    );
  }
}
