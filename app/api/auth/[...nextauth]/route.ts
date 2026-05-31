// Auth.js route handler — delegates all GET/POST to the NextAuth config
// (sign-in, sign-out, callback URLs, session check, etc).
//
// We wrap each method with ensureSchema() so the very first sign-in
// attempt on a fresh deploy doesn't fail trying to write to tables
// that haven't been created yet. ensureSchema is cached after first
// successful run, so the overhead is one extra cheap query per cold
// start, then nothing.

import { handlers } from "../../../../auth";
import { ensureSchema } from "../../../_lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await ensureSchema();
  } catch (err) {
    console.error("[auth route] ensureSchema failed:", err);
  }
  return handlers.GET(req);
}

export async function POST(req: Request) {
  try {
    await ensureSchema();
  } catch (err) {
    console.error("[auth route] ensureSchema failed:", err);
  }
  return handlers.POST(req);
}
