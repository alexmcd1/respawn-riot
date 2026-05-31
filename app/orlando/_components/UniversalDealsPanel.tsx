'use client'

// Universal Orlando deals panel — static catalog + RSS deal feed.
//
// Why no live rates? Universal's hotel-booking API is fronted by
// Akamai bot protection that blocks server-side replay. (Disney's
// equivalent isn't, which is why /disney/availability works.) We
// surface the catalog with booking deeplinks instead, and rely on
// MouseSavers/AllEars/Inside Universal RSS for "new offer dropped"
// alerts.

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
  return (
    <div className="space-y-6">
      {/* Heads-up explaining the rate situation honestly */}
      <div className="rounded-2xl border border-pink-400/30 bg-pink-500/5 p-4 text-sm">
        <p className="font-display text-[10px] tracking-[0.3em] text-pink-300">
          ▌ HOW THIS TAB WORKS
        </p>
        <p className="mt-2 text-white/85">
          Universal&apos;s booking system blocks server-side rate lookups (their
          anti-bot is more aggressive than Disney&apos;s). So instead of live
          prices, this tab shows the full on-site catalog with deeplinks +
          a feed of new Universal deal posts as soon as MouseSavers,
          AllEars, or Inside Universal publish them.
        </p>
        <p className="mt-2 text-white/65">
          Click any hotel to open Universal&apos;s booking page in a new tab —
          the FL Resident discount option (promo code <strong className="text-pink-200">FLO</strong>)
          is visible at the top of every page on universalorlando.com.
        </p>
      </div>

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
                  <p className="mt-1 text-sm leading-snug text-white group-hover:text-pink-100">
                    {d.title} ↗
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Catalog of on-site hotels, grouped by tier */}
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
                    <HotelCard key={h.code} hotel={h} />
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

function HotelCard({ hotel }: { hotel: UniversalHotel }) {
  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-pink-400/40">
      <p className="font-display text-base text-white">
        {hotel.name.replace(/^(Universal'?s?|Loews) /, '')}
      </p>
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
