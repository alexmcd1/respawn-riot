'use client'

import { useState } from 'react'

// Top 30 most-common ingredients across home cooking.
// Strings are display names; we lowercase + underscore-ify when
// querying TheMealDB's filter endpoint.
const COMMON_INGREDIENTS = [
  'Salt', 'Pepper', 'Sugar', 'Flour', 'Butter', 'Olive Oil',
  'Milk', 'Eggs', 'Garlic', 'Onion', 'Lemon', 'Vinegar',
  'Tomato', 'Potato', 'Carrot', 'Bell Pepper', 'Spinach', 'Lettuce',
  'Cheese', 'Yogurt', 'Bread', 'Pasta', 'Rice', 'Beans',
  'Chicken', 'Beef', 'Pork', 'Fish', 'Bacon', 'Mushroom',
]

const MAX_INGREDIENTS = 8 // we rank by match-count now, so more is fine

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
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [customInput, setCustomInput] = useState('')
  const [customExtras, setCustomExtras] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<RankedMeal[] | null>(null)
  const [totalSearched, setTotalSearched] = useState(0)
  const [expanded, setExpanded] = useState<Record<string, MealFull | 'loading' | null>>({})

  const total = selected.size + customExtras.length

  function toggle(name: string) {
    setSelected((prev) => {
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

  function clearAll() {
    setSelected(new Set())
    setCustomExtras([])
    setResults(null)
    setExpanded({})
    setError('')
  }

  async function findRecipes() {
    setError('')
    setExpanded({})
    const all = [...selected, ...customExtras]
    if (all.length === 0) {
      setError('Pick at least one ingredient')
      return
    }
    if (all.length > MAX_INGREDIENTS) {
      setError(`Try ${MAX_INGREDIENTS} or fewer at a time`)
      return
    }
    setLoading(true)
    setTotalSearched(all.length)
    try {
      // Fetch matching meals for each ingredient, then RANK by how many
      // selected ingredients each meal contains. (Was strict-intersection,
      // which returned almost nothing once you picked >2 ingredients since
      // TheMealDB has a small catalog.)
      const lists = await Promise.all(all.map((n) => fetchMealsByIngredient(n)))
      const ranked = new Map<string, RankedMeal>()
      lists.forEach((list, i) => {
        const ingredientName = all[i]
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
      const sorted = [...ranked.values()].sort((a, b) => {
        // Most matches first, ties broken by name for stability
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
      {/* Common ingredients */}
      <div>
        <div className="flex items-end justify-between">
          <p className="font-display text-[10px] tracking-[0.3em] text-red-300">
            ▌ COMMON ({selected.size} picked)
          </p>
          {total > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="font-display text-[10px] tracking-[0.25em] text-white/40 hover:text-white/70"
            >
              CLEAR ALL
            </button>
          )}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          {COMMON_INGREDIENTS.map((name) => {
            const picked = selected.has(name)
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggle(name)}
                aria-pressed={picked}
                className={`rounded-lg border px-2 py-2 text-sm transition ${
                  picked
                    ? 'border-red-400 bg-red-500/15 text-red-100'
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

      {/* Custom */}
      <div>
        <p className="font-display text-[10px] tracking-[0.3em] text-red-300">
          ▌ ADD YOUR OWN
        </p>
        <form onSubmit={addCustom} className="mt-2 flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="e.g. Tofu, Kimchi, Quinoa…"
            className="flex-1 rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-red-400"
          />
          <button
            type="submit"
            className="rounded-xl border border-red-400/60 px-4 py-2.5 font-display text-sm tracking-[0.2em] text-red-200 hover:bg-red-500/10"
          >
            + ADD
          </button>
        </form>
        {customExtras.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {customExtras.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-400/60 bg-red-500/10 px-3 py-1 text-sm text-red-100"
              >
                {name}
                <button
                  type="button"
                  onClick={() => removeCustom(name)}
                  aria-label={`Remove ${name}`}
                  className="text-red-300/70 hover:text-red-100"
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
        disabled={loading || total === 0}
        className="w-full rounded-xl bg-red-500 px-6 py-3 font-display text-base tracking-[0.25em] text-white transition hover:bg-red-400 disabled:opacity-50"
      >
        {loading ? 'SEARCHING…' : `🥘 FIND RECIPES (${total})`}
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
              No recipes match any of those ingredients in TheMealDB.
              <a
                href={`https://www.google.com/search?q=recipes+with+${encodeURIComponent(
                  [...selected, ...customExtras].join(' ')
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block text-red-300 hover:underline"
              >
                Search Google for ideas ↗
              </a>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <p className="text-xs text-white/55">
                  {results.length} recipe{results.length === 1 ? '' : 's'} ranked by ingredient match — via TheMealDB.
                </p>
                {results[0]?.matchCount < totalSearched && (
                  <p className="text-[11px] text-amber-300/80">
                    No recipe has ALL {totalSearched} — showing best matches.
                  </p>
                )}
              </div>
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
