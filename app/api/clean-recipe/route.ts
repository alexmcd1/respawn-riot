import { NextResponse } from "next/server";
import { auth } from "../../../auth";

// POST /api/clean-recipe
//
// Takes a free-form pasted recipe (potentially messy — title lines,
// "Ingredients:" / "Directions:" headers, footer metadata, numbered or
// bulleted steps, prose blocks, ad copy, you name it) and asks Google
// Gemini Flash to extract it into the same shape /api/parse-recipe
// returns.
//
// Why an LLM instead of regex: the heuristic in RecipeParser fails the
// moment the pasted text has anything other than ingredient lines on
// top — a title, a header word, an inline aside. We tried five or six
// fallback rules; each one broke a different recipe. An LLM handles
// the variation natively.
//
// Why Gemini: free tier (Flash: 15 RPM / 1,500 requests per day) is
// generous, no credit card required. aistudio.google.com gives an
// API key with one click after age verification.
//
// Body:   { text: string }
// Result: { ok: true, recipe: ParsedRecipe } or { ok: false, error }
//
// Requires a session (must be signed in) so anonymous traffic can't
// burn through the free-tier quota. Also requires GOOGLE_API_KEY env
// var — without it the route returns a friendly error and the
// frontend falls back to the heuristic parser.

export const dynamic = "force-dynamic";

// Default to gemini-3.1-flash-lite — chosen after the user shared
// their actual ai.dev/rate-limit dashboard, which showed an
// unusually restrictive new-account tier:
//
//   model                       RPM   TPM     RPD
//   gemini-2.5-flash             5    250K    20    ← 20/day is a typo? No.
//   gemini-2.5-flash-lite        10   250K    20    ← same tiny cap
//   gemini-3-flash               5    250K    20
//   gemini-3.5-flash             5    250K    20
//   gemini-3.1-flash-lite        15   250K    500   ← 25× more headroom
//   gemma-4-26b / 31b            15   ∞       1500  ← even more, but I'd
//                                                    rather stay on a
//                                                    Gemini model for
//                                                    reliable function
//                                                    calling
//
// So 500 RPD is the practical ceiling we can hit on Gemini models
// for this account today. Plenty for personal recipe parsing — you'd
// have to use it ~21 times an hour, every hour of the day, to run out.
//
// Override via GEMINI_MODEL env var. Hit /api/gemini-debug to see
// every model your key can call, and ai.dev/rate-limit to see the
// per-model RPD allowance.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

// Automatic 429 fallback. If primary hits its quota, retry once
// with a different model (different bucket = independent quota).
// We pick gemini-2.5-flash-lite as the fallback even though it has
// the tiny 20 RPD cap — because it's a different bucket from the
// 3.1-flash-lite primary, those 20 are 20 EXTRA requests on top of
// 500. Combined effective ceiling: ~520 cleanups per day.
const FALLBACK_MODEL = "gemini-2.5-flash-lite";

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

// Gemini's function-calling schema follows the OpenAPI subset they
// document at https://ai.google.dev/api/caching#Schema . Strict-mode
// types: STRING / NUMBER / INTEGER / BOOLEAN / ARRAY / OBJECT
// (UPPERCASED — the lowercase JSON-Schema spelling is silently
// ignored and you get a 400 with a confusing error).
const SUBMIT_RECIPE_FUNCTION = {
  name: "submit_recipe",
  description:
    "Submit the cleaned, structured recipe extracted from the user's pasted text.",
  parameters: {
    type: "OBJECT",
    properties: {
      name: {
        type: "STRING",
        description: "The recipe's title/name. Required.",
      },
      yield: {
        type: "STRING",
        description:
          "Servings or yield as written, e.g. '5 servings' or 'Makes 24 cookies'. Optional.",
      },
      ingredients: {
        type: "ARRAY",
        items: { type: "STRING" },
        description:
          "Each ingredient as ONE string with quantity + unit + item, e.g. '4 boneless skinless chicken breasts'. Do NOT include section headers.",
      },
      instructions: {
        type: "ARRAY",
        items: { type: "STRING" },
        description:
          "Each step as ONE string with the leading number STRIPPED, e.g. 'Preheat the oven to 375°F.'. Do NOT include section headers or meta footers.",
      },
      totalTimeMinutes: {
        type: "NUMBER",
        description:
          "Total cooking time in minutes if mentioned in the text. Optional.",
      },
      caloriesPerServing: {
        type: "NUMBER",
        description:
          "Calories per serving if mentioned in the text. Optional.",
      },
    },
    required: ["name", "ingredients", "instructions"],
  },
};

function badRequest(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function POST(request: Request) {
  // ── Auth: must be signed in. Free-tier quotas are real (Flash:
  //    15 RPM / 1500 req/day) and we don't want anonymous traffic
  //    burning through them.
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
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error:
        "AI cleanup isn't configured. Add GOOGLE_API_KEY to Vercel env vars (get a free key at aistudio.google.com → Get API key) and redeploy. The basic parse-it-locally button still works in the meantime.",
    });
  }

  // ── Gemini call
  //
  // tool_config.function_calling_config.mode = "ANY" forces the model
  // to call a function instead of replying with prose. Combined with
  // a single allowed function name, this is Gemini's equivalent of
  // OpenAI's tool_choice — reliable structured output without a
  // fragile "respond in JSON" prompt.
  //
  // Extracted as a helper so we can retry on 429 with the fallback
  // model (see below).
  async function callGemini(modelName: string): Promise<Response> {
    return fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey!,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text }] }],
          tools: [{ functionDeclarations: [SUBMIT_RECIPE_FUNCTION] }],
          toolConfig: {
            functionCallingConfig: {
              mode: "ANY",
              allowedFunctionNames: ["submit_recipe"],
            },
          },
          generationConfig: {
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            temperature: 0.2,
          },
        }),
      }
    );
  }

  // Primary attempt — configured model.
  let res: Response;
  let modelUsed = GEMINI_MODEL;
  try {
    res = await callGemini(GEMINI_MODEL);
  } catch (err) {
    console.error("[clean-recipe] fetch threw:", err);
    return NextResponse.json({
      ok: false,
      error: "Couldn't reach the AI provider. Try the basic parser instead.",
    });
  }

  // 429 fallback — if the configured model hit its quota AND the
  // fallback is a different name, transparently retry once with the
  // pinned lite model. Logs the fallback so we can see in Vercel
  // when it kicks in (telltale of a low probationary tier on the
  // configured model).
  if (res.status === 429 && GEMINI_MODEL !== FALLBACK_MODEL) {
    const primaryDetail = await res.text().catch(() => "<no body>");
    console.warn(
      `[clean-recipe] ${GEMINI_MODEL} returned 429, retrying with ${FALLBACK_MODEL} — ${primaryDetail.slice(0, 500)}`
    );
    try {
      res = await callGemini(FALLBACK_MODEL);
      modelUsed = FALLBACK_MODEL;
    } catch (err) {
      console.error("[clean-recipe] fallback fetch threw:", err);
      return NextResponse.json({
        ok: false,
        error: "Couldn't reach the AI provider. Try the basic parser instead.",
      });
    }
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "<no body>");
    // Full body in logs — the previous 400-char truncation cut error
    // messages mid-sentence and made debugging quota issues harder.
    console.error(
      `[clean-recipe] Gemini HTTP ${res.status} (model=${modelUsed}) — ${detail.slice(0, 2000)}`
    );
    const friendly =
      res.status === 429
        ? `AI quota hit on both "${GEMINI_MODEL}" and the fallback "${FALLBACK_MODEL}". Wait a minute (per-minute cap usually resets fast) or check https://ai.dev/rate-limit. Basic parse shown below.`
        : `AI provider returned ${res.status} (model=${modelUsed}). Try again or use the basic parser.`;
    return NextResponse.json({ ok: false, error: friendly });
  }

  // ── Parse Gemini response — find the functionCall block we forced.
  type GeminiResponse = {
    candidates?: Array<{
      content?: {
        parts?: Array<
          | { text: string }
          | { functionCall: { name: string; args: unknown } }
        >;
      };
      finishReason?: string;
    }>;
    promptFeedback?: unknown;
  };
  let data: GeminiResponse;
  try {
    data = (await res.json()) as GeminiResponse;
  } catch {
    return NextResponse.json({
      ok: false,
      error: "AI returned an unparseable response.",
    });
  }

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const fc = parts.find(
    (p): p is { functionCall: { name: string; args: unknown } } =>
      "functionCall" in p
  );
  if (!fc || fc.functionCall?.name !== "submit_recipe") {
    return NextResponse.json({
      ok: false,
      error: "AI didn't return structured data. Try again.",
    });
  }

  // ── Validate the function args match our expected shape.
  // Gemini returns args as a parsed object (unlike OpenAI-style APIs
  // which return a JSON string).
  const args = fc.functionCall.args as Partial<CleanedRecipe> | null;
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
