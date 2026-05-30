import { NextResponse } from "next/server";

// Fetch a single recipe's full ingredients + instructions for the
// expanded view in IngredientFinder.
//
// The recipe id includes its provider prefix so we route appropriately:
//   "s/12345"      → Spoonacular
//   "m/52772"      → TheMealDB
//
// Returns a normalized shape the UI can render without knowing about
// either provider's quirky field names.

export const dynamic = "force-dynamic";

const SPOON_BASE = "https://api.spoonacular.com";
const MEALDB_BASE = "https://www.themealdb.com/api/json/v1/1";

export type RecipeDetails = {
  id: string;
  title: string;
  image?: string;
  ingredients: string[];   // "1 cup flour" style
  instructions: string[];  // one step per item
  sourceUrl?: string;
  videoUrl?: string;
  area?: string;
  category?: string;
  source: "spoonacular" | "mealdb";
};

type Body = { id?: unknown };

// ─── Spoonacular ──────────────────────────────────────────────────────────

type SpoonIngredient = {
  original?: string;
  originalString?: string;
  name?: string;
  amount?: number;
  unit?: string;
};

type SpoonStep = { step?: string };

type SpoonRecipe = {
  id: number;
  title: string;
  image?: string;
  sourceUrl?: string;
  spoonacularSourceUrl?: string;
  cuisines?: string[];
  dishTypes?: string[];
  instructions?: string | null;
  analyzedInstructions?: Array<{ steps?: SpoonStep[] }>;
  extendedIngredients?: SpoonIngredient[];
};

async function getSpoonacular(numericId: string): Promise<RecipeDetails | null> {
  const key = process.env.SPOONACULAR_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `${SPOON_BASE}/recipes/${numericId}/information?apiKey=${key}&includeNutrition=false`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      console.warn(`[recipe-details] Spoonacular HTTP ${res.status}`);
      return null;
    }
    const r = (await res.json()) as SpoonRecipe;

    const ingredients = (r.extendedIngredients ?? [])
      .map((ing) => (ing.original ?? ing.originalString ?? ing.name ?? "").trim())
      .filter(Boolean);

    // Instructions: prefer the parsed analyzedInstructions if present,
    // otherwise split the unparsed instructions string.
    let instructions: string[] = [];
    const steps = r.analyzedInstructions?.[0]?.steps;
    if (Array.isArray(steps) && steps.length > 0) {
      instructions = steps.map((s) => (s.step ?? "").trim()).filter(Boolean);
    } else if (typeof r.instructions === "string" && r.instructions.trim()) {
      instructions = r.instructions
        .replace(/<[^>]+>/g, "\n")
        .split(/\r?\n+|\.\s+(?=[A-Z])/)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    return {
      id: `s/${r.id}`,
      title: r.title,
      image: r.image,
      ingredients,
      instructions,
      sourceUrl: r.sourceUrl ?? r.spoonacularSourceUrl,
      area: r.cuisines?.[0],
      category: r.dishTypes?.[0],
      source: "spoonacular",
    };
  } catch (err) {
    console.warn("[recipe-details] Spoonacular fetch failed:", err);
    return null;
  }
}

// ─── TheMealDB ────────────────────────────────────────────────────────────

type MealFull = {
  idMeal: string;
  strMeal: string;
  strMealThumb?: string;
  strInstructions?: string | null;
  strSource?: string | null;
  strYoutube?: string | null;
  strArea?: string | null;
  strCategory?: string | null;
} & Record<string, string | null | undefined>;

function extractMealdbIngredients(meal: MealFull): string[] {
  const out: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = (meal[`strIngredient${i}`] ?? "").toString().trim();
    const measure = (meal[`strMeasure${i}`] ?? "").toString().trim();
    if (!name) continue;
    out.push(measure ? `${measure} ${name}` : name);
  }
  return out;
}

async function getMealdb(numericId: string): Promise<RecipeDetails | null> {
  try {
    const res = await fetch(`${MEALDB_BASE}/lookup.php?i=${encodeURIComponent(numericId)}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { meals?: MealFull[] | null };
    const meal = Array.isArray(data.meals) ? data.meals[0] : null;
    if (!meal) return null;
    return {
      id: `m/${meal.idMeal}`,
      title: meal.strMeal,
      image: meal.strMealThumb ?? undefined,
      ingredients: extractMealdbIngredients(meal),
      instructions: meal.strInstructions
        ? meal.strInstructions
            .split(/\r?\n+/)
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      sourceUrl: meal.strSource ?? undefined,
      videoUrl: meal.strYoutube ?? undefined,
      area: meal.strArea ?? undefined,
      category: meal.strCategory ?? undefined,
      source: "mealdb",
    };
  } catch {
    return null;
  }
}

// ─── Route handler ────────────────────────────────────────────────────────

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing recipe id" }, { status: 400 });
  }

  // id format: "<provider>/<numericId>"
  const slash = id.indexOf("/");
  const prefix = slash >= 0 ? id.slice(0, slash) : "";
  const rawId = slash >= 0 ? id.slice(slash + 1) : id;

  let recipe: RecipeDetails | null = null;
  if (prefix === "s") {
    recipe = await getSpoonacular(rawId);
  } else if (prefix === "m") {
    recipe = await getMealdb(rawId);
  } else {
    return NextResponse.json(
      { ok: false, error: "Unknown recipe id format" },
      { status: 400 }
    );
  }

  if (!recipe) {
    return NextResponse.json({ ok: false, error: "Couldn't load that recipe" });
  }

  return NextResponse.json({ ok: true, recipe });
}
