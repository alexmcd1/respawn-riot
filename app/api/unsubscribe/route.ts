import { NextResponse } from "next/server";
import { ensureSchema, isValidToken, sql } from "../../_lib/db";

// One-click unsubscribe via emailed token. GET-only so the link works
// straight from an email client. Returns a tiny branded HTML page
// (not a JSON response — email recipients land here in a browser).

export const dynamic = "force-dynamic";

function htmlPage(title: string, body: string, accent: string): Response {
  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title} — Respawn Riot</title>
    <style>
      body {
        font-family: system-ui, sans-serif;
        background: #000;
        color: #f5f5f5;
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      .card {
        max-width: 480px;
        text-align: center;
        background: #0e0e0e;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 16px;
        padding: 32px 24px;
      }
      h1 {
        font-size: 13px;
        letter-spacing: 0.3em;
        text-transform: uppercase;
        color: ${accent};
        margin: 0 0 12px;
      }
      h2 { font-size: 24px; margin: 0 0 12px; letter-spacing: 0.04em; }
      p  { color: rgba(255,255,255,0.7); line-height: 1.5; margin: 0 0 16px; }
      a  {
        display: inline-block;
        margin-top: 16px;
        padding: 10px 20px;
        background: #ff2eb3;
        color: #000;
        text-decoration: none;
        font-weight: 600;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        font-size: 12px;
        border-radius: 8px;
      }
      a:hover { background: #ff5cc4; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>RESPAWN / RIOT</h1>
      ${body}
      <a href="https://respawnriot.io/music?tab=concerts">↗ Back to Concerts</a>
    </div>
  </body>
</html>`,
    {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";

  if (!isValidToken(token)) {
    return htmlPage(
      "Invalid link",
      `<h2>That link doesn't look right</h2>
       <p>The unsubscribe token is missing or malformed. If you got this from one of our emails, try clicking the link again.</p>`,
      "#ff8888"
    );
  }

  try {
    await ensureSchema();
    const db = sql();
    const rows = (await db`
      DELETE FROM subscribers WHERE unsub_token = ${token.trim()}
      RETURNING email
    `) as Array<{ email: string }>;

    if (rows.length === 0) {
      // Token was valid format but not in the DB — already unsubbed or
      // someone else's token. Be friendly either way.
      return htmlPage(
        "Already unsubscribed",
        `<h2>You're not on the list</h2>
         <p>This email isn't currently subscribed to concert alerts. Either you've already unsubscribed, or this link has been used before.</p>`,
        "#ffaa44"
      );
    }

    return htmlPage(
      "Unsubscribed",
      `<h2>You're out</h2>
       <p>We won't email <strong>${rows[0].email}</strong> about concerts anymore. Your favorite artists and saved cities are still there in your browser if you change your mind.</p>`,
      "#a8ff4d"
    );
  } catch (err) {
    console.error("[unsubscribe] DB error:", err);
    return htmlPage(
      "Something broke",
      `<h2>Couldn't process that</h2>
       <p>Our database had a hiccup. Try the link again in a minute. If it keeps failing, email us and we'll remove you manually.</p>`,
      "#ff8888"
    );
  }
}
