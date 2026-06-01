// Temporary diagnostic endpoint — confirms which env vars Vercel
// actually injected into this deploy. Returns only booleans + lengths,
// never raw values. Remove once auth is healthy.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const has = (k: string) => {
    const v = process.env[k];
    return {
      present: typeof v === "string" && v.length > 0,
      length: typeof v === "string" ? v.length : 0,
    };
  };

  // Attempt a trivial Auth.js handler import — catches "Auth.js config
  // failed to construct at module init" errors that otherwise show up
  // as opaque 500s on /api/auth/providers.
  let authImportError: string | null = null;
  try {
    await import("../../../auth");
  } catch (err) {
    authImportError = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  }

  // Connection probe: try the SAME pg Pool config Auth.js's pg adapter
  // uses, and run a trivial query. If this fails, the adapter has no
  // chance of working — and the error message tells us why.
  let dbProbe: { ok: boolean; error?: string; userCount?: number } = { ok: false };
  try {
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
    });
    const r = await pool.query<{ c: string }>("SELECT COUNT(*)::text AS c FROM users");
    dbProbe = { ok: true, userCount: parseInt(r.rows[0]?.c ?? "0", 10) };
    await pool.end();
  } catch (err) {
    dbProbe = {
      ok: false,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    };
  }

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV ?? null,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    vercelUrl: process.env.VERCEL_URL ?? null,
    envVars: {
      AUTH_SECRET: has("AUTH_SECRET"),
      AUTH_URL: has("AUTH_URL"),
      NEXTAUTH_URL: has("NEXTAUTH_URL"),
      NEXTAUTH_SECRET: has("NEXTAUTH_SECRET"),
      DATABASE_URL: has("DATABASE_URL"),
      RESEND_API_KEY: has("RESEND_API_KEY"),
      EMAIL_FROM: has("EMAIL_FROM"),
      CRON_SECRET: has("CRON_SECRET"),
      TICKETMASTER_API_KEY: has("TICKETMASTER_API_KEY"),
      SCRAPFLY_API_KEY: has("SCRAPFLY_API_KEY"),
      BROWSERLESS_TOKEN: has("BROWSERLESS_TOKEN"),
    },
    authImportError,
    dbProbe,
  });
}
