import { NextResponse } from "next/server";

// Recipe search backed by:
//
//   1. PRIMARY: Spoonacular complexSearch — 500k+ recipes, handles
//      include + exclude in a single call. Requires SPOONACULAR_API_KEY.
//   2. FALLBACK: TheMealDB — free, no key, ~300 recipes. Used when
//      the Spoonacular key is missing, errors, hits its daily quota,
//      or returns zero results.
//
// Both return the same shape so the client doesn't care which fired.

export const dynamic = "force-dynamic";

const UA = "respawn-riot/1.0 (+https://respawnriot.io)";
const SPOON_BASE = "https://api.spoonacular.com";
const MEALDB_BASE = "https://www.themealdb.com/api/json/v1/1";

type Body = {
  include?: unknown; // string[]
  exclude?: unknown; // string[]
  limit?: unknown;   // number, default 12
};

export type RecipeResult = {
  id: string;
  title: string;
  image?: string;
  // What the user can match against to know why this recipe showed up
  matched?: string[];      // ingredients from `include` that this recipe contains
  matchCount?: number;
  source: "spoonacular" | "mealdb";
  // Optional inline details (Spoonacular includes these when addRecipeInformation=true)
  sourceUrl?: string;
  summary?: string;        // short plain-text blurb
  usedIngredientCount?: number;
  missedIngredientCount?: number;
};

function normList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean);
}

// ─── Provider 1: Spoonacular ──────────────────────────────────────────────

type SpoonRecipe = {
  id: number;
  title: string;
  image?: string;
  sourceUrl?: string;
  summary?: string;
  usedIngredientCount?: number;
  missedIngredientCount?: number;
  usedIngredients?: Array<{ name?: string; original?: string }>;
};

async function spoonacularSearch(
  include: string[],
  exclude: string[],
  limit: number
): Promise<RecipeResult[] | null> {
  const key = process.env.SPOONACULAR_API_KEY;
  if (!key) return null;

  const params = new URLSearchParams({
    apiKey: key,
    number: String(Math.min(20, limit)),
    addRecipeInformation: "true",
    fillIngredients: "true",
    sort: "max-used-ingredients", // recipes that use most of what you have first
    instructionsRequired: "true",
  });
  if (include.length > 0) params.set("includeIngredients", include.join(","));
  if (exclude.length > 0) params.set("excludeIngredients", exclude.join(","));

  try {
    const res = await fetch(`${SPOON_BASE}/recipes/complexSearch?${params}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      // 402 = quota exhausted, 401 = bad key, 429 = rate-limited.
      // Surface in logs so a hot path failure shows up in Vercel.
      console.warn(`[find-recipes] Spoonacular HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json()) as { results?: SpoonRecipe[] };
    const arr = Array.isArray(data.results) ? data.results : [];
    if (arr.length === 0) return null; // trigger fallback rather than empty page

    const includeLower = include.map((s) => s.toLowerCase());

    return arr.map<RecipeResult>((r) => {
      // Build the "matched" list by checking which include-items appear
      // in the recipe's usedIngredients names.
      const matched: string[] = [];
      const used = (r.usedIngredients ?? [])
        .map((u) => (u.name ?? u.original ?? "").toLowerCase())
        .filter(Boolean);
      for (let i = 0; i < includeLower.length; i++) {
        const needle = includeLower[i];
        if (used.some((u) => u.includes(needle) || needle.includes(u))) {
          matched.push(include[i]);
        }
      }

      return {
        id: `s/${r.id}`,
        title: r.title,
        image: r.image,
        matched,
        matchCount: matched.length,
        source: "spoonacular",
        sourceUrl: r.sourceUrl,
        // Strip HTML from the summary for safe inline rendering
        summary: r.summary
          ? r.summary.replace(/<[^>]+>/g, "").slice(0, 240).trim()
          : undefined,
        usedIngredientCount: r.usedIngredientCount,
        missedIngredientCount: r.missedIngredientCount,
      };
    });
  } catch (err) {
    console.warn("[find-recipes] Spoonacular fetch failed:", err);
    return null;
  }
}

// ─── Provider 2: TheMealDB (fallback) ─────────────────────────────────────

type MealLite = { idMeal: string; strMeal: string; strMealThumb: string };

function toSlug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "_");
}

async function fetchMealsByIngredient(name: string): Promise<MealLite[]> {
  try {
    const res = await fetch(
      `${MEALDB_BASE}/filter.php?i=${encodeURIComponent(toSlug(name))}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { meals?: MealLite[] | null };
    return Array.isArray(data.meals) ? data.meals : [];
  } catch {
    return [];
  }
}

async function mealdbRanked(
  include: string[],
  exclude: string[],
  limit: number
): Promise<RecipeResult[]> {
  if (include.length === 0) return [];

  const [includeLists, excludeLists] = await Promise.all([
    Promise.all(include.map((name) => fetchMealsByIngredient(name))),
    Promise.all(exclude.map((name) => fetchMealsByIngredient(name))),
  ]);

  // Build exclude blocklist
  const blocked = new Set<string>();
  for (const list of excludeLists) for (const m of list) blocked.add(m.idMeal);

  // Score each meal by number of include-ingredients it contains
  const scoreById = new Map<string, { meal: MealLite; matched: string[] }>();
  for (let i = 0; i < includeLists.length; i++) {
    const ingName = include[i];
    for (const m of includeLists[i]) {
      if (blocked.has(m.idMeal)) continue;
      const cur = scoreById.get(m.idMeal);
      if (cur) cur.matched.push(ingName);
      else scoreById.set(m.idMeal, { meal: m, matched: [ingName] });
    }
  }

  const ranked = [...scoreById.values()].sort(
    (a, b) => b.matched.length - a.matched.length
  );

  return ranked.slice(0, limit).map<RecipeResult>(({ meal, matched }) => ({
    id: `m/${meal.idMeal}`,
    title: meal.strMeal,
    image: meal.strMealThumb,
    matched,
    matchCount: matched.length,
    source: "mealdb",
  }));
}

// ─── Route handler ────────────────────────────────────────────────────────

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const include = normList(body.include);
  const exclude = normList(body.exclude);
  if (include.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Pick at least one ingredient" },
      { status: 400 }
    );
  }
  const limit = Math.min(Math.max(typeof body.limit === "number" ? body.limit : 12, 1), 24);

  let results = await spoonacularSearch(include, exclude, limit);
  let source: "spoonacular" | "mealdb" | "mealdb-fallback" = "spoonacular";

  if (!results || results.length === 0) {
    source = results === null ? "mealdb-fallback" : "mealdb";
    results = await mealdbRanked(include, exclude, limit);
  }

  return NextResponse.json({
    ok: true,
    source, // "spoonacular" | "mealdb" | "mealdb-fallback"
    count: results.length,
    results,
  });
}
