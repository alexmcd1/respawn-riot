// Pulls recent git commits from the GitHub API and writes them to
// app/gaming/_devlog-auto.json so the devlog section can render them
// alongside manual entries. Runs as a `prebuild` step.
//
// Hybrid filter:
//   - Include commits that touched any path in INCLUDE_PATHS
//   - OR commits whose subject contains [devlog]
//   - Skip commits with [skip devlog]
//
// Fails open: if GitHub is unreachable or returns errors, leaves the
// existing JSON in place (so old data persists rather than wiping).

import { writeFileSync, existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = process.env.DEVLOG_REPO || "alexmcd1/respawn-riot";
const INCLUDE_PATHS = ["app/game", "public/games"];
const PER_PAGE = 50;
const OUT_PATH = join(
  __dirname,
  "..",
  "app",
  "gaming",
  "_devlog-auto.json"
);

const headers = {
  "User-Agent": "respawn-riot-devlog-builder",
  Accept: "application/vnd.github+json",
};
if (process.env.GITHUB_TOKEN) {
  headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

async function fetchCommits(path) {
  const params = new URLSearchParams({ per_page: String(PER_PAGE) });
  if (path) params.set("path", path);
  const url = `https://api.github.com/repos/${REPO}/commits?${params}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`GitHub ${res.status} ${res.statusText} for ${url}`);
  }
  return res.json();
}

function parseCommit(c) {
  const message = c.commit?.message ?? "";
  const lines = message.split("\n");
  const rawSubject = lines[0] ?? "";
  // Strip leading [devlog] marker from display title
  const title = rawSubject.replace(/^\s*\[devlog\]\s*/i, "").trim();

  // Body: lines after the first blank line, dropping Co-Authored-By and
  // any trailing 🤖 footer noise. Group into paragraphs.
  const bodyLines = [];
  let inBody = false;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!inBody) {
      if (line.trim() === "") {
        inBody = true;
      }
      continue;
    }
    if (/^Co-Authored-By:/i.test(line)) continue;
    if (/^🤖/.test(line)) continue;
    bodyLines.push(line);
  }

  const paragraphs = [];
  let buf = [];
  for (const line of bodyLines) {
    if (line.trim() === "") {
      if (buf.length) {
        paragraphs.push(buf.join(" "));
        buf = [];
      }
    } else {
      buf.push(line.trim());
    }
  }
  if (buf.length) paragraphs.push(buf.join(" "));

  return {
    sha: c.sha?.slice(0, 7) ?? "",
    date: (c.commit?.author?.date ?? "").split("T")[0],
    title,
    body: paragraphs,
    url: c.html_url ?? "",
  };
}

async function main() {
  let entries;
  try {
    const pathResults = await Promise.all(
      INCLUDE_PATHS.map((p) => fetchCommits(p))
    );
    const allRecent = await fetchCommits(null);

    const seen = new Set();
    const out = [];

    const consider = (c, requireMarker) => {
      if (!c?.sha) return;
      const message = c.commit?.message ?? "";
      if (/\[skip devlog\]/i.test(message)) return;
      if (requireMarker && !/\[devlog\]/i.test(message)) return;
      if (seen.has(c.sha)) return;
      seen.add(c.sha);
      const parsed = parseCommit(c);
      if (parsed.title) out.push(parsed);
    };

    // Path-touched commits — auto-include
    for (const list of pathResults) {
      for (const c of list) consider(c, false);
    }
    // Marker-only commits — opt-in via [devlog] in subject
    for (const c of allRecent) consider(c, true);

    out.sort((a, b) => b.date.localeCompare(a.date));
    entries = out;
  } catch (err) {
    console.warn(
      `[build-devlog] GitHub fetch failed: ${err.message}. Keeping existing JSON.`
    );
    if (existsSync(OUT_PATH)) {
      // Leave existing file alone
      return;
    }
    entries = [];
  }

  writeFileSync(OUT_PATH, JSON.stringify(entries, null, 2) + "\n");
  console.log(`[build-devlog] wrote ${entries.length} entries → ${OUT_PATH}`);
}

main().catch((err) => {
  console.error("[build-devlog] unexpected error:", err);
  // Don't fail the build
  process.exit(0);
});
