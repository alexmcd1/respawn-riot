'use client'

import { useEffect, useState } from 'react'

const CUISINES = [
  'Pizza', 'Sushi', 'Burgers', 'Tacos', 'Chinese', 'Thai',
  'Indian', 'Italian', 'Mexican', 'BBQ', 'Ramen', 'Vegan',
  'Breakfast', 'Coffee', 'Dessert', 'Seafood',
]

type Rating = {
  id: string         // stable id (timestamp)
  name: string
  cuisine?: string
  stars: number      // 0-10
  note?: string
  ratedAt: number    // epoch ms
}

const LS_KEY = 'respawn.food.ratings.v1'

function loadRatings(): Rating[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Rating[]) : []
  } catch {
    return []
  }
}

function saveRatings(ratings: Rating[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(ratings))
  } catch {
    // localStorage full or disabled — silently fail
  }
}

export default function RestaurantFinder() {
  // ─── Find restaurants
  const [cuisine, setCuisine] = useState('Pizza')
  const [customCuisine, setCustomCuisine] = useState('')
  const [zip, setZip] = useState('')
  const [useExact, setUseExact] = useState(false)
  const [geoStatus, setGeoStatus] = useState<'idle' | 'locating' | 'ok' | 'denied' | 'error'>('idle')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [searchError, setSearchError] = useState('')

  // ─── Ratings
  const [ratings, setRatings] = useState<Rating[]>([])
  const [newName, setNewName] = useState('')
  const [newCuisine, setNewCuisine] = useState('')
  const [newStars, setNewStars] = useState(8)
  const [newNote, setNewNote] = useState('')

  // Hydrate from localStorage after mount. Initial state must be [] so
  // the server and first client render match — then we update to the
  // saved data. This is the canonical pattern for browser-only state.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRatings(loadRatings())
  }, [])

  function persist(next: Rating[]) {
    setRatings(next)
    saveRatings(next)
  }

  async function requestLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoStatus('error')
      return
    }
    setGeoStatus('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGeoStatus('ok')
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGeoStatus('denied')
        else setGeoStatus('error')
        setUseExact(false)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  function toggleExact(next: boolean) {
    setUseExact(next)
    setSearchError('')
    if (next && !coords) requestLocation()
  }

  function buildMapsUrl(): string | null {
    const term = (customCuisine.trim() || cuisine.trim()).trim()
    if (!term) {
      setSearchError('Pick a cuisine first')
      return null
    }
    if (useExact && coords) {
      // Google Maps: query + center/zoom
      const q = encodeURIComponent(`${term} restaurants`)
      return `https://www.google.com/maps/search/?api=1&query=${q}&query_place_id=&center=${coords.lat},${coords.lng}`
    }
    if (!zip.trim()) {
      setSearchError('Enter a zip code or flip "use my exact location"')
      return null
    }
    const q = encodeURIComponent(`${term} restaurants near ${zip.trim()}`)
    return `https://www.google.com/maps/search/?api=1&query=${q}`
  }

  function openSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearchError('')
    const url = buildMapsUrl()
    if (url) window.open(url, '_blank', 'noopener')
  }

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
      ratings.map((r) => (r.id === id ? { ...r, stars: Math.min(10, Math.max(0, stars)) } : r))
    )
  }

  const sortedRatings = [...ratings].sort((a, b) => b.stars - a.stars || b.ratedAt - a.ratedAt)

  return (
    <div className="space-y-8">
      {/* ─── Find restaurants */}
      <form onSubmit={openSearch} className="space-y-3">
        <div>
          <label className="font-display text-[10px] tracking-[0.3em] text-red-300">
            ▌ CUISINE
          </label>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {CUISINES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCuisine(c)
                  setCustomCuisine('')
                }}
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
              {geoStatus === 'ok' && coords && `Got it — ${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`}
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

        <button
          type="submit"
          className="w-full rounded-xl bg-red-500 px-6 py-3 font-display text-base tracking-[0.25em] text-white transition hover:bg-red-400"
        >
          🍴 OPEN IN GOOGLE MAPS
        </button>
      </form>

      {/* ─── Ratings */}
      <div className="space-y-3">
        <h3 className="font-display text-xl tracking-wide">
          Places I&apos;ve been
        </h3>
        <p className="text-xs text-white/55">
          Saved locally on this device. Up to 10 stars. Tap a star to set.
        </p>

        <form
          onSubmit={addRating}
          className="space-y-2 rounded-2xl border border-white/10 bg-black/30 p-3"
        >
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
            No ratings yet. Add a spot above.
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
      </div>
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
