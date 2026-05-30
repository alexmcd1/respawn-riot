'use client'

import { useEffect, useState } from 'react'
import { RATINGS_EVENT, RATINGS_KEY } from '../_lib/backup'

const CUISINES = [
  'Pizza', 'Sushi', 'Burgers', 'Tacos', 'Chinese', 'Thai',
  'Indian', 'Italian', 'Mexican', 'BBQ', 'Ramen', 'Vegan',
  'Breakfast', 'Coffee', 'Dessert', 'Seafood',
]

type Rating = {
  id: string         // stable id (timestamp or osm id)
  name: string
  cuisine?: string
  stars: number      // 0-10
  note?: string
  ratedAt: number    // epoch ms
}

type RestaurantResult = {
  id: string
  name: string
  cuisine?: string
  address?: string
  distanceMeters?: number
  lat: number
  lon: number
  mapsUrl: string
  // Google Places extras — UI shows them when present
  rating?: number          // 1.0–5.0
  ratingCount?: number     // # of Google reviews
  priceLevel?: number      // 0–4
  openNow?: boolean | null
  source?: 'google' | 'osm'
}

const RADIUS_OPTIONS: { label: string; miles: number }[] = [
  { label: '1 mi',  miles: 1 },
  { label: '3 mi',  miles: 3 },
  { label: '5 mi',  miles: 5 },
  { label: '10 mi', miles: 10 },
  { label: '25 mi', miles: 25 },
]

function milesToMeters(miles: number): number {
  return Math.round(miles * 1609.344)
}

function formatDistance(meters?: number): string | null {
  if (typeof meters !== 'number') return null
  const miles = meters / 1609.344
  if (miles < 0.1) return '<0.1 mi'
  if (miles < 10) return `${miles.toFixed(1)} mi`
  return `${Math.round(miles)} mi`
}

function loadRatings(): Rating[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RATINGS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Rating[]) : []
  } catch {
    return []
  }
}

function saveRatings(ratings: Rating[]) {
  try {
    localStorage.setItem(RATINGS_KEY, JSON.stringify(ratings))
    // Tell other listeners (Backup panel, etc.) the ratings changed
    window.dispatchEvent(new CustomEvent(RATINGS_EVENT))
  } catch {
    // localStorage full or disabled — silently fail
  }
}

type Coords = { lat: number; lon: number }
type GeoStatus = 'idle' | 'locating' | 'ok' | 'denied' | 'error'

export default function RestaurantFinder() {
  // ─── Location (shared across features)
  const [zip, setZip] = useState('')
  const [useExact, setUseExact] = useState(false)
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle')
  const [coords, setCoords] = useState<Coords | null>(null)

  // ─── Cuisine search
  const [cuisine, setCuisine] = useState('Pizza')
  const [customCuisine, setCustomCuisine] = useState('')
  const [radiusMiles, setRadiusMiles] = useState(5)
  const [results, setResults] = useState<RestaurantResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [fallbackMapsUrl, setFallbackMapsUrl] = useState<string | null>(null)

  // ─── Randomizer pick
  const [pick, setPick] = useState<RestaurantResult | Rating | null>(null)
  const [pickKind, setPickKind] = useState<'result' | 'rating' | null>(null)

  // ─── By-name search (for adding ratings)
  const [nameQuery, setNameQuery] = useState('')
  const [nameResults, setNameResults] = useState<RestaurantResult[]>([])
  const [nameSearching, setNameSearching] = useState(false)
  const [nameError, setNameError] = useState('')

  // ─── Ratings state
  const [ratings, setRatings] = useState<Rating[]>([])
  const [newName, setNewName] = useState('')
  const [newCuisine, setNewCuisine] = useState('')
  const [newStars, setNewStars] = useState(8)
  const [newNote, setNewNote] = useState('')

  useEffect(() => {
    // Hydrate from localStorage on mount and refresh whenever something
    // else mutates ratings (e.g. an Import via the Backup panel).
    const refresh = () => setRatings(loadRatings())
    refresh()
    window.addEventListener(RATINGS_EVENT, refresh)
    return () => window.removeEventListener(RATINGS_EVENT, refresh)
  }, [])

  function persist(next: Rating[]) {
    setRatings(next)
    saveRatings(next)
  }

  // ─── Location helpers
  async function requestLocation(): Promise<Coords | null> {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setGeoStatus('error')
        resolve(null)
        return
      }
      setGeoStatus('locating')
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lat: pos.coords.latitude, lon: pos.coords.longitude }
          setCoords(c)
          setGeoStatus('ok')
          resolve(c)
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) setGeoStatus('denied')
          else setGeoStatus('error')
          setUseExact(false)
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 8000 }
      )
    })
  }

  function toggleExact(next: boolean) {
    setUseExact(next)
    setSearchError('')
    setNameError('')
    if (next && !coords) requestLocation()
  }

  function locationPayload(): { lat?: number; lon?: number; zip?: string } | null {
    if (useExact && coords) return { lat: coords.lat, lon: coords.lon }
    if (useExact) return null // still locating
    const z = zip.trim()
    if (z) return { zip: z }
    return null
  }

  // ─── Cuisine search
  async function doSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearchError('')
    setFallbackMapsUrl(null)
    setPick(null)
    const term = (customCuisine.trim() || cuisine.trim()).trim()
    if (!term) return setSearchError('Pick a cuisine first')
    const loc = locationPayload()
    if (!loc) return setSearchError('Enter a zip or toggle exact location')
    setSearching(true)
    try {
      const res = await fetch('/api/find-restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'cuisine',
          query: term,
          radiusMeters: milesToMeters(radiusMiles),
          ...loc,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!data.ok) {
        setSearchError(typeof data.error === 'string' ? data.error : 'Search failed')
        setResults([])
      } else {
        setResults(data.results ?? [])
        if (typeof data.fallbackMapsUrl === 'string') {
          setFallbackMapsUrl(data.fallbackMapsUrl)
        }
        if ((data.results ?? []).length === 0) {
          setSearchError(
            `No "${term}" places within ${radiusMiles} mi. Try a bigger radius or a different cuisine.`
          )
        }
      }
    } catch {
      setSearchError('Network error')
    } finally {
      setSearching(false)
    }
  }

  // ─── By-name search
  async function doNameSearch(e: React.FormEvent) {
    e.preventDefault()
    setNameError('')
    const term = nameQuery.trim()
    if (!term) return
    const loc = locationPayload()
    if (!loc) return setNameError('Set your location above first')
    setNameSearching(true)
    try {
      const res = await fetch('/api/find-restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'name',
          query: term,
          radiusMeters: milesToMeters(radiusMiles),
          ...loc,
          limit: 12,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!data.ok) {
        setNameError(typeof data.error === 'string' ? data.error : 'Search failed')
        setNameResults([])
      } else {
        setNameResults(data.results ?? [])
        if ((data.results ?? []).length === 0) {
          setNameError(`No "${term}" found nearby.`)
        }
      }
    } catch {
      setNameError('Network error')
    } finally {
      setNameSearching(false)
    }
  }

  function pickFromNameResults(r: RestaurantResult) {
    // Auto-fill the rating form so the user just sets stars + saves
    setNewName(r.address ? `${r.name} — ${r.address}` : r.name)
    setNewCuisine(r.cuisine ?? '')
    setNameResults([])
    setNameQuery('')
    // Scroll the rating form into view
    queueMicrotask(() => {
      const el = document.getElementById('rating-form')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  // ─── Randomizer
  // Pool = current search results + saved ratings. Weight: rated places get
  // (stars + 1); unrated search results get a baseline of 3 so they're still
  // discoverable but high-rated favorites win out.
  function randomize() {
    type PoolEntry =
      | { kind: 'result'; item: RestaurantResult; weight: number }
      | { kind: 'rating'; item: Rating; weight: number }
    const pool: PoolEntry[] = []
    for (const r of results) pool.push({ kind: 'result', item: r, weight: 3 })
    for (const r of ratings) pool.push({ kind: 'rating', item: r, weight: r.stars + 1 })
    if (pool.length === 0) {
      setSearchError(
        'Pick a cuisine and search, or add a rating first — nothing to randomize.'
      )
      return
    }
    const totalWeight = pool.reduce((s, p) => s + p.weight, 0)
    let roll = Math.random() * totalWeight
    let chosen: PoolEntry = pool[0]
    for (const p of pool) {
      roll -= p.weight
      if (roll <= 0) { chosen = p; break }
    }
    setPick(chosen.item)
    setPickKind(chosen.kind)
  }

  function dismissPick() {
    setPick(null)
    setPickKind(null)
  }

  function ratePickedResult() {
    if (!pick || pickKind !== 'result') return
    const r = pick as RestaurantResult
    setNewName(r.address ? `${r.name} — ${r.address}` : r.name)
    setNewCuisine(r.cuisine ?? '')
    dismissPick()
    queueMicrotask(() => {
      const el = document.getElementById('rating-form')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  // ─── Rating CRUD
  function addRating(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    const rec: Rating = {
      id: String(Date.now()),
      name,
      cuisine: newCuisine.trim() || undefined,
      stars: Math.min(10, Math.max(0, newStars)),
      note: newNote.trim() || undefined,
      ratedAt: Date.now(),
    }
    persist([rec, ...ratings])
    setNewName('')
    setNewCuisine('')
    setNewNote('')
    setNewStars(8)
  }

  function removeRating(id: string) {
    persist(ratings.filter((r) => r.id !== id))
  }

  function updateStars(id: string, stars: number) {
    persist(
      ratings.map((r) =>
        r.id === id ? { ...r, stars: Math.min(10, Math.max(0, stars)) } : r
      )
    )
  }

  const sortedRatings = [...ratings].sort((a, b) => b.stars - a.stars || b.ratedAt - a.ratedAt)

  // ─── Render
  return (
    <div className="space-y-8">
      {/* ─── Find restaurants */}
      <section className="space-y-3">
        <form onSubmit={doSearch} className="space-y-3">
          <div>
            <label className="font-display text-[10px] tracking-[0.3em] text-red-300">
              ▌ CUISINE
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {CUISINES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setCuisine(c); setCustomCuisine('') }}
                  className={`rounded-lg border px-2 py-2.5 text-sm transition ${
                    cuisine === c && !customCuisine
                      ? 'border-red-400 bg-red-500/15 text-red-100'
                      : 'border-white/10 bg-black/30 text-white/70 hover:border-white/30'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={customCuisine}
              onChange={(e) => setCustomCuisine(e.target.value)}
              placeholder="…or type a custom cuisine (e.g. Ethiopian)"
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-red-400"
            />
          </div>

          <div>
            <label className="font-display text-[10px] tracking-[0.3em] text-red-300">
              ▌ DISTANCE
            </label>
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {RADIUS_OPTIONS.map((opt) => (
                <button
                  key={opt.miles}
                  type="button"
                  onClick={() => setRadiusMiles(opt.miles)}
                  aria-pressed={radiusMiles === opt.miles}
                  className={`rounded-lg border py-2.5 font-display text-sm tracking-widest transition ${
                    radiusMiles === opt.miles
                      ? 'border-red-400 bg-red-500/15 text-red-100'
                      : 'border-white/10 bg-black/30 text-white/70 hover:border-white/30'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-display text-[10px] tracking-[0.3em] text-red-300">
              ▌ WHERE
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                disabled={useExact}
                placeholder="Zip code"
                className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-red-400 disabled:opacity-40"
              />
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white/85 hover:border-white/30">
                <input
                  type="checkbox"
                  checked={useExact}
                  onChange={(e) => toggleExact(e.target.checked)}
                  className="h-5 w-5 accent-red-500"
                />
                Use my exact location
              </label>
            </div>
            {useExact && (
              <p className="mt-2 text-xs text-white/55">
                {geoStatus === 'locating' && 'Asking your browser for location…'}
                {geoStatus === 'ok' && coords &&
                  `Got it — ${coords.lat.toFixed(3)}, ${coords.lon.toFixed(3)}`}
                {geoStatus === 'denied' && 'Permission denied — toggle off or change browser settings.'}
                {geoStatus === 'error' && 'Could not get location — try the zip code instead.'}
              </p>
            )}
          </div>

          {searchError && (
            <p className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
              ▲ {searchError}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              disabled={searching}
              className="flex-1 rounded-xl bg-red-500 px-6 py-3 font-display text-base tracking-[0.25em] text-white transition hover:bg-red-400 disabled:opacity-50"
            >
              {searching ? 'SEARCHING…' : '🔍 SEARCH'}
            </button>
            <button
              type="button"
              onClick={randomize}
              className="rounded-xl border-2 border-yellow-400 bg-black px-6 py-3 font-display text-base tracking-[0.25em] text-yellow-300 transition hover:bg-yellow-400/10"
            >
              🎲 PICK FOR ME
            </button>
          </div>
        </form>

        {/* Randomizer result */}
        {pick && (
          <div className="rounded-2xl border-2 border-yellow-400/60 bg-gradient-to-br from-yellow-500/15 via-orange-500/5 to-transparent p-5 text-center">
            <p className="font-display text-[10px] tracking-[0.3em] text-yellow-300">
              ▌ TONIGHT YOU&apos;RE GOING TO…
            </p>
            <p className="mt-2 font-display text-2xl tracking-wide text-white sm:text-3xl">
              {pick.name}
            </p>
            {pickKind === 'rating' && (
              <p className="mt-1 text-sm text-yellow-200/85">
                ★ {(pick as Rating).stars}/10 — your past pick
                {(pick as Rating).cuisine ? ` · ${(pick as Rating).cuisine}` : ''}
              </p>
            )}
            {pickKind === 'result' && (
              <p className="mt-1 text-sm text-white/75">
                {(pick as RestaurantResult).cuisine ?? 'Restaurant'}
                {(pick as RestaurantResult).address
                  ? ` · ${(pick as RestaurantResult).address}`
                  : ''}
              </p>
            )}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {pickKind === 'result' && (
                <>
                  <a
                    href={(pick as RestaurantResult).mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-yellow-400 px-4 py-2 font-display text-xs tracking-[0.2em] text-black hover:bg-yellow-300"
                  >
                    → MAPS
                  </a>
                  <button
                    type="button"
                    onClick={ratePickedResult}
                    className="rounded-lg border border-white/30 px-4 py-2 font-display text-xs tracking-[0.2em] text-white hover:bg-white/10"
                  >
                    + RATE IT
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={randomize}
                className="rounded-lg border border-white/30 px-4 py-2 font-display text-xs tracking-[0.2em] text-white hover:bg-white/10"
              >
                🎲 AGAIN
              </button>
              <button
                type="button"
                onClick={dismissPick}
                className="rounded-lg border border-white/15 px-4 py-2 font-display text-xs tracking-[0.2em] text-white/60 hover:bg-white/5"
              >
                DISMISS
              </button>
            </div>
          </div>
        )}

        {/* Cuisine search results */}
        {results.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-white/55">
                {results.length} {results.length === 1 ? 'spot' : 'spots'} within {radiusMiles} mi — via OpenStreetMap
              </p>
              {fallbackMapsUrl && (
                <a
                  href={fallbackMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-red-300 hover:underline"
                >
                  See more on Google Maps ↗
                </a>
              )}
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {results.map((r) => {
                const dist = formatDistance(r.distanceMeters)
                return (
                  <li
                    key={r.id}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-display text-base text-white">{r.name}</p>
                      {dist && (
                        <span className="shrink-0 rounded-md border border-white/15 bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-white/70">
                          {dist}
                        </span>
                      )}
                    </div>
                    {/* Google-only meta row: rating · price · open status */}
                    {(typeof r.rating === 'number' || typeof r.priceLevel === 'number' || r.openNow != null) && (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                        {typeof r.rating === 'number' && (
                          <span className="rounded-md bg-yellow-500/15 px-1.5 py-0.5 text-yellow-200">
                            ★ {r.rating.toFixed(1)}
                            {typeof r.ratingCount === 'number' && (
                              <span className="ml-1 text-yellow-200/60">
                                ({r.ratingCount > 999 ? `${(r.ratingCount / 1000).toFixed(1)}k` : r.ratingCount})
                              </span>
                            )}
                          </span>
                        )}
                        {typeof r.priceLevel === 'number' && r.priceLevel > 0 && (
                          <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-emerald-200">
                            {'$'.repeat(r.priceLevel)}
                          </span>
                        )}
                        {r.openNow === true && (
                          <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-emerald-200">
                            ● Open now
                          </span>
                        )}
                        {r.openNow === false && (
                          <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-white/60">
                            ● Closed
                          </span>
                        )}
                      </div>
                    )}
                    {r.cuisine && (
                      <p className="mt-1 text-xs uppercase tracking-widest text-red-300/80">
                        {r.cuisine}
                      </p>
                    )}
                    {r.address && (
                      <p className="mt-1 text-xs text-white/55">{r.address}</p>
                    )}
                    <div className="mt-2 flex gap-2">
                      <a
                        href={r.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:border-red-400 hover:text-red-200"
                      >
                        ↗ Maps
                      </a>
                      <button
                        type="button"
                        onClick={() => pickFromNameResults(r)}
                        className="rounded-md border border-red-400/60 bg-red-500/10 px-3 py-1.5 text-xs text-red-100 hover:bg-red-500/20"
                      >
                        + Rate this
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Fallback when 0 results — surface Google Maps so the user
            still has somewhere to look (OSM coverage is uneven). */}
        {results.length === 0 && fallbackMapsUrl && (
          <a
            href={fallbackMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center text-sm text-red-300 hover:bg-white/[0.05]"
          >
            Open this search in Google Maps ↗
          </a>
        )}
      </section>

      {/* ─── Ratings */}
      <section className="space-y-3">
        <div>
          <h3 className="font-display text-xl tracking-wide">
            Places I&apos;ve been
          </h3>
          <p className="text-xs text-white/55">
            Saved locally on this device. Up to 10 stars. Tap a star to set.
          </p>
        </div>

        {/* Quick add: search by name */}
        <form
          onSubmit={doNameSearch}
          className="rounded-2xl border border-white/10 bg-black/20 p-3"
        >
          <label className="font-display text-[10px] tracking-[0.3em] text-red-300">
            ▌ FIND A PLACE BY NAME
          </label>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder='e.g. "McDonalds", "Chipotle"'
              className="flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-red-400"
            />
            <button
              type="submit"
              disabled={nameSearching}
              className="rounded-lg border border-red-400/60 px-4 py-2.5 font-display text-sm tracking-[0.2em] text-red-200 hover:bg-red-500/10 disabled:opacity-50"
            >
              {nameSearching ? '…' : 'FIND'}
            </button>
          </div>
          {nameError && (
            <p className="mt-2 text-xs text-red-200/85">▲ {nameError}</p>
          )}
          {nameResults.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {nameResults.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/40 p-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white">{r.name}</p>
                    <p className="truncate text-xs text-white/55">
                      {[r.cuisine, r.address].filter(Boolean).join(' · ') || 'Restaurant'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => pickFromNameResults(r)}
                    aria-label={`Add ${r.name}`}
                    className="shrink-0 rounded-md border border-red-400/60 bg-red-500/10 px-3 py-1.5 text-xs text-red-100 hover:bg-red-500/20"
                  >
                    ✓ THIS ONE
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>

        {/* Manual rating form */}
        <form
          id="rating-form"
          onSubmit={addRating}
          className="space-y-2 rounded-2xl border border-white/10 bg-black/30 p-3"
        >
          <p className="font-display text-[10px] tracking-[0.3em] text-red-300">
            ▌ OR ADD MANUALLY
          </p>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Restaurant name"
            required
            className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-red-400"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={newCuisine}
              onChange={(e) => setNewCuisine(e.target.value)}
              placeholder="Cuisine (optional)"
              className="rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-red-400"
            />
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Quick note (optional)"
              className="rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-red-400"
            />
          </div>
          <StarRow value={newStars} onChange={setNewStars} />
          <button
            type="submit"
            className="w-full rounded-lg bg-red-500/90 px-4 py-2.5 font-display text-sm tracking-[0.2em] text-white hover:bg-red-400"
          >
            + SAVE RATING
          </button>
        </form>

        {sortedRatings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-white/45">
            No ratings yet. Search for a spot above, or add one manually.
          </p>
        ) : (
          <ul className="space-y-2">
            {sortedRatings.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border border-white/10 bg-black/30 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-display text-base text-white">
                      {r.name}
                    </p>
                    {r.cuisine && (
                      <p className="text-xs uppercase tracking-widest text-red-300/80">
                        {r.cuisine}
                      </p>
                    )}
                    {r.note && (
                      <p className="mt-1 text-sm text-white/70">{r.note}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRating(r.id)}
                    aria-label="Delete rating"
                    className="rounded-md border border-white/15 px-2 py-1 text-xs text-white/50 hover:border-red-400 hover:text-red-300"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-2">
                  <StarRow value={r.stars} onChange={(n) => updateStars(r.id, n)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function StarRow({
  value,
  onChange,
}: {
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label={`Rating: ${value} out of 10`}
      className="flex items-center justify-between gap-0.5"
    >
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const filled = n <= value
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={filled}
            aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
            onClick={() => onChange(value === n ? n - 1 : n)}
            className={`flex h-9 w-9 items-center justify-center text-xl transition sm:h-8 sm:w-8 ${
              filled ? 'text-yellow-300' : 'text-white/20 hover:text-white/50'
            }`}
          >
            {filled ? '★' : '☆'}
          </button>
        )
      })}
      <span className="ml-1 w-10 text-right font-display text-sm text-white/70">
        {value}/10
      </span>
    </div>
  )
}
