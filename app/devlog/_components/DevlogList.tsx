'use client'

// Filterable devlog entry list. Used by both:
//   - /devlog (standalone site-wide build log page)
//   - /games tab "Build Log" (same data, same filter UX)
//
// Filter pills at the top let the visitor narrow to one category
// (GAMES / MUSIC / FOOD / etc) — driven entirely by what's actually
// present in the post array, so empty categories don't get a pill.

import { useState } from 'react'
import {
  CATEGORY_COLORS,
  type DevlogCategory,
  type DevlogPost,
} from '../_devlog'

type Filter = DevlogCategory | 'ALL'

export default function DevlogList({ posts }: { posts: DevlogPost[] }) {
  const [filter, setFilter] = useState<Filter>('ALL')

  // Per-category post counts so the pill labels can show "GAMES (4)".
  const counts: Partial<Record<DevlogCategory, number>> = {}
  for (const p of posts) {
    if (p.category) counts[p.category] = (counts[p.category] ?? 0) + 1
  }
  // Render pills in a stable order — biggest category first, then
  // by name — instead of letting Object.keys order leak through.
  const presentCategories = (Object.keys(counts) as DevlogCategory[]).sort(
    (a, b) => (counts[b] ?? 0) - (counts[a] ?? 0) || a.localeCompare(b)
  )

  const visible = filter === 'ALL' ? posts : posts.filter((p) => p.category === filter)

  return (
    <div>
      {/* Filter pill row */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        <FilterPill
          label="ALL"
          count={posts.length}
          active={filter === 'ALL'}
          onClick={() => setFilter('ALL')}
        />
        {presentCategories.map((cat) => {
          const c = CATEGORY_COLORS[cat]
          return (
            <FilterPill
              key={cat}
              label={cat}
              count={counts[cat] ?? 0}
              active={filter === cat}
              onClick={() => setFilter(filter === cat ? 'ALL' : cat)}
              activeClasses={`${c.border} ${c.bg} ${c.text}`}
            />
          )
        })}
      </div>

      {/* Entries */}
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/55">
          No entries in this category yet. Click <span className="font-display tracking-widest text-white/75">ALL</span> to clear the filter.
        </div>
      ) : (
        <ol className="space-y-5">
          {visible.map((post) => {
            const id =
              post.source === 'manual' ? `m-${post.issue}` : `g-${post.sha}`
            const catColors = post.category
              ? CATEGORY_COLORS[post.category]
              : { border: 'border-white/15', text: 'text-white/60', bg: 'bg-white/[0.04]' }
            return (
              <li
                key={id}
                className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:grid-cols-[160px_1fr] sm:gap-6 sm:p-6"
              >
                <div className="flex items-baseline gap-3 sm:flex-col sm:items-start sm:gap-2">
                  {post.source === 'manual' ? (
                    <span className="font-display text-3xl tracking-wider text-fuchsia-300">
                      #{post.issue}
                    </span>
                  ) : (
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-base text-cyan-300 underline-offset-2 hover:underline"
                    >
                      {post.sha?.slice(0, 7)}
                    </a>
                  )}
                  <span className="font-mono text-xs text-white/45">{post.date}</span>
                  <div className="ml-auto flex flex-col gap-1 sm:ml-0">
                    {post.category && (
                      <span
                        className={`rounded border px-2 py-0.5 text-center font-display text-[10px] tracking-[0.25em] ${catColors.border} ${catColors.bg} ${catColors.text}`}
                      >
                        {post.category}
                      </span>
                    )}
                    <span
                      className={`rounded border px-2 py-0.5 text-center font-display text-[10px] tracking-[0.2em] ${
                        post.source === 'manual'
                          ? 'border-fuchsia-400/40 text-fuchsia-300'
                          : 'border-cyan-400/40 text-cyan-300'
                      }`}
                    >
                      {post.source === 'manual' ? post.tag ?? 'MANUAL' : 'GIT'}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="font-display text-xl leading-tight tracking-wide text-white">
                    {post.title}
                  </h3>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-white/75">
                    {post.body.length > 0 ? (
                      post.body.map((p, i) => <p key={i}>{p}</p>)
                    ) : (
                      <p className="text-white/40">{'(no body)'}</p>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

function FilterPill({
  label,
  count,
  active,
  onClick,
  activeClasses,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  /** Classes applied when the pill is active. Defaults to the neutral
   *  fuchsia treatment used by the "ALL" pill; category pills pass
   *  their own brand classes so the active state matches the
   *  category-tag color used on each post entry. */
  activeClasses?: string
}) {
  const base =
    'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-display text-[11px] tracking-[0.22em] uppercase transition'
  const activeFallback = 'border-fuchsia-400/60 bg-fuchsia-500/20 text-fuchsia-100'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        base,
        active
          ? activeClasses ?? activeFallback
          : 'border-white/10 bg-black/40 text-white/60 hover:border-white/30 hover:text-white',
      ].join(' ')}
    >
      <span>{label}</span>
      <span className="font-mono text-[10px] tabular-nums text-current opacity-70">
        {count}
      </span>
    </button>
  )
}
