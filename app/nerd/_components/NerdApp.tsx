'use client'

// Client tab switcher for /nerd. News + LEGO + Comic Con panels are
// server-rendered and passed in as ReactNode props so their fetches
// stay warm when the user flips between tabs. The Crochet panel is
// fully client-side (just a search form), so we mount it directly.

import MiniAppNav, { useTabFromUrl, type MiniAppTab } from '../../_components/MiniAppNav'
import CrochetPanel from './CrochetPanel'

const TABS: MiniAppTab[] = [
  { id: 'news',     label: 'News',         icon: '📰' },
  { id: 'lego',     label: 'LEGO Drops',   icon: '🧱' },
  { id: 'comicon',  label: 'Comic Con',    icon: '🦸' },
  { id: 'crochet',  label: 'Crochet',      icon: '🧶' },
]

const TAB_IDS = TABS.map((t) => t.id)

export default function NerdApp({
  news,
  lego,
  comicon,
}: {
  news: React.ReactNode
  lego: React.ReactNode
  comicon: React.ReactNode
}) {
  const [tab, setTab] = useTabFromUrl('news', TAB_IDS)

  return (
    <>
      <MiniAppNav tabs={TABS} activeTab={tab} onChange={setTab} color="fuchsia" />
      <div hidden={tab !== 'news'}>{news}</div>
      <div hidden={tab !== 'lego'}>{lego}</div>
      <div hidden={tab !== 'comicon'}>{comicon}</div>
      <div hidden={tab !== 'crochet'}>
        <CrochetPanel />
      </div>
    </>
  )
}
