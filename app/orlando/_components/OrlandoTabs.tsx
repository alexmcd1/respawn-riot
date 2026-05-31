'use client'

// Client tab shell for the Orlando page. The server component
// (page.tsx) does all the data fetching, builds the news JSX tree,
// and passes it as `newsContent`. We swap that content with the
// Disney Deals panel based on the active tab. URL stays in sync
// via ?tab=… so deep-linking works.

import MiniAppNav, { useTabFromUrl, type MiniAppTab } from '../../_components/MiniAppNav'
import DisneyDealsPanel from './DisneyDealsPanel'
import DisneyAlertsSubscribe from './DisneyAlertsSubscribe'

const TABS: MiniAppTab[] = [
  { id: 'news',         label: 'News',         icon: '📰' },
  { id: 'disney-deals', label: 'Disney Deals', icon: '✦' },
]

const TAB_IDS = TABS.map((t) => t.id)

export default function OrlandoTabs({ newsContent }: { newsContent: React.ReactNode }) {
  const [tab, setTab] = useTabFromUrl('news', TAB_IDS)

  return (
    <>
      <MiniAppNav tabs={TABS} activeTab={tab} onChange={setTab} color="amber" />

      {tab === 'news' && newsContent}

      {tab === 'disney-deals' && (
        <section className="px-4 py-8 sm:px-6 sm:py-10">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="mb-5">
              <p className="font-display text-[11px] tracking-[0.3em] text-orange-400">
                ▌ DISNEY DEALS
              </p>
              <h2 className="mt-2 font-display text-2xl tracking-wide sm:text-3xl">
                Watch Disney rates — Florida Resident included.
              </h2>
              <p className="mt-2 text-sm text-white/65">
                Live rates pulled from Disney&apos;s booking API. Subscribe to
                get a daily email when prices drop on the hotels and dates you
                care about. Florida Resident discounts apply automatically — no
                Disney account login needed.
              </p>
            </div>

            <DisneyDealsPanel />
            <DisneyAlertsSubscribe />
          </div>
        </section>
      )}
    </>
  )
}
