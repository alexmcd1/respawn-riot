import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Orlando — Respawn Riot",
  description:
    "Live Orlando weather, NWS alerts, Disney + Universal news, and Florida traffic links.",
};

// Cache server fetches for 10 minutes
export const revalidate = 600;

const NWS_HEADERS = {
  "User-Agent": "respawn-riot.io (contact via website)",
  Accept: "application/geo+json",
};

type Observation = {
  textDescription?: string | null;
  icon?: string | null;
  temperature?: { value: number | null; unitCode: string };
  relativeHumidity?: { value: number | null };
  windSpeed?: { value: number | null; unitCode: string };
};

type ForecastPeriod = {
  number: number;
  name: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  shortForecast: string;
  detailedForecast: string;
  windSpeed: string;
  windDirection: string;
  probabilityOfPrecipitation?: { value: number | null };
};

type Alert = {
  properties: {
    id: string;
    event: string;
    headline?: string | null;
    severity: string;
    urgency: string;
    areaDesc: string;
    description: string;
    instruction?: string | null;
    onset?: string | null;
    ends?: string | null;
    expires?: string | null;
  };
};

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: NWS_HEADERS,
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function cToF(c: number | null | undefined): number | null {
  if (c === null || c === undefined) return null;
  return Math.round((c * 9) / 5 + 32);
}

function msToMph(ms: number | null | undefined): number | null {
  if (ms === null || ms === undefined) return null;
  return Math.round(ms * 2.23694);
}

function severityClass(severity: string): string {
  const s = severity.toLowerCase();
  if (s === "extreme") return "border-red-500 bg-red-500/15 text-red-200";
  if (s === "severe") return "border-orange-500 bg-orange-500/15 text-orange-200";
  if (s === "moderate") return "border-amber-400 bg-amber-400/15 text-amber-200";
  return "border-yellow-400 bg-yellow-400/10 text-yellow-200";
}

function fmtDate(iso?: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
    });
  } catch {
    return null;
  }
}

const disneyNews = [
  {
    headline:
      "Big Thunder Mountain Railroad first-look — new effects + returning critters",
    href: "https://wdwnt.com/2026/05/disney-shares-first-look-photos-video-of-big-thunder-mountain-railroad-updates-including-new-effects-returning-critters-at-walt-disney-world/",
    source: "WDW News Today",
  },
  {
    headline:
      "May 22: Smugglers Run gets a Mando + Grogu story overhaul; new destinations open",
    href: "https://www.disneytouristblog.com/15-reasons-why-may-2026-is-disney-worlds-biggest-month-of-the-year/",
    source: "Disney Tourist Blog",
  },
  {
    headline:
      "May 26: Soarin' Across America premieres + Rock 'n' Roller Coaster reopens with Muppets",
    href: "https://www.disneytouristblog.com/15-reasons-why-may-2026-is-disney-worlds-biggest-month-of-the-year/",
    source: "Disney Tourist Blog",
  },
  {
    headline: "Bluey's Wild World opens at Animal Kingdom",
    href: "https://www.clickorlando.com/theme-parks/2026/05/05/heres-why-may-is-a-big-month-at-walt-disney-world/",
    source: "ClickOrlando",
  },
  {
    headline: "Haunted Mansion facing extended downtime at Magic Kingdom",
    href: "https://www.wdwmagic.com/attractions/haunted-mansion/news/03may2026-haunted-mansion-facing-extended-downtime-at-magic-kingdom.htm",
    source: "WDWMagic",
  },
  {
    headline: "Walt Disney World — last 14 days news roll-up",
    href: "https://www.wdwmagic.com/news.htm",
    source: "WDWMagic",
  },
];

const universalNews = [
  {
    headline:
      "Spielberg Summer Blockbusters lineup runs May 23 – Aug 10 at Universal Studios Florida",
    href: "https://www.fantasylandnews.com/2026/05/02/universal-orlando-summer-2026-experiences/",
    source: "Fantasy Land News",
  },
  {
    headline:
      "Universal halts Epic Universe expansions; refocuses on new theme park",
    href: "https://insidethemagic.net/2026/05/universal-halts-epic-universe-expansions-focuses-on-new-theme-park-coming-in-2026/",
    source: "Inside the Magic",
  },
  {
    headline:
      "Around the Universe — Universal Orlando news roundup, May 2026",
    href: "https://touringplans.com/blog/around-the-universe-universal-orlando-news-roundup-for-may-2026-draft/",
    source: "TouringPlans",
  },
  {
    headline:
      "Donkey Kong Mine-Cart Madness — one-day closure scheduled",
    href: "https://www.insideuniversal.net/2026/03/donkey-kong-mine-cart-madness-one-day-closure-set-for-may-2026-at-epic-universe/",
    source: "Inside Universal",
  },
  {
    headline: "Park-to-park 2026 tickets now include Epic Universe",
    href: "https://www.fox35orlando.com/news/universal-orlando-rolls-out-new-multi-day-options-epic-universe",
    source: "FOX 35 Orlando",
  },
  {
    headline:
      "Popular Epic Universe attraction temporarily closing soon",
    href: "https://allears.net/2026/04/30/this-popular-epic-universal-attraction-temporarily-closes-soon/",
    source: "AllEars.Net",
  },
];

const trafficLinks = [
  {
    title: "FL511 — Live Florida Traffic",
    body: "Real-time travel times, accidents, traffic cameras across the whole state.",
    href: "https://fl511.com/",
  },
  {
    title: "TPK Traffic — Florida's Turnpike",
    body: "Active events, lane closures, and live cameras on the Turnpike.",
    href: "https://www.tpktraffic.com/",
  },
  {
    title: "FDOT Traffic Warnings",
    body: "Statewide construction warnings and active advisory list.",
    href: "https://www.fdot.gov/info/traffic/trafficwarnings.shtm",
  },
  {
    title: "Florida's Turnpike — Construction Updates",
    body: "Project-by-project list of current and upcoming closures.",
    href: "https://floridasturnpike.com/traveler-resources/construction-updates/",
  },
  {
    title: "I-75 Central Florida Roads",
    body: "All active I-75 projects in Central Florida.",
    href: "https://www.cflroads.com/projects/Road/I75",
  },
  {
    title: "I-75 RoadWatch (SW Florida)",
    body: "I-75 alerts and active work zones for SW Florida.",
    href: "https://www.swflroads.com/roadwatch/Road/I75",
  },
];

const trafficHeadlines = [
  {
    headline:
      "I-75 double-lane closures NB + SB between SR 200 and SR 326 (resurfacing, started Nov 3, 2025)",
    href: "https://www.cflroads.com/project/452074-1",
    source: "CFL Roads",
  },
  {
    headline:
      "Turnpike widening: NW 106 St to I-75 — featured project",
    href: "https://floridasturnpike.com/turnpike-projects/featured-projects/turnpike-extension-widening-nw-106-street-to-i-75/",
    source: "Florida's Turnpike",
  },
  {
    headline: "Statewide major projects on Florida highways",
    href: "https://www.fdot.gov/info/moredot/majorprojects.shtm",
    source: "FDOT",
  },
];

export default async function OrlandoPage() {
  const [observation, forecastData, alertsData] = await Promise.all([
    fetchJson<{ properties: Observation }>(
      "https://api.weather.gov/stations/KMCO/observations/latest"
    ),
    fetchJson<{ properties: { periods: ForecastPeriod[] } }>(
      "https://api.weather.gov/gridpoints/MLB/26,68/forecast"
    ),
    fetchJson<{ features: Alert[] }>(
      "https://api.weather.gov/alerts/active?point=28.5383,-81.3792"
    ),
  ]);

  const obs = observation?.properties;
  const tempF = cToF(obs?.temperature?.value);
  const humidity =
    obs?.relativeHumidity?.value !== null && obs?.relativeHumidity?.value !== undefined
      ? Math.round(obs.relativeHumidity.value)
      : null;
  const windMph = msToMph(obs?.windSpeed?.value);

  const periods = forecastData?.properties.periods ?? [];
  const today = periods[0];
  const next6 = periods.slice(0, 6);

  const alerts = alertsData?.features ?? [];

  return (
    <main className="bg-black text-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-orange-500/40 scanlines">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.30),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.20),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-2 stripe-band" />

        <div className="relative mx-auto max-w-7xl px-6 py-12 sm:py-16">
          <p className="font-display text-sm tracking-[0.3em] text-orange-300">
            ▌ CHANNEL 06
          </p>
          <h1 className="mt-3 font-display text-5xl tracking-[0.04em] sm:text-7xl">
            ORLANDO <span className="text-orange-400">{"//"}</span> PARKS &amp; ROADS
          </h1>
          <p className="mt-4 max-w-2xl text-white/75">
            {"Live weather + NWS alerts, what's moving at Disney and Universal, and how messy I-75 and the Turnpike are right now."}
          </p>

          {/* Live weather strip */}
          <div className="mt-8 grid gap-4 rounded-2xl border border-orange-400/30 bg-gradient-to-br from-orange-500/15 via-fuchsia-500/10 to-transparent p-5 sm:grid-cols-4">
            <div>
              <p className="font-display text-xs tracking-[0.3em] text-orange-300">
                NOW IN ORLANDO
              </p>
              <p className="mt-1 font-display text-5xl tracking-tight">
                {tempF !== null ? `${tempF}°F` : "—"}
              </p>
              <p className="mt-1 text-sm text-white/75">
                {obs?.textDescription ?? "Conditions unavailable"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:col-span-2 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                <p className="text-[10px] uppercase tracking-[0.25em] text-orange-300">Humidity</p>
                <p className="mt-1 font-display text-xl">
                  {humidity !== null ? `${humidity}%` : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                <p className="text-[10px] uppercase tracking-[0.25em] text-orange-300">Wind</p>
                <p className="mt-1 font-display text-xl">
                  {windMph !== null ? `${windMph} mph` : "—"}
                </p>
              </div>
              <div className="col-span-2 rounded-lg border border-white/10 bg-black/40 p-3 sm:col-span-1">
                <p className="text-[10px] uppercase tracking-[0.25em] text-orange-300">Today</p>
                <p className="mt-1 truncate font-display text-base">
                  {today ? `${today.temperature}°${today.temperatureUnit} · ${today.shortForecast}` : "—"}
                </p>
              </div>
            </div>
            <div className="text-xs text-white/55 sm:text-right">
              <p className="font-display tracking-[0.2em] text-white/70">SOURCE</p>
              <p className="mt-1">National Weather Service (NWS)</p>
              <p className="mt-1">KMCO • MLB grid 26,68</p>
              <p className="mt-1">Updates every 10 min</p>
            </div>
          </div>
        </div>
      </section>

      {/* Active alerts */}
      {alerts.length > 0 && (
        <section className="border-b border-white/10 bg-zinc-950 px-6 py-10">
          <div className="mx-auto max-w-7xl">
            <h2 className="font-display text-3xl tracking-[0.04em] sm:text-4xl">
              ▲ ACTIVE WEATHER ALERTS
            </h2>
            <p className="mt-2 text-white/60">
              Live from NWS for Orange/Seminole/Osceola/Lake area.
            </p>
            <div className="mt-6 grid gap-3">
              {alerts.map((a) => (
                <div
                  key={a.properties.id}
                  className={`rounded-xl border-l-4 ${severityClass(
                    a.properties.severity
                  )} bg-white/[0.03] p-5`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-current px-2 py-0.5 text-[10px] uppercase tracking-widest">
                      {a.properties.severity} · {a.properties.urgency}
                    </span>
                    <h3 className="font-display text-lg tracking-wide">
                      {a.properties.event}
                    </h3>
                  </div>
                  {a.properties.headline && (
                    <p className="mt-2 text-sm leading-6 text-white/85">
                      {a.properties.headline}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-white/55">
                    Areas: {a.properties.areaDesc}
                  </p>
                  {(a.properties.onset || a.properties.ends || a.properties.expires) && (
                    <p className="mt-1 text-xs text-white/55">
                      {a.properties.onset && <>Starts: {fmtDate(a.properties.onset)} ET · </>}
                      {a.properties.ends && <>Ends: {fmtDate(a.properties.ends)} ET</>}
                      {!a.properties.ends && a.properties.expires && (
                        <>Expires: {fmtDate(a.properties.expires)} ET</>
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Forecast */}
      {next6.length > 0 && (
        <section className="px-6 py-12">
          <div className="mx-auto max-w-7xl">
            <h2 className="font-display text-3xl tracking-[0.04em] sm:text-4xl">
              ☼ FORECAST
            </h2>
            <p className="mt-2 text-white/60">
              Next periods from the NWS Melbourne (MLB) office.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {next6.map((p) => (
                <div
                  key={p.number}
                  className="rounded-xl border border-white/10 bg-gradient-to-br from-orange-500/10 to-transparent p-4"
                >
                  <p className="font-display text-xs tracking-[0.25em] text-orange-300">
                    {p.name.toUpperCase()}
                  </p>
                  <p className="mt-2 font-display text-3xl">
                    {p.temperature}°{p.temperatureUnit}
                  </p>
                  <p className="mt-1 text-xs text-white/75">{p.shortForecast}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-widest text-white/45">
                    {p.windSpeed} {p.windDirection}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Disney */}
      <section className="border-t border-white/10 bg-zinc-950 px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-3xl tracking-[0.04em] sm:text-4xl">
            ✦ DISNEY WORLD
          </h2>
          <p className="mt-2 text-white/60">
            {"What's announced, opening, or breaking at WDW right now."}
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {disneyNews.map((n) => (
              <Link
                key={n.headline}
                href={n.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-blue-400/50 hover:bg-white/[0.05]"
              >
                <p className="font-display text-xs tracking-[0.3em] text-blue-300">
                  {n.source}
                </p>
                <h3 className="mt-2 font-display text-base tracking-wide group-hover:text-white">
                  {n.headline} ↗
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Universal */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-3xl tracking-[0.04em] sm:text-4xl">
            ◢ UNIVERSAL ORLANDO
          </h2>
          <p className="mt-2 text-white/60">
            Studios Florida, Islands of Adventure, Volcano Bay, Epic Universe.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {universalNews.map((n) => (
              <Link
                key={n.headline}
                href={n.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-red-400/50 hover:bg-white/[0.05]"
              >
                <p className="font-display text-xs tracking-[0.3em] text-red-300">
                  {n.source}
                </p>
                <h3 className="mt-2 font-display text-base tracking-wide group-hover:text-white">
                  {n.headline} ↗
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Traffic */}
      <section className="border-t border-white/10 bg-zinc-950 px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-3xl tracking-[0.04em] sm:text-4xl">
            {"⚠ I-75 & FLORIDA'S TURNPIKE"}
          </h2>
          <p className="mt-2 text-white/60">
            Live cameras + active construction. Click through for real-time data.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trafficLinks.map((t) => (
              <Link
                key={t.title}
                href={t.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/10 to-transparent p-5 transition hover:border-amber-400/60 hover:bg-white/[0.05]"
              >
                <h3 className="font-display text-lg tracking-wide group-hover:text-amber-200">
                  {t.title} ↗
                </h3>
                <p className="mt-2 text-sm text-white/70">{t.body}</p>
              </Link>
            ))}
          </div>

          <h3 className="mt-12 font-display text-2xl tracking-[0.04em]">
            ▌ CURRENT ROAD WORK
          </h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {trafficHeadlines.map((n) => (
              <Link
                key={n.headline}
                href={n.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-amber-400/50"
              >
                <p className="font-display text-xs tracking-[0.3em] text-amber-300">
                  {n.source}
                </p>
                <p className="mt-1 text-sm leading-snug group-hover:text-white">
                  {n.headline} ↗
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-xs text-white/45">
        Weather + alerts via the National Weather Service. Theme park and traffic
        headlines link to source publications.
      </footer>
    </main>
  );
}
