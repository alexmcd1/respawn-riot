'use client'

import { useState } from 'react'
import SaveRecipeButton from './SaveRecipeButton'

// Top 30 most-common ingredients across home cooking, grouped so the
// picker reads at a glance. These names get sent to the server route
// which forwards to Spoonacular (primary) or TheMealDB (fallback).
const INGREDIENT_CATEGORIES: { label: string; emoji: string; items: string[] }[] = [
  {
    label: 'Pantry',
    emoji: '🧂',
    items: ['Salt', 'Pepper', 'Sugar', 'Flour', 'Olive Oil', 'Vinegar', 'Garlic'],
  },
  {
    label: 'Dairy + Eggs',
    emoji: '🥛',
    items: ['Butter', 'Milk', 'Eggs', 'Cheese', 'Yogurt'],
  },
  {
    label: 'Produce',
    emoji: '🥬',
    items: ['Onion', 'Lemon', 'Tomato', 'Potato', 'Carrot', 'Bell Pepper', 'Spinach', 'Lettuce', 'Mushroom'],
  },
  {
    label: 'Proteins',
    emoji: '🍗',
    items: ['Chicken', 'Beef', 'Pork', 'Fish', 'Bacon', 'Beans'],
  },
  {
    label: 'Carbs',
    emoji: '🍞',
    items: ['Bread', 'Pasta', 'Rice'],
  },
]

const MAX_INCLUDE = 10
const MAX_EXCLUDE = 6

// Server returns ids prefixed with "s/" (Spoonacular) or "m/" (TheMealDB).
type RecipeResult = {
  id: string
  title: string
  image?: string
  matched?: string[]
  matchCount?: number
  source: 'spoonacular' | 'mealdb'
  sourceUrl?: string
  summary?: string
  usedIngredientCount?: number
  missedIngredientCount?: number
}

type RecipeDetails = {
  id: string
  title: string
  image?: string
  ingredients: string[]
  instructions: string[]
  sourceUrl?: string
  videoUrl?: string
  area?: string
  category?: string
  source: 'spoonacular' | 'mealdb'
}

type SearchSource = 'spoonacular' | 'mealdb' | 'mealdb-fallback' | null

export default function IngredientFinder() {
  // INCLUDE list (what you have on hand)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [customInput, setCustomInput] = useState('')
  const [customExtras, setCustomExtras] = useState<string[]>([])

  // EXCLUDE list (things to filter OUT — allergens, dislikes, etc.)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [excludeInput, setExcludeInput] = useState('')
  const [excludeExtras, setExcludeExtras] = useState<string[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<RecipeResult[] | null>(null)
  const [totalSearched, setTotalSearched] = useState(0)
  const [totalExcluded, setTotalExcluded] = useState(0)
  const [searchSource, setSearchSource] = useState<SearchSource>(null)
  const [expanded, setExpanded] = useState<
    Record<string, RecipeDetails | 'loading' | null>
  >({})

  const totalInclude = selected.size + customExtras.length
  const totalExclude = excluded.size + excludeExtras.length

  function toggle(name: string) {
    // Toggling include also clears it from exclude (you can't have both)
    setExcluded((prev) => {
      if (!prev.has(name)) return prev
      const next = new Set(prev); next.delete(name); return next
    })
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function toggleExclude(name: string) {
    // Excluding also clears from include
    setSelected((prev) => {
      if (!prev.has(name)) return prev
      const next = new Set(prev); next.delete(name); return next
    })
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function addCustom(e: React.FormEvent) {
    e.preventDefault()
    const v = customInput.trim()
    if (!v) return
    if (customExtras.includes(v) || selected.has(v)) {
      setCustomInput('')
      return
    }
    setCustomExtras((p) => [...p, v])
    setCustomInput('')
  }

  function removeCustom(name: string) {
    setCustomExtras((p) => p.filter((x) => x !== name))
  }

  function addExcludeCustom(e: React.FormEvent) {
    e.preventDefault()
    const v = excludeInput.trim()
    if (!v) return
    if (excludeExtras.includes(v) || excluded.has(v)) {
      setExcludeInput('')
      return
    }
    setExcludeExtras((p) => [...p, v])
    setExcludeInput('')
  }

  function removeExcludeCustom(name: string) {
    setExcludeExtras((p) => p.filter((x) => x !== name))
  }

  function clearAll() {
    setSelected(new Set())
    setCustomExtras([])
    setExcluded(new Set())
    setExcludeExtras([])
    setResults(null)
    setExpanded({})
    setError('')
    setSearchSource(null)
  }

  async function findRecipes() {
    setError('')
    setExpanded({})
    const include = [...selected, ...customExtras]
    const exclude = [...excluded, ...excludeExtras]
    if (include.length === 0) {
      setError('Pick at least one ingredient you have')
      return
    }
    if (include.length > MAX_INCLUDE) {
      setError(`Cap is ${MAX_INCLUDE} include ingredients — narrow it down`)
      return
    }
    if (exclude.length > MAX_EXCLUDE) {
      setError(`Cap is ${MAX_EXCLUDE} exclude ingredients`)
      return
    }
    setLoading(true)
    setTotalSearched(include.length)
    setTotalExcluded(exclude.length)
    try {
      const res = await fetch('/api/find-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ include, exclude, limit: 18 }),
      })
      const data = await res.json().catch(() => ({} as Record<string, unknown>))
      if (!res.ok || data.ok !== true) {
        setError(typeof data.error === 'string' ? data.error : 'Search failed')
        setResults([])
        setSearchSource(null)
        return
      }
      setResults(Array.isArray(data.results) ? (data.results as RecipeResult[]) : [])
      setSearchSource((data.source as SearchSource) ?? null)
    } catch {
      setError('Network error — try again')
      setResults([])
      setSearchSource(null)
    } finally {
      setLoading(false)
    }
  }

  async function expandResult(meal: RecipeResult) {
    setExpanded((prev) => {
      // Collapse if already open
      if (prev[meal.id] && prev[meal.id] !== 'loading') {
        const next = { ...prev }
        next[meal.id] = null
        return next
      }
      return { ...prev, [meal.id]: 'loading' }
    })
    try {
      const res = await fetch('/api/recipe-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: meal.id }),
      })
      const data = await res.json().catch(() => ({} as Record<string, unknown>))
      if (!res.ok || data.ok !== true) {
        setExpanded((prev) => ({ ...prev, [meal.id]: null }))
        return
      }
      setExpanded((prev) => ({ ...prev, [meal.id]: data.recipe as RecipeDetails }))
    } catch {
      setExpanded((prev) => ({ ...prev, [meal.id]: null }))
    }
  }

  // Build a stable sourceUrl for SaveRecipeButton dedup. Prefer the
  // real recipe URL when Spoonacular has one (so re-saving from the
  // same blog post upserts cleanly); otherwise use a provider:id pseudo-URL.
  function saveSourceUrl(d: RecipeDetails): string {
    if (d.sourceUrl) return d.sourceUrl
    return `${d.source}:${d.id.replace(/^[sm]\//, '')}`
  }

  // Pick the right SaveRecipeButton source type. Spoonacular with a real
  // sourceUrl is treated as a "url" source for dedup; otherwise mealdb.
  function saveSourceType(d: RecipeDetails): 'url' | 'mealdb' {
    if (d.source === 'spoonacular' && d.sourceUrl) return 'url'
    return 'mealdb'
  }

  return (
    <div className="space-y-5">
      {/* ─── INCLUDE — what you have on hand, grouped by category */}
      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-display text-[10px] tracking-[0.3em] text-emerald-300">
              ▌ I HAVE ({totalInclude})
            </p>
            <p className="mt-0.5 text-[11px] text-white/45">
              Tap to add. Recipes with the most matches win.
            </p>
          </div>
          {(totalInclude + totalExclude) > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="font-display text-[10px] tracking-[0.25em] text-white/40 hover:text-white/70"
            >
              CLEAR ALL
            </button>
          )}
        </div>

        <div className="mt-3 space-y-3">
          {INGREDIENT_CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <p className="font-mono text-[11px] uppercase tracking-wider text-white/45">
                {cat.emoji} {cat.label}
              </p>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                {cat.items.map((name) => {
                  const picked = selected.has(name)
                  const blocked = excluded.has(name)
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggle(name)}
                      aria-pressed={picked}
                      className={`rounded-lg border px-2 py-2 text-sm transition ${
                        picked
                          ? 'border-emerald-400 bg-emerald-500/15 text-emerald-100'
                          : blocked
                          ? 'border-red-400/50 bg-red-500/10 text-red-200/60 line-through'
                          : 'border-white/10 bg-black/30 text-white/75 hover:border-white/30'
                      }`}
                    >
                      {picked && <span className="mr-1">✓</span>}
                      {name}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Custom include add */}
        <form onSubmit={addCustom} className="mt-4 flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Add your own — e.g. Tofu, Kimchi, Quinoa…"
            className="flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-emerald-400"
          />
          <button
            type="submit"
            className="rounded-lg border border-emerald-400/60 px-4 py-2.5 font-display text-sm tracking-[0.2em] text-emerald-200 hover:bg-emerald-500/10"
          >
            + ADD
          </button>
        </form>
        {customExtras.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {customExtras.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/60 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-100"
              >
                {name}
                <button
                  type="button"
                  onClick={() => removeCustom(name)}
                  aria-label={`Remove ${name}`}
                  className="text-emerald-300/70 hover:text-emerald-100"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ─── EXCLUDE — allergens, dislikes */}
      <div className="rounded-2xl border border-red-400/20 bg-red-500/5 p-3 sm:p-4">
        <p className="font-display text-[10px] tracking-[0.3em] text-red-300">
          ✕ AVOID ({totalExclude})
        </p>
        <p className="mt-0.5 text-[11px] text-white/45">
          Recipes containing any of these get filtered OUT. Good for allergens or things you don&apos;t want.
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1">
          {INGREDIENT_CATEGORIES.flatMap((c) => c.items).map((name) => {
            const blocked = excluded.has(name)
            const picked = selected.has(name)
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggleExclude(name)}
                aria-pressed={blocked}
                className={`rounded-full border px-2.5 py-0.5 text-xs transition ${
                  blocked
                    ? 'border-red-400 bg-red-500/20 text-red-100'
                    : picked
                    ? 'border-white/10 bg-black/30 text-white/30'
                    : 'border-white/10 bg-black/30 text-white/55 hover:border-red-400/50 hover:text-red-200'
                }`}
              >
                {blocked ? '✕ ' : ''}{name}
              </button>
            )
          })}
        </div>
        <form onSubmit={addExcludeCustom} className="mt-3 flex gap-2">
          <input
            type="text"
            value={excludeInput}
            onChange={(e) => setExcludeInput(e.target.value)}
            placeholder="Add to avoid — e.g. Peanuts, Cilantro, Shellfish…"
            className="flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-red-400"
          />
          <button
            type="submit"
            className="rounded-lg border border-red-400/60 px-4 py-2.5 font-display text-sm tracking-[0.2em] text-red-200 hover:bg-red-500/10"
          >
            + AVOID
          </button>
        </form>
        {excludeExtras.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {excludeExtras.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-400 bg-red-500/20 px-3 py-1 text-sm text-red-100"
              >
                ✕ {name}
                <button
                  type="button"
                  onClick={() => removeExcludeCustom(name)}
                  aria-label={`Stop avoiding ${name}`}
                  className="text-red-200/70 hover:text-red-100"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={findRecipes}
        disabled={loading || totalInclude === 0}
        className="w-full rounded-xl bg-red-500 px-6 py-3 font-display text-base tracking-[0.25em] text-white transition hover:bg-red-400 disabled:opacity-50"
      >
        {loading
          ? 'SEARCHING…'
          : `🥘 FIND RECIPES (${totalInclude}${totalExclude > 0 ? ` − ${totalExclude}` : ''})`}
      </button>

      {error && (
        <p className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
          ▲ {error}
        </p>
      )}

      {results !== null && (
        <div className="space-y-3">
          {results.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/65">
              <p>
                No recipes left after filtering.{' '}
                {totalExcluded > 0 && (
                  <span className="text-white/45">
                    {totalExcluded} avoid filter{totalExcluded === 1 ? '' : 's'} may be too strict.
                  </span>
                )}
              </p>
              <a
                href={`https://www.google.com/search?q=recipes+with+${encodeURIComponent(
                  [...selected, ...customExtras].join(' ')
                )}${totalExcluded > 0 ? '+without+' + encodeURIComponent([...excluded, ...excludeExtras].join(' ')) : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block rounded-lg border border-red-400/60 bg-red-500/10 px-4 py-2 text-sm text-red-200 hover:bg-red-500/20"
              >
                Search Google for ideas ↗
              </a>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <p className="text-xs text-white/55">
                  {results.length} recipe{results.length === 1 ? '' : 's'} ranked by match
                  {totalExcluded > 0 && ` · ${totalExcluded} avoided`}
                  {searchSource === 'spoonacular' && ' — via Spoonacular'}
                  {searchSource === 'mealdb' && ' — via TheMealDB'}
                  {searchSource === 'mealdb-fallback' && ' — via TheMealDB (fallback)'}
                </p>
                {results[0]?.matchCount !== undefined && results[0].matchCount < totalSearched && (
                  <p className="text-[11px] text-amber-300/80">
                    No recipe has ALL {totalSearched} — showing best matches.
                  </p>
                )}
              </div>

              {/* Sparse-result Google link — shown when fallback returned few results */}
              {searchSource !== 'spoonacular' && results.length < 4 && (
                <a
                  href={`https://www.google.com/search?q=recipes+with+${encodeURIComponent(
                    [...selected, ...customExtras].join(' ')
                  )}${totalExcluded > 0 ? '+without+' + encodeURIComponent([...excluded, ...excludeExtras].join(' ')) : ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center text-sm text-red-300 hover:bg-white/[0.05]"
                >
                  Only a few results in our catalog — search Google for more ↗
                </a>
              )}
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {results.map((meal) => {
                  const ex = expanded[meal.id]
                  const isLoading = ex === 'loading'
                  const isOpen = ex && ex !== 'loading'
                  const matchCount = meal.matchCount ?? 0
                  const perfect = matchCount === totalSearched && matchCount > 0
                  return (
                    <li
                      key={meal.id}
                      className={`overflow-hidden rounded-2xl border bg-white/[0.03] ${
                        perfect ? 'border-emerald-400/50' : 'border-white/10'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => expandResult(meal)}
                        className="block w-full text-left"
                      >
                        {meal.image && (
                          <div className="relative aspect-video w-full overflow-hidden bg-black">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={meal.image}
                              alt={meal.title}
                              loading="lazy"
                              className="h-full w-full object-cover opacity-90"
                            />
                            <span
                              className={`absolute right-2 top-2 rounded border px-2 py-0.5 font-display text-[10px] tracking-[0.2em] ${
                                perfect
                                  ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200'
                                  : 'border-red-400/50 bg-black/70 text-red-200'
                              }`}
                            >
                              {matchCount}/{totalSearched}
                            </span>
                          </div>
                        )}
                        <div className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display text-sm tracking-wide text-white">
                              {meal.title}
                            </span>
                            <span className="font-display text-[10px] tracking-[0.25em] text-red-300">
                              {isOpen ? 'HIDE' : isLoading ? '…' : 'VIEW'}
                            </span>
                          </div>
                          {meal.matched && meal.matched.length > 0 && (
                            <p className="mt-1 text-[11px] leading-snug text-white/55">
                              Has: {meal.matched.join(', ')}
                            </p>
                          )}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="border-t border-white/10 bg-black/30 p-3">
                          {(ex.category || ex.area) && (
                            <p className="mb-2 text-xs uppercase tracking-widest text-red-300/80">
                              {[ex.area, ex.category].filter(Boolean).join(' · ')}
                            </p>
                          )}
                          <p className="font-display text-[10px] tracking-[0.3em] text-red-300">
                            INGREDIENTS
                          </p>
                          {ex.ingredients.length === 0 ? (
                            <p className="mt-1 text-sm italic text-white/55">
                              {"Ingredient list wasn't included — open the source link."}
                            </p>
                          ) : (
                            <ul className="mt-1 space-y-1 text-sm text-white/85">
                              {ex.ingredients.map((line, i) => (
                                <li key={i}>· {line}</li>
                              ))}
                            </ul>
                          )}
                          {ex.instructions.length > 0 && (
                            <>
                              <p className="mt-3 font-display text-[10px] tracking-[0.3em] text-red-300">
                                STEPS
                              </p>
                              <ol className="mt-1 space-y-1 text-sm leading-6 text-white/85">
                                {ex.instructions.map((step, i) => (
                                  <li key={i} className="flex gap-2">
                                    <span className="shrink-0 font-display text-red-300">
                                      {String(i + 1).padStart(2, '0')}
                                    </span>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            {ex.sourceUrl && (
                              <a
                                href={ex.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-md border border-white/15 px-3 py-1.5 text-white/80 hover:border-red-400 hover:text-red-200"
                              >
                                Source ↗
                              </a>
                            )}
                            {ex.videoUrl && (
                              <a
                                href={ex.videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-md border border-white/15 px-3 py-1.5 text-white/80 hover:border-red-400 hover:text-red-200"
                              >
                                ▶ YouTube
                              </a>
                            )}
                          </div>

                          {/* Save to My Recipes */}
                          <div className="mt-3">
                            <SaveRecipeButton
                              name={ex.title}
                              source={saveSourceType(ex)}
                              sourceUrl={saveSourceUrl(ex)}
                              image={ex.image}
                              ingredients={ex.ingredients}
                              instructions={ex.instructions}
                            />
                          </div>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
