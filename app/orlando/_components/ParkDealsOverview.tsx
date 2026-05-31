'use client'

// Cross-park overview tile shown at the top of the Park Deals tab.
// Surfaces the freshest deal posts from BOTH parks, plus a couple
// of jump-to-section anchors. Keeps the user oriented when first
// landing on the tab.

type ParkDealItem = {
  source: string
  title: string
  link: string
  pubDate?: string
  parks: 'disney' | 'universal' | 'both' | 'other'
}

function parkLabel(t: ParkDealItem['parks']): { text: string; tone: string } {
  if (t === 'disney') return { text: 'DISNEY', tone: 'bg-blue-500/15 text-blue-200' }
  if (t === 'universal') return { text: 'UNIVERSAL', tone: 'bg-pink-500/15 text-pink-200' }
  if (t === 'both') return { text: 'BOTH', tone: 'bg-amber-500/15 text-amber-200' }
  return { text: '', tone: '' }
}

function shortRelative(iso?: string): string | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  const ageMs = Date.now() - t
  const ageHrs = ageMs / 3_600_000
  if (ageHrs < 1) return 'just now'
  if (ageHrs < 24) return `${Math.round(ageHrs)}h ago`
  const ageDays = ageHrs / 24
  if (ageDays < 14) return `${Math.round(ageDays)}d ago`
  return `${Math.round(ageDays / 7)}w ago`
}

export default function ParkDealsOverview({
  deals,
  disneyCount,
  universalCount,
}: {
  deals: ParkDealItem[]
  disneyCount: number
  universalCount: number
}) {
  // Pick the 6 most recent across both parks for the headline tile
  const sorted = [...deals].sort((a, b) => {
    const ta = a.pubDate ? Date.parse(a.pubDate) : 0
    const tb = b.pubDate ? Date.parse(b.pubDate) : 0
    return tb - ta
  })
  const top = sorted.slice(0, 6)

  return (
    <section className="overflow-hidden rounded-2xl border border-orange-400/30 bg-gradient-to-br from-orange-500/10 via-fuchsia-500/5 to-blue-500/5 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-display text-[10px] tracking-[0.3em] text-orange-300">
            ▌ LATEST DEALS · ACROSS BOTH PARKS
          </p>
          <h3 className="mt-1 font-display text-xl tracking-wide text-white sm:text-2xl">
            {deals.length === 0
              ? 'No fresh deal posts in the last few days.'
              : `${deals.length} new deal post${deals.length === 1 ? '' : 's'}`}
          </h3>
        </div>
        <div className="flex gap-2 text-[11px]">
          <a
            href="#disney-section"
            className="rounded-md border border-blue-400/50 bg-blue-500/10 px-2.5 py-1 font-display tracking-widest text-blue-200 hover:bg-blue-500/20"
          >
            DISNEY ({disneyCount})
          </a>
          <a
            href="#universal-section"
            className="rounded-md border border-pink-400/50 bg-pink-500/10 px-2.5 py-1 font-display tracking-widest text-pink-200 hover:bg-pink-500/20"
          >
            UNIVERSAL ({universalCount})
          </a>
        </div>
      </div>

      {top.length > 0 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {top.map((d) => {
            const label = parkLabel(d.parks)
            const rel = shortRelative(d.pubDate)
            return (
              <li
                key={d.link}
                className="rounded-xl border border-white/10 bg-black/30 p-3 transition hover:border-orange-400/60"
              >
                <a
                  href={d.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="flex items-center justify-between gap-2">
                    {label.text && (
                      <span
                        className={`rounded px-1.5 py-0.5 font-display text-[9px] tracking-widest ${label.tone}`}
                      >
                        {label.text}
                      </span>
                    )}
                    {rel && (
                      <span className="font-mono text-[10px] text-white/40">
                        {rel}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm leading-snug text-white/95 hover:text-white">
                    {d.title} ↗
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-white/40">
                    {d.source}
                  </p>
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
