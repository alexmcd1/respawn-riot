'use client'

// The persistent AIM-style buddy list — a floating window in the corner
// of every page (after sign-in). Two collapsed states: hidden via a
// status-bar pill (default on mobile) or fully expanded (default on
// desktop). Three tabs inside: BUDDIES, REQUESTS, ME.

import { useEffect, useMemo, useState } from 'react'
import { useChat } from './ChatContext'
import { STATUS_OPTIONS, type ChatStatus } from '../../_lib/chat'
import AddBuddyModal from './AddBuddyModal'

const COLLAPSED_KEY = 'rr.chat.collapsed'

type Tab = 'buddies' | 'requests' | 'me'

export default function BuddyList() {
  const chat = useChat()
  // Lazy-load remembered state; default collapsed on small screens so
  // the buddy list doesn't squat on a phone viewport before the user
  // explicitly opens it.
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const saved = window.localStorage.getItem(COLLAPSED_KEY)
    if (saved === '1') return true
    if (saved === '0') return false
    return window.innerWidth < 640 // default collapsed on mobile
  })
  const [tab, setTab] = useState<Tab>('buddies')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  const incomingCount = useMemo(
    () => chat.pending.filter((p) => p.direction === 'incoming').length,
    [chat.pending]
  )

  if (!chat.ready || !chat.me) {
    // First load — show a compact placeholder pill while /buddies fetches
    return (
      <div className="pointer-events-none fixed bottom-3 right-3 z-40 sm:bottom-4 sm:right-4">
        <div className="rounded-full border border-fuchsia-500/40 bg-black/85 px-3 py-1.5 font-display text-[10px] tracking-[0.3em] text-fuchsia-300/60">
          ▶ CONNECTING…
        </div>
      </div>
    )
  }

  if (collapsed) {
    // Collapsed pill: shows count of online buddies + unread badge
    const onlineCount = chat.buddies.filter((b) => b.presence === 'online').length
    const myStatus = STATUS_OPTIONS.find((s) => s.id === chat.me!.status) ?? STATUS_OPTIONS[0]
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="fixed bottom-3 right-3 z-40 flex items-center gap-2 rounded-full border border-fuchsia-500/40 bg-black/85 px-3 py-1.5 font-display text-[11px] tracking-[0.25em] text-fuchsia-300 shadow-[0_0_20px_-8px_rgba(255,46,179,0.6)] backdrop-blur transition hover:border-fuchsia-400 hover:text-fuchsia-200 sm:bottom-4 sm:right-4"
        aria-label="Open buddy list"
      >
        <span className={`h-2 w-2 rounded-full ${myStatus.dotClass} ${chat.me.status === 'available' ? 'animate-pulse' : ''}`} />
        <span>BUDDIES</span>
        <span className="text-white/45">{onlineCount}</span>
        {chat.totalUnread > 0 && (
          <span className="ml-1 rounded-full bg-fuchsia-500 px-1.5 py-0.5 text-[10px] text-black">
            {chat.totalUnread}
          </span>
        )}
        {incomingCount > 0 && (
          <span className="ml-0.5 rounded-full bg-cyan-400 px-1.5 py-0.5 text-[10px] text-black">
            +{incomingCount}
          </span>
        )}
      </button>
    )
  }

  // Expanded panel
  return (
    <>
      <aside
        className="fixed bottom-3 right-3 z-40 flex w-[300px] flex-col overflow-hidden rounded-xl border-2 border-fuchsia-500/60 bg-[#0c0c0c]/95 font-display shadow-[0_0_30px_-8px_rgba(255,46,179,0.7)] backdrop-blur sm:bottom-4 sm:right-4 sm:w-[320px]"
        style={{ maxHeight: 'calc(100vh - 140px)' }}
        aria-label="Buddy list"
      >
        {/* Title bar */}
        <header className="flex items-center justify-between gap-2 border-b border-fuchsia-500/40 bg-gradient-to-r from-fuchsia-500/25 via-pink-500/15 to-cyan-500/15 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-[10px] tracking-[0.35em] text-fuchsia-300">▌ BUDDY LIST</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setAdding(true)}
              title="Add buddy"
              className="rounded border border-cyan-400/40 px-1.5 py-0.5 text-[10px] tracking-widest text-cyan-200 hover:border-cyan-300 hover:text-cyan-100"
            >
              + ADD
            </button>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              title="Hide buddy list"
              className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] tracking-widest text-white/60 hover:text-white"
            >
              –
            </button>
          </div>
        </header>

        {/* Tabs */}
        <nav className="flex border-b border-white/10 bg-black/50 text-[10px] tracking-[0.3em]">
          <TabButton active={tab === 'buddies'} onClick={() => setTab('buddies')}>
            BUDDIES <span className="ml-1 text-white/40">{chat.buddies.length}</span>
          </TabButton>
          <TabButton active={tab === 'requests'} onClick={() => setTab('requests')}>
            REQ
            {incomingCount > 0 && (
              <span className="ml-1 rounded-full bg-cyan-400 px-1.5 text-[9px] text-black">
                {incomingCount}
              </span>
            )}
          </TabButton>
          <TabButton active={tab === 'me'} onClick={() => setTab('me')}>
            ME
          </TabButton>
        </nav>

        <div className="flex-1 overflow-y-auto p-2 font-sans text-sm">
          {tab === 'buddies' && <BuddiesTab />}
          {tab === 'requests' && <RequestsTab />}
          {tab === 'me' && <MeTab />}
        </div>

        {/* Status footer */}
        <footer className="flex items-center justify-between border-t border-white/10 bg-black/50 px-3 py-1.5 text-[10px] tracking-[0.25em] text-white/55">
          <span>SIGNED IN AS</span>
          <span className="truncate text-fuchsia-300/85">{chat.me.username}</span>
        </footer>
      </aside>

      {adding && <AddBuddyModal onClose={() => setAdding(false)} />}
    </>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Tab content

function BuddiesTab() {
  const chat = useChat()
  const online = chat.buddies.filter((b) => b.presence === 'online')
  const offline = chat.buddies.filter((b) => b.presence === 'offline')

  if (chat.buddies.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-2 py-6 text-center">
        <p className="font-display text-[10px] tracking-[0.3em] text-fuchsia-300/60">
          NO BUDDIES YET
        </p>
        <p className="text-xs text-white/50">
          Tap <span className="text-cyan-300">+ ADD</span> to search for someone by screenname.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Group title={`ONLINE (${online.length})`} accent="text-emerald-300">
        {online.map((b) => <BuddyRow key={b.userId} buddy={b} />)}
      </Group>
      <Group title={`OFFLINE (${offline.length})`} accent="text-white/40">
        {offline.map((b) => <BuddyRow key={b.userId} buddy={b} />)}
      </Group>
    </div>
  )
}

function Group({ title, accent, children }: {
  title: string
  accent: string
  children: React.ReactNode
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children
  if (!hasChildren) return null
  return (
    <section>
      <h3 className={`mb-1 px-1 font-display text-[10px] tracking-[0.3em] ${accent}`}>
        ▌ {title}
      </h3>
      <ul className="space-y-0.5">{children}</ul>
    </section>
  )
}

function BuddyRow({ buddy }: { buddy: ReturnType<typeof useChat>['buddies'][number] }) {
  const chat = useChat()
  const statusMeta = STATUS_OPTIONS.find((s) => s.id === buddy.status) ?? STATUS_OPTIONS[0]
  const dotColor =
    buddy.presence === 'online'
      ? statusMeta.dotClass
      : 'bg-zinc-600'
  const isAway = buddy.presence === 'online' && buddy.status === 'away'
  return (
    <li>
      <button
        type="button"
        onClick={() => chat.openWindow(buddy.userId, buddy.username)}
        title={
          buddy.awayMessage
            ? `${buddy.username} — ${buddy.awayMessage}`
            : buddy.username
        }
        className="group flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-fuchsia-500/10"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={`relative inline-flex h-2 w-2 shrink-0 rounded-full ${dotColor}`}
          >
            {buddy.presence === 'online' && buddy.status === 'available' && (
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
            )}
          </span>
          <span
            className={
              buddy.presence === 'online'
                ? `truncate ${isAway ? 'text-amber-200' : 'text-white'}`
                : 'truncate text-white/45'
            }
          >
            {buddy.username}
          </span>
          {isAway && (
            <span className="shrink-0 rounded bg-amber-400/15 px-1 text-[9px] tracking-widest text-amber-300">
              AWAY
            </span>
          )}
        </span>
        {buddy.unreadCount > 0 && (
          <span className="shrink-0 rounded-full bg-fuchsia-500 px-1.5 py-0.5 text-[10px] font-display text-black">
            {buddy.unreadCount}
          </span>
        )}
      </button>
    </li>
  )
}

// ──────────────────────────────────────────────────────────────────────────

function RequestsTab() {
  const chat = useChat()
  const incoming = chat.pending.filter((p) => p.direction === 'incoming')
  const outgoing = chat.pending.filter((p) => p.direction === 'outgoing')

  if (chat.pending.length === 0) {
    return (
      <p className="px-2 py-6 text-center text-xs text-white/50">
        No pending buddy requests.
      </p>
    )
  }
  return (
    <div className="space-y-3">
      {incoming.length > 0 && (
        <section>
          <h3 className="mb-1 px-1 font-display text-[10px] tracking-[0.3em] text-cyan-300">
            ▌ INCOMING ({incoming.length})
          </h3>
          <ul className="space-y-1">
            {incoming.map((req) => (
              <PendingRow key={req.friendshipId} request={req} kind="incoming" />
            ))}
          </ul>
        </section>
      )}
      {outgoing.length > 0 && (
        <section>
          <h3 className="mb-1 px-1 font-display text-[10px] tracking-[0.3em] text-white/45">
            ▌ SENT ({outgoing.length})
          </h3>
          <ul className="space-y-1">
            {outgoing.map((req) => (
              <PendingRow key={req.friendshipId} request={req} kind="outgoing" />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function PendingRow({
  request,
  kind,
}: {
  request: { friendshipId: number; username: string }
  kind: 'incoming' | 'outgoing'
}) {
  const chat = useChat()
  const [busy, setBusy] = useState(false)

  async function act(action: 'accept' | 'decline' | 'cancel') {
    if (busy) return
    setBusy(true)
    try {
      if (action === 'cancel') {
        await fetch(`/api/chat/friends/${request.friendshipId}`, { method: 'DELETE' })
      } else {
        await fetch(
          `/api/chat/friends/${request.friendshipId}?action=${action}`,
          { method: 'POST' }
        )
      }
      await chat.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="flex items-center justify-between gap-2 rounded-md bg-white/[0.025] px-2 py-1.5">
      <span className="min-w-0 truncate text-sm text-white/90">{request.username}</span>
      {kind === 'incoming' ? (
        <span className="flex shrink-0 gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => void act('accept')}
            className="rounded border border-emerald-400/40 bg-emerald-500/10 px-1.5 py-0.5 font-display text-[10px] tracking-widest text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
          >
            ACCEPT
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void act('decline')}
            className="rounded border border-white/15 px-1.5 py-0.5 font-display text-[10px] tracking-widest text-white/60 hover:text-white disabled:opacity-50"
          >
            ✕
          </button>
        </span>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void act('cancel')}
          className="shrink-0 rounded border border-white/15 px-1.5 py-0.5 font-display text-[10px] tracking-widest text-white/60 hover:text-white disabled:opacity-50"
        >
          CANCEL
        </button>
      )}
    </li>
  )
}

// ──────────────────────────────────────────────────────────────────────────

function MeTab() {
  const chat = useChat()
  if (!chat.me) return null
  const me = chat.me

  return (
    <div className="space-y-4 px-1">
      <div>
        <p className="font-display text-[10px] tracking-[0.3em] text-fuchsia-300">SCREENNAME</p>
        <p className="mt-1 font-display text-lg tracking-wide text-white">{me.username}</p>
      </div>

      <div>
        <p className="font-display text-[10px] tracking-[0.3em] text-fuchsia-300">STATUS</p>
        <div className="mt-1 grid grid-cols-3 gap-1">
          {STATUS_OPTIONS.map((opt) => {
            const active = me.status === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => void chat.updateMe({ status: opt.id as ChatStatus })}
                title={opt.blurb}
                className={[
                  'flex flex-col items-center justify-center gap-1 rounded-md border px-1 py-1.5 font-display text-[9px] tracking-widest',
                  active
                    ? 'border-fuchsia-400 bg-fuchsia-500/15 text-fuchsia-200'
                    : 'border-white/10 text-white/55 hover:border-white/30 hover:text-white',
                ].join(' ')}
              >
                <span className={`h-2 w-2 rounded-full ${opt.dotClass}`} />
                <span>{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <AwayMessageEditor />

      <ProfileEditor />

      <div>
        <label className="flex items-center justify-between gap-2 rounded-md border border-white/10 px-2 py-2">
          <span className="flex flex-col">
            <span className="font-display text-[10px] tracking-[0.3em] text-white/70">
              DOOR SOUND
            </span>
            <span className="text-[11px] text-white/45">
              Ding when a buddy comes online.
            </span>
          </span>
          <input
            type="checkbox"
            checked={me.soundEnabled}
            onChange={(e) => void chat.updateMe({ soundEnabled: e.target.checked })}
            className="h-4 w-4 accent-fuchsia-500"
          />
        </label>
      </div>
    </div>
  )
}

function AwayMessageEditor() {
  const chat = useChat()
  const me = chat.me!
  const [draft, setDraft] = useState(me.awayMessage ?? '')
  const [saving, setSaving] = useState(false)
  // Keep local field in sync if the upstream value changes (e.g. another tab)
  useEffect(() => { setDraft(me.awayMessage ?? '') }, [me.awayMessage])

  async function save() {
    setSaving(true)
    try {
      await chat.updateMe({ awayMessage: draft.trim() || null })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <label className="font-display text-[10px] tracking-[0.3em] text-fuchsia-300">
        AWAY MESSAGE
      </label>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { if (draft !== (me.awayMessage ?? '')) void save() }}
        maxLength={200}
        rows={2}
        placeholder='"brb dying in elden ring"'
        className="mt-1 w-full rounded-md border border-white/15 bg-black/40 px-2 py-1.5 font-mono text-xs text-white placeholder:text-white/30 focus:border-fuchsia-400 focus:outline-none"
      />
      {saving && <p className="mt-1 text-[10px] text-white/40">saving…</p>}
    </div>
  )
}

function ProfileEditor() {
  const chat = useChat()
  const me = chat.me!
  const [draft, setDraft] = useState(me.profile ?? '')
  const [saving, setSaving] = useState(false)
  useEffect(() => { setDraft(me.profile ?? '') }, [me.profile])

  async function save() {
    setSaving(true)
    try {
      await chat.updateMe({ profile: draft.trim() || null })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <label className="font-display text-[10px] tracking-[0.3em] text-fuchsia-300">
        PROFILE
      </label>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { if (draft !== (me.profile ?? '')) void save() }}
        maxLength={500}
        rows={3}
        placeholder="Tell your buddies who you are."
        className="mt-1 w-full rounded-md border border-white/15 bg-black/40 px-2 py-1.5 font-mono text-xs text-white placeholder:text-white/30 focus:border-fuchsia-400 focus:outline-none"
      />
      {saving && <p className="mt-1 text-[10px] text-white/40">saving…</p>}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex-1 py-2 transition',
        active
          ? 'bg-fuchsia-500/15 text-fuchsia-200 shadow-[inset_0_-2px_0_rgba(255,46,179,0.8)]'
          : 'text-white/55 hover:bg-white/[0.03] hover:text-white',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
