'use client'

import { useEffect, useState } from 'react'
import {
  ARTISTS_EVENT,
  CITIES_EVENT,
  loadFavoriteArtists,
  loadSavedCities,
} from '../_lib/concertFavorites'

// Subscribe UI for daily concert alert emails. Reads the user's
// localStorage favorites + saved cities, sends them to the DB along
// with their email. Cron job in /api/cron/check-favorites does the
// actual matching + emailing once per day.

const EMAIL_KEY = 'respawn.music.alertsEmail.v1'

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; message: string; isNew: boolean }
  | { kind: 'error'; message: string }

export default function AlertsSubscribe() {
  const [email, setEmail] = useState('')
  const [artists, setArtists] = useState<string[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [state, setState] = useState<SubmitState>({ kind: 'idle' })
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Hydrate from localStorage
    const refresh = () => {
      setArtists(loadFavoriteArtists())
      setCities(loadSavedCities())
    }
    refresh()
    // Remember the email locally so a returning user sees it pre-filled
    try {
      const saved = localStorage.getItem(EMAIL_KEY)
      if (saved) setEmail(saved)
    } catch {}
    window.addEventListener(ARTISTS_EVENT, refresh)
    window.addEventListener(CITIES_EVENT, refresh)
    return () => {
      window.removeEventListener(ARTISTS_EVENT, refresh)
      window.removeEventListener(CITIES_EVENT, refresh)
    }
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (artists.length === 0) {
      setState({
        kind: 'error',
        message: 'Add at least one favorite artist above before subscribing.',
      })
      return
    }
    setState({ kind: 'loading' })
    try {
      const res = await fetch('/api/subscribe-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), artists, cities }),
      })
      const data = await res.json().catch(() => ({}))
      if (!data.ok) {
        setState({
          kind: 'error',
          message: typeof data.error === 'string' ? data.error : 'Subscribe failed',
        })
        return
      }
      try {
        localStorage.setItem(EMAIL_KEY, email.trim())
      } catch {}
      setState({
        kind: 'ok',
        message: typeof data.message === 'string' ? data.message : 'Subscribed.',
        isNew: data.isNew === true,
      })
    } catch {
      setState({ kind: 'error', message: 'Network error — try again.' })
    }
  }

  const hasFavorites = artists.length > 0

  return (
    <section className="rounded-2xl border border-pink-400/30 bg-gradient-to-br from-pink-500/5 via-fuchsia-500/5 to-transparent p-4">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div>
          <p className="font-display text-[10px] tracking-[0.3em] text-pink-300">
            ▌ EMAIL ALERTS
          </p>
          <p className="mt-1 text-sm text-white/85">
            {expanded
              ? 'Get an email when your favorites announce shows in your cities.'
              : hasFavorites
                ? `Get notified when ${artists.length} favorite${artists.length === 1 ? '' : 's'} announce shows.`
                : 'Save a favorite first, then subscribe here.'}
          </p>
        </div>
        <span className="font-display text-xs tracking-widest text-pink-300/70">
          {expanded ? '× CLOSE' : '+ OPEN'}
        </span>
      </button>

      {expanded && (
        <form onSubmit={onSubmit} className="mt-4 space-y-3 border-t border-white/5 pt-4">
          <div>
            <label htmlFor="alert-email" className="font-display text-[10px] tracking-[0.3em] text-pink-300">
              ▌ EMAIL
            </label>
            <input
              id="alert-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-pink-400"
            />
          </div>

          {/* What we'll watch */}
          <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
            <p className="font-display text-[10px] tracking-[0.3em] text-pink-300/80">
              ▌ WE&apos;LL WATCH
            </p>
            <p className="mt-1 text-white/85">
              <strong className="text-white">{artists.length}</strong>{' '}
              artist{artists.length === 1 ? '' : 's'}:{' '}
              {artists.length > 0 ? (
                <span className="text-white/65">
                  {artists.slice(0, 5).join(', ')}
                  {artists.length > 5 && `, +${artists.length - 5} more`}
                </span>
              ) : (
                <span className="text-yellow-300/80">none yet — add favorites first</span>
              )}
            </p>
            <p className="mt-1 text-white/85">
              <strong className="text-white">{cities.length > 0 ? cities.length : 'any'}</strong>{' '}
              {cities.length > 0 ? `cit${cities.length === 1 ? 'y' : 'ies'}: ` : 'city (nationwide): '}
              <span className="text-white/65">
                {cities.length > 0 ? cities.join(', ') : 'all locations'}
              </span>
            </p>
            <p className="mt-2 text-[11px] text-white/45">
              We sync your localStorage favorites every time you subscribe. Re-subscribe after changing them to update.
            </p>
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
            disabled={state.kind === 'loading' || !hasFavorites}
            className="w-full rounded-xl bg-pink-500 px-6 py-3 font-display text-sm tracking-[0.25em] text-white hover:bg-pink-400 disabled:opacity-50"
          >
            {state.kind === 'loading' ? 'SUBSCRIBING…' : '★ SUBSCRIBE TO ALERTS'}
          </button>
          <p className="text-center text-[11px] text-white/45">
            One-click unsubscribe in every email. We never share your address.
          </p>
        </form>
      )}
    </section>
  )
}
