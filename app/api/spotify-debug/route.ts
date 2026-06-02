import { NextResponse } from "next/server";
import { fetchArtistImage, isSpotifyConfigured } from "../../_lib/spotifyArtist";

export const dynamic = "force-dynamic";

// ─── GET /api/spotify-debug ───────────────────────────────────────────────
//
// Tiny diagnostic to check that:
//   1. The env vars are visible to the running deployment
//   2. The Client Credentials flow actually mints a token
//   3. A live search returns an image URL for a known band
//
// Never reveals secret values — only their length + first/last char
// so you can sanity-check "is this the key I pasted" without leaking it.
//
// Visit https://respawnriot.io/api/spotify-debug after configuring
// SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET and redeploying.

function summarize(v: string | undefined): {
  present: boolean;
  length: number;
  hint: string;
} {
  if (!v) return { present: false, length: 0, hint: "(missing)" };
  // Show first 4 + last 2 chars so you can tell which key it is without
  // exposing the whole secret. e.g. "abcd…ef"
  const head = v.slice(0, 4);
  const tail = v.slice(-2);
  return { present: true, length: v.length, hint: `${head}…${tail}` };
}

export async function GET() {
  const env = {
    SPOTIFY_CLIENT_ID: summarize(process.env.SPOTIFY_CLIENT_ID),
    SPOTIFY_CLIENT_SECRET: summarize(process.env.SPOTIFY_CLIENT_SECRET),
    configured: isSpotifyConfigured(),
  };

  if (!env.configured) {
    return NextResponse.json({
      ok: false,
      stage: "env",
      env,
      message:
        "SPOTIFY_CLIENT_ID and/or SPOTIFY_CLIENT_SECRET not visible to this deployment. " +
        "If you just added them, you need to REDEPLOY in Vercel — env var changes don't " +
        "apply to the running build. Also confirm they're applied to the 'Production' " +
        "environment (not just Preview/Development).",
    });
  }

  // Try a search for a band that definitely exists on Spotify.
  const probe = "Blink-182";
  let img: string | null = null;
  let error: string | null = null;
  try {
    img = await fetchArtistImage(probe);
  } catch (err) {
    error = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  }

  if (error) {
    return NextResponse.json({
      ok: false,
      stage: "fetch-threw",
      env,
      probe,
      error,
      message:
        "Env vars are present but the Spotify API call threw. Check Vercel function logs " +
        "for the [spotify] warning — most common cause is a bad client_secret (copy/paste " +
        "added a leading/trailing space).",
    });
  }

  if (!img) {
    return NextResponse.json({
      ok: false,
      stage: "no-image",
      env,
      probe,
      message:
        "Env vars are present and the API call didn't throw, but returned no image. " +
        "Either the access-token mint failed (401 in Vercel logs → bad credentials) " +
        "or the artist search came back empty. Check Vercel logs for [spotify] warnings.",
    });
  }

  return NextResponse.json({
    ok: true,
    stage: "success",
    env,
    probe,
    imageUrl: img,
    message:
      "Spotify is wired up correctly. Hard-refresh the pop-punk page (Ctrl/Cmd+Shift+R) " +
      "to bust any cached HTML — the band tile photos should now be the Spotify-served " +
      "versions, and the 'ℹ Band tile photos auto-refresh via Spotify…' banner should " +
      "be gone.",
  });
}
