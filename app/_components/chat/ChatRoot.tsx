'use client'

// Mounted once in the root layout. Renders nothing unless the user is
// signed in. Once signed in, mounts:
//   - The persistent BuddyList in the bottom-right corner
//   - Stacked ChatWindow popups to the left of it (one per open chat)
//
// Hidden on the /sign-in pages so the chat overlay doesn't sit on top
// of the auth flow.

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useChat } from './ChatContext'
import BuddyList from './BuddyList'
import ChatWindow from './ChatWindow'

const HIDDEN_PREFIXES = ['/sign-in']

// ChatRoot renders the floating overlay only. The provider lives in
// layout.tsx so /buddies (and any other page that consumes useChat()) all
// share the same state with the overlay.
export default function ChatRoot() {
  const { status } = useSession()
  const pathname = usePathname() ?? ''

  if (status !== 'authenticated') return null
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null

  return <ChatOverlay />
}

function ChatOverlay() {
  const chat = useChat()

  // Layout constants. Window CSS uses 300px on phones, 320px on sm+.
  // We compute offsets from viewport width so all windows fit (with
  // the buddy list claiming the rightmost slot).
  const windowWidth = 320
  const gap = 12
  const buddyListSlot = 320

  // Track viewport width so the "hide buddy list when too narrow"
  // decision re-evaluates on resize / rotate.
  const [viewportW, setViewportW] = useState<number | null>(null)
  useEffect(() => {
    const update = () => setViewportW(window.innerWidth)
    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  const visibleWindows = chat.openWindows
  const tooNarrow =
    viewportW != null &&
    viewportW < buddyListSlot + windowWidth + gap * 3
  const hideBuddyListBehindChats = tooNarrow && visibleWindows.length > 0

  return (
    <>
      {!hideBuddyListBehindChats && <BuddyList />}
      {visibleWindows.map((w, idx) => {
        // Stack the most recently opened chat closest to the buddy list,
        // older ones further left. When the buddy list is hidden (narrow
        // viewport with chats open), stack from the right edge instead.
        const baseRight = hideBuddyListBehindChats ? 12 : buddyListSlot + gap
        const offset = baseRight + idx * (windowWidth + gap)
        return (
          <ChatWindow
            key={w.buddyId}
            buddyId={w.buddyId}
            username={w.username}
            minimized={w.minimized}
            offset={offset}
          />
        )
      })}
    </>
  )
}
