'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  RECIPES_EVENT,
  deleteRecipe,
  loadRecipes,
  updateRecipe,
  type SavedRecipe,
} from '../_lib/recipes'
import { transformIngredient, type System } from '../_lib/units'

type SortKey = 'recent' | 'stars' | 'name'

export default function MyRecipes() {
  const [recipes, setRecipes] = useState<SavedRecipe[]>([])
  const [query, setQuery] = useState('')
  const [minStars, setMinStars] = useState(0)
  const [sort, setSort] = useState<SortKey>('recent')
  const [openId, setOpenId] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [system, setSystem] = useState<System>('as-written')
  const [tagDraft, setTagDraft] = useState('')

  // Hydrate from localStorage and refresh whenever another component
  // saves/deletes/updates a recipe (via the RECIPES_EVENT we dispatch).
  useEffect(() => {
    const hydrate = () => setRecipes(loadRecipes())
    hydrate()
    window.addEventListener(RECIPES_EVENT, hydrate)
    return () => window.removeEventListener(RECIPES_EVENT, hydrate)
  }, [])

  // Helper used when toggling a recipe open so we don't carry state
  // (e.g. 4× scale) into the next opened recipe.
  function openRecipe(id: string | null) {
    setOpenId(id)
    setScale(1)
    setSystem('as-written')
    setTagDraft('')
  }

  const allTags = useMemo(() => {
    const s = new Set<string>()
    for (const r of recipes) for (const t of r.tags) s.add(t)
    return [...s].sort()
  }, [recipes])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = recipes.filter((r) => {
      if (r.stars < minStars) return false
      if (!q) return true
      if (r.name.toLowerCase().includes(q)) return true
      if (r.tags.some((t) => t.toLowerCase().includes(q))) return true
      if (r.ingredients.some((line) => line.toLowerCase().includes(q))) return true
      return false
    })
    if (sort === 'stars') {
      filtered.sort((a, b) => b.stars - a.stars || b.savedAt - a.savedAt)
    } else if (sort === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name))
    } else {
      filtered.sort((a, b) => b.savedAt - a.savedAt)
    }
    return filtered
  }, [recipes, query, minStars, sort])

  const open = openId ? recipes.find((r) => r.id === openId) ?? null : null

  function setStars(id: string, stars: number) {
    updateRecipe(id, { stars: Math.min(10, Math.max(0, stars)) })
  }

  function setNote(id: string, note: string) {
    updateRecipe(id, { note })
  }

  function addTag(id: string, tag: string) {
    const t = tag.trim()
    if (!t) return
    const recipe = recipes.find((r) => r.id === id)
    if (!recipe) return
    if (recipe.tags.includes(t)) return
    updateRecipe(id, { tags: [...recipe.tags, t] })
    setTagDraft('')
  }

  function removeTag(id: string, tag: string) {
    const recipe = recipes.find((r) => r.id === id)
    if (!recipe) return
    updateRecipe(id, { tags: recipe.tags.filter((t) => t !== tag) })
  }

  if (recipes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-white/55">
        Nothing saved yet. Parse a recipe above (URL or paste), or expand a
        result in the fridge section — both have a <span className="text-red-300">★ SAVE</span> button.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-2 rounded-2xl border border-white/10 bg-black/30 p-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, ingredient, or tag…"
          className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-red-400"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <p className="font-display text-[10px] tracking-[0.3em] text-red-300">
              ▌ MIN STARS
            </p>
            <div className="mt-1 grid grid-cols-6 gap-1 sm:grid-cols-11">
              {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMinStars(n)}
                  className={`rounded-md py-1.5 font-mono text-xs transition ${
                    minStars === n
                      ? 'bg-red-500/20 text-red-100'
                      : 'bg-black/40 text-white/55 hover:bg-white/10'
                  }`}
                >
                  {n === 0 ? 'any' : `${n}+`}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="font-display text-[10px] tracking-[0.3em] text-red-300">
              ▌ SORT
            </p>
            <div className="mt-1 grid grid-cols-3 gap-1">
              {(
                [
                  ['recent', 'Recent'],
                  ['stars', 'Stars'],
                  ['name', 'A–Z'],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSort(k)}
                  className={`rounded-md py-1.5 font-display text-xs tracking-[0.2em] transition ${
                    sort === k
                      ? 'bg-red-500/20 text-red-100'
                      : 'bg-black/40 text-white/55 hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setQuery(t)}
                className="rounded-full border border-white/15 bg-black/40 px-2.5 py-0.5 text-[11px] text-white/70 hover:border-red-400 hover:text-red-200"
              >
                #{t}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-white/55">
        {filtered.length} of {recipes.length} saved
      </p>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-white/45">
          No saved recipes match. Try clearing filters.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => {
            const isOpen = open?.id === r.id
            return (
              <li
                key={r.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
              >
                <button
                  type="button"
                  onClick={() => openRecipe(isOpen ? null : r.id)}
                  className="flex w-full items-center gap-3 p-3 text-left hover:bg-white/[0.04]"
                >
                  {r.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.image}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded-lg object-cover"
                      loading="lazy"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base text-white">
                      {r.name}
                    </p>
                    <p className="text-[11px] text-white/45">
                      {r.source === 'url' && 'From URL'}
                      {r.source === 'pasted' && 'Pasted text'}
                      {r.source === 'mealdb' && 'TheMealDB'}
                      {r.ingredients.length > 0 &&
                        ` · ${r.ingredients.length} ingredients`}
                    </p>
                    {r.tags.length > 0 && (
                      <p className="mt-0.5 truncate text-[11px] text-red-300/80">
                        {r.tags.map((t) => `#${t}`).join(' ')}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="font-display text-base text-yellow-300">
                      {r.stars > 0 ? `★ ${r.stars}` : '—'}
                    </span>
                    <span className="ml-2 font-display text-[10px] tracking-[0.25em] text-red-300">
                      {isOpen ? 'HIDE' : 'OPEN'}
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-white/10 bg-black/30 p-3 sm:p-4">
                    {/* Stars editor */}
                    <p className="font-display text-[10px] tracking-[0.3em] text-red-300">
                      ▌ RATING
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-1">
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <button
                          key={n}
                          type="button"
                          aria-label={`${n} stars`}
                          onClick={() => setStars(r.id, r.stars === n ? n - 1 : n)}
                          className={`flex h-9 w-9 items-center justify-center text-xl ${
                            n <= r.stars
                              ? 'text-yellow-300'
                              : 'text-white/20 hover:text-white/50'
                          }`}
                        >
                          {n <= r.stars ? '★' : '☆'}
                        </button>
                      ))}
                      <span className="ml-1 w-10 text-right font-display text-sm text-white/70">
                        {r.stars}/10
                      </span>
                    </div>

                    {/* Note */}
                    <p className="mt-3 font-display text-[10px] tracking-[0.3em] text-red-300">
                      ▌ NOTE
                    </p>
                    <textarea
                      value={r.note ?? ''}
                      onChange={(e) => setNote(r.id, e.target.value)}
                      placeholder="What did you tweak? When did you last make it?"
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-red-400"
                    />

                    {/* Tags */}
                    <p className="mt-3 font-display text-[10px] tracking-[0.3em] text-red-300">
                      ▌ TAGS
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {r.tags.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1.5 rounded-full border border-red-400/60 bg-red-500/10 px-2.5 py-0.5 text-xs text-red-100"
                        >
                          #{t}
                          <button
                            type="button"
                            onClick={() => removeTag(r.id, t)}
                            aria-label={`Remove tag ${t}`}
                            className="text-red-300/70 hover:text-red-100"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          addTag(r.id, tagDraft)
                        }}
                        className="flex items-center gap-1"
                      >
                        <input
                          type="text"
                          value={tagDraft}
                          onChange={(e) => setTagDraft(e.target.value)}
                          placeholder="add tag…"
                          className="w-24 rounded-full border border-white/15 bg-black/40 px-2.5 py-0.5 text-xs text-white outline-none placeholder:text-white/35 focus:border-red-400"
                        />
                      </form>
                    </div>

                    {/* Scale + units */}
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl border border-white/10 bg-black/40 p-2.5">
                        <p className="font-display text-[10px] tracking-[0.3em] text-red-300">
                          ▌ SCALE
                          {r.yield && (
                            <span className="ml-2 text-white/40">base: {r.yield}</span>
                          )}
                        </p>
                        <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                          {[1, 2, 3, 4].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setScale(n)}
                              className={`rounded-md border py-2 font-display text-base tracking-widest transition ${
                                scale === n
                                  ? 'border-red-400 bg-red-500/20 text-red-100'
                                  : 'border-white/15 bg-black/30 text-white/70 hover:border-white/30'
                              }`}
                            >
                              {n}×
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/40 p-2.5">
                        <p className="font-display text-[10px] tracking-[0.3em] text-red-300">
                          ▌ UNITS
                        </p>
                        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                          {[
                            { v: 'as-written' as System, label: 'AS-IS' },
                            { v: 'metric' as System, label: 'g·ml' },
                            { v: 'imperial' as System, label: 'oz·cup' },
                          ].map((opt) => (
                            <button
                              key={opt.v}
                              type="button"
                              onClick={() => setSystem(opt.v)}
                              className={`rounded-md border py-2 font-display text-[11px] tracking-widest transition ${
                                system === opt.v
                                  ? 'border-red-400 bg-red-500/20 text-red-100'
                                  : 'border-white/15 bg-black/30 text-white/70 hover:border-white/30'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Ingredients */}
                    <p className="mt-4 font-display text-[10px] tracking-[0.3em] text-red-300">
                      ▌ INGREDIENTS ({r.ingredients.length})
                    </p>
                    <ul className="mt-1 space-y-1">
                      {r.ingredients.map((line, i) => (
                        <li
                          key={i}
                          className="rounded-md border border-white/5 bg-black/30 px-3 py-1.5 text-sm text-white/85"
                        >
                          · {transformIngredient(line, scale, system)}
                        </li>
                      ))}
                    </ul>

                    {/* Instructions */}
                    {r.instructions.length > 0 && (
                      <>
                        <p className="mt-4 font-display text-[10px] tracking-[0.3em] text-red-300">
                          ▌ STEPS ({r.instructions.length})
                        </p>
                        <ol className="mt-1 space-y-1">
                          {r.instructions.map((step, i) => (
                            <li
                              key={i}
                              className="flex gap-2 rounded-md border border-white/5 bg-black/30 px-3 py-1.5 text-sm text-white/85"
                            >
                              <span className="shrink-0 font-display text-red-300">
                                {String(i + 1).padStart(2, '0')}
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      </>
                    )}

                    {/* Footer actions */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {r.sourceUrl && r.source !== 'mealdb' && (
                        <a
                          href={r.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:border-red-400 hover:text-red-200"
                        >
                          Source ↗
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== 'undefined' &&
                              confirm(`Delete "${r.name}"?`)) {
                            deleteRecipe(r.id)
                            openRecipe(null)
                          }
                        }}
                        className="ml-auto rounded-md border border-white/15 px-3 py-1.5 text-xs text-white/60 hover:border-red-400 hover:text-red-300"
                      >
                        DELETE
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
