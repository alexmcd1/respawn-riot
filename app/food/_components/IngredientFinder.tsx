'use client'

import { useState } from 'react'
import SaveRecipeButton from './SaveRecipeButton'

// Top 30 most-common ingredients across home cooking, grouped so the
// picker reads at a glance. Strings are display names; we lowercase +
// underscore-ify when querying TheMealDB's filter endpoint.
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

type MealLite = { idMeal: string; strMeal: string; strMealThumb: string }
type RankedMeal = MealLite & { matched: string[]; matchCount: number }
type MealFull = MealLite & {
  strInstructions?: string | null
  strSource?: string | null
  strYoutube?: string | null
  strArea?: string | null
  strCategory?: string | null
  // strIngredient1..20 + strMeasure1..20
  [key: string]: string | null | undefined
}

function toSlug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '_')
}

async function fetchMealsByIngredient(name: string): Promise<MealLite[]> {
  const slug = toSlug(name)
  const url = `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(slug)}`
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data?.meals) ? (data.meals as MealLite[]) : []
  } catch {
    return []
  }
}

async function fetchMealById(id: string): Promise<MealFull | null> {
  try {
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`)
    if (!res.ok) return null
    const data = await res.json()
    const meal = Array.isArray(data?.meals) ? (data.meals[0] as MealFull) : null
    return meal ?? null
  } catch {
    return null
  }
}

// Pull "1 cup" + "flour" pairs from the goofy strIngredient1..20 / strMeasure1..20 shape
function extractIngredients(meal: MealFull): string[] {
  const out: string[] = []
  for (let i = 1; i <= 20; i++) {
    const name = (meal[`strIngredient${i}`] ?? '').toString().trim()
    const measure = (meal[`strMeasure${i}`] ?? '').toString().trim()
    if (!name) continue
    out.push(measure ? `${measure} ${name}` : name)
  }
  return out
}

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
  const [results, setResults] = useState<RankedMeal[] | null>(null)
  const [totalSearched, setTotalSearched] = useState(0)
  const [totalExcluded, setTotalExcluded] = useState(0)
  const [expanded, setExpanded] = useState<Record<string, MealFull | 'loading' | null>>({})

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
      // Fetch in parallel: include lists for ranking + exclude lists for filtering
      const [includeLists, excludeLists] = await Promise.all([
        Promise.all(include.map((n) => fetchMealsByIngredient(n))),
        Promise.all(exclude.map((n) => fetchMealsByIngredient(n))),
      ])

      // Rank by match count across include lists
      const ranked = new Map<string, RankedMeal>()
      includeLists.forEach((list, i) => {
        const ingredientName = include[i]
        for (const m of list) {
          const existing = ranked.get(m.idMeal)
          if (existing) {
            if (!existing.matched.includes(ingredientName)) {
              existing.matched.push(ingredientName)
              existing.matchCount = existing.matched.length
            }
          } else {
            ranked.set(m.idMeal, { ...m, matched: [ingredientName], matchCount: 1 })
          }
        }
      })

      // Build exclude set of meal IDs to filter out
      const blockedIds = new Set<string>()
      for (const list of excludeLists) {
        for (const m of list) blockedIds.add(m.idMeal)
      }
      for (const id of blockedIds) ranked.delete(id)

      const sorted = [...ranked.values()].sort((a, b) => {
        if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount
        return a.strMeal.localeCompare(b.strMeal)
      })
      setResults(sorted.slice(0, 18))
    } finally {
      setLoading(false)
    }
  }

  async function expandResult(meal: MealLite) {
    setExpanded((prev) => {
      // Collapse if already open
      if (prev[meal.idMeal] && prev[meal.idMeal] !== 'loading') {
        const next = { ...prev }
        next[meal.idMeal] = null
        return next
      }
      return { ...prev, [meal.idMeal]: 'loading' }
    })
    const full = await fetchMealById(meal.idMeal)
    setExpanded((prev) => ({ ...prev, [meal.idMeal]: full }))
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
        {/* Quick-pick from same common list */}
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
                  {' — via TheMealDB'}
                </p>
                {results[0]?.matchCount < totalSearched && (
                  <p className="text-[11px] text-amber-300/80">
                    No recipe has ALL {totalSearched} — showing best matches.
                  </p>
                )}
              </div>

              {/* Sparse-result Google link — shown when we got SOME results
                  but not great coverage (TheMealDB has ~300 recipes total) */}
              {results.length < 4 && (
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
                  const ex = expanded[meal.idMeal]
                  const isLoading = ex === 'loading'
                  const isOpen = ex && ex !== 'loading'
                  const perfect = meal.matchCount === totalSearched
                  return (
                    <li
                      key={meal.idMeal}
                      className={`overflow-hidden rounded-2xl border bg-white/[0.03] ${
                        perfect ? 'border-emerald-400/50' : 'border-white/10'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => expandResult(meal)}
                        className="block w-full text-left"
                      >
                        <div className="relative aspect-video w-full overflow-hidden bg-black">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={meal.strMealThumb}
                            alt={meal.strMeal}
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
                            {meal.matchCount}/{totalSearched}
                          </span>
                        </div>
                        <div className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display text-sm tracking-wide text-white">
                              {meal.strMeal}
                            </span>
                            <span className="font-display text-[10px] tracking-[0.25em] text-red-300">
                              {isOpen ? 'HIDE' : isLoading ? '…' : 'VIEW'}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] leading-snug text-white/55">
                            Has: {meal.matched.join(', ')}
                          </p>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="border-t border-white/10 bg-black/30 p-3">
                          {(ex.strCategory || ex.strArea) && (
                            <p className="mb-2 text-xs uppercase tracking-widest text-red-300/80">
                              {[ex.strArea, ex.strCategory].filter(Boolean).join(' · ')}
                            </p>
                          )}
                          <p className="font-display text-[10px] tracking-[0.3em] text-red-300">
                            INGREDIENTS
                          </p>
                          <ul className="mt-1 space-y-1 text-sm text-white/85">
                            {extractIngredients(ex).map((line, i) => (
                              <li key={i}>· {line}</li>
                            ))}
                          </ul>
                          {ex.strInstructions && (
                            <>
                              <p className="mt-3 font-display text-[10px] tracking-[0.3em] text-red-300">
                                STEPS
                              </p>
                              <p className="mt-1 whitespace-pre-line text-sm leading-6 text-white/80">
                                {ex.strInstructions}
                              </p>
                            </>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            {ex.strSource && (
                              <a
                                href={ex.strSource}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-md border border-white/15 px-3 py-1.5 text-white/80 hover:border-red-400 hover:text-red-200"
                              >
                                Source ↗
                              </a>
                            )}
                            {ex.strYoutube && (
                              <a
                                href={ex.strYoutube}
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
                              name={ex.strMeal}
                              source="mealdb"
                              sourceUrl={`mealdb:${ex.idMeal}`}
                              image={ex.strMealThumb}
                              ingredients={extractIngredients(ex)}
                              instructions={
                                ex.strInstructions
                                  ? ex.strInstructions
                                      .split(/\r?\n+/)
                                      .map((s) => s.trim())
                                      .filter(Boolean)
                                  : []
                              }
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
