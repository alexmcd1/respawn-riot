'use client'

// Interactive planning checklist. The task list itself is defined in
// _lib/details.ts (PLANNING_TASKS); this component tracks which are
// done in localStorage so progress persists per-device. No backend —
// this is a private couple's page, local storage is plenty.
//
// Keyed by task label so reordering / adding tasks in the details file
// doesn't lose existing checked state.

import { useEffect, useMemo, useState } from 'react'
import { PLANNING_TASKS, type PlanTask } from '../_lib/details'

const LS_KEY = 'wedding.checklist.v1'

export default function PlanningChecklist() {
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) setDone(JSON.parse(raw))
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(done))
    } catch {}
  }, [done, hydrated])

  const toggle = (label: string) =>
    setDone((d) => ({ ...d, [label]: !d[label] }))

  // Group tasks by category, preserving first-seen category order.
  const groups = useMemo(() => {
    const map = new Map<PlanTask['category'], PlanTask[]>()
    for (const t of PLANNING_TASKS) {
      if (!map.has(t.category)) map.set(t.category, [])
      map.get(t.category)!.push(t)
    }
    return [...map.entries()]
  }, [])

  const total = PLANNING_TASKS.length
  const completed = PLANNING_TASKS.filter((t) => done[t.label]).length
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100)

  return (
    <div>
      {/* Progress header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl uppercase tracking-[0.04em] sm:text-3xl">
            The Plan
          </h2>
          <p className="mt-1 text-sm text-white/60">
            Everything to lock down. Check things off as you go — saved on this
            device.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-3xl tracking-[0.02em] text-fuchsia-300 tabular-nums">
            {completed}
            <span className="text-white/30">/{total}</span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/45">
            {pct}% done
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-pink-500 to-cyan-400 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Category groups */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {groups.map(([category, tasks]) => {
          const catDone = tasks.filter((t) => done[t.label]).length
          return (
            <section
              key={category}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-[11px] uppercase tracking-[0.28em] text-fuchsia-200/80">
                  {category}
                </h3>
                <span className="font-mono text-[10px] text-white/40">
                  {catDone}/{tasks.length}
                </span>
              </div>
              <ul className="mt-3 space-y-1.5">
                {tasks.map((t) => {
                  const checked = !!done[t.label]
                  return (
                    <li key={t.label}>
                      <button
                        type="button"
                        onClick={() => toggle(t.label)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/[0.04]"
                      >
                        <span
                          className={[
                            'grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 text-xs transition',
                            checked
                              ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                              : 'border-white/25',
                          ].join(' ')}
                        >
                          {checked ? '✓' : ''}
                        </span>
                        <span
                          className={[
                            'text-sm transition',
                            checked
                              ? 'text-white/40 line-through'
                              : 'text-white/85',
                          ].join(' ')}
                        >
                          {t.label}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
