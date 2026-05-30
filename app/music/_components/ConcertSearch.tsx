'use client'

import { useEffect, useState } from 'react'

type ConcertResult = {
  id: string
  artist: string
  date: string
  time?: string
  venue: string
  city: string
  region?: string
  country?: string
  ticketUrl?: string
  source: 'ticketmaster' | 'bandsintown'
}

type SearchSource =
  | 'ticketmaster'
  | 'bandsintown'
  | 'bandsintown-fallback'
  | 'none'
  | null

// Preset bands — the user named these explicitly. Free-text input below
// covers everything else.
const PRESETS = [
  'Yellowcard',
  'My Chemical Romance',
  'Simple Plan',
  'All Time Low',
] as const

const STORAGE_KEY = 'respawn.music.lastArtist.v1'

export default function ConcertSearch() {
  const [artist, setArtist] = useState('')
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<ConcertResult[]>([])
  const [source, setSource] = useState<SearchSource>(null)
  const [searchedArtist, setSearchedArtist] = useState<string | null>(null)

  // Auto-load the last artist someone searched so they don't see an empty
  // screen when they re-open the page.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const last = localStorage.getItem(STORAGE_KEY)
    if (last) {
      setArtist(last)
      void doSearch(last)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function doSearch(name: string) {
    const clean = name.trim()
    if (!clean) return
    setSearching(true)
    setError('')
    try {
      const res = await fetch('/api/concerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artist: clean }),
      })
      const data = await res.json().catch(() => ({}))
      if (!data.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Search failed')
        setResults([])
        setSource(null)
      } else {
        setResults(data.results ?? [])
        setSource(
          data.source === 'ticketmaster' ||
          data.source === 'bandsintown' ||
          data.source === 'bandsintown-fallback' ||
          data.source === 'none'
            ? data.source
            : null
        )
        setSearchedArtist(clean)
        try {
          localStorage.setItem(STORAGE_KEY, clean)
        } catch {
          // ignore quota errors
        }
      }
    } catch {
      setError('Network error')
    } finally {
      setSearching(false)
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    void doSearch(artist)
  }

  function onPreset(name: string) {
    setArtist(name)
    void doSearch(name)
  }

  return (
    <div className="space-y-5">
      {/* Preset row */}
      <div>
        <p className="font-display text-[10px] tracking-[0.3em] text-pink-300">
          ▌ QUICK PICKS
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRESETS.map((name) => {
            const active = searchedArtist === name
            return (
              <button
                key={name}
                type="button"
                onClick={() => onPreset(name)}
                className={`rounded-lg border px-2 py-2.5 text-sm transition ${
                  active
                    ? 'border-pink-400 bg-pink-500/15 text-pink-100'
                    : 'border-white/10 bg-black/30 text-white/75 hover:border-white/30'
                }`}
              >
                {name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Free-text search */}
      <form onSubmit={onSubmit} className="space-y-2">
        <label className="font-display text-[10px] tracking-[0.3em] text-pink-300">
          ▌ OR SEARCH AN ARTIST
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder='e.g. "Paramore", "blink-182"'
            className="flex-1 rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-pink-400"
          />
          <button
            type="submit"
            disabled={searching || !artist.trim()}
            className="rounded-xl bg-pink-500 px-5 py-3 font-display text-sm tracking-[0.2em] text-white hover:bg-pink-400 disabled:opacity-50"
          >
            {searching ? '…' : 'FIND'}
          </button>
        </div>
      </form>

      {error && (
        <p className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
          ▲ {error}
        </p>
      )}

      {/* Both providers failed (Ticketmaster key missing AND Bandsintown
          public endpoint blocked) — be honest + give the user a path
          forward (search externally + add the API key). */}
      {!searching && searchedArtist && results.length === 0 && source === 'none' && (
        <div className="space-y-3 rounded-xl border border-yellow-400/30 bg-yellow-500/5 p-5 text-sm">
          <p className="font-display text-[11px] tracking-[0.3em] text-yellow-300">
            ▌ NO PROVIDERS AVAILABLE
          </p>
          <p className="text-white/85">
            Couldn&apos;t reach a concert provider. Bandsintown&apos;s public
            endpoint blocks anonymous traffic, so we need a Ticketmaster API
            key for this to work in production.
          </p>
          <p className="text-white/65">
            Free signup at{' '}
            <a
              href="https://developer.ticketmaster.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-300 underline hover:text-pink-200"
            >
              developer.ticketmaster.com
            </a>
            , then add <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-xs text-yellow-200">TICKETMASTER_API_KEY</code> to Vercel env vars. 5k calls/day free, no credit card.
          </p>
          <p>
            For now, search externally:
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={`https://www.ticketmaster.com/search?q=${encodeURIComponent(searchedArtist)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-pink-400/60 bg-pink-500/10 px-3 py-2 font-display text-[11px] tracking-[0.2em] text-pink-100 hover:bg-pink-500/20"
            >
              ↗ TICKETMASTER
            </a>
            <a
              href={`https://www.bandsintown.com/a/${encodeURIComponent(searchedArtist)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-white/20 bg-black/40 px-3 py-2 font-display text-[11px] tracking-[0.2em] text-white/80 hover:border-white/40"
            >
              ↗ BANDSINTOWN
            </a>
            <a
              href={`https://www.songkick.com/search?query=${encodeURIComponent(searchedArtist)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-white/20 bg-black/40 px-3 py-2 font-display text-[11px] tracking-[0.2em] text-white/80 hover:border-white/40"
            >
              ↗ SONGKICK
            </a>
          </div>
        </div>
      )}

      {/* Searched, providers worked, but artist has no upcoming dates */}
      {!searching && searchedArtist && results.length === 0 && !error && source !== 'none' && (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-center text-sm text-white/65">
          No upcoming dates found for <strong>{searchedArtist}</strong>. They
          might be between tours — try the band&apos;s website or socials.
        </p>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-white/55">
              {results.length} upcoming {results.length === 1 ? 'date' : 'dates'} for{' '}
              <span className="text-white/85">{searchedArtist}</span> —{' '}
              {source === 'ticketmaster' && (
                <span className="text-emerald-300/85">via Ticketmaster</span>
              )}
              {source === 'bandsintown' && (
                <span className="text-pink-300/85">via Bandsintown</span>
              )}
              {source === 'bandsintown-fallback' && (
                <span className="text-yellow-300/85">via Bandsintown (Ticketmaster unavailable)</span>
              )}
            </p>
          </div>
          <ul className="space-y-2">
            {results.map((r) => (
              <ConcertCard key={r.id} concert={r} />
            ))}
          </ul>
        </div>
      )}

      {/* First-load helper */}
      {!searchedArtist && !searching && (
        <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-white/50">
          Tap an artist above or type one in to see their upcoming tour dates.
        </p>
      )}
    </div>
  )
}

function ConcertCard({ concert }: { concert: ConcertResult }) {
  const niceDate = formatDate(concert.date)
  const location = [concert.city, concert.region, concert.country]
    .filter(Boolean)
    .join(', ')
  return (
    <li className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-stretch">
        {/* Date column */}
        <div className="flex w-20 shrink-0 flex-col items-center justify-center border-r border-white/10 bg-black/30 px-2 py-3 text-center">
          <p className="font-display text-[10px] uppercase tracking-[0.25em] text-pink-300">
            {niceDate.month}
          </p>
          <p className="font-display text-2xl leading-none text-white">
            {niceDate.day}
          </p>
          <p className="mt-1 font-mono text-[10px] text-white/45">
            {niceDate.year}
          </p>
        </div>

        {/* Details column */}
        <div className="min-w-0 flex-1 p-3">
          <p className="truncate font-display text-base text-white">
            {concert.venue}
          </p>
          {location && (
            <p className="mt-0.5 truncate text-xs text-white/60">{location}</p>
          )}
          <p className="mt-1 text-[11px] uppercase tracking-widest text-pink-300/80">
            {concert.artist}
            {concert.time && (
              <span className="ml-2 font-mono text-white/45">{concert.time}</span>
            )}
          </p>
        </div>

        {/* Ticket link */}
        {concert.ticketUrl && (
          <a
            href={concert.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="my-auto mr-3 shrink-0 rounded-lg border border-pink-400/60 bg-pink-500/10 px-3 py-2 font-display text-[11px] tracking-[0.2em] text-pink-100 hover:bg-pink-500/20"
          >
            ↗ TICKETS
          </a>
        )}
      </div>
    </li>
  )
}

function formatDate(iso: string): { month: string; day: string; year: string } {
  // Use UTC-style parsing so timezone doesn't swing the day boundary
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return { month: '???', day: '??', year: '????' }
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const monthIdx = parseInt(m[2], 10) - 1
  return {
    month: months[monthIdx] ?? '???',
    day: m[3],
    year: m[1],
  }
}
