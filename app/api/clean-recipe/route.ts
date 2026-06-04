import { NextResponse } from "next/server";
import { auth } from "../../../auth";

// POST /api/clean-recipe
//
// Takes a free-form pasted recipe (potentially messy — title lines,
// "Ingredients:" / "Directions:" headers, footer metadata, numbered or
// bulleted steps, prose blocks, ad copy, you name it) and asks Claude
// Haiku to extract it into the same shape /api/parse-recipe returns.
//
// Why an LLM instead of regex: the heuristic in RecipeParser fails the
// moment the pasted text has anything other than ingredient lines on
// top — a title, a header word, an inline aside. We tried five or six
// fallback rules; each one broke a different recipe. An LLM handles
// the variation natively.
//
// Body:   { text: string }
// Result: { ok: true, recipe: ParsedRecipe } or { ok: false, error }
//
// Requires a session (must be signed in). Also requires the
// ANTHROPIC_API_KEY env var — without it the route returns
// { ok: false, error: "AI cleanup not configured" } and the frontend
// falls back to the heuristic.

export const dynamic = "force-dynamic";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5";
const MAX_INPUT_CHARS = 12_000; // a generous-but-finite cap on pasted text
const MAX_TOKENS = 2_048;

type CleanedRecipe = {
  name?: string;
  yield?: string;
  ingredients: string[];
  instructions: string[];
  totalTimeMinutes?: number;
  caloriesPerServing?: number;
};

// System prompt is stable across calls — mark it for prompt caching so
// repeated cleanups (same user typing several recipes in a session)
// only bill the user text token-count, not the instructions.
const SYSTEM_PROMPT = `You extract structured recipe data from messy pasted text.

The text may contain any combination of:
- A site/section header line (e.g. "Homemade Cooking Recipes") — IGNORE these.
- The recipe NAME on its own line.
- An "Ingredients:" or similar section header — IGNORE.
- Ingredient lines (with quantity, unit, item). Each becomes ONE ingredient string.
- A "Directions:" / "Instructions:" / "Method:" header — IGNORE.
- Numbered or bulleted steps. The leading "1." / "2." / "•" should be STRIPPED.
- A footer with cooking time, servings, calories, nutrition facts.

Your job: call the submit_recipe tool with the cleaned data.

Rules:
1. Do NOT include section headers ("Ingredients:", "Directions:", etc.) as ingredients or steps.
2. Do NOT include the site header / page title as an ingredient or step.
3. Do NOT include the footer metadata line as a step.
4. Strip leading numbers/bullets from instructions ("1. Preheat" → "Preheat").
5. Keep ingredient quantities and units intact ("4 boneless skinless chicken breasts" stays whole).
6. If a single visual line has multiple sentences that are clearly separate steps, split them.
7. If you can't determine the recipe name, use the first non-header line that reads like a recipe title.
8. Parse total cooking time and calories from the footer if present.

Always call submit_recipe exactly once. Never reply with prose.`;

const SUBMIT_RECIPE_TOOL = {
  name: "submit_recipe",
  description: "Submit the cleaned, structured recipe extracted from the user's pasted text.",
  input_schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "The recipe's title/name. Required.",
      },
      yield: {
        type: "string",
        description: "Servings or yield as written, e.g. '5 servings' or 'Makes 24 cookies'. Optional.",
      },
      ingredients: {
        type: "array",
        items: { type: "string" },
        description:
          "Each ingredient as ONE string with quantity + unit + item, e.g. '4 boneless skinless chicken breasts'. Do NOT include section headers.",
      },
      instructions: {
        type: "array",
        items: { type: "string" },
        description:
          "Each step as ONE string with the leading number STRIPPED, e.g. 'Preheat the oven to 375°F.'. Do NOT include section headers or meta footers.",
      },
      totalTimeMinutes: {
        type: "number",
        description: "Total cooking time in minutes if mentioned in the text. Optional.",
      },
      caloriesPerServing: {
        type: "number",
        description: "Calories per serving if mentioned in the text. Optional.",
      },
    },
    required: ["name", "ingredients", "instructions"],
  },
};

function badRequest(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function POST(request: Request) {
  // ── Auth: must be signed in. AI calls cost real money, so we don't
  //    want anonymous abuse.
  const session = await auth();
  if (!session?.user?.id) {
    return badRequest("Sign in to use AI cleanup.", 401);
  }

  // ── Body
  let text: string;
  try {
    const body = (await request.json()) as { text?: unknown };
    if (typeof body.text !== "string" || !body.text.trim()) {
      return badRequest("Missing recipe text");
    }
    text = body.text.trim();
  } catch {
    return badRequest("Invalid JSON body");
  }
  if (text.length > MAX_INPUT_CHARS) {
    return badRequest(
      `Recipe text is too long (${text.length.toLocaleString()} chars). Trim it under ${MAX_INPUT_CHARS.toLocaleString()} and try again.`,
      413
    );
  }

  // ── Provider config
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error:
        "AI cleanup isn't configured. Add ANTHROPIC_API_KEY to Vercel env vars and redeploy. The basic parse-it-locally button still works in the meantime.",
    });
  }

  // ── Anthropic call
  let res: Response;
  try {
    res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        // Tool-use forced: model MUST call submit_recipe — no other
        // output paths. This is what gets us reliable structured JSON
        // without a fragile "please respond in JSON" instruction.
        tools: [SUBMIT_RECIPE_TOOL],
        tool_choice: { type: "tool", name: "submit_recipe" },
        // System prompt marked for prompt caching — the user-visible
        // recipe text varies, but the instructions are reused.
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: text }],
      }),
    });
  } catch (err) {
    console.error("[clean-recipe] fetch threw:", err);
    return NextResponse.json({
      ok: false,
      error: "Couldn't reach the AI provider. Try the basic parser instead.",
    });
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "<no body>");
    console.error(
      `[clean-recipe] Anthropic HTTP ${res.status} — ${detail.slice(0, 400)}`
    );
    return NextResponse.json({
      ok: false,
      error: `AI provider returned ${res.status}. Try again or use the basic parser.`,
    });
  }

  // ── Parse Anthropic response — grab the tool_use block we forced.
  type AnthropicResponse = {
    content?: Array<
      | { type: "text"; text: string }
      | { type: "tool_use"; name: string; input: unknown }
    >;
  };
  let data: AnthropicResponse;
  try {
    data = (await res.json()) as AnthropicResponse;
  } catch {
    return NextResponse.json({
      ok: false,
      error: "AI returned an unparseable response.",
    });
  }

  const toolUse = (data.content ?? []).find(
    (b): b is { type: "tool_use"; name: string; input: unknown } =>
      b.type === "tool_use" && b.name === "submit_recipe"
  );
  if (!toolUse) {
    return NextResponse.json({
      ok: false,
      error: "AI didn't return structured data. Try again.",
    });
  }

  // ── Validate the tool input matches our expected shape.
  const input = toolUse.input as Partial<CleanedRecipe> | null;
  if (
    !input ||
    !Array.isArray(input.ingredients) ||
    !Array.isArray(input.instructions)
  ) {
    return NextResponse.json({
      ok: false,
      error: "AI returned malformed data. Try again.",
    });
  }

  const recipe = {
    name: typeof input.name === "string" ? input.name.trim() : "Pasted recipe",
    yield: typeof input.yield === "string" ? input.yield.trim() : undefined,
    ingredients: input.ingredients
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean),
    instructions: input.instructions
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean),
    totalTimeMinutes:
      typeof input.totalTimeMinutes === "number"
        ? input.totalTimeMinutes
        : undefined,
    caloriesPerServing:
      typeof input.caloriesPerServing === "number"
        ? input.caloriesPerServing
        : undefined,
  };

  if (recipe.ingredients.length === 0 || recipe.instructions.length === 0) {
    return NextResponse.json({
      ok: false,
      error:
        "AI returned no ingredients or instructions. Double-check that the pasted text is a recipe.",
    });
  }

  return NextResponse.json({ ok: true, recipe });
}
