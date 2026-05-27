'use client'

import { useEffect, useState } from 'react'
import {
  RECIPES_EVENT,
  isSaved,
  recipeIdFor,
  upsertRecipe,
  type RecipeSource,
} from '../_lib/recipes'

type Props = {
  name: string
  source: RecipeSource
  sourceUrl?: string
  image?: string
  yield?: string
  ingredients: string[]
  instructions: string[]
}

export default function SaveRecipeButton(props: Props) {
  const id = recipeIdFor(props.source, props.sourceUrl, props.name)
  const [saved, setSaved] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [stars, setStars] = useState(0)

  // Hydrate "is this already saved?" from localStorage on mount, and
  // re-check whenever something else on the page mutates the recipe list.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(isSaved(id))
    const onChange = () => setSaved(isSaved(id))
    window.addEventListener(RECIPES_EVENT, onChange)
    return () => window.removeEventListener(RECIPES_EVENT, onChange)
  }, [id])

  function quickSave() {
    upsertRecipe({
      name: props.name,
      source: props.source,
      sourceUrl: props.sourceUrl,
      image: props.image,
      yield: props.yield,
      ingredients: props.ingredients,
      instructions: props.instructions,
    })
    setSaved(true)
  }

  function saveWithRating() {
    upsertRecipe({
      name: props.name,
      source: props.source,
      sourceUrl: props.sourceUrl,
      image: props.image,
      yield: props.yield,
      ingredients: props.ingredients,
      instructions: props.instructions,
      stars,
    })
    setSaved(true)
    setExpanded(false)
    setStars(0)
  }

  if (!expanded) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {saved ? (
          <span className="rounded-md border border-emerald-400/60 bg-emerald-500/10 px-3 py-1.5 font-display text-xs tracking-[0.2em] text-emerald-200">
            ✓ SAVED
          </span>
        ) : (
          <button
            type="button"
            onClick={quickSave}
            className="rounded-md border border-red-400/60 bg-red-500/10 px-3 py-1.5 font-display text-xs tracking-[0.2em] text-red-200 hover:bg-red-500/20"
          >
            ★ SAVE
          </button>
        )}
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="rounded-md border border-white/15 px-3 py-1.5 font-display text-xs tracking-[0.2em] text-white/70 hover:bg-white/5"
        >
          {saved ? 'RE-RATE' : 'SAVE + RATE'}
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-3">
      <p className="font-display text-[10px] tracking-[0.3em] text-red-300">
        ▌ {saved ? 'UPDATE RATING' : 'SAVE WITH RATING'}
      </p>
      <div className="mt-2 flex items-center justify-between gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} stars`}
            onClick={() => setStars(stars === n ? n - 1 : n)}
            className={`flex h-9 w-9 items-center justify-center text-xl ${
              n <= stars ? 'text-yellow-300' : 'text-white/20 hover:text-white/50'
            }`}
          >
            {n <= stars ? '★' : '☆'}
          </button>
        ))}
        <span className="ml-1 w-10 text-right font-display text-sm text-white/70">
          {stars}/10
        </span>
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={saveWithRating}
          className="flex-1 rounded-lg bg-red-500 px-4 py-2 font-display text-xs tracking-[0.2em] text-white hover:bg-red-400"
        >
          SAVE
        </button>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="rounded-lg border border-white/15 px-4 py-2 font-display text-xs tracking-[0.2em] text-white/70 hover:bg-white/5"
        >
          CANCEL
        </button>
      </div>
    </div>
  )
}
