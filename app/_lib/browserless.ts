// Browserless.io client. Lets us run real-Chrome JavaScript from our
// serverless backend so we can hit APIs that block headless / server-
// side requests (Akamai-protected sites like Universal Orlando).
//
// Auth: BROWSERLESS_TOKEN env var (Vercel).
// Base URL: BROWSERLESS_URL env var, defaults to the SFO region.
//
// Browserless's /function endpoint accepts a JavaScript source string
// + a context object. The function runs server-side in a real Chrome
// instance with a Puppeteer `page` argument. Returns whatever the
// function returns (must be JSON-serializable).

const DEFAULT_BASE = "https://production-sfo.browserless.io";

export type BrowserlessFunctionResult<T> = {
  data: T;
  type?: string;
};

function baseUrl(): string {
  return process.env.BROWSERLESS_URL ?? DEFAULT_BASE;
}

/**
 * Run a Puppeteer function in Browserless's hosted Chrome.
 *
 * @param code - The function source as a string. Browserless v2 expects
 *   ES module syntax: `export default async ({ page, context }) => {...}`.
 *   The function should return { data, type } or just data.
 * @param context - Plain-object data passed as `context` to the function.
 *   Must be JSON-serializable.
 * @param opts.timeoutMs - How long to wait. Default 60s.
 * @param opts.stealth - Apply puppeteer-extra-plugin-stealth to mask the
 *   automation tells Akamai/Cloudflare bot detection looks for. Required
 *   for many travel + commerce sites. Free on Browserless.
 * @param opts.humanlike - Add mouse-movement + scroll simulation to look
 *   more like a real visitor. Pairs with stealth for stronger bots.
 */
export async function browserlessFunction<TInput extends object, TOutput>(
  code: string,
  context: TInput,
  opts: {
    timeoutMs?: number;
    stealth?: boolean;
    humanlike?: boolean;
  } = {}
): Promise<TOutput> {
  const token = process.env.BROWSERLESS_TOKEN;
  if (!token) {
    throw new Error(
      "BROWSERLESS_TOKEN is not set — add it to Vercel env vars (Production + Preview)"
    );
  }
  const timeoutMs = opts.timeoutMs ?? 60_000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const qs = new URLSearchParams({ token });
    if (opts.stealth) qs.set("stealth", "true");
    if (opts.humanlike) qs.set("humanlike", "true");
    const res = await fetch(`${baseUrl()}/function?${qs}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, context }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "<no body>");
      throw new Error(
        `Browserless /function HTTP ${res.status} — ${text.slice(0, 500)}`
      );
    }
    // Browserless wraps the function's return value as { data, type }.
    // Some response shapes return data at top level; handle both.
    const json = (await res.json()) as
      | BrowserlessFunctionResult<TOutput>
      | TOutput;
    if (json && typeof json === "object" && "data" in json) {
      return (json as BrowserlessFunctionResult<TOutput>).data;
    }
    return json as TOutput;
  } finally {
    clearTimeout(timer);
  }
}
