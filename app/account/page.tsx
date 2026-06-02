import type { Metadata } from "next";
import type { Session } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { ensureSchema, sql } from "../_lib/db";
import { displayName } from "../_lib/username";
import UsernameForm from "./_components/UsernameForm";

export const metadata: Metadata = {
  title: "Account — Respawn Riot",
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  let session: Session | null = null;
  try { session = (await auth()) as Session | null; } catch {}
  if (!session?.user?.id) {
    // Bounce signed-out visitors to homepage (where the SIGN IN button lives)
    redirect("/?signin=1");
  }

  const userId = parseInt(session.user.id, 10);
  await ensureSchema();
  const db = sql();
  // Defensive: also handles case where created_at column doesn't exist
  // yet on a stale deploy. Pattern: try with the column, fall back
  // without it on error.
  let me: {
    id: number;
    email: string | null;
    name: string | null;
    username: string | null;
    created_at: string | null;
  } | undefined;
  try {
    const rows = (await db`
      SELECT id, email, name, username, created_at::text AS created_at
      FROM users WHERE id = ${userId}
    `) as Array<typeof me extends infer T ? T : never>;
    me = rows[0] as typeof me;
  } catch {
    const rows = (await db`
      SELECT id, email, name, username
      FROM users WHERE id = ${userId}
    `) as Array<{
      id: number;
      email: string | null;
      name: string | null;
      username: string | null;
    }>;
    if (rows[0]) me = { ...rows[0], created_at: null };
  }

  if (!me) {
    return (
      <main className="bg-black px-6 py-16 text-center text-white">
        <p className="font-display text-2xl tracking-wide">User not found</p>
      </main>
    );
  }

  const currentName = displayName({
    username: me.username,
    name: me.name,
    email: me.email,
  });

  return (
    <main className="bg-black text-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-fuchsia-500/30 scanlines">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.25),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.18),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-2 stripe-band" />

        <div className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
          <p className="font-display text-xs tracking-[0.3em] text-fuchsia-400">
            ▌ YOUR PROFILE
          </p>
          <h1 className="mt-2 font-display text-3xl tracking-[0.04em] sm:text-5xl">
            ACCOUNT <span className="text-fuchsia-400">{"//"}</span> SETTINGS
          </h1>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Current state */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="font-display text-[10px] tracking-[0.3em] text-fuchsia-300">
              ▌ SIGNED IN AS
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-[120px_1fr]">
              <span className="font-display text-[11px] uppercase tracking-widest text-white/55">
                Display name
              </span>
              <span className="font-display text-lg text-white">{currentName}</span>

              <span className="font-display text-[11px] uppercase tracking-widest text-white/55">
                Email
              </span>
              <span className="font-mono text-sm text-white/75">{me.email ?? "—"}</span>

              <span className="font-display text-[11px] uppercase tracking-widest text-white/55">
                Joined
              </span>
              <span className="font-mono text-sm text-white/75">
                {me.created_at ? me.created_at.slice(0, 10) : "—"}
              </span>
            </div>
          </div>

          {/* Username form */}
          <UsernameForm initialUsername={me.username ?? ""} />

          {/* About / how-it-works */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 text-sm text-white/65">
            <p className="font-display text-[10px] tracking-[0.3em] text-cyan-300">
              ▌ HOW YOUR ACCOUNT WORKS
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Sign-in is <strong className="text-white">magic-link only</strong> —
                no passwords. You get a one-time link emailed to {me.email}.
              </li>
              <li>
                Your username appears on transmissions, replies, ratings,
                and anywhere else you broadcast.
              </li>
              <li>
                Your email is never shown publicly.
              </li>
              <li>
                Signing in syncs your saved recipes, restaurant ratings,
                shopping list, quests, and favorite bands across devices.
              </li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/creativity"
              className="rounded-xl border border-fuchsia-400/60 bg-fuchsia-500/10 px-4 py-2 font-display text-xs tracking-[0.25em] text-fuchsia-100 hover:bg-fuchsia-500/20"
            >
              ✦ GO BROADCAST
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-white/15 px-4 py-2 font-display text-xs tracking-[0.25em] text-white/75 hover:border-white/30 hover:text-white"
            >
              ← HOME
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
