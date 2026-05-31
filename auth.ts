// Auth.js v5 configuration.
//
// Strategy:
//   - Email magic-link sign-in via Resend (no passwords, no OAuth)
//   - JWT session tokens (no DB hit per page load — fast)
//   - Pg adapter still used for the verification_tokens + users tables
//     that the email flow needs to store/lookup
//
// On first sign-in for a given email, Auth.js creates a row in `users`
// and any client-side localStorage data gets merged via the post-sign-in
// sync hooks (see app/_lib/useSyncedStore.ts).

import NextAuth from "next-auth";
import PostgresAdapter from "@auth/pg-adapter";
import Resend from "next-auth/providers/resend";
import { Pool } from "pg";

// Augment Session.user to include the id (Auth.js v5 omits it by default)
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}

// Lazy pool init so build doesn't crash when DATABASE_URL is undefined.
// Auth.js wants the adapter at config time, but we can defer the Pool
// creation by passing a thunk-wrapped object. Simpler: just call the
// adapter at config time — Pool() doesn't actually connect until first
// query, so it's safe at module top-level.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon recommends max=1 for serverless to avoid connection bloat
  max: 1,
});

const fromAddress =
  process.env.EMAIL_FROM ?? "Respawn Riot <onboarding@resend.dev>";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PostgresAdapter(pool),
  session: { strategy: "jwt" },
  trustHost: true, // Required for Vercel preview deploys with dynamic URLs
  providers: [
    Resend({
      from: fromAddress,
      apiKey: process.env.RESEND_API_KEY,
      // Override the default Auth.js HTML so the email matches our brand.
      // identifier = the email being signed in, url = the magic link
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        const { host } = new URL(url);
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${provider.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: provider.from,
            to: identifier,
            subject: "Sign in to Respawn Riot",
            html: `
              <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #0a0a0a; color: #f5f5f5;">
                <h1 style="color: #ff2eb3; font-size: 14px; letter-spacing: 0.3em; text-transform: uppercase; margin: 0 0 16px;">
                  RESPAWN / RIOT
                </h1>
                <h2 style="font-size: 22px; margin: 0 0 12px; color: #fff;">
                  Click to sign in
                </h2>
                <p style="color: #bbb; margin: 0 0 24px;">
                  Tap the button below to sign in to <strong style="color:#fff;">${host}</strong>.
                  This link works once and expires in 24 hours.
                </p>
                <p style="margin: 0 0 24px;">
                  <a href="${url}" style="display:inline-block; padding:14px 28px; background:#ff2eb3; color:#000; text-decoration:none; font-weight:600; letter-spacing:0.2em; text-transform:uppercase; font-size:13px; border-radius:8px;">
                    Sign in →
                  </a>
                </p>
                <p style="font-size: 12px; color: #666;">
                  Didn't request this? You can safely ignore the email.
                </p>
              </div>
            `,
            text: `Sign in to Respawn Riot: ${url}\n\nThis link works once and expires in 24 hours.`,
          }),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "<no body>");
          console.warn(`[auth] Resend send failed ${res.status} — ${body.slice(0, 200)}`);
          throw new Error(`Resend failed: ${res.status}`);
        }
      },
    }),
  ],
  callbacks: {
    // Stuff the user.id into the JWT so we can read it from session
    // checks without another DB lookup.
    async jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.userId && session.user) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
  pages: {
    // Use our own modal-style sign-in. Auth.js will redirect here when
    // a protected route is accessed without a session — we don't have
    // any, but setting this avoids the default sign-in page styling.
    signIn: "/sign-in",
    verifyRequest: "/sign-in/check-email",
  },
});
