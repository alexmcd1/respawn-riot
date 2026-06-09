'use client'

// Client-side tab switcher for /books. All three panels are rendered
// server-side and passed in as ReactNode props; we hide the inactive
// ones with `hidden` so server-fetched data stays warm when the user
// flips between tabs (matches the /games and /food pattern).

import MiniAppNav, { useTabFromUrl, type MiniAppTab } from '../../_components/MiniAppNav'
import { IconBook, IconCrescent, IconNews } from '../../_components/icons'

const TABS: MiniAppTab[] = [
  { id: 'series',    label: 'Sci-Fi & Fantasy', icon: <IconBook /> },
  { id: 'thrillers', label: 'Psych Thrillers',  icon: <IconCrescent /> },
  { id: 'news',      label: 'Book News',        icon: <IconNews /> },
]

const TAB_IDS = TABS.map((t) => t.id)

export default function BooksApp({
  series,
  thrillers,
  news,
}: {
  series: React.ReactNode
  thrillers: React.ReactNode
  news: React.ReactNode
}) {
  const [tab, setTab] = useTabFromUrl('series', TAB_IDS)

  return (
    <>
      <MiniAppNav tabs={TABS} activeTab={tab} onChange={setTab} color="amber" />
      <div hidden={tab !== 'series'}>{series}</div>
      <div hidden={tab !== 'thrillers'}>{thrillers}</div>
      <div hidden={tab !== 'news'}>{news}</div>
    </>
  )
}
