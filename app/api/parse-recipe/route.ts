import { NextResponse } from "next/server";

// Parse a recipe page by:
//   1. Fetching the HTML server-side (CORS-bypass + bot UA)
//   2. Finding every <script type="application/ld+json"> block
//   3. Pulling out the Recipe object (handles @graph + arrays)
//   4. Normalizing fields the client expects
//
// Returns 200 with { ok: false, error } on any parse failure so the
// client can render a friendly message instead of throwing.

export type ParsedRecipe = {
  name?: string;
  image?: string;
  yield?: string;        // "8 servings" or "Makes 24 cookies"
  yieldNumber?: number;  // parsed numeric, used as baseline scale
  ingredients: string[];
  instructions: string[];
  sourceUrl: string;
};

type LdRecipe = {
  "@type"?: string | string[];
  name?: string;
  image?: unknown;
  recipeYield?: string | string[] | number;
  recipeIngredient?: string[];
  ingredients?: string[];
  recipeInstructions?: unknown;
};

function unwrapImage(image: unknown): string | undefined {
  if (!image) return undefined;
  if (typeof image === "string") return image;
  if (Array.isArray(image)) return unwrapImage(image[0]);
  if (typeof image === "object" && image !== null) {
    const obj = image as Record<string, unknown>;
    if (typeof obj.url === "string") return obj.url;
    if (typeof obj["@id"] === "string") return obj["@id"] as string;
  }
  return undefined;
}

function flattenInstructions(input: unknown): string[] {
  if (!input) return [];
  if (typeof input === "string") {
    return input
      .split(/\r?\n+|\.\s+(?=[A-Z])/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (Array.isArray(input)) {
    const out: string[] = [];
    for (const item of input) {
      if (typeof item === "string") {
        out.push(item.trim());
      } else if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const t = obj["@type"];
        if (t === "HowToStep" && typeof obj.text === "string") {
          out.push(obj.text.trim());
        } else if (t === "HowToSection" && Array.isArray(obj.itemListElement)) {
          out.push(...flattenInstructions(obj.itemListElement));
        } else if (typeof obj.text === "string") {
          out.push(obj.text.trim());
        }
      }
    }
    return out.filter(Boolean);
  }
  return [];
}

function findRecipe(node: unknown): LdRecipe | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findRecipe(child);
      if (found) return found;
    }
    return null;
  }
  if (typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  const t = obj["@type"];
  const matches =
    t === "Recipe" || (Array.isArray(t) && t.includes("Recipe"));
  if (matches) return obj as LdRecipe;
  // Walk @graph and any nested arrays/objects
  if (Array.isArray(obj["@graph"])) {
    const found = findRecipe(obj["@graph"]);
    if (found) return found;
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") {
      const found = findRecipe(v);
      if (found) return found;
    }
  }
  return null;
}

function parseYieldNumber(y: LdRecipe["recipeYield"]): number | undefined {
  const text = Array.isArray(y) ? y[0] : y;
  if (typeof text === "number" && isFinite(text)) return text;
  if (typeof text !== "string") return undefined;
  const m = text.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : undefined;
}

function extractLdJson(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    if (!raw) continue;
    try {
      out.push(JSON.parse(raw));
    } catch {
      // Try cleaning up common issues (trailing commas, HTML entities)
      try {
        const cleaned = raw
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, "&")
          .replace(/,(\s*[}\]])/g, "$1");
        out.push(JSON.parse(cleaned));
      } catch {
        // skip
      }
    }
  }
  return out;
}

export async function POST(request: Request) {
  let url: string;
  try {
    const body = (await request.json()) as { url?: unknown };
    if (typeof body.url !== "string" || !body.url) {
      return NextResponse.json(
        { ok: false, error: "Missing URL" },
        { status: 400 }
      );
    }
    url = body.url.trim();
    new URL(url); // throws if invalid
  } catch {
    return NextResponse.json(
      { ok: false, error: "That URL doesn't look right" },
      { status: 400 }
    );
  }

  // Block Facebook explicitly with a helpful message — most FB pages
  // require login and almost never publish structured Recipe data.
  if (/^https?:\/\/(www\.)?(facebook|instagram)\.com\//i.test(url)) {
    return NextResponse.json({
      ok: false,
      error:
        "Facebook and Instagram pages need a login + rarely have structured recipe data. Copy the recipe text and use the 'Paste recipe' tab instead.",
    });
  }

  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        // Pretend to be a real browser; many sites block bots
        "User-Agent":
          "Mozilla/5.0 (compatible; respawn-riot-recipe/1.0; +https://respawnriot.io)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      // Cache for an hour — the same recipe URL is unlikely to change
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        error: `That site returned ${res.status}. Try the 'Paste recipe' tab.`,
      });
    }
    html = await res.text();
  } catch {
    return NextResponse.json({
      ok: false,
      error: "Couldn't fetch that page. Try the 'Paste recipe' tab.",
    });
  }

  const ldBlocks = extractLdJson(html);
  let recipe: LdRecipe | null = null;
  for (const block of ldBlocks) {
    recipe = findRecipe(block);
    if (recipe) break;
  }

  if (!recipe) {
    return NextResponse.json({
      ok: false,
      error:
        "Couldn't find structured recipe data on that page. Some food blogs don't publish it. Try 'Paste recipe' instead.",
    });
  }

  const ingredients =
    recipe.recipeIngredient ?? recipe.ingredients ?? [];
  const instructions = flattenInstructions(recipe.recipeInstructions);

  if (ingredients.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "Found a recipe but no ingredients listed. Try pasting the text.",
    });
  }

  const result: ParsedRecipe = {
    name: typeof recipe.name === "string" ? recipe.name.trim() : undefined,
    image: unwrapImage(recipe.image),
    yield:
      typeof recipe.recipeYield === "string"
        ? recipe.recipeYield
        : Array.isArray(recipe.recipeYield)
        ? recipe.recipeYield[0]
        : typeof recipe.recipeYield === "number"
        ? String(recipe.recipeYield)
        : undefined,
    yieldNumber: parseYieldNumber(recipe.recipeYield),
    ingredients: ingredients.map((s) => s.trim()).filter(Boolean),
    instructions,
    sourceUrl: url,
  };

  return NextResponse.json({ ok: true, recipe: result });
}
