'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  SHOPPING_EVENT,
  addItem,
  addManyItems,
  clearAll,
  clearChecked,
  formatItemLine,
  loadShopping,
  removeItem,
  splitQty,
  toggleChecked,
  type ShoppingCategory,
  type ShoppingItem,
} from '../_lib/shopping'
import { RECIPES_EVENT, loadRecipes, type SavedRecipe } from '../_lib/recipes'

export default function ShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [recipes, setRecipes] = useState<SavedRecipe[]>([])

  // Add-item form
  const [text, setText] = useState('')
  const [qty, setQty] = useState('')
  const [category, setCategory] = useState<ShoppingCategory | ''>('')

  // Import-from-recipe picker
  const [importOpen, setImportOpen] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)

  // Hydrate on mount + listen for changes
  useEffect(() => {
    const refreshItems = () => setItems(loadShopping())
    const refreshRecipes = () => setRecipes(loadRecipes())
    refreshItems()
    refreshRecipes()
    window.addEventListener(SHOPPING_EVENT, refreshItems)
    window.addEventListener(RECIPES_EVENT, refreshRecipes)
    return () => {
      window.removeEventListener(SHOPPING_EVENT, refreshItems)
      window.removeEventListener(RECIPES_EVENT, refreshRecipes)
    }
  }, [])

  // Auto-clear the import message after a few seconds
  useEffect(() => {
    if (!importMsg) return
    const t = setTimeout(() => setImportMsg(null), 4000)
    return () => clearTimeout(t)
  }, [importMsg])

  // Group items by category. "checked" items always at the bottom regardless
  // of category.
  const { liveByCategory, checked } = useMemo(() => {
    const live: Record<ShoppingCategory, ShoppingItem[]> = {
      produce: [], meat: [], dairy: [], pantry: [], frozen: [], bakery: [], drinks: [], other: [],
    }
    const done: ShoppingItem[] = []
    for (const it of items) {
      if (it.checked) done.push(it)
      else live[it.category ?? 'other'].push(it)
    }
    return { liveByCategory: live, checked: done }
  }, [items])

  const liveCount = items.length - checked.length

  function onAdd(e: React.FormEvent) {
    e.preventDefault()
    const added = addItem(text, {
      qty: qty || undefined,
      category: category || undefined,
    })
    if (!added) return
    setText('')
    setQty('')
    // Keep selected category sticky so user can quickly add several from
    // one section (e.g. multiple produce items)
  }

  function importFromRecipe(recipe: SavedRecipe) {
    const parsed = recipe.ingredients.map((line) => splitQty(line))
    const n = addManyItems(parsed)
    setImportOpen(false)
    setImportMsg(
      n === 0
        ? `Nothing new — all of "${recipe.name}" already on your list.`
        : `Added ${n} item${n === 1 ? '' : 's'} from "${recipe.name}".`
    )
  }

  async function copyToClipboard() {
    if (items.length === 0) return
    const lines: string[] = []
    for (const cat of CATEGORY_ORDER) {
      const group = liveByCategory[cat]
      if (group.length === 0) continue
      lines.push(`— ${CATEGORY_META[cat].label} —`)
      for (const it of group) lines.push(formatItemLine(it))
      lines.push('')
    }
    if (checked.length > 0) {
      lines.push('— Got it —')
      for (const it of checked) lines.push(formatItemLine(it))
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n').trim())
      setImportMsg('Copied list to clipboard.')
    } catch {
      setImportMsg("Couldn't copy — your browser blocked it.")
    }
  }

  return (
    <div className="space-y-5">
      {/* Add-item form */}
      <form
        onSubmit={onAdd}
        className="space-y-2 rounded-2xl border border-white/10 bg-black/30 p-3"
      >
        <p className="font-display text-[10px] tracking-[0.3em] text-red-300">
          ▌ ADD AN ITEM
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="2 lbs"
            className="w-24 shrink-0 rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-red-400"
          />
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What do you need?"
            required
            className="flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-red-400"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="font-display text-[10px] tracking-[0.3em] text-white/55">
            CATEGORY
          </label>
          <button
            type="button"
            onClick={() => setCategory('')}
            className={`rounded-md border px-2 py-1 text-[11px] uppercase tracking-widest transition ${
              category === ''
                ? 'border-white/40 bg-white/10 text-white'
                : 'border-white/10 bg-black/40 text-white/55 hover:border-white/30'
            }`}
          >
            auto
          </button>
          {CATEGORY_ORDER.map((c) => {
            const meta = CATEGORY_META[c]
            const active = category === c
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(active ? '' : c)}
                className={`rounded-md border px-2 py-1 text-[11px] uppercase tracking-widest transition ${
                  active
                    ? meta.chip
                    : 'border-white/10 bg-black/40 text-white/55 hover:border-white/30'
                }`}
              >
                <span className="mr-1">{meta.emoji}</span>
                {meta.label}
              </button>
            )
          })}
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-red-500/90 px-4 py-2.5 font-display text-sm tracking-[0.2em] text-white hover:bg-red-400"
        >
          + ADD
        </button>
      </form>

      {/* Actions row */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setImportOpen((o) => !o)}
          className="rounded-lg border border-red-400/60 bg-red-500/10 px-3 py-2 font-display text-[11px] tracking-[0.2em] text-red-100 hover:bg-red-500/20"
        >
          {importOpen ? '× CLOSE PICKER' : '+ FROM SAVED RECIPE'}
        </button>
        {checked.length > 0 && (
          <button
            type="button"
            onClick={clearChecked}
            className="rounded-lg border border-white/15 px-3 py-2 font-display text-[11px] tracking-[0.2em] text-white/70 hover:border-white/30 hover:text-white"
          >
            CLEAR CHECKED ({checked.length})
          </button>
        )}
        {items.length > 0 && (
          <>
            <button
              type="button"
              onClick={copyToClipboard}
              className="rounded-lg border border-white/15 px-3 py-2 font-display text-[11px] tracking-[0.2em] text-white/70 hover:border-white/30 hover:text-white"
            >
              📋 COPY ALL
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm('Clear the entire list?')) clearAll()
              }}
              className="rounded-lg border border-white/15 px-3 py-2 font-display text-[11px] tracking-[0.2em] text-white/45 hover:border-red-400/60 hover:text-red-300"
            >
              CLEAR ALL
            </button>
          </>
        )}
      </div>

      {importMsg && (
        <p className="rounded-xl border border-red-400/30 bg-red-500/5 p-3 text-xs text-red-100">
          {importMsg}
        </p>
      )}

      {/* Recipe picker */}
      {importOpen && (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          {recipes.length === 0 ? (
            <p className="text-sm text-white/55">
              You don&apos;t have any saved recipes yet. Save one from the
              RECIPES or IN THE HOUSE tab first.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {recipes.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/40 p-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white">{r.name}</p>
                    <p className="truncate text-[11px] text-white/55">
                      {r.ingredients.length} ingredient
                      {r.ingredients.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => importFromRecipe(r)}
                    className="shrink-0 rounded-md border border-red-400/60 bg-red-500/10 px-3 py-1.5 text-xs text-red-100 hover:bg-red-500/20"
                  >
                    + ADD
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* The list */}
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-white/45">
          Your list is empty. Add something above, or pull ingredients from a
          saved recipe.
        </p>
      ) : (
        <div className="space-y-4">
          {/* Live items, grouped by category */}
          {CATEGORY_ORDER.map((cat) => {
            const group = liveByCategory[cat]
            if (group.length === 0) return null
            const meta = CATEGORY_META[cat]
            return (
              <section key={cat}>
                <h4
                  className={`mb-2 inline-flex items-center gap-2 rounded-md border px-2 py-1 font-display text-[10px] uppercase tracking-[0.3em] ${meta.chip}`}
                >
                  <span>{meta.emoji}</span> {meta.label}
                  <span className="ml-1 text-white/55">({group.length})</span>
                </h4>
                <ul className="space-y-1.5">
                  {group.map((it) => (
                    <ItemRow key={it.id} item={it} />
                  ))}
                </ul>
              </section>
            )
          })}

          {/* Got-it / checked section */}
          {checked.length > 0 && (
            <section>
              <h4 className="mb-2 inline-flex items-center gap-2 rounded-md border border-white/10 bg-black/40 px-2 py-1 font-display text-[10px] uppercase tracking-[0.3em] text-white/55">
                ✓ Got it
                <span className="ml-1 text-white/40">({checked.length})</span>
              </h4>
              <ul className="space-y-1.5">
                {checked.map((it) => (
                  <ItemRow key={it.id} item={it} />
                ))}
              </ul>
            </section>
          )}

          {/* Footer summary */}
          <p className="border-t border-white/5 pt-3 text-center text-xs text-white/45">
            {liveCount} to get · {checked.length} got · saved on this device
          </p>
        </div>
      )}
    </div>
  )
}

function ItemRow({ item }: { item: ShoppingItem }) {
  const c = item.category ? CATEGORY_META[item.category] : null
  return (
    <li
      className={`flex items-center gap-2 rounded-lg border bg-black/30 p-2.5 transition ${
        item.checked ? 'border-white/5 opacity-50' : 'border-white/10'
      }`}
    >
      <button
        type="button"
        onClick={() => toggleChecked(item.id)}
        aria-label={item.checked ? 'Uncheck item' : 'Check off item'}
        aria-pressed={item.checked}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-base transition ${
          item.checked
            ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
            : 'border-white/20 bg-black/40 text-white/0 hover:border-emerald-400/60'
        }`}
      >
        {item.checked ? '✓' : ''}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm ${
            item.checked ? 'text-white/50 line-through' : 'text-white'
          }`}
        >
          {item.qty && (
            <span className="mr-1.5 font-mono text-xs text-white/55">
              {item.qty}
            </span>
          )}
          {item.text}
        </p>
        {c && !item.checked && (
          <p className="text-[10px] uppercase tracking-widest text-white/35">
            {c.emoji} {c.label}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => removeItem(item.id)}
        aria-label="Remove item"
        className="rounded-md border border-white/10 px-2 py-1 text-xs text-white/45 hover:border-red-400 hover:text-red-300"
      >
        ✕
      </button>
    </li>
  )
}
