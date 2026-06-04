import { NextResponse } from "next/server";
import { auth } from "../../../auth";

// POST /api/clean-recipe
//
// Takes a free-form pasted recipe (potentially messy — title lines,
// "Ingredients:" / "Directions:" headers, footer metadata, numbered or
// bulleted steps, prose blocks, ad copy, you name it) and asks an LLM
// to extract it into the same shape /api/parse-recipe returns.
//
// Why an LLM instead of regex: the heuristic in RecipeParser fails the
// moment the pasted text has anything other than ingredient lines on
// top — a title, a header word, an inline aside. We tried five or six
// fallback rules; each one broke a different recipe. An LLM handles
// the variation natively.
//
// Why Groq: free tier, no credit card, no regional restrictions
// (Google AI Studio has both 18+ verification + country gating).
// console.groq.com → API Keys → Create. Their endpoint is
// OpenAI-compatible so swapping to OpenAI / Mistral / Cerebras later
// is a one-line change.
//
// Body:   { text: string }
// Result: { ok: true, recipe: ParsedRecipe } or { ok: false, error }
//
// Requires a session (must be signed in) so anonymous traffic can't
// burn through the free-tier rate limit. Also requires GROQ_API_KEY
// env var — without it the route returns a friendly error and the
// frontend falls back to the heuristic parser.

export const dynamic = "force-dynamic";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile"; // Groq's flagship reasoning model
const MAX_INPUT_CHARS = 12_000;
const MAX_OUTPUT_TOKENS = 2_048;

type CleanedRecipe = {
  name?: string;
  yield?: string;
  ingredients: string[];
  instructions: string[];
  totalTimeMinutes?: number;
  caloriesPerServing?: number;
};

const SYSTEM_PROMPT = `You extract structured recipe data from messy pasted text.

The text may contain any combination of:
- A site/section header line (e.g. "Homemade Cooking Recipes") — IGNORE these.
- The recipe NAME on its own line.
- An "Ingredients:" or similar section header — IGNORE.
- Ingredient lines (with quantity, unit, item). Each becomes ONE ingredient string.
- A "Directions:" / "Instructions:" / "Method:" header — IGNORE.
- Numbered or bulleted steps. The leading "1." / "2." / "•" should be STRIPPED.
- A footer with cooking time, servings, calories, nutrition facts.

Your job: call the submit_recipe function with the cleaned data.

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

// Groq uses the OpenAI tool-calling schema (which uses standard
// JSON Schema property types — lowercase, unlike Gemini's
// uppercase OpenAPI dialect).
const SUBMIT_RECIPE_TOOL = {
  type: "function" as const,
  function: {
    name: "submit_recipe",
    description:
      "Submit the cleaned, structured recipe extracted from the user's pasted text.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The recipe's title/name. Required.",
        },
        yield: {
          type: "string",
          description:
            "Servings or yield as written, e.g. '5 servings' or 'Makes 24 cookies'. Optional.",
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
          description:
            "Total cooking time in minutes if mentioned in the text. Optional.",
        },
        caloriesPerServing: {
          type: "number",
          description:
            "Calories per serving if mentioned in the text. Optional.",
        },
      },
      required: ["name", "ingredients", "instructions"],
    },
  },
};

function badRequest(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function POST(request: Request) {
  // ── Auth: must be signed in. Free-tier quotas are real (Groq Llama
  //    3.3 70B: 30 RPM, 6000 RPD on free tier) — block anonymous abuse.
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
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error:
        "AI cleanup isn't configured. Add GROQ_API_KEY to Vercel env vars (get a free key at console.groq.com → API Keys) and redeploy. The basic parse-it-locally button still works in the meantime.",
    });
  }

  // ── Groq call (OpenAI-compatible API)
  //
  // tool_choice with type:"function" + a specific function name forces
  // the model to call exactly that function. This is the OpenAI
  // equivalent of Anthropic's tool_choice or Gemini's
  // toolConfig.functionCallingConfig — reliable structured JSON
  // without a fragile "respond in JSON" prompt.
  let res: Response;
  try {
    res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
        tools: [SUBMIT_RECIPE_TOOL],
        tool_choice: {
          type: "function",
          function: { name: "submit_recipe" },
        },
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.2,
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
      `[clean-recipe] Groq HTTP ${res.status} — ${detail.slice(0, 400)}`
    );
    const friendly =
      res.status === 429
        ? "AI quota hit for the day. Try again later or use the basic parser."
        : `AI provider returned ${res.status}. Try again or use the basic parser.`;
    return NextResponse.json({ ok: false, error: friendly });
  }

  // ── Parse Groq response — pull the forced tool_call.
  type GroqResponse = {
    choices?: Array<{
      message?: {
        tool_calls?: Array<{
          function?: { name?: string; arguments?: string };
        }>;
      };
    }>;
  };
  let data: GroqResponse;
  try {
    data = (await res.json()) as GroqResponse;
  } catch {
    return NextResponse.json({
      ok: false,
      error: "AI returned an unparseable response.",
    });
  }

  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.name !== "submit_recipe" || !toolCall.function.arguments) {
    return NextResponse.json({
      ok: false,
      error: "AI didn't return structured data. Try again.",
    });
  }

  // OpenAI-compatible APIs return tool arguments as a JSON STRING
  // (Anthropic returns a parsed object). Parse it here.
  let args: Partial<CleanedRecipe>;
  try {
    args = JSON.parse(toolCall.function.arguments) as Partial<CleanedRecipe>;
  } catch {
    return NextResponse.json({
      ok: false,
      error: "AI returned malformed JSON. Try again.",
    });
  }

  if (
    !args ||
    !Array.isArray(args.ingredients) ||
    !Array.isArray(args.instructions)
  ) {
    return NextResponse.json({
      ok: false,
      error: "AI returned malformed data. Try again.",
    });
  }

  const recipe = {
    name: typeof args.name === "string" ? args.name.trim() : "Pasted recipe",
    yield: typeof args.yield === "string" ? args.yield.trim() : undefined,
    ingredients: args.ingredients
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean),
    instructions: args.instructions
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean),
    totalTimeMinutes:
      typeof args.totalTimeMinutes === "number"
        ? args.totalTimeMinutes
        : undefined,
    caloriesPerServing:
      typeof args.caloriesPerServing === "number"
        ? args.caloriesPerServing
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
