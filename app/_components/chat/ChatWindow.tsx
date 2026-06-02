'use client'

// One open conversation. Stacks alongside other open windows in the
// bottom of the screen. Polls /api/chat/messages for new messages and
// the peer's presence + typing state.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useChat } from './ChatContext'
import { playMessagePing } from './sounds'
import {
  MESSAGES_POLL_MS,
  MESSAGE_BODY_MAX,
  TYPING_PING_DEBOUNCE_MS,
  formatChatTime,
  type ChatMessage,
  type ChatStatus,
} from '../../_lib/chat'

type Peer = {
  userId: number
  username: string
  status: ChatStatus
  presence: 'online' | 'offline'
  awayMessage: string | null
  profile: string | null
  typing: boolean
}

export default function ChatWindow({
  buddyId,
  username,
  minimized,
  offset,
}: {
  buddyId: number
  username: string
  minimized: boolean
  /** Distance from the LEFT edge in pixels — buddy list reserves the
   *  far left slot, each open window is stacked to the right of it. */
  offset: number
}) {
  const chat = useChat()
  const { data: session } = useSession()
  const myUserId = session?.user?.id ? parseInt(session.user.id, 10) : null

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [peer, setPeer] = useState<Peer | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const lastIdRef = useRef(0)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const lastTypingPingRef = useRef(0)
  const firstFetchRef = useRef(true)

  // Poll loop. Initial fetch (no `since`) gets the recent window; later
  // fetches use the delta endpoint to keep payloads small.
  useEffect(() => {
    let cancelled = false

    async function fetchOnce() {
      try {
        const url =
          lastIdRef.current > 0
            ? `/api/chat/messages?with=${buddyId}&since=${lastIdRef.current}`
            : `/api/chat/messages?with=${buddyId}`
        const res = await fetch(url, { cache: 'no-store' })
        const data = await res.json()
        if (cancelled || !data?.ok) return
        const incoming = (data.messages || []) as ChatMessage[]
        if (incoming.length > 0) {
          const newId = incoming[incoming.length - 1].id
          // Ping sound for incoming-from-peer messages on poll (not first
          // load, not for messages we sent ourselves).
          if (!firstFetchRef.current && chat.me?.soundEnabled) {
            const fromPeer = incoming.some((m) => m.senderId === buddyId)
            if (fromPeer) playMessagePing()
          }
          if (lastIdRef.current > 0) {
            setMessages((cur) => [...cur, ...incoming])
          } else {
            setMessages(incoming)
          }
          lastIdRef.current = Math.max(lastIdRef.current, newId)
        }
        if (data.peer) setPeer(data.peer as Peer)
        firstFetchRef.current = false
      } catch {
        // ignore; will retry
      }
    }

    void fetchOnce()
    const id = window.setInterval(fetchOnce, MESSAGES_POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [buddyId, chat.me?.soundEnabled])

  // Refresh global buddy list whenever this window closes (so unread
  // counts update).
  useEffect(() => {
    return () => {
      void chat.refresh()
    }
    // Intentionally empty deps — fire on unmount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-scroll on new messages
  useEffect(() => {
    if (!scrollerRef.current) return
    if (minimized) return
    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight
  }, [messages, minimized, peer?.typing])

  // Optimistic send
  async function onSend(e?: React.FormEvent) {
    e?.preventDefault()
    const body = draft.trim()
    if (!body || sending) return
    setError('')
    setSending(true)
    const tempId = -Math.floor(Math.random() * 1e9)
    const optimistic: ChatMessage = {
      id: tempId,
      senderId: myUserId ?? 0,
      recipientId: buddyId,
      body,
      createdAt: new Date().toISOString(),
      readAt: null,
    }
    setMessages((cur) => [...cur, optimistic])
    setDraft('')
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: buddyId, body }),
      })
      const data = await res.json()
      if (!data.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Send failed.')
        // Rollback optimistic
        setMessages((cur) => cur.filter((m) => m.id !== tempId))
        // Put the draft back so the user can retry
        setDraft(body)
        return
      }
      // Replace optimistic with server copy
      setMessages((cur) =>
        cur.map((m) => (m.id === tempId ? (data.message as ChatMessage) : m))
      )
      lastIdRef.current = Math.max(lastIdRef.current, data.message.id)
    } catch {
      setError('Network error.')
      setMessages((cur) => cur.filter((m) => m.id !== tempId))
      setDraft(body)
    } finally {
      setSending(false)
    }
  }

  // Typing indicator — debounced ping when the user types.
  function onDraftChange(value: string) {
    setDraft(value)
    const now = Date.now()
    if (value.length === 0) {
      // Cleared — tell server to drop the row
      fetch('/api/chat/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: buddyId, stopped: true }),
      }).catch(() => {})
      lastTypingPingRef.current = 0
      return
    }
    if (now - lastTypingPingRef.current < TYPING_PING_DEBOUNCE_MS) return
    lastTypingPingRef.current = now
    fetch('/api/chat/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: buddyId }),
    }).catch(() => {})
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter to send, Shift+Enter for newline (AIM-ish)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void onSend()
    }
  }

  const presenceMeta = useMemo(() => {
    if (!peer) return { label: '…', dot: 'bg-zinc-500' }
    if (peer.presence === 'offline') return { label: 'OFFLINE', dot: 'bg-zinc-600' }
    if (peer.status === 'away') return { label: 'AWAY', dot: 'bg-amber-400' }
    return { label: 'ONLINE', dot: 'bg-emerald-400' }
  }, [peer])

  return (
    <aside
      className="fixed bottom-3 z-40 flex w-[300px] flex-col overflow-hidden rounded-xl border-2 border-cyan-400/50 bg-[#0c0c0c]/95 font-display shadow-[0_0_30px_-8px_rgba(34,211,238,0.7)] backdrop-blur sm:bottom-4 sm:w-[320px]"
      style={{
        left: `${offset}px`,
        maxHeight: minimized ? undefined : 'calc(100vh - 140px)',
      }}
      aria-label={`Chat with ${peer?.username ?? username}`}
    >
      {/* Title bar */}
      <header className="flex items-center justify-between gap-2 border-b border-cyan-400/40 bg-gradient-to-r from-cyan-500/25 via-fuchsia-500/15 to-pink-500/15 px-3 py-2">
        <button
          type="button"
          onClick={() => chat.toggleMinimize(buddyId)}
          className="flex min-w-0 items-center gap-2 text-left"
          title={minimized ? 'Expand' : 'Minimize'}
        >
          <span className={`h-2 w-2 shrink-0 rounded-full ${presenceMeta.dot}`} />
          <span className="truncate text-xs tracking-[0.25em] text-cyan-200">
            {peer?.username ?? username}
          </span>
          <span className="shrink-0 text-[9px] tracking-widest text-white/40">
            {presenceMeta.label}
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => chat.toggleMinimize(buddyId)}
            className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] tracking-widest text-white/55 hover:text-white"
            title={minimized ? 'Expand' : 'Minimize'}
          >
            {minimized ? '▲' : '–'}
          </button>
          <button
            type="button"
            onClick={() => chat.closeWindow(buddyId)}
            className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] tracking-widest text-white/55 hover:text-white"
            title="Close"
          >
            ✕
          </button>
        </div>
      </header>

      {!minimized && (
        <>
          {/* Away message / profile banner */}
          {peer?.awayMessage && peer.status === 'away' && (
            <div className="border-b border-amber-400/30 bg-amber-500/10 px-3 py-1.5 font-sans text-[11px] italic text-amber-200">
              Away: “{peer.awayMessage}”
            </div>
          )}

          {/* Messages */}
          <div
            ref={scrollerRef}
            className="flex-1 overflow-y-auto bg-black/30 p-2 font-sans text-sm"
            style={{ minHeight: 180 }}
          >
            {messages.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-white/40">
                No messages yet. Say hi.
              </p>
            ) : (
              <ul className="space-y-2">
                {messages.map((m, idx) => {
                  const mine = m.senderId === myUserId
                  const prev = idx > 0 ? messages[idx - 1] : null
                  const showTime =
                    !prev ||
                    Date.parse(m.createdAt) - Date.parse(prev.createdAt) > 5 * 60 * 1000
                  return (
                    <li key={m.id}>
                      {showTime && (
                        <p className="my-1 text-center font-display text-[10px] tracking-widest text-white/35">
                          ─ {formatChatTime(m.createdAt)} ─
                        </p>
                      )}
                      <div
                        className={[
                          'max-w-[88%] break-words rounded-lg px-3 py-1.5 text-[13px] leading-relaxed',
                          mine
                            ? 'ml-auto bg-fuchsia-500/15 text-fuchsia-100 ring-1 ring-fuchsia-400/30'
                            : 'mr-auto bg-cyan-500/10 text-cyan-50 ring-1 ring-cyan-400/30',
                        ].join(' ')}
                      >
                        <span className="block font-display text-[9px] tracking-[0.3em] opacity-60">
                          {mine ? 'YOU' : peer?.username ?? username}
                        </span>
                        <span className="whitespace-pre-wrap font-mono">{m.body}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
            {peer?.typing && (
              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/[0.03] px-2 py-0.5 text-[11px] italic text-white/55">
                <span className="inline-block animate-pulse">•••</span>
                {peer.username} is typing…
              </p>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={onSend}
            className="border-t border-cyan-400/30 bg-black/50 p-2"
          >
            {error && (
              <p className="mb-1 rounded border border-red-400/40 bg-red-500/10 px-2 py-1 text-[11px] text-red-200">
                ▲ {error}
              </p>
            )}
            <textarea
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={onKeyDown}
              maxLength={MESSAGE_BODY_MAX}
              rows={2}
              placeholder="message…"
              className="w-full resize-none rounded-md border border-white/15 bg-black/50 px-2 py-1.5 font-mono text-[13px] text-white placeholder:text-white/30 focus:border-cyan-400 focus:outline-none"
            />
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="font-display text-[10px] tracking-widest text-white/35">
                ↵ SEND · ⇧↵ NEWLINE
              </span>
              <button
                type="submit"
                disabled={!draft.trim() || sending}
                className="rounded-md bg-cyan-400 px-3 py-1 font-display text-[10px] tracking-widest text-black hover:bg-cyan-300 disabled:opacity-50"
              >
                {sending ? '…' : 'SEND'}
              </button>
            </div>
          </form>
        </>
      )}
    </aside>
  )
}
