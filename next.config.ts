import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org" },
      // Spotify CDN — used by app/_lib/spotifyArtist.ts for the
      // pop-punk band tile photos (auto-current artist images).
      { protocol: "https", hostname: "i.scdn.co" },
    ],
  },
};

export default nextConfig;
