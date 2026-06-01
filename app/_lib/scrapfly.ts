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
  /** Override the timeout (default 60s). */
  timeoutMs?: number;
};

export type ScrapflyResult = {
  status: number;
  body: string;
  contentType?: string;
  /** Scrapfly metadata — how many credits the call cost, etc. */
  cost: number;
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

  // Scrapfly accepts POST with a JSON body where the URL + options live.
  // Cleaner than building a 2KB URL with the body URL-encoded into a
  // query param, and supports more option types.
  const payload: Record<string, unknown> = {
    url: opts.url,
    method: opts.method ?? "GET",
  };
  if (opts.body != null) payload.body = opts.body;
  if (opts.headers && Object.keys(opts.headers).length > 0) {
    payload.headers = opts.headers;
  }
  if (opts.asp) payload.asp = true;
  if (opts.country) payload.country = opts.country;
  if (opts.tags && opts.tags.length > 0) payload.tags = opts.tags;

  try {
    const res = await fetch(`${BASE}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
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

    return {
      status: r.status_code,
      body: r.content ?? "",
      contentType: r.content_type,
      cost: wrapper.context?.cost?.total ?? 0,
    };
  } finally {
    clearTimeout(timer);
  }
}
