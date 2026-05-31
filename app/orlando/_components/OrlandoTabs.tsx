'use client'

// Client tab shell for the Orlando page. Two tabs:
//   - News (the existing weather/forecast/news/traffic JSX)
//   - Park Deals (the new Disney + Universal aggregation)
//
// Park Deals layout, top → bottom:
//   1. ParkDealsOverview — cross-park "latest deal posts" tile
//   2. Disney section (live rates + subscribe)
//   3. Universal section (static catalog + RSS deals + booking links)

import MiniAppNav, { useTabFromUrl, type MiniAppTab } from '../../_components/MiniAppNav'
import DisneyDealsPanel from './DisneyDealsPanel'
import DisneyAlertsSubscribe from './DisneyAlertsSubscribe'
import UniversalDealsPanel from './UniversalDealsPanel'
import ParkDealsOverview from './ParkDealsOverview'

const TABS: MiniAppTab[] = [
  { id: 'news',       label: 'News',       icon: '📰' },
  { id: 'park-deals', label: 'Park Deals', icon: '✦' },
]

// Legacy alias: a previous version used "disney-deals" as the tab id.
// Treat it as park-deals so any saved bookmark / shared link still works.
const TAB_IDS = ['news', 'park-deals', 'disney-deals'] as const

type ParkDealItem = {
  source: string
  title: string
  link: string
  pubDate?: string
  parks: 'disney' | 'universal' | 'both' | 'other'
}

export default function OrlandoTabs({
  newsContent,
  parkDeals,
}: {
  newsContent: React.ReactNode
  parkDeals: ParkDealItem[]
}) {
  const [tabRaw, setTab] = useTabFromUrl('news', TAB_IDS)
  // Normalize legacy "disney-deals" id to the new "park-deals" so the
  // pill nav highlights correctly.
  const tab = tabRaw === 'disney-deals' ? 'park-deals' : tabRaw

  const disneyDealsList = parkDeals.filter(
    (d) => d.parks === 'disney' || d.parks === 'both'
  )
  const universalDealsList = parkDeals.filter(
    (d) => d.parks === 'universal' || d.parks === 'both'
  )

  return (
    <>
      <MiniAppNav tabs={TABS} activeTab={tab} onChange={setTab} color="amber" />

      {tab === 'news' && newsContent}

      {tab === 'park-deals' && (
        <section className="px-4 py-8 sm:px-6 sm:py-10">
          <div className="mx-auto max-w-4xl space-y-8">
            {/* Header */}
            <header>
              <p className="font-display text-[11px] tracking-[0.3em] text-orange-400">
                ▌ PARK DEALS
              </p>
              <h2 className="mt-2 font-display text-2xl tracking-wide sm:text-3xl">
                Watch Disney + Universal in one place.
              </h2>
              <p className="mt-2 text-sm text-white/65">
                Live rates pulled from Disney&apos;s booking API (Florida
                Resident included). Universal&apos;s rates aren&apos;t
                accessible server-side, so we surface their full hotel
                catalog with direct booking deeplinks plus a feed of new
                deal-post coverage from MouseSavers / AllEars / Inside
                Universal.
              </p>
            </header>

            {/* Cross-park overview */}
            <ParkDealsOverview
              deals={parkDeals}
              disneyCount={disneyDealsList.length}
              universalCount={universalDealsList.length}
            />

            {/* DISNEY section */}
            <section id="disney-section" className="scroll-mt-32 space-y-4">
              <div className="flex items-baseline justify-between gap-2 border-b border-white/10 pb-2">
                <h3 className="font-display text-xl tracking-wide text-white sm:text-2xl">
                  <span className="text-blue-300">✦</span> Disney World
                </h3>
                <span className="font-display text-[10px] tracking-[0.3em] text-blue-300/70">
                  LIVE RATES
                </span>
              </div>
              <DisneyDealsPanel />
              <DisneyAlertsSubscribe />
            </section>

            {/* UNIVERSAL section */}
            <section id="universal-section" className="scroll-mt-32 space-y-4">
              <div className="flex items-baseline justify-between gap-2 border-b border-white/10 pb-2">
                <h3 className="font-display text-xl tracking-wide text-white sm:text-2xl">
                  <span className="text-pink-300">◢</span> Universal Orlando
                </h3>
                <span className="font-display text-[10px] tracking-[0.3em] text-pink-300/70">
                  CATALOG + RSS
                </span>
              </div>
              <UniversalDealsPanel recentDeals={universalDealsList} />
            </section>
          </div>
        </section>
      )}
    </>
  )
}
