'use client'

import { useEffect, useRef, useState } from 'react'
import {
  RATINGS_EVENT,
  downloadBackup,
  importFromFile,
  type ImportResult,
} from '../_lib/backup'
import { RECIPES_EVENT, loadRecipes } from '../_lib/recipes'

// Quick counts so the panel shows the user what they're backing up.
function loadRatingsCount(): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = localStorage.getItem('respawn.food.ratings.v1')
    if (!raw) return 0
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.length : 0
  } catch {
    return 0
  }
}

export default function BackupPanel() {
  const [recipeCount, setRecipeCount] = useState(0)
  const [ratingCount, setRatingCount] = useState(0)
  const [importing, setImporting] = useState(false)
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Hydrate counts on mount and on any change to either store.
  useEffect(() => {
    const refresh = () => {
      setRecipeCount(loadRecipes().length)
      setRatingCount(loadRatingsCount())
    }
    refresh()
    window.addEventListener(RECIPES_EVENT, refresh)
    window.addEventListener(RATINGS_EVENT, refresh)
    return () => {
      window.removeEventListener(RECIPES_EVENT, refresh)
      window.removeEventListener(RATINGS_EVENT, refresh)
    }
  }, [])

  function handleExport() {
    setStatus(null)
    const empty = recipeCount === 0 && ratingCount === 0
    if (empty) {
      setStatus({ kind: 'err', msg: 'Nothing to back up yet — save a recipe or rate a restaurant first.' })
      return
    }
    const { filename, recipes, ratings } = downloadBackup()
    setStatus({
      kind: 'ok',
      msg: `Exported ${recipes} recipe${recipes === 1 ? '' : 's'} + ${ratings} rating${ratings === 1 ? '' : 's'} → ${filename}`,
    })
  }

  function pickFile() {
    setStatus(null)
    fileInputRef.current?.click()
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setStatus(null)
    let result: ImportResult
    try {
      result = await importFromFile(file)
    } finally {
      setImporting(false)
      // Reset so picking the same file again still triggers onChange
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    if (!result.ok) {
      setStatus({ kind: 'err', msg: result.error ?? 'Import failed' })
      return
    }
    const parts: string[] = []
    if (result.recipesAdded) parts.push(`${result.recipesAdded} new recipe${result.recipesAdded === 1 ? '' : 's'}`)
    if (result.recipesUpdated) parts.push(`${result.recipesUpdated} updated`)
    if (result.ratingsAdded) parts.push(`${result.ratingsAdded} new rating${result.ratingsAdded === 1 ? '' : 's'}`)
    setStatus({
      kind: 'ok',
      msg: parts.length ? `Merged: ${parts.join(', ')}.` : 'Nothing new — already up to date.',
    })
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5">
      <p className="font-display text-[11px] tracking-[0.3em] text-red-400">
        ▌ BACKUP &amp; RESTORE
      </p>
      <h3 className="mt-1 font-display text-lg tracking-wide">
        Save a copy of your data.
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-white/55">
        Currently storing <span className="text-white/85">{recipeCount}</span> recipe{recipeCount === 1 ? '' : 's'} +{' '}
        <span className="text-white/85">{ratingCount}</span> restaurant rating{ratingCount === 1 ? '' : 's'} in this browser.
        Export downloads a JSON file. Import merges from a file (recipes upsert by source URL; ratings dedupe by name + cuisine).
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleExport}
          className="flex-1 rounded-lg border border-red-400/60 bg-red-500/10 px-4 py-2.5 font-display text-sm tracking-[0.2em] text-red-200 hover:bg-red-500/20"
        >
          ⬇ EXPORT JSON
        </button>
        <button
          type="button"
          onClick={pickFile}
          disabled={importing}
          className="flex-1 rounded-lg border border-white/20 px-4 py-2.5 font-display text-sm tracking-[0.2em] text-white/80 hover:bg-white/5 disabled:opacity-50"
        >
          {importing ? 'IMPORTING…' : '⬆ IMPORT JSON'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      {status && (
        <p
          className={`mt-3 rounded-lg border p-3 text-sm ${
            status.kind === 'ok'
              ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
              : 'border-red-400/40 bg-red-500/10 text-red-200'
          }`}
        >
          {status.kind === 'ok' ? '✓ ' : '▲ '}
          {status.msg}
        </p>
      )}

      <p className="mt-3 text-[11px] text-white/40">
        Same file works on any browser/device. When you switch phones,
        export here, email the file to yourself, import on the new device.
      </p>
    </div>
  )
}
