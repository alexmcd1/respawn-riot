'use client'

// Client tab switcher for the Music page. Both child panels are
// rendered server-side and passed in as props — we just show/hide
// the active one based on the URL ?tab=… param.
//
// The hide-via-CSS approach (instead of conditional render) keeps
// the pop-punk panel's server-side data warm even when the user
// switches to concerts and back, and avoids re-mounting the RSS-fed
// band cards on every tab toggle.

import MiniAppNav, { useTabFromUrl, type MiniAppTab } from '../../_components/MiniAppNav'

const TABS: MiniAppTab[] = [
  { id: 'pop-punk', label: 'Pop Punk', icon: '🎸' },
  { id: 'concerts', label: 'Concerts', icon: '🎟️' },
]

const TAB_IDS = TABS.map((t) => t.id)

export default function MusicApp({
  popPunk,
  concerts,
}: {
  popPunk: React.ReactNode
  concerts: React.ReactNode
}) {
  const [tab, setTab] = useTabFromUrl('pop-punk', TAB_IDS)

  return (
    <>
      <MiniAppNav tabs={TABS} activeTab={tab} onChange={setTab} color="pink" />

      {/* Pop punk panel — left mounted at all times so its server-rendered
          content stays cached. We hide with CSS rather than condition,
          so the embedded images and links survive tab swaps without a
          re-fetch flash. */}
      <div hidden={tab !== 'pop-punk'}>{popPunk}</div>
      <div hidden={tab !== 'concerts'}>{concerts}</div>
    </>
  )
}
