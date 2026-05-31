'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  WATCH_EVENT,
  loadWatch,
  saveWatch,
  type DisneyWatch,
} from '../_lib/disneyWatch'

type ResortSummary = {
  id: string
  name: string
  category: string
  image?: string
  url?: string
}

type Offer = {
  resortId: string
  basePrice: number
  sidePrice?: number
  savings?: number
  packageName?: string
  marketingOfferId?: string
  offerName?: string
  offerCategory?: string
  unavailable?: string
}

type AvailabilityResponse = {
  ok: boolean
  offers?: Offer[]
  marketingOffers?: Record<string, { name: string; category?: string }>
  error?: string
}

const TIERS = [
  'Value Resort Hotels',
  'Moderate Resort Hotels',
  'Deluxe Resort Hotels',
  'Deluxe Villas',
  'Campgrounds',
] as const

export default function DisneyDealsPanel() {
  // ─── State
  const [catalog, setCatalog] = useState<ResortSummary[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState('')

  const [watch, setWatchState] = useState<DisneyWatch>({
    resortIds: [],
    checkIn: '',
    checkOut: '',
    adults: 2,
    children: 0,
    flResident: true,
    postalCode: '32601',
    maxPrice: null,
    watchName: '',
  })

  const [offers, setOffers] = useState<Offer[] | null>(null)
  const [marketingOffers, setMarketingOffers] = useState<Record<string, { name: string; category?: string }>>({})
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  // ─── Hydrate watch + fetch catalog on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const refresh = () => setWatchState(loadWatch())
    refresh()
    window.addEventListener(WATCH_EVENT, refresh)
    return () => window.removeEventListener(WATCH_EVENT, refresh)
  }, [])

  useEffect(() => {
    let cancelled = false
    setCatalogLoading(true)
    fetch('/api/disney/resorts')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.ok) setCatalog(data.resorts ?? [])
        else setCatalogError(data.error || 'Failed to load resorts')
      })
      .catch(() => !cancelled && setCatalogError('Network error loading resorts'))
      .finally(() => !cancelled && setCatalogLoading(false))
    return () => { cancelled = true }
  }, [])

  // ─── Setters that auto-persist
  function updateWatch(patch: Partial<DisneyWatch>) {
    const next = { ...watch, ...patch }
    setWatchState(next)
    saveWatch(next)
  }

  function toggleResort(id: string) {
    const has = watch.resortIds.includes(id)
    updateWatch({
      resortIds: has
        ? watch.resortIds.filter((r) => r !== id)
        : [...watch.resortIds, id],
    })
  }

  function selectAllInTier(tier: string) {
    const ids = catalog.filter((r) => r.category === tier).map((r) => r.id)
    const allSelected = ids.every((id) => watch.resortIds.includes(id))
    if (allSelected) {
      updateWatch({ resortIds: watch.resortIds.filter((id) => !ids.includes(id)) })
    } else {
      const merged = [...new Set([...watch.resortIds, ...ids])]
      updateWatch({ resortIds: merged })
    }
  }

  // ─── Catalog grouped by tier (memoized)
  const byTier = useMemo(() => {
    const map = new Map<string, ResortSummary[]>()
    for (const r of catalog) {
      if (!map.has(r.category)) map.set(r.category, [])
      map.get(r.category)!.push(r)
    }
    return map
  }, [catalog])

  // ─── Search submit
  async function doSearch(e?: React.FormEvent) {
    e?.preventDefault()
    setSearchError('')

    if (!/^\d{4}-\d{2}-\d{2}$/.test(watch.checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(watch.checkOut)) {
      setSearchError('Pick check-in and check-out dates first.')
      return
    }
    if (watch.checkIn >= watch.checkOut) {
      setSearchError('Check-out must be after check-in.')
      return
    }
    setSearching(true)
    try {
      const res = await fetch('/api/disney/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkIn: watch.checkIn,
          checkOut: watch.checkOut,
          adults: watch.adults,
          children: watch.children,
          flResident: watch.flResident,
          postalCode: watch.postalCode,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as AvailabilityResponse
      if (!data.ok) {
        setSearchError(typeof data.error === 'string' ? data.error : 'Search failed')
        setOffers(null)
        return
      }
      setOffers(data.offers ?? [])
      setMarketingOffers(data.marketingOffers ?? {})
    } catch {
      setSearchError('Network error — try again.')
    } finally {
      setSearching(false)
    }
  }

  // ─── Filter results to the user's selected resorts (or show all if none picked)
  const filteredOffers = useMemo(() => {
    if (!offers) return null
    const subset = watch.resortIds.length > 0
      ? offers.filter((o) => watch.resortIds.includes(o.resortId))
      : offers
    // Sort: deals first (best savings), then unavailable last
    return [...subset].sort((a, b) => {
      if (a.unavailable && !b.unavailable) return 1
      if (!a.unavailable && b.unavailable) return -1
      return (b.savings ?? 0) - (a.savings ?? 0)
    })
  }, [offers, watch.resortIds])

  const resortNameById = useMemo(() => {
    const m = new Map<string, ResortSummary>()
    for (const r of catalog) m.set(r.id, r)
    return m
  }, [catalog])

  const selectedCount = watch.resortIds.length

  return (
    <div className="space-y-6">
      {/* ─── Filters ─── */}
      <form onSubmit={doSearch} className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        {/* Resort selector */}
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-display text-[10px] tracking-[0.3em] text-orange-300">
              ▌ HOTELS{' '}
              <span className="text-white/40">
                ({selectedCount === 0 ? 'all' : `${selectedCount} selected`})
              </span>
            </p>
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={() => updateWatch({ resortIds: [] })}
                className="text-[10px] uppercase tracking-widest text-white/45 hover:text-orange-300"
              >
                clear
              </button>
            )}
          </div>
          {catalogLoading && (
            <p className="mt-2 text-xs text-white/55">Loading Disney resorts…</p>
          )}
          {catalogError && (
            <p className="mt-2 text-xs text-red-300">▲ {catalogError}</p>
          )}
          {!catalogLoading && !catalogError && (
            <div className="mt-2 space-y-3">
              {TIERS.map((tier) => {
                const list = byTier.get(tier) ?? []
                if (list.length === 0) return null
                const allSelected = list.every((r) => watch.resortIds.includes(r.id))
                return (
                  <div key={tier}>
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <p className="font-display text-[10px] uppercase tracking-widest text-white/55">
                        {tier} ({list.length})
                      </p>
                      <button
                        type="button"
                        onClick={() => selectAllInTier(tier)}
                        className="text-[10px] uppercase tracking-widest text-orange-300/70 hover:text-orange-200"
                      >
                        {allSelected ? '× clear tier' : '+ all in tier'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {list.map((r) => {
                        const active = watch.resortIds.includes(r.id)
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => toggleResort(r.id)}
                            className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                              active
                                ? 'border-orange-400 bg-orange-500/15 text-orange-100'
                                : 'border-white/10 bg-black/30 text-white/65 hover:border-white/30'
                            }`}
                          >
                            {r.name.replace(/^Disney's /, '')}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Dates + party */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label htmlFor="d-in" className="font-display text-[10px] tracking-[0.3em] text-orange-300">
              ▌ CHECK-IN
            </label>
            <input
              id="d-in"
              type="date"
              value={watch.checkIn}
              onChange={(e) => updateWatch({ checkIn: e.target.value })}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400 [color-scheme:dark]"
            />
          </div>
          <div>
            <label htmlFor="d-out" className="font-display text-[10px] tracking-[0.3em] text-orange-300">
              ▌ CHECK-OUT
            </label>
            <input
              id="d-out"
              type="date"
              value={watch.checkOut}
              min={watch.checkIn || undefined}
              onChange={(e) => updateWatch({ checkOut: e.target.value })}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400 [color-scheme:dark]"
            />
          </div>
          <div>
            <label htmlFor="d-adults" className="font-display text-[10px] tracking-[0.3em] text-orange-300">
              ▌ ADULTS
            </label>
            <input
              id="d-adults"
              type="number"
              min={1}
              max={10}
              value={watch.adults}
              onChange={(e) => updateWatch({ adults: Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 2)) })}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
            />
          </div>
          <div>
            <label htmlFor="d-children" className="font-display text-[10px] tracking-[0.3em] text-orange-300">
              ▌ CHILDREN
            </label>
            <input
              id="d-children"
              type="number"
              min={0}
              max={10}
              value={watch.children}
              onChange={(e) => updateWatch({ children: Math.max(0, Math.min(10, parseInt(e.target.value, 10) || 0)) })}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
            />
          </div>
        </div>

        {/* FL resident + postal */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-orange-400/40 bg-orange-500/5 px-4 py-3 text-sm text-orange-100 hover:border-orange-400">
            <input
              type="checkbox"
              checked={watch.flResident}
              onChange={(e) => updateWatch({ flResident: e.target.checked })}
              className="h-5 w-5 accent-orange-500"
            />
            <span>
              ✦ Florida Resident rates
              <span className="ml-2 text-[11px] text-white/50">(no Disney login needed)</span>
            </span>
          </label>
          {watch.flResident && (
            <div className="flex-1 sm:max-w-[180px]">
              <label htmlFor="d-zip" className="font-display text-[10px] tracking-[0.3em] text-orange-300">
                ▌ FL ZIP
              </label>
              <input
                id="d-zip"
                type="text"
                inputMode="numeric"
                pattern="\d{5}"
                maxLength={5}
                value={watch.postalCode}
                onChange={(e) => updateWatch({ postalCode: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
              />
            </div>
          )}
        </div>

        {/* Max-price threshold (for alerts) */}
        <div>
          <label htmlFor="d-max" className="font-display text-[10px] tracking-[0.3em] text-orange-300">
            ▌ ALERT WHEN UNDER (per night, optional)
          </label>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-lg text-white/55">$</span>
            <input
              id="d-max"
              type="number"
              min={50}
              max={2000}
              step={10}
              placeholder="e.g. 150"
              value={watch.maxPrice ?? ''}
              onChange={(e) => {
                const v = e.target.value === '' ? null : parseInt(e.target.value, 10)
                updateWatch({ maxPrice: Number.isFinite(v) ? v : null })
              }}
              className="w-32 rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
            />
            <span className="text-xs text-white/45">
              Per-night threshold for the daily email digest.
            </span>
          </div>
        </div>

        {searchError && (
          <p className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
            ▲ {searchError}
          </p>
        )}

        <button
          type="submit"
          disabled={searching}
          className="w-full rounded-xl bg-orange-500 px-6 py-3 font-display text-base tracking-[0.25em] text-black hover:bg-orange-400 disabled:opacity-50"
        >
          {searching ? 'CHECKING DISNEY…' : '🔍 PREVIEW RATES'}
        </button>
      </form>

      {/* ─── Results ─── */}
      {filteredOffers && filteredOffers.length === 0 && (
        <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-white/55">
          No matching offers for your selection.
        </p>
      )}

      {filteredOffers && filteredOffers.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-white/75">
              <strong className="text-white">{filteredOffers.filter((o) => !o.unavailable).length}</strong>{' '}
              available · {filteredOffers.filter((o) => o.unavailable).length} unavailable
            </p>
            <p className="text-[11px] uppercase tracking-widest text-emerald-300/85">
              ✓ via Disney API · live rates
            </p>
          </div>

          {/* Active marketing offers banner */}
          {Object.values(marketingOffers).filter((o) => o.category === 'specialOffer').length > 0 && (
            <div className="rounded-xl border border-orange-400/40 bg-orange-500/10 p-3 text-sm text-orange-100">
              <p className="font-display text-[10px] tracking-[0.3em] text-orange-300">▌ ACTIVE OFFERS</p>
              <ul className="mt-1 list-disc pl-5">
                {Object.values(marketingOffers)
                  .filter((o) => o.category === 'specialOffer')
                  .map((o) => (
                    <li key={o.name}>{o.name}</li>
                  ))}
              </ul>
            </div>
          )}

          <ul className="space-y-2">
            {filteredOffers.map((o) => {
              const resort = resortNameById.get(o.resortId)
              return (
                <OfferCard key={o.resortId} offer={o} resort={resort} maxPrice={watch.maxPrice} />
              )
            })}
          </ul>
        </div>
      )}

      {!filteredOffers && !searching && (
        <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-white/50">
          Pick dates and hit <strong className="text-orange-300">PREVIEW RATES</strong> to see live Disney prices,
          including your Florida Resident discount.
        </p>
      )}
    </div>
  )
}

function OfferCard({
  offer,
  resort,
  maxPrice,
}: {
  offer: Offer
  resort?: ResortSummary
  maxPrice: number | null
}) {
  if (offer.unavailable) {
    return (
      <li className="rounded-xl border border-white/10 bg-white/[0.02] p-3 opacity-60">
        <p className="font-display text-base text-white/75">
          {resort?.name ?? `Resort ${offer.resortId}`}
        </p>
        <p className="mt-1 text-xs text-white/50">
          {offer.unavailable.replace(/_/g, ' ').toLowerCase()}
        </p>
      </li>
    )
  }
  const underThreshold = maxPrice != null && offer.basePrice <= maxPrice
  return (
    <li
      className={`overflow-hidden rounded-xl border bg-white/[0.03] p-3 ${
        underThreshold
          ? 'border-emerald-400/60 shadow-[0_0_12px_-4px_rgba(52,211,153,0.6)]'
          : 'border-white/10'
      }`}
    >
      <div className="flex items-start gap-3">
        {resort?.image && (
          <img
            src={resort.image}
            alt=""
            loading="lazy"
            className="hidden h-16 w-24 shrink-0 rounded-md object-cover sm:block"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base text-white">
            {resort?.name ?? `Resort ${offer.resortId}`}
            {underThreshold && (
              <span className="ml-2 rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-emerald-200">
                ✓ under threshold
              </span>
            )}
          </p>
          {resort?.category && (
            <p className="text-[10px] uppercase tracking-widest text-orange-300/80">
              {resort.category}
            </p>
          )}
          {offer.offerName && (
            <p className="mt-1 text-xs text-orange-200">★ {offer.offerName}</p>
          )}
          {offer.packageName && offer.packageName !== offer.offerName && (
            <p className="text-[11px] text-white/50">{offer.packageName}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-2xl leading-none text-white">
            ${Math.round(offer.basePrice)}
            <span className="ml-0.5 text-xs text-white/55">/nt</span>
          </p>
          {offer.sidePrice && offer.sidePrice > offer.basePrice && (
            <p className="text-xs text-white/45">
              <span className="line-through">${Math.round(offer.sidePrice)}</span>
              {offer.savings != null && offer.savings > 0 && (
                <span className="ml-1 text-emerald-300">
                  save ${Math.round(offer.savings)}
                </span>
              )}
            </p>
          )}
          {resort?.url && (
            <a
              href={resort.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block rounded-md border border-orange-400/60 bg-orange-500/10 px-2 py-1 text-[10px] uppercase tracking-widest text-orange-100 hover:bg-orange-500/20"
            >
              ↗ Book
            </a>
          )}
        </div>
      </div>
    </li>
  )
}
