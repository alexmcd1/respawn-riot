'use client'

// Central client-side state for the chat overlay.
//
// Responsibilities:
//   1. Poll /api/chat/buddies on a 15s timer + on demand
//   2. Heartbeat /api/chat/presence every 30s (kept alive while any tab open)
//   3. Track which chat windows are open (one per buddy)
//   4. Play the "door open" sound when a buddy transitions offline → online
//   5. Expose actions: open/close a window, update status, refresh
//
// Everything below the provider can call useChat() to read state and
// dispatch actions.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useSession } from 'next-auth/react'
import {
  BUDDIES_POLL_MS,
  PRESENCE_HEARTBEAT_MS,
  type Buddy,
  type BuddiesPayload,
  type ChatStatus,
  type PendingRequest,
} from '../../_lib/chat'
import { playDoorOpen } from './sounds'

type OpenWindow = {
  buddyId: number
  username: string
  minimized: boolean
}

type Me = BuddiesPayload['me']

type ChatState = {
  ready: boolean              // initial /buddies load complete
  me: Me | null
  buddies: Buddy[]
  pending: PendingRequest[]
  openWindows: OpenWindow[]
  // Actions
  refresh: () => Promise<void>
  openWindow: (buddyId: number, username: string) => void
  closeWindow: (buddyId: number) => void
  toggleMinimize: (buddyId: number) => void
  updateMe: (patch: Partial<{
    status: ChatStatus
    awayMessage: string | null
    profile: string | null
    soundEnabled: boolean
  }>) => Promise<void>
  // Total unread across all conversations (for the buddy-list badge)
  totalUnread: number
}

const ChatCtx = createContext<ChatState | null>(null)

export function useChat(): ChatState {
  const ctx = useContext(ChatCtx)
  if (!ctx) {
    throw new Error('useChat() must be used inside <ChatProvider>')
  }
  return ctx
}

// ──────────────────────────────────────────────────────────────────────────

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const authed = status === 'authenticated'

  const [ready, setReady] = useState(false)
  const [me, setMe] = useState<Me | null>(null)
  const [buddies, setBuddies] = useState<Buddy[]>([])
  const [pending, setPending] = useState<PendingRequest[]>([])
  const [openWindows, setOpenWindows] = useState<OpenWindow[]>([])

  // Remember which buddies were online on the last refresh so we can
  // detect offline→online transitions and ding the door sound.
  const prevOnlineRef = useRef<Set<number>>(new Set())
  const firstLoadRef = useRef(true)

  const refresh = useCallback(async () => {
    if (!authed) return
    try {
      const res = await fetch('/api/chat/buddies', { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as BuddiesPayload | { ok: false }
      if (!data.ok) return
      // Detect offline→online transitions for the door sound. We skip the
      // very first load so we don't blast the door for everyone already
      // online when the page mounts.
      const nextOnline = new Set<number>()
      for (const b of data.buddies) {
        if (b.presence === 'online') nextOnline.add(b.userId)
      }
      if (!firstLoadRef.current && data.me.soundEnabled) {
        for (const id of nextOnline) {
          if (!prevOnlineRef.current.has(id)) {
            playDoorOpen()
            break // one ding even if multiple buddies came online at once
          }
        }
      }
      prevOnlineRef.current = nextOnline
      firstLoadRef.current = false

      setMe(data.me)
      setBuddies(data.buddies)
      setPending(data.pending)
      setReady(true)
    } catch {
      // Network blip — keep last state, try again next interval
    }
  }, [authed])

  // Initial load + polling. Reset everything if we sign out.
  useEffect(() => {
    if (!authed) {
      setReady(false)
      setMe(null)
      setBuddies([])
      setPending([])
      setOpenWindows([])
      prevOnlineRef.current = new Set()
      firstLoadRef.current = true
      return
    }
    void refresh()
    const id = window.setInterval(() => void refresh(), BUDDIES_POLL_MS)
    return () => window.clearInterval(id)
  }, [authed, refresh])

  // Standalone heartbeat — fires even when the tab is in the background
  // (just slower, browsers throttle). Distinct from the buddies poll so
  // a single failed buddies fetch doesn't make us look offline.
  useEffect(() => {
    if (!authed) return
    const ping = () => {
      fetch('/api/chat/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        cache: 'no-store',
        keepalive: true,
      }).catch(() => {})
    }
    ping()
    const id = window.setInterval(ping, PRESENCE_HEARTBEAT_MS)
    return () => window.clearInterval(id)
  }, [authed])

  // Public actions ────────────────────────────────────────────────────────

  const openWindow = useCallback((buddyId: number, username: string) => {
    setOpenWindows((cur) => {
      // Already open? Un-minimize.
      const idx = cur.findIndex((w) => w.buddyId === buddyId)
      if (idx >= 0) {
        const next = cur.slice()
        next[idx] = { ...next[idx], minimized: false }
        return next
      }
      // Cap at 4 open chats to keep the screen tidy on mobile.
      const next = [...cur, { buddyId, username, minimized: false }]
      return next.slice(-4)
    })
  }, [])

  const closeWindow = useCallback((buddyId: number) => {
    setOpenWindows((cur) => cur.filter((w) => w.buddyId !== buddyId))
  }, [])

  const toggleMinimize = useCallback((buddyId: number) => {
    setOpenWindows((cur) =>
      cur.map((w) => (w.buddyId === buddyId ? { ...w, minimized: !w.minimized } : w))
    )
  }, [])

  const updateMe = useCallback(
    async (patch: Parameters<ChatState['updateMe']>[0]) => {
      // Optimistic local update
      setMe((cur) => (cur ? { ...cur, ...patch } : cur))
      try {
        await fetch('/api/chat/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        })
      } catch {
        // Will re-sync on next /buddies poll
      }
    },
    []
  )

  const totalUnread = useMemo(
    () => buddies.reduce((sum, b) => sum + (b.unreadCount || 0), 0),
    [buddies]
  )

  const value: ChatState = useMemo(
    () => ({
      ready,
      me,
      buddies,
      pending,
      openWindows,
      refresh,
      openWindow,
      closeWindow,
      toggleMinimize,
      updateMe,
      totalUnread,
    }),
    [ready, me, buddies, pending, openWindows, refresh, openWindow, closeWindow, toggleMinimize, updateMe, totalUnread]
  )

  return <ChatCtx.Provider value={value}>{children}</ChatCtx.Provider>
}
