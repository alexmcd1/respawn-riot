'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ARTISTS_EVENT,
  CITIES_EVENT,
  addFavoriteArtist,
  addSavedCity,
  isFavoriteArtist,
  loadFavoriteArtists,
  loadSavedCities,
  removeFavoriteArtist,
  removeSavedCity,
} from '../_lib/concertFavorites'

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
  genre?: string
  source: 'ticketmaster' | 'bandsintown'
}

type SearchSource =
  | 'ticketmaster'
  | 'bandsintown'
  | 'bandsintown-fallback'
  | 'none'
  | null

type SearchResponse = {
  ok: boolean
  source?: SearchSource
  count?: number
  totalPages?: number
  page?: number
  results?: ConcertResult[]
  error?: string
}

// Pre-seeded picks for two purposes:
//   1. First-time users see a useful list instead of an empty page
//   2. Quick-add path for the user's original named bands
const PRESET_ARTISTS = [
  'Yellowcard',
  'My Chemical Romance',
  'Simple Plan',
  'All Time Low',
] as const

const PRESET_GENRES = [
  'Rock', 'Pop', 'Hip-Hop/Rap', 'Alternative', 'Metal',
  'Country', 'Electronic', 'R&B', 'Jazz', 'Latin',
  'Classical', 'Reggae', 'Blues', 'Folk',
] as const

const PAGE_SIZES = [20, 50, 100] as const

const LAST_QUERY_KEY = 'respawn.music.lastQuery.v2'

type SearchMode = 'artist' | 'genre'

type LastQuery = {
  mode: SearchMode
  artist: string
  genre: string
  cities: string[]
  startDate: string
  endDate: string
  size: number
}

export default function ConcertSearch() {
  // ─── Mode + query state
  const [mode, setMode] = useState<SearchMode>('artist')
  const [artist, setArtist] = useState('')
  const [genre, setGenre] = useState<string>('Rock')

  // ─── Filter state
  const [cities, setCities] = useState<string[]>([])
  const [cityInput, setCityInput] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [pageSize, setPageSize] = useState<number>(50)

  // ─── Favorites (synced from localStorage)
  const [favoriteArtists, setFavoriteArtists] = useState<string[]>([])
  const [savedCities, setSavedCities] = useState<string[]>([])

  // ─── Search state
  const [searching, setSearching] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<ConcertResult[]>([])
  const [source, setSource] = useState<SearchSource>(null)
  const [searchedLabel, setSearchedLabel] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Hydrate favorites + restore last query on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const refreshArtists = () => setFavoriteArtists(loadFavoriteArtists())
    const refreshCities = () => setSavedCities(loadSavedCities())
    refreshArtists()
    refreshCities()
    window.addEventListener(ARTISTS_EVENT, refreshArtists)
    window.addEventListener(CITIES_EVENT, refreshCities)

    try {
      const raw = localStorage.getItem(LAST_QUERY_KEY)
      if (raw) {
        const q = JSON.parse(raw) as Partial<LastQuery>
        if (q.mode === 'artist' || q.mode === 'genre') setMode(q.mode)
        if (typeof q.artist === 'string') setArtist(q.artist)
        if (typeof q.genre === 'string') setGenre(q.genre)
        if (Array.isArray(q.cities)) setCities(q.cities.filter((c): c is string => typeof c === 'string'))
        if (typeof q.startDate === 'string') setStartDate(q.startDate)
        if (typeof q.endDate === 'string') setEndDate(q.endDate)
        if (typeof q.size === 'number') setPageSize(q.size)
      }
    } catch {
      // ignore
    }

    return () => {
      window.removeEventListener(ARTISTS_EVENT, refreshArtists)
      window.removeEventListener(CITIES_EVENT, refreshCities)
    }
  }, [])

  // ─── City chip handlers
  function addCityChip(name: string) {
    const clean = name.trim()
    if (!clean) return
    if (cities.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      setCityInput('')
      return
    }
    setCities([...cities, clean])
    setCityInput('')
  }

  function onCityKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addCityChip(cityInput)
    } else if (e.key === 'Backspace' && !cityInput && cities.length > 0) {
      // Backspace on empty input pops the last chip — common UX pattern
      setCities(cities.slice(0, -1))
    }
  }

  function removeCityChip(name: string) {
    setCities(cities.filter((c) => c !== name))
  }

  function saveCurrentCities() {
    cities.forEach(addSavedCity)
  }

  function applySavedCities(names: string[]) {
    // Merge into current selection (don't replace — user might be combining)
    const merged = [...cities]
    for (const n of names) {
      if (!merged.some((c) => c.toLowerCase() === n.toLowerCase())) merged.push(n)
    }
    setCities(merged)
  }

  // ─── Submit
  async function doSearch(args: { append?: boolean } = {}) {
    setError('')
    const isAppend = args.append === true
    const targetPage = isAppend ? currentPage + 1 : 0

    if (mode === 'artist' && !artist.trim()) {
      setError('Type an artist or pick one from favorites.')
      return
    }
    if (mode === 'genre' && !genre.trim()) {
      setError('Pick a genre.')
      return
    }

    if (isAppend) setLoadingMore(true)
    else setSearching(true)

    try {
      const body: Record<string, unknown> = {
        cities,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        size: pageSize,
        page: targetPage,
      }
      if (mode === 'artist') body.artist = artist.trim()
      if (mode === 'genre') body.genre = genre.trim()

      const res = await fetch('/api/concerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = (await res.json().catch(() => ({}))) as SearchResponse
      if (!data.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Search failed')
        if (!isAppend) {
          setResults([])
          setSource(null)
        }
        return
      }

      const incoming = data.results ?? []
      const nextSource =
        data.source === 'ticketmaster' ||
        data.source === 'bandsintown' ||
        data.source === 'bandsintown-fallback' ||
        data.source === 'none'
          ? data.source
          : null

      if (isAppend) {
        // Dedupe across pages by id
        const seen = new Set(results.map((r) => r.id))
        const fresh = incoming.filter((r) => !seen.has(r.id))
        const merged = [...results, ...fresh].sort((a, b) =>
          a.date.localeCompare(b.date)
        )
        setResults(merged)
      } else {
        setResults(incoming)
      }

      setSource(nextSource)
      setCurrentPage(targetPage)
      setTotalPages(data.totalPages ?? 0)

      // Label for results header — e.g. "Yellowcard in Tampa, Orlando"
      const subject = mode === 'artist' ? artist.trim() : `${genre} shows`
      const where = cities.length > 0 ? ` in ${cities.join(', ')}` : ''
      setSearchedLabel(`${subject}${where}`)

      // Persist the query for next visit
      try {
        const persisted: LastQuery = {
          mode, artist, genre, cities, startDate, endDate, size: pageSize,
        }
        localStorage.setItem(LAST_QUERY_KEY, JSON.stringify(persisted))
      } catch {
        // ignore
      }
    } catch {
      setError('Network error')
    } finally {
      setSearching(false)
      setLoadingMore(false)
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    void doSearch()
  }

  function quickSearchArtist(name: string) {
    setMode('artist')
    setArtist(name)
    // Defer the search so the input update flushes first
    queueMicrotask(() => void doSearch())
  }

  const hasMore = currentPage + 1 < totalPages
  const artistAlreadyFavorited = mode === 'artist' && isFavoriteArtist(artist)

  const groupedByDate = useMemo(() => {
    const map = new Map<string, ConcertResult[]>()
    for (const r of results) {
      const k = r.date
      const arr = map.get(k) ?? []
      arr.push(r)
      map.set(k, arr)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [results])

  return (
    <div className="space-y-6">
      {/* ───────── Favorites pane (artists) ───────── */}
      <section className="rounded-2xl border border-white/10 bg-black/30 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-[10px] tracking-[0.3em] text-pink-300">
            ★ FAVORITE ARTISTS
          </p>
          <span className="text-[10px] uppercase tracking-widest text-white/40">
            saved on this device
          </span>
        </div>
        {favoriteArtists.length === 0 ? (
          <p className="mt-2 text-xs text-white/55">
            None yet. Search an artist and tap <strong className="text-pink-300">★ FAVORITE</strong>{' '}
            to keep them here. Phase 2 will email you when they announce
            shows in your saved cities.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {favoriteArtists.map((name) => (
              <div
                key={name}
                className="group flex items-center gap-1 rounded-full border border-pink-400/40 bg-pink-500/10 pl-3 pr-1 text-xs text-pink-100"
              >
                <button
                  type="button"
                  onClick={() => quickSearchArtist(name)}
                  className="py-1.5 hover:text-white"
                >
                  {name}
                </button>
                <button
                  type="button"
                  onClick={() => removeFavoriteArtist(name)}
                  aria-label={`Remove ${name} from favorites`}
                  className="ml-1 rounded-full px-1.5 py-1 text-pink-300/60 hover:text-red-300"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        {/* Preset quick-add (for first-time users — fades after they have favorites) */}
        {favoriteArtists.length < 4 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-3">
            <span className="text-[10px] uppercase tracking-widest text-white/35">
              quick add:
            </span>
            {PRESET_ARTISTS.filter((p) => !favoriteArtists.includes(p)).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => addFavoriteArtist(p)}
                className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[11px] text-white/70 hover:border-pink-400/60 hover:text-pink-200"
              >
                + {p}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ───────── Search form ───────── */}
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        {/* Mode toggle */}
        <div>
          <p className="font-display text-[10px] tracking-[0.3em] text-pink-300">
            ▌ I&apos;M LOOKING FOR
          </p>
          <div className="mt-2 inline-flex rounded-lg border border-white/15 bg-black/40 p-1">
            {(['artist', 'genre'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-md px-4 py-1.5 font-display text-[11px] tracking-[0.25em] uppercase transition ${
                  mode === m
                    ? 'bg-pink-500/20 text-pink-100'
                    : 'text-white/55 hover:text-white'
                }`}
              >
                {m === 'artist' ? 'A specific artist' : 'Any artist in a genre'}
              </button>
            ))}
          </div>
        </div>

        {/* Artist mode */}
        {mode === 'artist' && (
          <div>
            <label className="font-display text-[10px] tracking-[0.3em] text-pink-300">
              ▌ ARTIST
            </label>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder='e.g. "Yellowcard", "Paramore"'
                className="flex-1 rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-pink-400"
              />
              {artist.trim() && !artistAlreadyFavorited && (
                <button
                  type="button"
                  onClick={() => {
                    addFavoriteArtist(artist)
                    setFavoriteArtists(loadFavoriteArtists())
                  }}
                  className="shrink-0 rounded-xl border border-pink-400/60 bg-pink-500/10 px-3 py-3 font-display text-[11px] tracking-[0.2em] text-pink-100 hover:bg-pink-500/20"
                  title="Save as favorite"
                >
                  ★ FAVORITE
                </button>
              )}
            </div>
          </div>
        )}

        {/* Genre mode */}
        {mode === 'genre' && (
          <div>
            <label className="font-display text-[10px] tracking-[0.3em] text-pink-300">
              ▌ GENRE
            </label>
            <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {PRESET_GENRES.map((g) => {
                const active = genre === g
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGenre(g)}
                    className={`rounded-lg border px-2 py-2 text-xs transition ${
                      active
                        ? 'border-pink-400 bg-pink-500/15 text-pink-100'
                        : 'border-white/10 bg-black/30 text-white/70 hover:border-white/30'
                    }`}
                  >
                    {g}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Cities */}
        <div>
          <label className="font-display text-[10px] tracking-[0.3em] text-pink-300">
            ▌ CITIES <span className="text-white/40">(leave empty for nationwide)</span>
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-white/15 bg-black/40 px-2 py-2 focus-within:border-pink-400">
            {cities.map((c) => (
              <span
                key={c}
                className="flex items-center gap-1 rounded-full bg-pink-500/15 pl-3 pr-1 text-xs text-pink-100"
              >
                {c}
                <button
                  type="button"
                  onClick={() => removeCityChip(c)}
                  aria-label={`Remove ${c}`}
                  className="rounded-full px-1.5 py-1 text-pink-300/60 hover:text-red-300"
                >
                  ✕
                </button>
              </span>
            ))}
            <input
              type="text"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              onKeyDown={onCityKeyDown}
              onBlur={() => cityInput && addCityChip(cityInput)}
              placeholder={cities.length === 0 ? 'Tampa, Orlando, Jacksonville…  press Enter' : 'Add another'}
              className="min-w-[10ch] flex-1 bg-transparent px-1 py-1 text-sm text-white outline-none placeholder:text-white/35"
            />
          </div>
          {/* Saved cities row */}
          {(savedCities.length > 0 || cities.length > 0) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
              {savedCities.length > 0 && (
                <>
                  <span className="text-white/40 uppercase tracking-widest">saved:</span>
                  {savedCities.map((c) => (
                    <div
                      key={c}
                      className="group flex items-center gap-1 rounded-full border border-white/15 bg-black/40 pl-2.5 pr-1 text-white/70"
                    >
                      <button
                        type="button"
                        onClick={() => applySavedCities([c])}
                        className="py-1 hover:text-white"
                      >
                        + {c}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSavedCity(c)}
                        aria-label={`Forget ${c}`}
                        className="rounded-full px-1 py-1 text-white/30 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {savedCities.length > 1 && (
                    <button
                      type="button"
                      onClick={() => applySavedCities(savedCities)}
                      className="rounded-full border border-pink-400/40 bg-pink-500/10 px-2.5 py-1 text-pink-100 hover:bg-pink-500/20"
                    >
                      + ALL SAVED
                    </button>
                  )}
                </>
              )}
              {cities.length > 0 && (
                <button
                  type="button"
                  onClick={saveCurrentCities}
                  className="ml-auto rounded-full border border-white/15 px-2.5 py-1 text-white/55 hover:border-pink-400/60 hover:text-pink-200"
                >
                  ★ SAVE THESE
                </button>
              )}
            </div>
          )}
        </div>

        {/* Date range + page size */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="startDate" className="font-display text-[10px] tracking-[0.3em] text-pink-300">
              ▌ FROM
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-pink-400 [color-scheme:dark]"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="font-display text-[10px] tracking-[0.3em] text-pink-300">
              ▌ TO
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-pink-400 [color-scheme:dark]"
            />
          </div>
          <div>
            <label htmlFor="pageSize" className="font-display text-[10px] tracking-[0.3em] text-pink-300">
              ▌ PER PAGE
            </label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-pink-400"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n} per city
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
            ▲ {error}
          </p>
        )}

        <button
          type="submit"
          disabled={searching}
          className="w-full rounded-xl bg-pink-500 px-6 py-3 font-display text-base tracking-[0.25em] text-white hover:bg-pink-400 disabled:opacity-50"
        >
          {searching ? 'SEARCHING…' : '🔍 SEARCH'}
        </button>
      </form>

      {/* ───────── Results ───────── */}
      {!searching && searchedLabel && results.length === 0 && source === 'none' && (
        <div className="space-y-3 rounded-xl border border-yellow-400/30 bg-yellow-500/5 p-5 text-sm">
          <p className="font-display text-[11px] tracking-[0.3em] text-yellow-300">
            ▌ NO PROVIDERS AVAILABLE
          </p>
          <p className="text-white/85">
            Couldn&apos;t reach a concert provider. Multi-city + genre filters
            need the Ticketmaster API.
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
            , then add <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-xs text-yellow-200">TICKETMASTER_API_KEY</code> to Vercel env vars.
          </p>
        </div>
      )}

      {!searching && searchedLabel && results.length === 0 && source !== 'none' && !error && (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-center text-sm text-white/65">
          No shows match <strong>{searchedLabel}</strong>. Try widening the
          date range, removing a city, or switching to nationwide.
        </p>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-white/75">
              <strong className="text-white">{results.length}</strong>{' '}
              {results.length === 1 ? 'show' : 'shows'} for{' '}
              <span className="text-pink-200">{searchedLabel}</span>
            </p>
            <p className="text-xs text-white/55">
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

          {groupedByDate.map(([date, list]) => (
            <DateGroup key={date} date={date} concerts={list} favorites={favoriteArtists} />
          ))}

          {hasMore && (
            <button
              type="button"
              onClick={() => void doSearch({ append: true })}
              disabled={loadingMore}
              className="w-full rounded-xl border border-pink-400/60 bg-pink-500/10 px-4 py-3 font-display text-sm tracking-[0.25em] text-pink-100 hover:bg-pink-500/20 disabled:opacity-50"
            >
              {loadingMore
                ? 'LOADING…'
                : `LOAD PAGE ${currentPage + 2} OF ${totalPages}`}
            </button>
          )}
        </div>
      )}

      {!searchedLabel && !searching && (
        <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-white/50">
          Add cities (Tampa, Orlando, Jacksonville, …), pick an artist or
          genre, hit search. Save your favorites so you don&apos;t retype.
        </p>
      )}
    </div>
  )
}

// ─── Subcomponents ───────────────────────────────────────────────────────

function DateGroup({
  date,
  concerts,
  favorites,
}: {
  date: string
  concerts: ConcertResult[]
  favorites: string[]
}) {
  const nice = formatDateLong(date)
  return (
    <section>
      <h4 className="mb-1.5 flex items-baseline gap-2 border-b border-white/5 pb-1">
        <span className="font-display text-xs tracking-[0.25em] text-pink-300/90">
          {nice}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-white/35">
          ({concerts.length})
        </span>
      </h4>
      <ul className="space-y-2">
        {concerts.map((c) => (
          <ConcertCard key={c.id} concert={c} isFavorited={favorites.some((f) => f.toLowerCase() === c.artist.toLowerCase())} />
        ))}
      </ul>
    </section>
  )
}

function ConcertCard({
  concert,
  isFavorited,
}: {
  concert: ConcertResult
  isFavorited: boolean
}) {
  const niceDate = formatDateChip(concert.date)
  const location = [concert.city, concert.region, concert.country]
    .filter(Boolean)
    .join(', ')
  return (
    <li className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-stretch">
        {/* Date chip */}
        <div className="flex w-16 shrink-0 flex-col items-center justify-center border-r border-white/10 bg-black/30 px-2 py-3 text-center">
          <p className="font-display text-[10px] uppercase tracking-[0.25em] text-pink-300">
            {niceDate.month}
          </p>
          <p className="font-display text-2xl leading-none text-white">
            {niceDate.day}
          </p>
        </div>
        {/* Details */}
        <div className="min-w-0 flex-1 p-3">
          <p className="flex items-center gap-1.5 text-[12px] font-display uppercase tracking-widest text-pink-300/90">
            {isFavorited && (
              <span aria-label="Favorited" title="On your favorites list" className="text-pink-300">
                ★
              </span>
            )}
            <span className="truncate">{concert.artist}</span>
            {concert.time && (
              <span className="ml-1 font-mono text-[10px] text-white/45">
                {concert.time}
              </span>
            )}
          </p>
          <p className="mt-1 truncate font-display text-base text-white">
            {concert.venue}
          </p>
          {location && (
            <p className="mt-0.5 truncate text-xs text-white/60">{location}</p>
          )}
          {concert.genre && (
            <p className="mt-1 text-[10px] uppercase tracking-widest text-white/40">
              {concert.genre}
            </p>
          )}
        </div>
        {/* Ticket link + favorite */}
        <div className="my-auto mr-3 flex shrink-0 flex-col gap-1.5">
          {concert.ticketUrl && (
            <a
              href={concert.ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-pink-400/60 bg-pink-500/10 px-3 py-1.5 text-center font-display text-[11px] tracking-[0.2em] text-pink-100 hover:bg-pink-500/20"
            >
              ↗ TICKETS
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              if (isFavorited) removeFavoriteArtist(concert.artist)
              else addFavoriteArtist(concert.artist)
            }}
            className={`rounded-lg border px-3 py-1.5 font-display text-[11px] tracking-[0.2em] ${
              isFavorited
                ? 'border-pink-400 bg-pink-500/20 text-pink-100'
                : 'border-white/15 bg-black/30 text-white/65 hover:border-pink-400/60 hover:text-pink-100'
            }`}
          >
            {isFavorited ? '★ FAV' : '☆ FAV'}
          </button>
        </div>
      </div>
    </li>
  )
}

// "Sat, May 30" — long form for the date group header
function formatDateLong(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return iso
  const d = new Date(`${iso}T12:00:00Z`)
  return d.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

// "MAY / 30" — short form for the date chip
function formatDateChip(iso: string): { month: string; day: string } {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return { month: '???', day: '??' }
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const monthIdx = parseInt(m[2], 10) - 1
  return { month: months[monthIdx] ?? '???', day: m[3] }
}
