'use client'

import { useEffect, useState } from 'react'
import { WATCH_EVENT, loadWatch, type DisneyWatch } from '../_lib/disneyWatch'

// Subscribe to daily Disney deal alerts. Reads the user's current
// watch config (hotels + dates + party + threshold) from localStorage
// and POSTs it along with their email to /api/disney/subscribe-alerts.
// The cron job then checks for price drops + new offers on their
// schedule and emails a digest.

const EMAIL_KEY = 'respawn.orlando.disneyAlertsEmail.v1'

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; message: string; isNew: boolean }
  | { kind: 'error'; message: string }

export default function DisneyAlertsSubscribe() {
  const [email, setEmail] = useState('')
  const [watch, setWatch] = useState<DisneyWatch | null>(null)
  const [state, setState] = useState<SubmitState>({ kind: 'idle' })
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const refresh = () => setWatch(loadWatch())
    refresh()
    window.addEventListener(WATCH_EVENT, refresh)
    try {
      const saved = localStorage.getItem(EMAIL_KEY)
      if (saved) setEmail(saved)
    } catch {}
    return () => window.removeEventListener(WATCH_EVENT, refresh)
  }, [])

  const hasValidConfig =
    watch != null &&
    /^\d{4}-\d{2}-\d{2}$/.test(watch.checkIn) &&
    /^\d{4}-\d{2}-\d{2}$/.test(watch.checkOut) &&
    watch.checkIn < watch.checkOut

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!watch) return
    if (!hasValidConfig) {
      setState({ kind: 'error', message: 'Set check-in and check-out dates first.' })
      return
    }
    setState({ kind: 'loading' })
    try {
      const res = await fetch('/api/disney/subscribe-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          watch: {
            name: watch.watchName || undefined,
            checkIn: watch.checkIn,
            checkOut: watch.checkOut,
            adults: watch.adults,
            children: watch.children,
            resortIds: watch.resortIds,
            maxPrice: watch.maxPrice,
            flResident: watch.flResident,
            postalCode: watch.postalCode,
          },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!data.ok) {
        setState({
          kind: 'error',
          message: typeof data.error === 'string' ? data.error : 'Subscribe failed',
        })
        return
      }
      try { localStorage.setItem(EMAIL_KEY, email.trim()) } catch {}
      setState({
        kind: 'ok',
        message: typeof data.message === 'string' ? data.message : 'Subscribed.',
        isNew: data.isNew === true,
      })
    } catch {
      setState({ kind: 'error', message: 'Network error — try again.' })
    }
  }

  if (!watch) return null

  return (
    <section className="rounded-2xl border border-orange-400/30 bg-gradient-to-br from-orange-500/5 via-yellow-500/5 to-transparent p-4">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div>
          <p className="font-display text-[10px] tracking-[0.3em] text-orange-300">
            ▌ DAILY DEAL ALERTS
          </p>
          <p className="mt-1 text-sm text-white/85">
            {expanded
              ? 'Get a daily email if Disney drops a price on this trip.'
              : hasValidConfig
                ? `Watch ${watch.resortIds.length === 0 ? 'all Disney hotels' : `${watch.resortIds.length} hotel${watch.resortIds.length === 1 ? '' : 's'}`} for ${watch.checkIn}.`
                : 'Set check-in/check-out above, then subscribe here.'}
          </p>
        </div>
        <span className="font-display text-xs tracking-widest text-orange-300/70">
          {expanded ? '× CLOSE' : '+ OPEN'}
        </span>
      </button>

      {expanded && (
        <form onSubmit={onSubmit} className="mt-4 space-y-3 border-t border-white/5 pt-4">
          <div>
            <label htmlFor="disney-alert-email" className="font-display text-[10px] tracking-[0.3em] text-orange-300">
              ▌ EMAIL
            </label>
            <input
              id="disney-alert-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-orange-400"
            />
          </div>

          {/* Optional friendly name */}
          <div>
            <label htmlFor="disney-watch-name" className="font-display text-[10px] tracking-[0.3em] text-orange-300">
              ▌ WATCH NAME (OPTIONAL)
            </label>
            <input
              id="disney-watch-name"
              type="text"
              value={watch.watchName}
              onChange={(e) => {
                // We persist via DisneyDealsPanel's saveWatch; for this
                // form we just keep a local copy + push through next
                // submit. For now read-only display + an update via
                // localStorage roundtrip.
                try {
                  const cur = loadWatch()
                  const next = { ...cur, watchName: e.target.value }
                  localStorage.setItem('respawn.orlando.disneyWatch.v1', JSON.stringify(next))
                  window.dispatchEvent(new CustomEvent(WATCH_EVENT))
                } catch {}
              }}
              placeholder='e.g. "Spring break 2027"'
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-orange-400"
            />
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
            <p className="font-display text-[10px] tracking-[0.3em] text-orange-300/80">
              ▌ WE&apos;LL WATCH
            </p>
            <p className="mt-1 text-white/85">
              <strong className="text-white">
                {watch.resortIds.length === 0 ? 'All Disney hotels' : `${watch.resortIds.length} hotels`}
              </strong>{' '}
              for{' '}
              <span className="text-white/65">
                {watch.checkIn} → {watch.checkOut}
              </span>{' '}
              · {watch.adults} adult{watch.adults === 1 ? '' : 's'}
              {watch.children > 0 && `, ${watch.children} child${watch.children === 1 ? '' : 'ren'}`}
              {watch.flResident && (
                <span className="ml-2 rounded bg-orange-500/15 px-1.5 py-0.5 text-orange-200">
                  ✦ FL Resident
                </span>
              )}
            </p>
            {watch.maxPrice != null && (
              <p className="mt-1 text-white/85">
                Email me when any selected hotel drops below{' '}
                <strong className="text-emerald-300">${watch.maxPrice}/night</strong>.
              </p>
            )}
          </div>

          {state.kind === 'ok' && (
            <p className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-3 text-sm text-emerald-100">
              ✓ {state.message}
              {state.isNew && ' Check your inbox for the welcome email.'}
            </p>
          )}
          {state.kind === 'error' && (
            <p className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
              ▲ {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={state.kind === 'loading' || !hasValidConfig}
            className="w-full rounded-xl bg-orange-500 px-6 py-3 font-display text-sm tracking-[0.25em] text-black hover:bg-orange-400 disabled:opacity-50"
          >
            {state.kind === 'loading' ? 'SUBSCRIBING…' : '★ SUBSCRIBE TO DEAL ALERTS'}
          </button>
          <p className="text-center text-[11px] text-white/45">
            One-click unsubscribe in every email. Daily digest only when something changes.
          </p>
        </form>
      )}
    </section>
  )
}
