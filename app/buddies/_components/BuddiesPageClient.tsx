'use client'

// Full-page client UI for /buddies — search bar + grid of online + offline
// buddies + pending requests block. Opens chat popups via the shared
// ChatContext (so a click here matches a click in the corner buddy list).
//
// Since the page sits OUTSIDE the always-mounted ChatRoot's provider
// for signed-out viewers, this component wraps its content in its own
// gated provider when needed. Once signed in, ChatRoot's provider is
// already up — but the page provider is a no-op because useChat() will
// find the closer parent provider if available. To keep things simple
// we always render through the shared provider via ChatRoot when
// authed, and show a sign-in CTA when not.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { openSignIn } from '../../_components/SignInModal'
import { useChat } from '../../_components/chat/ChatContext'
import { STATUS_OPTIONS, type UserSearchResult } from '../../_lib/chat'

export default function BuddiesPageClient() {
  const { status } = useSession()
  if (status === 'loading') {
    return (
      <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-white/45">
        Loading…
      </p>
    )
  }
  if (status !== 'authenticated') {
    return (
      <div className="rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/[0.05] to-transparent p-6 text-center">
        <p className="font-display text-[11px] tracking-[0.3em] text-cyan-300">
          ▌ SIGN IN TO CONNECT
        </p>
        <p className="mt-2 text-white/75">
          You need a screenname to add buddies and chat. Sign in (no password —
          just a magic link emailed to you) and grab your handle on the
          account page.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => openSignIn()}
            className="rounded-md bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 font-display text-sm tracking-[0.2em] text-black hover:scale-[1.03]"
          >
            ✦ SIGN IN
          </button>
          <Link
            href="/account"
            className="font-display text-xs tracking-[0.25em] text-cyan-300 hover:text-cyan-200"
          >
            SET A SCREENNAME →
          </Link>
        </div>
      </div>
    )
  }
  // No nested provider — uses the one mounted in app/layout.tsx so the
  // overlay buddy list and this page share state.
  return <BuddiesPageBody />
}

function BuddiesPageBody() {
  const chat = useChat()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [actionBusy, setActionBusy] = useState<Set<number>>(new Set())
  const [error, setError] = useState('')

  // Debounced search
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/chat/search?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        if (data?.ok) setResults(data.results || [])
        else setResults([])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 250)
    return () => window.clearTimeout(t)
  }, [query])

  async function sendRequest(target: UserSearchResult) {
    setError('')
    setActionBusy((cur) => new Set(cur).add(target.userId))
    try {
      const res = await fetch('/api/chat/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: target.username }),
      })
      const data = await res.json()
      if (!data.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not send request.')
        return
      }
      const nextRelation: UserSearchResult['relation'] =
        data.state === 'friends' ? 'friends' : 'pending-out'
      setResults((cur) =>
        cur.map((r) => (r.userId === target.userId ? { ...r, relation: nextRelation } : r))
      )
      await chat.refresh()
    } catch {
      setError('Network error.')
    } finally {
      setActionBusy((cur) => {
        const next = new Set(cur)
        next.delete(target.userId)
        return next
      })
    }
  }

  const online = chat.buddies.filter((b) => b.presence === 'online')
  const offline = chat.buddies.filter((b) => b.presence === 'offline')
  const incoming = chat.pending.filter((p) => p.direction === 'incoming')
  const outgoing = chat.pending.filter((p) => p.direction === 'outgoing')

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      {/* Main column */}
      <div className="space-y-6">
        {/* Search */}
        <section className="rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/[0.05] to-transparent p-5">
          <h2 className="font-display text-[11px] tracking-[0.3em] text-cyan-300">
            ▌ FIND A BUDDY
          </h2>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search by screenname…"
            className="mt-3 w-full rounded-md border border-white/20 bg-black/60 px-3 py-2 font-mono text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-400"
          />
          {error && (
            <p className="mt-2 rounded border border-red-400/40 bg-red-500/10 px-2 py-1 text-xs text-red-200">
              ▲ {error}
            </p>
          )}
          <div className="mt-3">
            {query.trim().length < 2 ? (
              <p className="text-[11px] text-white/40">
                Type at least 2 characters. Searches by username prefix.
              </p>
            ) : searching ? (
              <p className="text-[11px] text-white/40">searching…</p>
            ) : results.length === 0 ? (
              <p className="text-[11px] text-white/40">No matches.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {results.map((r) => (
                  <li
                    key={r.userId}
                    className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.02] px-3 py-2"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          r.presence === 'online' ? 'bg-emerald-400' : 'bg-zinc-600'
                        }`}
                      />
                      <span
                        className={`truncate text-sm ${
                          r.presence === 'online' ? 'text-white' : 'text-white/55'
                        }`}
                      >
                        {r.username}
                      </span>
                    </span>
                    <SearchRowAction
                      result={r}
                      busy={actionBusy.has(r.userId)}
                      onAdd={() => void sendRequest(r)}
                      onOpenChat={() => chat.openWindow(r.userId, r.username)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Buddies grid */}
        <section>
          <h2 className="mb-3 font-display text-[11px] tracking-[0.3em] text-emerald-300">
            ▌ ONLINE ({online.length})
          </h2>
          {online.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-white/45">
              Nobody&rsquo;s online right now. Add some buddies above.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {online.map((b) => (
                <BuddyCard key={b.userId} buddy={b} />
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-display text-[11px] tracking-[0.3em] text-white/45">
            ▌ OFFLINE ({offline.length})
          </h2>
          {offline.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-white/45">
              All quiet.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {offline.map((b) => (
                <BuddyCard key={b.userId} buddy={b} />
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Sidebar — pending requests + status */}
      <aside className="space-y-4">
        <section className="rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/[0.08] to-transparent p-4">
          <h2 className="font-display text-[11px] tracking-[0.3em] text-fuchsia-300">
            ▌ REQUESTS
          </h2>
          {incoming.length === 0 && outgoing.length === 0 ? (
            <p className="mt-2 text-xs text-white/45">No pending requests.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {incoming.length > 0 && (
                <div>
                  <p className="font-display text-[9px] tracking-[0.3em] text-cyan-300">
                    INCOMING
                  </p>
                  <ul className="mt-1 space-y-1">
                    {incoming.map((req) => (
                      <PendingRow key={req.friendshipId} request={req} kind="incoming" />
                    ))}
                  </ul>
                </div>
              )}
              {outgoing.length > 0 && (
                <div>
                  <p className="font-display text-[9px] tracking-[0.3em] text-white/45">
                    SENT
                  </p>
                  <ul className="mt-1 space-y-1">
                    {outgoing.map((req) => (
                      <PendingRow key={req.friendshipId} request={req} kind="outgoing" />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <h2 className="font-display text-[11px] tracking-[0.3em] text-white/70">
            ▌ MY STATUS
          </h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {STATUS_OPTIONS.map((s) => {
              const active = chat.me?.status === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => void chat.updateMe({ status: s.id })}
                  className={[
                    'flex flex-col items-center gap-1 rounded-md border px-2 py-2 font-display text-[10px] tracking-widest',
                    active
                      ? 'border-fuchsia-400 bg-fuchsia-500/10 text-fuchsia-200'
                      : 'border-white/10 text-white/55 hover:border-white/30 hover:text-white',
                  ].join(' ')}
                >
                  <span className={`h-2 w-2 rounded-full ${s.dotClass}`} />
                  {s.label}
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-[11px] text-white/45">
            Status, away message, and door-sound toggle live in the floating
            buddy list&apos;s <span className="text-fuchsia-300">ME</span> tab.
          </p>
        </section>
      </aside>
    </div>
  )
}

function BuddyCard({
  buddy,
}: {
  buddy: ReturnType<typeof useChat>['buddies'][number]
}) {
  const chat = useChat()
  const dot =
    buddy.presence === 'online'
      ? buddy.status === 'away'
        ? 'bg-amber-400'
        : 'bg-emerald-400'
      : 'bg-zinc-600'
  return (
    <li>
      <button
        type="button"
        onClick={() => chat.openWindow(buddy.userId, buddy.username)}
        className="group flex w-full flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left transition hover:border-cyan-400/50 hover:bg-cyan-500/[0.05]"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
            <span
              className={`truncate font-display tracking-wide ${
                buddy.presence === 'online' ? 'text-white' : 'text-white/55'
              }`}
            >
              {buddy.username}
            </span>
          </div>
          {buddy.unreadCount > 0 && (
            <span className="rounded-full bg-fuchsia-500 px-1.5 py-0.5 font-display text-[10px] text-black">
              {buddy.unreadCount}
            </span>
          )}
        </div>
        {buddy.awayMessage && buddy.status === 'away' && (
          <p className="truncate text-[11px] italic text-amber-200/85">
            “{buddy.awayMessage}”
          </p>
        )}
        {buddy.profile && (
          <p className="truncate text-[11px] text-white/45">{buddy.profile}</p>
        )}
        <p className="mt-1 font-display text-[10px] tracking-widest text-cyan-300/70 opacity-0 transition group-hover:opacity-100">
          ↳ OPEN CHAT
        </p>
      </button>
    </li>
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
    <li className="flex items-center justify-between gap-2 rounded-md bg-black/30 px-2 py-1.5">
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

function SearchRowAction({
  result,
  busy,
  onAdd,
  onOpenChat,
}: {
  result: UserSearchResult
  busy: boolean
  onAdd: () => void
  onOpenChat: () => void
}) {
  if (result.relation === 'friends') {
    return (
      <button
        type="button"
        onClick={onOpenChat}
        className="rounded border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 font-display text-[10px] tracking-widest text-emerald-200 hover:bg-emerald-500/20"
      >
        ↳ CHAT
      </button>
    )
  }
  if (result.relation === 'pending-out') {
    return (
      <span className="rounded border border-white/15 px-2 py-0.5 font-display text-[10px] tracking-widest text-white/55">
        SENT
      </span>
    )
  }
  if (result.relation === 'pending-in') {
    return (
      <button
        type="button"
        onClick={onAdd}
        disabled={busy}
        className="rounded border border-cyan-400/40 bg-cyan-500/10 px-2 py-0.5 font-display text-[10px] tracking-widest text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50"
      >
        ACCEPT
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={busy}
      className="rounded border border-fuchsia-400/50 bg-fuchsia-500/15 px-2 py-0.5 font-display text-[10px] tracking-widest text-fuchsia-200 hover:bg-fuchsia-500/25 disabled:opacity-50"
    >
      + ADD
    </button>
  )
}
