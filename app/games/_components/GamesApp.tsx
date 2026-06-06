'use client'

// Client-side tab switcher for /games. All four panels are rendered
// server-side and passed in as ReactNode props; we hide the inactive
// ones with the `hidden` attribute rather than conditionally rendering,
// so server-fetched data stays warm when the user flips between tabs.

import MiniAppNav, { useTabFromUrl, type MiniAppTab } from '../../_components/MiniAppNav'

const TABS: MiniAppTab[] = [
  { id: 'news',        label: 'News',        icon: '📰' },
  { id: 'hot',         label: 'Hot Now',     icon: '🔥' },
  { id: 'now-playing', label: 'Now Playing', icon: '🎮' },
  { id: 'devlog',      label: 'Build Log',   icon: '✦' },
]

const TAB_IDS = TABS.map((t) => t.id)

export default function GamesApp({
  news,
  hot,
  nowPlaying,
  devlog,
}: {
  news: React.ReactNode
  hot: React.ReactNode
  nowPlaying: React.ReactNode
  devlog: React.ReactNode
}) {
  // Default tab is 'news' per user preference — the headline grid
  // is the most immediately useful surface for first-time visitors.
  const [tab, setTab] = useTabFromUrl('news', TAB_IDS)

  return (
    <>
      <MiniAppNav tabs={TABS} activeTab={tab} onChange={setTab} color="cyan" />
      <div hidden={tab !== 'news'}>{news}</div>
      <div hidden={tab !== 'hot'}>{hot}</div>
      <div hidden={tab !== 'now-playing'}>{nowPlaying}</div>
      <div hidden={tab !== 'devlog'}>{devlog}</div>
    </>
  )
}
