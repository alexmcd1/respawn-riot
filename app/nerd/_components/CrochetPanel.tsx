'use client'

// Crochet pattern search — sits on the Nerd hub because the kind of
// patterns this household actually crochets are fandom-flavored
// (Baby Yoda, Star Wars, Marvel, Pokémon amigurumi, etc.).
//
// No backend lookup. The form takes a query and renders four "go"
// buttons that punch the search through to the major pattern sites
// in new tabs. Saves typing the same query into four search bars.

import { useState } from 'react'

const QUICK_PICKS = [
  'baby yoda amigurumi',
  'mandalorian helmet',
  'mickey mouse blanket',
  'pokemon plush',
  'lord of the rings',
  'harry potter house scarf',
  'spiderman beanie',
  'dragon amigurumi',
  'stitch (lilo) plush',
  'witch hat',
]

type Engine = {
  id: string
  label: string
  blurb: string
  build: (q: string) => string
  accent: string
}

const ENGINES: Engine[] = [
  {
    id: 'ravelry',
    label: 'Ravelry',
    blurb: 'The serious pattern database — filters by yarn weight, hook size, free vs paid.',
    build: (q) =>
      `https://www.ravelry.com/patterns/search?craft=crochet&query=${encodeURIComponent(q)}`,
    accent: 'border-rose-400/60 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25',
  },
  {
    id: 'etsy',
    label: 'Etsy',
    blurb: 'Buy-or-free patterns from real designers. Good for fandom amigurumi.',
    build: (q) =>
      `https://www.etsy.com/search?q=${encodeURIComponent(q + ' crochet pattern')}`,
    accent: 'border-orange-400/60 bg-orange-500/15 text-orange-200 hover:bg-orange-500/25',
  },
  {
    id: 'pinterest',
    label: 'Pinterest',
    blurb: 'The mood board. Great for visual references and free pattern roundups.',
    build: (q) =>
      `https://www.pinterest.com/search/pins/?q=${encodeURIComponent('crochet ' + q + ' pattern')}`,
    accent: 'border-red-400/60 bg-red-500/15 text-red-200 hover:bg-red-500/25',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    blurb: 'Tutorial videos — best for new techniques or learning a stitch from a pattern.',
    build: (q) =>
      `https://www.youtube.com/results?search_query=${encodeURIComponent('crochet ' + q + ' tutorial')}`,
    accent: 'border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-200 hover:bg-fuchsia-500/25',
  },
]

export default function CrochetPanel() {
  const [query, setQuery] = useState('')
  const trimmed = query.trim()

  return (
    <div className="px-4 py-10 sm:px-6 sm:py-12">
      <section className="mx-auto max-w-4xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black uppercase sm:text-3xl">
              Crochet Design Search
            </h2>
            <p className="mt-2 text-white/60">
              Type what you want to make. Hit one of the four buttons to punch
              the search through to Ravelry, Etsy, Pinterest, or YouTube — each
              opens in a new tab. Same query, four very different result feeds.
            </p>
          </div>
          <span className="hidden font-display text-[10px] tracking-[0.3em] text-white/40 sm:block">
            CLIENT-SIDE · NO TRACKING
          </span>
        </div>

        <div className="mt-6 rounded-2xl border border-rose-400/30 bg-gradient-to-br from-rose-500/[0.08] via-fuchsia-500/[0.05] to-transparent p-5">
          <label
            htmlFor="crochet-query"
            className="font-display text-[10px] tracking-[0.3em] text-rose-200"
          >
            ▌ WHAT ARE WE MAKING?
          </label>
          <input
            id="crochet-query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. baby yoda amigurumi, mandalorian helmet, dragon plush…"
            className="mt-2 w-full rounded-md border border-white/20 bg-black/60 px-3 py-3 font-mono text-sm text-white outline-none placeholder:text-white/30 focus:border-rose-400"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />

          {/* Quick picks — single-tap fills the input */}
          <div className="mt-4">
            <p className="font-display text-[10px] tracking-[0.3em] text-white/45">
              ▌ QUICK PICKS
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_PICKS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuery(q)}
                  className="rounded-md border border-white/15 bg-black/40 px-2.5 py-1 font-mono text-[11px] text-white/70 hover:border-rose-400/60 hover:text-white"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Search-through buttons */}
          <div className="mt-6">
            <p className="font-display text-[10px] tracking-[0.3em] text-rose-200">
              ▌ SEARCH ON
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {ENGINES.map((e) => {
                const disabled = trimmed.length === 0
                const href = disabled ? '#' : e.build(trimmed)
                return (
                  <a
                    key={e.id}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(ev) => {
                      if (disabled) ev.preventDefault()
                    }}
                    aria-disabled={disabled}
                    className={[
                      'group flex flex-col gap-1 rounded-xl border p-4 transition',
                      disabled
                        ? 'cursor-not-allowed border-white/10 bg-white/[0.02] text-white/30'
                        : e.accent,
                    ].join(' ')}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-display text-base tracking-wide">
                        {e.label} ↗
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-widest opacity-60">
                        {disabled ? 'type to enable' : 'open'}
                      </span>
                    </span>
                    <span className="text-xs leading-snug opacity-85">
                      {e.blurb}
                    </span>
                  </a>
                )
              })}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm text-white/65">
          <p className="font-display text-[10px] tracking-[0.3em] text-rose-200">
            ▌ WHY FOUR SITES
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>
              <span className="text-white">Ravelry</span> — best for serious
              pattern data (yarn weight, hook size, finished dimensions). Free
              + paid mixed.
            </li>
            <li>
              <span className="text-white">Etsy</span> — independent designers,
              huge fandom amigurumi catalog. Mostly paid PDFs.
            </li>
            <li>
              <span className="text-white">Pinterest</span> — visual moodboard
              + roundups of free patterns scraped from blogs.
            </li>
            <li>
              <span className="text-white">YouTube</span> — when you want to
              learn the stitch by watching, not reading.
            </li>
          </ul>
        </div>
      </section>
    </div>
  )
}
