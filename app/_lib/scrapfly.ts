// Scrapfly Web Scraping API client.
//
// Used to bypass Akamai bot detection on sites our serverless can't
// reach directly (Universal Orlando's booking API, etc). Scrapfly
// handles the residential proxies + TLS fingerprint matching + JS
// challenge solving under one API.
//
// Auth: SCRAPFLY_API_KEY env var (key starts with "scp-").
// Pricing: 1 credit per basic request, 5 credits with asp=true (the
// Akamai bypass). Free tier is 1,000 credits/mo.

export type ScrapflyOptions = {
  /** Target URL to fetch via Scrapfly's proxy network. */
  url: string;
  /** HTTP method to perform on the target. Default GET. */
  method?: "GET" | "POST" | "PUT" | "DELETE";
  /** Request body for the target (as a string — JSON.stringify yourself). */
  body?: string;
  /** Headers to forward to the target. */
  headers?: Record<string, string>;
  /** Enable Anti Scraping Protection (residential proxies + bot bypass).
   *  Costs ~5 credits per call vs 1 for basic mode. Required for Akamai. */
  asp?: boolean;
  /** Pin the proxy to a specific country code (e.g. "us"). */
  country?: string;
  /** Tag the call for analytics (visible in your Scrapfly dashboard). */
  tags?: string[];
  /** Session ID — when set, Scrapfly pins the same proxy IP across
   *  calls with the same session value AND persists cookies between
   *  them. Use this to "warm up" a session (e.g. visit a landing page)
   *  before hitting an API that expects existing cookies. */
  session?: string;
  /** Render the page in a real headless browser before reading the
   *  response. Required when the page is a JS app or you want to run
   *  custom JS via the `js` parameter. Costs ~5x normal credits. */
  renderJs?: boolean;
  /** JavaScript expression evaluated in the page context AFTER load.
   *  Must be a single async IIFE that returns a serializable value.
   *  Scrapfly returns it via result.browserData.jsEvaluationResult.
   *  Requires renderJs=true. */
  js?: string;
  /** Override the timeout (default 60s — js_scenario adds 30s usually). */
  timeoutMs?: number;
};

export type ScrapflyResult = {
  status: number;
  body: string;
  contentType?: string;
  /** Scrapfly metadata — how many credits the call cost, etc. */
  cost: number;
  /** Return value of the `js` script (if one was passed), as a string.
   *  Caller is responsible for parsing it back into whatever shape they
   *  asked the script to return. */
  jsEvaluationResult?: string;
};

const BASE = "https://api.scrapfly.io/scrape";

export async function scrapfly(opts: ScrapflyOptions): Promise<ScrapflyResult> {
  const apiKey = process.env.SCRAPFLY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "SCRAPFLY_API_KEY is not set — add it to Vercel env vars (Production + Preview)"
    );
  }

  const timeoutMs = opts.timeoutMs ?? 60_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Scrapfly's REST API takes ALL config as query params (url, method,
  // asp, country, headers[Name]=value, etc). The body of OUR POST to
  // Scrapfly becomes the body that Scrapfly forwards to the target.
  // Earlier mistake: putting config in a JSON body — Scrapfly ignored
  // it and complained "url must not be empty".
  const qs = new URLSearchParams();
  qs.set("key", apiKey);
  qs.set("url", opts.url);
  qs.set("method", opts.method ?? "GET");
  if (opts.asp) qs.set("asp", "true");
  if (opts.country) qs.set("country", opts.country);
  if (opts.tags && opts.tags.length > 0) {
    qs.set("tags", opts.tags.join(","));
  }
  if (opts.session) qs.set("session", opts.session);
  if (opts.renderJs) qs.set("render_js", "true");
  if (opts.js) {
    // Scrapfly requires URL-SAFE base64 specifically (- and _ instead
    // of + and /, no = padding). Standard base64 gets rejected with
    // "Unable to base64 decode the JS script".
    qs.set("js", Buffer.from(opts.js, "utf8").toString("base64url"));
  }
  // Headers go in as headers[Name]=Value; Scrapfly forwards them to
  // the target. URLSearchParams handles the URL encoding for us.
  if (opts.headers) {
    for (const [k, v] of Object.entries(opts.headers)) {
      qs.set(`headers[${k}]`, v);
    }
  }

  // Decide whether to POST a body to Scrapfly (when the target call
  // has one) or just GET. GET keeps the URL shorter for credit cost.
  const shouldPostBody = opts.body != null && opts.body.length > 0;

  try {
    const res = await fetch(`${BASE}?${qs.toString()}`, {
      method: shouldPostBody ? "POST" : "GET",
      headers: shouldPostBody
        ? { "content-type": opts.headers?.["content-type"] ?? "application/json" }
        : undefined,
      body: shouldPostBody ? opts.body : undefined,
      signal: controller.signal,
    });

    // Scrapfly returns rich errors at /scrape with code + description +
    // sometimes a doc link. Surface ALL of it so 400s are debuggable.
    const rawText = await res.text();
    let wrapper: {
      result?: {
        status_code?: number;
        content?: string;
        content_type?: string;
        browser_data?: {
          javascript_evaluation_result?: string;
        };
      };
      context?: { cost?: { total?: number } };
      message?: string;
      code?: string;
      description?: string;
      error_id?: string;
      doc_url?: string;
      errors?: Array<{ message?: string; code?: string }>;
    };
    try {
      wrapper = JSON.parse(rawText);
    } catch {
      throw new Error(
        `Scrapfly API HTTP ${res.status} — non-JSON response: ${rawText.slice(0, 300)}`
      );
    }

    if (!res.ok) {
      // Pull every diagnostic field we can find into one error string.
      const parts: string[] = [`HTTP ${res.status}`];
      if (wrapper.code) parts.push(`code=${wrapper.code}`);
      if (wrapper.message) parts.push(`msg="${wrapper.message}"`);
      if (wrapper.description) parts.push(`desc="${wrapper.description}"`);
      if (wrapper.errors && wrapper.errors.length > 0) {
        parts.push(`errors=${JSON.stringify(wrapper.errors)}`);
      }
      if (wrapper.error_id) parts.push(`id=${wrapper.error_id}`);
      if (wrapper.doc_url) parts.push(`docs=${wrapper.doc_url}`);
      // ALWAYS include the raw body snippet as a fallback — if Scrapfly
      // ever puts the actionable detail in an unexpected field, we still
      // see it.
      parts.push(`raw=${rawText.slice(0, 400)}`);
      console.warn(
        `[scrapfly] error response — status=${res.status} bodyKeys=${Object.keys(wrapper).join(",")} fullBody=${rawText.slice(0, 800)}`
      );
      throw new Error(`Scrapfly API ${parts.join(" — ")}`);
    }

    const r = wrapper.result;
    if (!r || typeof r.status_code !== "number") {
      throw new Error(`Scrapfly returned unexpected shape: ${JSON.stringify(wrapper).slice(0, 300)}`);
    }

    // Find the JS evaluation result. Scrapfly's API has used different
    // field names across versions (javascript_evaluation_result vs
    // js_evaluation_result, sometimes nested in browser_data, sometimes
    // top-level on result). Try every known location.
    type Bag = Record<string, unknown>;
    const r2 = r as unknown as Bag;
    const bdata = (r2.browser_data ?? {}) as Bag;
    const jsResult =
      (bdata.javascript_evaluation_result as string | undefined) ??
      (bdata.js_evaluation_result as string | undefined) ??
      (r2.javascript_evaluation_result as string | undefined) ??
      (r2.js_evaluation_result as string | undefined);

    // If renderJs/js was requested but no result came back, log the
    // shape so we can debug field-name drift.
    if (opts.js && jsResult == null) {
      console.warn(
        `[scrapfly] js_evaluation_result not found. result keys: ${Object.keys(r2).join(",")}` +
        (bdata && Object.keys(bdata).length > 0
          ? ` | browser_data keys: ${Object.keys(bdata).join(",")}`
          : "")
      );
    }

    return {
      status: r.status_code,
      body: r.content ?? "",
      contentType: r.content_type,
      cost: wrapper.context?.cost?.total ?? 0,
      jsEvaluationResult: jsResult,
    };
  } finally {
    clearTimeout(timer);
  }
}
