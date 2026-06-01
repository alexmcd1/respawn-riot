'use client'

// Universal Orlando deals panel — live rates (via Scrapfly) +
// static catalog + RSS deal feed + booking deeplinks.
//
// Live rates need Scrapfly because Universal's booking API is
// Akamai-protected. We tried Browserless first; stealth wasn't
// enough — Akamai IP-blocks data-center pools. Scrapfly's Anti
// Scraping Protection (ASP) uses residential proxies, which works.
// See app/_lib/universalLive.ts.
//
// You can disable live rates without a redeploy by setting
// NEXT_PUBLIC_UNIVERSAL_LIVE_RATES=0 in Vercel env vars.

import { useState } from 'react'

const LIVE_RATES_ENABLED =
  process.env.NEXT_PUBLIC_UNIVERSAL_LIVE_RATES !== '0'
import {
  UNIVERSAL_ALL_OFFERS_URL,
  UNIVERSAL_FL_RESIDENT_URL,
  UNIVERSAL_HOTELS,
  UNIVERSAL_HOTEL_LISTING_URL,
  UNIVERSAL_TIERS,
  type UniversalHotel,
  type UniversalTier,
} from '../../_lib/universalCatalog'

type ParkDealItem = {
  source: string
  title: string
  link: string
  pubDate?: string
  parks: 'disney' | 'universal' | 'both' | 'other'
}

type LiveOffer = {
  hotelCode: string
  name: string
  tier: UniversalTier
  fromPrice: number
  url?: string
}

const TIER_TONE: Record<UniversalTier, string> = {
  Value: 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200',
  'Prime Value': 'border-amber-400/50 bg-amber-500/10 text-amber-200',
  Preferred: 'border-sky-400/50 bg-sky-500/10 text-sky-200',
  Premier: 'border-fuchsia-400/50 bg-fuchsia-500/10 text-fuchsia-200',
}

export default function UniversalDealsPanel({
  recentDeals,
}: {
  recentDeals: ParkDealItem[]
}) {
  // Live-rate search state
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [flResident, setFlResident] = useState(true)

  const [liveOffers, setLiveOffers] = useState<LiveOffer[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [fetchedMs, setFetchedMs] = useState<number | null>(null)

  async function doSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearchError('')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) {
      setSearchError('Pick check-in and check-out dates first.')
      return
    }
    if (checkIn >= checkOut) {
      setSearchError('Check-out must be after check-in.')
      return
    }
    setSearching(true)
    try {
      const res = await fetch('/api/universal/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkIn,
          checkOut,
          adults,
          children,
          promoCode: flResident ? 'FLO' : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!data.ok) {
        setSearchError(typeof data.error === 'string' ? data.error : 'Search failed')
        setLiveOffers(null)
      } else {
        setLiveOffers(data.offers ?? [])
        setFetchedMs(typeof data.fetchedInMs === 'number' ? data.fetchedInMs : null)
      }
    } catch {
      setSearchError('Network error — try again.')
    } finally {
      setSearching(false)
    }
  }

  // Build a quick lookup of live prices by hotel code so the catalog
  // section can show "from $X/night" badges alongside each hotel.
  const livePriceByCode = new Map<string, number>(
    (liveOffers ?? []).map((o) => [o.hotelCode, o.fromPrice])
  )

  return (
    <div className="space-y-6">
      {/* Quick links to canonical Universal pages */}
      <div className="flex flex-wrap gap-2">
        <a
          href={UNIVERSAL_FL_RESIDENT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-pink-400/60 bg-pink-500/10 px-3 py-2 font-display text-[11px] tracking-[0.2em] text-pink-100 hover:bg-pink-500/20"
        >
          ✦ FL RESIDENT HOTEL DEALS ↗
        </a>
        <a
          href={UNIVERSAL_ALL_OFFERS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 font-display text-[11px] tracking-[0.2em] text-white/85 hover:border-white/40"
        >
          ALL HOTEL OFFERS ↗
        </a>
        <a
          href={UNIVERSAL_HOTEL_LISTING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 font-display text-[11px] tracking-[0.2em] text-white/85 hover:border-white/40"
        >
          BOOK BY DATE ↗
        </a>
      </div>

      {/* Live rate search — disabled by default because Akamai's
          IP-level bot detection blocks Browserless's data-center pool.
          Flip NEXT_PUBLIC_UNIVERSAL_LIVE_RATES=1 once you have a
          residential-proxy upgrade and it'll work end-to-end. */}
      {LIVE_RATES_ENABLED && (
      <form onSubmit={doSearch} className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div>
          <p className="font-display text-[10px] tracking-[0.3em] text-pink-300">
            ▌ LIVE RATE CHECK
          </p>
          <p className="mt-1 text-xs text-white/55">
            Routes through a hosted browser to bypass Universal&apos;s bot
            wall — takes 5–10 seconds.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label htmlFor="u-in" className="font-display text-[10px] tracking-[0.3em] text-pink-300">
              ▌ CHECK-IN
            </label>
            <input
              id="u-in"
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-pink-400 [color-scheme:dark]"
            />
          </div>
          <div>
            <label htmlFor="u-out" className="font-display text-[10px] tracking-[0.3em] text-pink-300">
              ▌ CHECK-OUT
            </label>
            <input
              id="u-out"
              type="date"
              value={checkOut}
              min={checkIn || undefined}
              onChange={(e) => setCheckOut(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-pink-400 [color-scheme:dark]"
            />
          </div>
          <div>
            <label htmlFor="u-ad" className="font-display text-[10px] tracking-[0.3em] text-pink-300">
              ▌ ADULTS
            </label>
            <input
              id="u-ad"
              type="number"
              min={1}
              max={10}
              value={adults}
              onChange={(e) => setAdults(Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 2)))}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-pink-400"
            />
          </div>
          <div>
            <label htmlFor="u-ch" className="font-display text-[10px] tracking-[0.3em] text-pink-300">
              ▌ CHILDREN
            </label>
            <input
              id="u-ch"
              type="number"
              min={0}
              max={10}
              value={children}
              onChange={(e) => setChildren(Math.max(0, Math.min(10, parseInt(e.target.value, 10) || 0)))}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-pink-400"
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-pink-400/40 bg-pink-500/5 px-4 py-3 text-sm text-pink-100 hover:border-pink-400">
          <input
            type="checkbox"
            checked={flResident}
            onChange={(e) => setFlResident(e.target.checked)}
            className="h-5 w-5 accent-pink-500"
          />
          <span>
            ✦ Florida Resident rates
            <span className="ml-2 text-[11px] text-white/50">
              (promo <strong className="text-pink-200">FLO</strong> — no Universal login needed)
            </span>
          </span>
        </label>

        {searchError && (
          <p className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
            ▲ {searchError}
          </p>
        )}

        <button
          type="submit"
          disabled={searching}
          className="w-full rounded-xl bg-pink-500 px-6 py-3 font-display text-base tracking-[0.25em] text-black hover:bg-pink-400 disabled:opacity-50"
        >
          {searching ? 'CHECKING UNIVERSAL… (5-10s)' : '🔍 PREVIEW RATES'}
        </button>
      </form>
      )}

      {/* Honest explainer (shown only when live rates are disabled) */}
      {!LIVE_RATES_ENABLED && (
        <div className="rounded-2xl border border-pink-400/30 bg-pink-500/5 p-4 text-sm">
          <p className="font-display text-[10px] tracking-[0.3em] text-pink-300">
            ▌ ABOUT UNIVERSAL RATES
          </p>
          <p className="mt-2 text-white/85">
            Universal&apos;s booking system is fronted by Akamai bot
            detection that blocks server-side rate lookups even through
            a headless browser. Use the <strong className="text-pink-200">BOOK BY DATE ↗</strong> link
            above to check current prices directly on universalorlando.com
            (the FL Resident toggle, promo code <strong className="text-pink-200">FLO</strong>, is on every page).
          </p>
          <p className="mt-2 text-white/65">
            We do catch new Universal FL Resident promo announcements
            within hours of them landing via the deal feed below.
          </p>
        </div>
      )}

      {/* Live results */}
      {LIVE_RATES_ENABLED && liveOffers && (
        <div className="rounded-2xl border border-pink-400/30 bg-pink-500/5 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-display text-[10px] tracking-[0.3em] text-pink-300">
              ▌ LIVE RATES{flResident ? ' · FLORIDA RESIDENT' : ''}
            </p>
            <p className="text-[11px] text-emerald-300/85">
              ✓ via Browserless · {fetchedMs ? `${(fetchedMs / 1000).toFixed(1)}s` : 'fresh'}
            </p>
          </div>
          {liveOffers.length === 0 ? (
            <p className="mt-3 text-sm text-white/65">
              No rates returned for these dates. Try widening the range or
              dropping the FL Resident filter.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {liveOffers.map((o) => {
                const meta = UNIVERSAL_HOTELS.find((h) => h.code === o.hotelCode)
                return (
                  <li
                    key={o.hotelCode}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-display text-base text-white">
                        {o.name.replace(/^(Universal'?s?|Loews) /, '')}
                      </p>
                      <p className="text-[10px] uppercase tracking-widest text-pink-300/80">
                        {o.tier}
                      </p>
                      {meta?.tierBlurb && o.tier === 'Premier' && (
                        <p className="mt-0.5 text-[11px] text-emerald-300/85">
                          ✓ Free Unlimited Express Pass
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display text-2xl leading-none text-white">
                        ${Math.round(o.fromPrice)}
                        <span className="ml-0.5 text-xs text-white/55">/nt</span>
                      </p>
                      {o.url && (
                        <a
                          href={o.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block rounded-md border border-pink-400/60 bg-pink-500/10 px-2 py-1 text-[10px] uppercase tracking-widest text-pink-100 hover:bg-pink-500/20"
                        >
                          ↗ Book
                        </a>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {/* Recent Universal-tagged deal posts */}
      {recentDeals.length > 0 && (
        <section>
          <h4 className="mb-3 font-display text-[11px] tracking-[0.3em] text-pink-300">
            ▌ RECENT UNIVERSAL DEAL POSTS
          </h4>
          <ul className="grid gap-2 sm:grid-cols-2">
            {recentDeals.slice(0, 6).map((d) => (
              <li
                key={d.link}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-pink-400/60"
              >
                <a
                  href={d.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <p className="font-display text-[10px] tracking-[0.25em] text-pink-300/85">
                    {d.source}
                    {d.parks === 'both' && (
                      <span className="ml-1.5 rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-white/60">
                        + DISNEY
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm leading-snug text-white">
                    {d.title} ↗
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Static catalog — always visible as reference, "from $X" badges
          appear once a live search runs. */}
      <section>
        <h4 className="mb-3 font-display text-[11px] tracking-[0.3em] text-pink-300">
          ▌ ON-SITE HOTELS ({UNIVERSAL_HOTELS.length})
        </h4>
        <div className="space-y-5">
          {UNIVERSAL_TIERS.map((tier) => {
            const list = UNIVERSAL_HOTELS.filter((h) => h.tier === tier)
            if (list.length === 0) return null
            return (
              <div key={tier}>
                <h5
                  className={`inline-flex items-center gap-2 rounded-md border px-2 py-1 font-display text-[10px] uppercase tracking-[0.3em] ${TIER_TONE[tier]}`}
                >
                  {tier} ({list.length})
                </h5>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {list.map((h) => (
                    <HotelCard
                      key={h.code}
                      hotel={h}
                      livePrice={livePriceByCode.get(h.code)}
                    />
                  ))}
                </ul>
                {list[0].tierBlurb && (
                  <p className="mt-1 text-[11px] text-white/45">
                    {list[0].tierBlurb}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function HotelCard({ hotel, livePrice }: { hotel: UniversalHotel; livePrice?: number }) {
  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-pink-400/40">
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-base text-white">
          {hotel.name.replace(/^(Universal'?s?|Loews) /, '')}
        </p>
        {livePrice != null && (
          <span className="shrink-0 rounded-md bg-emerald-500/15 px-2 py-0.5 font-display text-[11px] tracking-widest text-emerald-200">
            ${Math.round(livePrice)}/nt
          </span>
        )}
      </div>
      {hotel.blurb && (
        <p className="mt-1 text-xs text-white/65">{hotel.blurb}</p>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-white/35">
          {hotel.code}
        </span>
        <a
          href={hotel.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-pink-400/60 bg-pink-500/10 px-2.5 py-1 font-display text-[11px] tracking-[0.2em] text-pink-100 hover:bg-pink-500/20"
        >
          ↗ Book on Universal
        </a>
      </div>
    </li>
  )
}
