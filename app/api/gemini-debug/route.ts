import { NextResponse } from "next/server";

// GET /api/gemini-debug
//
// One-shot diagnostic for the Gemini integration. Calls Google's
// ListModels API with the configured GOOGLE_API_KEY and returns the
// list of models the key is allowed to use, filtered to ones that
// support generateContent (i.e. usable with /api/clean-recipe).
//
// Hit this in the browser whenever the recipe parser stops working
// after a model swap — Google routinely deprecates aliases (you have
// to use "model-name-latest" or pinned "-001" / "-002" versions),
// adds new tiers, or restricts which models are visible to new
// accounts. The error we get from generateContent doesn't tell us
// what we COULD have used; this does.
//
// Doesn't reveal the key. Doesn't even require sign-in (it's purely a
// diagnostic for the admin running the site, not user content).

export const dynamic = "force-dynamic";

type ListModelsResponse = {
  models?: Array<{
    name?: string;
    baseModelId?: string;
    displayName?: string;
    description?: string;
    supportedGenerationMethods?: string[];
    inputTokenLimit?: number;
    outputTokenLimit?: number;
  }>;
};

export async function GET() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      stage: "env",
      message:
        "GOOGLE_API_KEY is not set on this deployment. Add it to Vercel env vars (Settings → Environment Variables) and redeploy.",
    });
  }

  const configuredModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  let res: Response;
  try {
    res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models",
      {
        headers: {
          "x-goog-api-key": apiKey,
        },
      }
    );
  } catch (err) {
    return NextResponse.json({
      ok: false,
      stage: "fetch-threw",
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    });
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "<no body>");
    return NextResponse.json({
      ok: false,
      stage: "list-models-failed",
      status: res.status,
      body: body.slice(0, 2000),
      hint:
        res.status === 403
          ? "403 usually means the API key isn't valid OR the Generative Language API isn't enabled for the project this key belongs to. Check aistudio.google.com → API Keys to confirm the key, and console.cloud.google.com/apis to confirm the API is on."
          : undefined,
    });
  }

  const data = (await res.json().catch(() => null)) as ListModelsResponse | null;
  if (!data || !Array.isArray(data.models)) {
    return NextResponse.json({
      ok: false,
      stage: "parse-failed",
      message: "List succeeded but response didn't parse.",
    });
  }

  // Filter to models that support generateContent (the call
  // /api/clean-recipe makes). Trim the giant description text so the
  // response stays readable.
  const usable = data.models
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => ({
      name: (m.name ?? "").replace(/^models\//, ""),
      displayName: m.displayName,
      inputTokenLimit: m.inputTokenLimit,
      outputTokenLimit: m.outputTokenLimit,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const configuredAvailable = usable.some((m) => m.name === configuredModel);

  return NextResponse.json({
    ok: true,
    configuredModel,
    configuredAvailable,
    note: configuredAvailable
      ? "Configured model is available — if you're still getting errors, it's a quota / 429 issue, not a model availability issue."
      : `Configured model "${configuredModel}" is NOT in the list of models your key can use. Set GEMINI_MODEL in Vercel env vars to one of the names below (then redeploy).`,
    availableForGenerateContent: usable,
  });
}
