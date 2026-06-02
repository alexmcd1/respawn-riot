'use client'

// "Add buddy" modal — search by screenname, send a request. Closes on
// success or via the × button. Inspired by AIM's "Add Buddy" dialog,
// but with live prefix search instead of an exact-match lookup.

import { useEffect, useState } from 'react'
import { useChat } from './ChatContext'
import { type UserSearchResult } from '../../_lib/chat'

export default function AddBuddyModal({ onClose }: { onClose: () => void }) {
  const chat = useChat()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Per-row "we just hit the button" busy flag so multiple rows don't
  // freeze each other.
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set())

  // Debounced search
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const handle = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/chat/search?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        if (data?.ok && Array.isArray(data.results)) {
          setResults(data.results)
        } else {
          setResults([])
        }
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => window.clearTimeout(handle)
  }, [query])

  // Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function sendRequest(target: UserSearchResult) {
    setError('')
    setBusyIds((cur) => new Set(cur).add(target.userId))
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
      // Refresh both the search row (relation may change) + buddy list
      const nextRelation: UserSearchResult['relation'] =
        data.state === 'friends' ? 'friends' : 'pending-out'
      setResults((cur) =>
        cur.map((r) =>
          r.userId === target.userId ? { ...r, relation: nextRelation } : r
        )
      )
      await chat.refresh()
    } catch {
      setError('Network error.')
    } finally {
      setBusyIds((cur) => {
        const next = new Set(cur)
        next.delete(target.userId)
        return next
      })
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl border-2 border-fuchsia-500/60 bg-[#0c0c0c] shadow-[0_0_40px_-10px_rgba(255,46,179,0.7)]"
        role="dialog"
        aria-label="Add buddy"
      >
        <header className="flex items-center justify-between gap-2 border-b border-fuchsia-500/40 bg-gradient-to-r from-fuchsia-500/25 via-pink-500/15 to-cyan-500/15 px-4 py-2">
          <h2 className="font-display text-xs tracking-[0.3em] text-fuchsia-200">
            ▌ ADD BUDDY
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-white/15 px-2 py-0.5 font-display text-[10px] tracking-widest text-white/60 hover:text-white"
          >
            ✕
          </button>
        </header>

        <div className="p-4">
          <label className="font-display text-[10px] tracking-[0.3em] text-fuchsia-300">
            FIND BY SCREENNAME
          </label>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="kid_ghost"
            className="mt-2 w-full rounded-md border border-white/20 bg-black/60 px-3 py-2 font-mono text-sm text-white outline-none placeholder:text-white/30 focus:border-fuchsia-400"
          />
          <p className="mt-1 text-[10px] text-white/40">
            Type at least 2 characters. Lowercase letters, numbers, _ and -.
          </p>

          {error && (
            <p className="mt-3 rounded border border-red-400/40 bg-red-500/10 px-2 py-1 text-xs text-red-200">
              ▲ {error}
            </p>
          )}

          <div className="mt-4 max-h-72 overflow-y-auto">
            {query.trim().length < 2 ? (
              <p className="px-1 py-4 text-center text-xs text-white/40">
                Search to see results.
              </p>
            ) : loading ? (
              <p className="px-1 py-4 text-center text-xs text-white/40">searching…</p>
            ) : results.length === 0 ? (
              <p className="px-1 py-4 text-center text-xs text-white/40">
                No buddies match that screenname.
              </p>
            ) : (
              <ul className="space-y-1">
                {results.map((r) => (
                  <li
                    key={r.userId}
                    className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1.5"
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
                    <ActionButton
                      result={r}
                      busy={busyIds.has(r.userId)}
                      onAdd={() => void sendRequest(r)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ActionButton({
  result,
  busy,
  onAdd,
}: {
  result: UserSearchResult
  busy: boolean
  onAdd: () => void
}) {
  if (result.relation === 'friends') {
    return (
      <span className="rounded border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 font-display text-[10px] tracking-widest text-emerald-200">
        ✓ BUDDIES
      </span>
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
        title="They already added you — accept the request"
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
