'use client'

import { useMemo, useState } from 'react'
import { transformIngredient, type System } from '../_lib/units'
import SaveRecipeButton from './SaveRecipeButton'

type ParsedRecipe = {
  name?: string
  image?: string
  yield?: string
  yieldNumber?: number
  ingredients: string[]
  instructions: string[]
  sourceUrl?: string
}

type Mode = 'url' | 'paste'

export default function RecipeParser() {
  const [mode, setMode] = useState<Mode>('url')
  const [url, setUrl] = useState('')
  const [pasted, setPasted] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [recipe, setRecipe] = useState<ParsedRecipe | null>(null)
  const [scale, setScale] = useState(1)
  const [system, setSystem] = useState<System>('as-written')

  async function loadFromUrl(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/parse-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!data.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not parse')
        setRecipe(null)
      } else {
        setRecipe(data.recipe)
        setScale(1)
      }
    } catch {
      setError('Network error — try again')
    } finally {
      setLoading(false)
    }
  }

  function parsePasted() {
    setError('')
    const text = pasted.trim()
    if (!text) {
      setError('Paste a recipe first')
      return
    }
    setRecipe(parsePastedRecipe(text))
    setScale(1)
  }

  // AI cleanup — calls /api/clean-recipe (Claude Haiku w/ tool use)
  // which handles the messy cases the heuristic chokes on (title lines,
  // section headers, footer metadata, prose between sections, etc.).
  // Falls back to the local heuristic on any failure so the button is
  // never a dead-end.
  async function aiCleanPasted() {
    setError('')
    const text = pasted.trim()
    if (!text) {
      setError('Paste a recipe first')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/clean-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json().catch(() => ({}))
      if (!data.ok) {
        // Show the AI's error message AND silently run the heuristic
        // so the user always lands on something usable. The error
        // surface tells them why AI didn't run; the recipe section
        // shows the best-effort heuristic result.
        setError(
          typeof data.error === 'string'
            ? `${data.error} Showing basic parse below.`
            : 'AI cleanup unavailable — showing basic parse below.'
        )
        setRecipe(parsePastedRecipe(text))
        setScale(1)
        return
      }
      setRecipe(data.recipe)
      setScale(1)
    } catch {
      setError('Network error — showing basic parse below.')
      setRecipe(parsePastedRecipe(text))
      setScale(1)
    } finally {
      setLoading(false)
    }
  }

  function clearAll() {
    setRecipe(null)
    setError('')
    setScale(1)
  }

  const scaledIngredients = useMemo(() => {
    if (!recipe) return []
    return recipe.ingredients.map((line) => transformIngredient(line, scale, system))
  }, [recipe, scale, system])

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`rounded-md border px-3 py-2 font-display text-sm tracking-[0.2em] uppercase transition ${
            mode === 'url'
              ? 'border-red-400 bg-red-500/10 text-red-200'
              : 'border-white/15 bg-black/30 text-white/60 hover:border-white/30 hover:text-white/90'
          }`}
        >
          From URL
        </button>
        <button
          type="button"
          onClick={() => setMode('paste')}
          className={`rounded-md border px-3 py-2 font-display text-sm tracking-[0.2em] uppercase transition ${
            mode === 'paste'
              ? 'border-red-400 bg-red-500/10 text-red-200'
              : 'border-white/15 bg-black/30 text-white/60 hover:border-white/30 hover:text-white/90'
          }`}
        >
          Paste text
        </button>
      </div>

      {/* URL form */}
      {mode === 'url' && (
        <form onSubmit={loadFromUrl} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://recipe-site.com/your-recipe"
            inputMode="url"
            autoComplete="url"
            required
            className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-red-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-red-500 px-6 py-3 font-display text-sm tracking-[0.2em] text-white transition hover:bg-red-400 disabled:opacity-50"
          >
            {loading ? 'PARSING…' : 'PARSE'}
          </button>
        </form>
      )}

      {/* Paste form */}
      {mode === 'paste' && (
        <div className="flex flex-col gap-3">
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder={
              'Paste a recipe here. Ingredients first (one per line), then instructions.\nE.g.\n\n2 cups flour\n1 tsp salt\n3 eggs\n\nMix dry ingredients.\nWhisk eggs.\nFold together.'
            }
            rows={8}
            className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-red-400"
          />
          {/* Primary: AI cleanup. Secondary: heuristic parse (the
              old behavior, kept as a no-cost / no-auth fallback for
              well-formed pastes). Clear lives on the right. */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={aiCleanPasted}
              disabled={loading}
              className="flex-1 min-w-[200px] rounded-xl bg-gradient-to-r from-fuchsia-500 to-red-500 px-6 py-3 font-display text-sm tracking-[0.2em] text-white shadow-[0_0_24px_-6px_rgba(255,46,179,0.6)] transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? 'CLEANING…' : '✨ CLEAN WITH AI'}
            </button>
            <button
              type="button"
              onClick={parsePasted}
              disabled={loading}
              title="Skip AI and use the simple line-splitter (good for already-clean text)."
              className="rounded-xl border border-white/20 bg-black/30 px-4 py-3 font-display text-xs tracking-[0.2em] text-white/70 hover:border-white/40 hover:bg-white/5 disabled:opacity-60"
            >
              BASIC PARSE
            </button>
            <button
              type="button"
              onClick={() => {
                setPasted('')
                clearAll()
              }}
              disabled={loading}
              className="rounded-xl border border-white/20 px-4 py-3 font-display text-xs tracking-[0.2em] text-white/70 hover:bg-white/5 disabled:opacity-60"
            >
              CLEAR
            </button>
          </div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-white/35">
            ✨ AI handles titles, headers, footers, and messy formatting. Sign-in required.
          </p>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
          ▲ {error}
        </p>
      )}

      {recipe && (
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
          {recipe.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={recipe.image}
              alt={recipe.name ?? 'Recipe'}
              className="mb-4 aspect-video w-full rounded-xl object-cover"
              loading="lazy"
            />
          )}

          {recipe.name && (
            <h3 className="font-display text-2xl tracking-wide text-white sm:text-3xl">
              {recipe.name}
            </h3>
          )}

          {recipe.sourceUrl && (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs text-red-300 hover:underline"
            >
              source ↗
            </a>
          )}

          {/* Save to My Recipes */}
          <div className="mt-4">
            <SaveRecipeButton
              name={recipe.name ?? 'Untitled recipe'}
              source={recipe.sourceUrl ? 'url' : 'pasted'}
              sourceUrl={recipe.sourceUrl}
              image={recipe.image}
              yield={recipe.yield}
              ingredients={recipe.ingredients}
              instructions={recipe.instructions}
            />
          </div>

          {/* Scale + Units pickers — big touch targets for mobile */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/40 p-3">
              <p className="font-display text-[10px] tracking-[0.3em] text-red-300">
                ▌ SCALE
                {recipe.yield && (
                  <span className="ml-2 text-white/40">
                    base: {recipe.yield}
                  </span>
                )}
              </p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setScale(n)}
                    className={`rounded-lg border py-3 font-display text-lg tracking-widest transition ${
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

            <div className="rounded-xl border border-white/10 bg-black/40 p-3">
              <p className="font-display text-[10px] tracking-[0.3em] text-red-300">
                ▌ UNITS
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[
                  { v: 'as-written' as System, label: 'AS-IS' },
                  { v: 'metric' as System,     label: 'g · ml' },
                  { v: 'imperial' as System,   label: 'oz · cup' },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setSystem(opt.v)}
                    aria-pressed={system === opt.v}
                    className={`rounded-lg border py-3 font-display text-xs tracking-widest transition ${
                      system === opt.v
                        ? 'border-red-400 bg-red-500/20 text-red-100'
                        : 'border-white/15 bg-black/30 text-white/70 hover:border-white/30'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-white/40">
                Lines without a unit (e.g. &quot;3 eggs&quot;) stay as-is.
              </p>
            </div>
          </div>

          {/* Ingredients */}
          <h4 className="mt-6 font-display text-sm tracking-[0.25em] text-red-300">
            ▌ INGREDIENTS ({scaledIngredients.length})
          </h4>
          <ul className="mt-2 space-y-1.5">
            {scaledIngredients.map((line, i) => (
              <li
                key={i}
                className="flex gap-2 rounded-lg border border-white/5 bg-black/30 px-3 py-2 text-sm text-white/90"
              >
                <span className="text-red-300/70">·</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>

          {/* Instructions */}
          {recipe.instructions.length > 0 && (
            <>
              <h4 className="mt-6 font-display text-sm tracking-[0.25em] text-red-300">
                ▌ STEPS ({recipe.instructions.length})
              </h4>
              <ol className="mt-2 space-y-2">
                {recipe.instructions.map((step, i) => (
                  <li
                    key={i}
                    className="flex gap-3 rounded-lg border border-white/5 bg-black/30 px-3 py-2 text-sm text-white/85"
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

          <button
            type="button"
            onClick={clearAll}
            className="mt-6 w-full rounded-xl border border-white/15 px-4 py-2 font-display text-xs tracking-[0.25em] text-white/60 hover:bg-white/5"
          >
            CLEAR RECIPE
          </button>
        </article>
      )}
    </div>
  )
}

// Heuristic parser for pasted text. Splits into ingredients + instructions
// by looking for ingredient-shaped lines (quantity prefix) vs. sentence-ish
// instruction blocks. Not perfect, but handles the common shape:
//
//   2 cups flour
//   1 tsp salt
//   3 eggs
//
//   Mix dry ingredients...
function parsePastedRecipe(text: string): ParsedRecipe {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  // Strip common list markers
  const cleaned = lines.map((l) => l.replace(/^[-*•·▪◦]\s+/, ''))

  // An "ingredient-shaped" line: starts with a number/fraction/unicode-frac,
  // OR is short (<80 chars) and contains a known unit word.
  const UNITS = /\b(cup|cups|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lb|lbs|pounds?|g|grams?|kg|ml|l|liters?|pinch|dash|cloves?|stick|sticks)\b/i
  const LEADING_NUM = /^(\d|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞|⅕|⅖|⅗|⅘|⅙|⅚)/

  // Walk lines: collect leading "ingredient-shaped" lines, then everything
  // after the first long/non-ingredient block is treated as instructions.
  const ingredients: string[] = []
  const instructions: string[] = []
  let inIngredients = true

  for (const line of cleaned) {
    const looksLikeIngredient =
      LEADING_NUM.test(line) || (line.length < 80 && UNITS.test(line))
    if (inIngredients && looksLikeIngredient) {
      ingredients.push(line)
    } else {
      inIngredients = false
      // Skip section headers like "Instructions:" / "Directions:"
      if (/^(instructions?|directions?|method|steps?|preparation)\s*[:：]?\s*$/i.test(line)) {
        continue
      }
      instructions.push(line)
    }
  }

  // If we somehow caught nothing as ingredients, treat first half as
  // ingredients and second half as instructions.
  if (ingredients.length === 0 && cleaned.length > 0) {
    const mid = Math.ceil(cleaned.length / 2)
    ingredients.push(...cleaned.slice(0, mid))
    instructions.length = 0
    instructions.push(...cleaned.slice(mid))
  }

  return {
    name: 'Pasted recipe',
    ingredients,
    instructions,
  }
}
