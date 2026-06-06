'use client'

// Sticky sub-nav for tabbed "mini-apps" (Food, Music, Games, Orlando).
// Sits just below the main NavBar; square buttons swap content in
// place so a single page can host multiple features without the
// long-scroll grab-bag pattern.
//
// Design notes (matches the punk NavBar aesthetic):
//   - Squared-off rounded-md buttons (no pill shape) for the
//     more brutalist look users asked for
//   - Channel-numbered labels (01 / 02 / 03) matching how the
//     main NavBar numbers its top-level routes
//   - Heavier active state — thicker border, sharper glow, blink
//     dot indicator
//   - Diagonal stripe + scanline overlay on the strip itself so it
//     reads as part of the brand instead of a generic tab row
//   - Bigger touch targets / clearer text at sm+ breakpoints
//
// The page owns activeTab state and tells us which one is on; we
// just render the strip and fire onChange. Pair with useTabFromUrl
// below for ?tab=… URL sync.

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export type MiniAppTab = {
  id: string
  label: string
  icon?: string
}

export type MiniAppNavColor =
  | 'red' | 'pink' | 'cyan' | 'emerald' | 'fuchsia' | 'violet' | 'amber' | 'lime'

const COLOR: Record<MiniAppNavColor, {
  text: string
  border: string
  bg: string
  glow: string
  dot: string
  hoverText: string
  hoverBorder: string
  edge: string  // gradient color for the bottom edge accent
}> = {
  red: {
    text: 'text-red-200', border: 'border-red-400', bg: 'bg-red-500/15',
    glow: 'shadow-[0_0_16px_-2px_rgba(248,113,113,0.6)]',
    dot: 'bg-red-400',
    hoverText: 'hover:text-red-200', hoverBorder: 'hover:border-red-400/60',
    edge: 'via-red-500',
  },
  pink: {
    text: 'text-pink-200', border: 'border-pink-400', bg: 'bg-pink-500/15',
    glow: 'shadow-[0_0_16px_-2px_rgba(244,114,182,0.6)]',
    dot: 'bg-pink-400',
    hoverText: 'hover:text-pink-200', hoverBorder: 'hover:border-pink-400/60',
    edge: 'via-pink-500',
  },
  cyan: {
    text: 'text-cyan-200', border: 'border-cyan-400', bg: 'bg-cyan-500/15',
    glow: 'shadow-[0_0_16px_-2px_rgba(34,211,238,0.6)]',
    dot: 'bg-cyan-400',
    hoverText: 'hover:text-cyan-200', hoverBorder: 'hover:border-cyan-400/60',
    edge: 'via-cyan-500',
  },
  emerald: {
    text: 'text-emerald-200', border: 'border-emerald-400', bg: 'bg-emerald-500/15',
    glow: 'shadow-[0_0_16px_-2px_rgba(52,211,153,0.6)]',
    dot: 'bg-emerald-400',
    hoverText: 'hover:text-emerald-200', hoverBorder: 'hover:border-emerald-400/60',
    edge: 'via-emerald-500',
  },
  fuchsia: {
    text: 'text-fuchsia-200', border: 'border-fuchsia-400', bg: 'bg-fuchsia-500/15',
    glow: 'shadow-[0_0_18px_-2px_rgba(232,121,249,0.65)]',
    dot: 'bg-fuchsia-400',
    hoverText: 'hover:text-fuchsia-200', hoverBorder: 'hover:border-fuchsia-400/60',
    edge: 'via-fuchsia-500',
  },
  violet: {
    text: 'text-violet-200', border: 'border-violet-400', bg: 'bg-violet-500/15',
    glow: 'shadow-[0_0_16px_-2px_rgba(167,139,250,0.6)]',
    dot: 'bg-violet-400',
    hoverText: 'hover:text-violet-200', hoverBorder: 'hover:border-violet-400/60',
    edge: 'via-violet-500',
  },
  amber: {
    text: 'text-amber-200', border: 'border-amber-400', bg: 'bg-amber-500/15',
    glow: 'shadow-[0_0_16px_-2px_rgba(251,191,36,0.6)]',
    dot: 'bg-amber-400',
    hoverText: 'hover:text-amber-200', hoverBorder: 'hover:border-amber-400/60',
    edge: 'via-amber-500',
  },
  lime: {
    text: 'text-lime-200', border: 'border-lime-400', bg: 'bg-lime-500/15',
    glow: 'shadow-[0_0_16px_-2px_rgba(163,230,53,0.6)]',
    dot: 'bg-lime-400',
    hoverText: 'hover:text-lime-200', hoverBorder: 'hover:border-lime-400/60',
    edge: 'via-lime-500',
  },
}

export default function MiniAppNav({
  tabs,
  activeTab,
  onChange,
  color = 'red',
}: {
  tabs: MiniAppTab[]
  activeTab: string
  onChange: (id: string) => void
  color?: MiniAppNavColor
}) {
  const c = COLOR[color]
  // Sticky offset clears the parent NavBar (top bar ~61px + ticker
  // strip ~30px = ~91px total) with a small buffer.
  return (
    <div className="sticky top-24 z-30">
      {/* Strip background — solid black with a faint scanline overlay
          and a thin colored edge at the bottom to match the main NavBar
          treatment. Keeps the punk vibe consistent across surfaces. */}
      <div className="relative border-b border-white/10 bg-black/90 backdrop-blur-md">
        {/* Faint horizontal scanlines */}
        <div className="pointer-events-none absolute inset-0 opacity-25 [background:repeating-linear-gradient(to_bottom,rgba(255,255,255,0.04)_0px,rgba(255,255,255,0.04)_1px,transparent_1px,transparent_3px)]" />
        {/* Bottom edge gradient using the tab color */}
        <div className={`pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent ${c.edge} to-transparent`} />

        <nav aria-label="Section" className="relative mx-auto max-w-7xl px-3 sm:px-6">
          <ul className="-mx-3 flex gap-2 overflow-x-auto px-3 py-3 sm:gap-3 sm:py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((t, i) => {
              const active = t.id === activeTab
              // 01, 02, 03 — matches the main NavBar's channel numbering.
              const num = String(i + 1).padStart(2, '0')
              return (
                <li key={t.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => onChange(t.id)}
                    aria-pressed={active}
                    className={[
                      // Base — squared-off, generous padding, display font, all-caps
                      'relative inline-flex items-center gap-2.5 rounded-md border-2 px-3.5 py-2.5 font-display text-sm tracking-[0.22em] uppercase whitespace-nowrap transition-all',
                      'sm:gap-3 sm:px-5 sm:py-3 sm:text-base',
                      active
                        // Active: filled background, thick colored border, glow, brighter text
                        ? `${c.border} ${c.bg} ${c.text} ${c.glow} scale-[1.02]`
                        // Inactive: muted but still legible, color-tinted hover
                        : `border-white/15 bg-black/50 text-white/70 ${c.hoverText} ${c.hoverBorder} hover:bg-white/[0.04]`,
                    ].join(' ')}
                  >
                    {/* Channel number — bigger on desktop so it's actually readable */}
                    <span
                      className={[
                        'font-mono text-[10px] tabular-nums tracking-widest sm:text-xs',
                        active ? 'text-current opacity-80' : 'text-white/40',
                      ].join(' ')}
                    >
                      {num}
                    </span>
                    {t.icon && (
                      <span className="text-base sm:text-lg" aria-hidden>
                        {t.icon}
                      </span>
                    )}
                    <span className="font-display">{t.label}</span>
                    {/* Active blink dot — same indicator used on the main NavBar */}
                    {active && (
                      <span
                        className={`ml-1 inline-block h-2 w-2 rounded-full ${c.dot} shadow-[0_0_10px_currentColor] blink`}
                        aria-hidden
                      />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </div>
  )
}

// Hook that reads ?tab=… from the URL and falls back to defaultTab.
// Use the returned setter to update both local state + URL — the URL
// update uses replace + scroll=false so the back button stays sane
// and we don't jump to top mid-tab-switch.
export function useTabFromUrl(
  defaultTab: string,
  validTabs: readonly string[]
): [string, (next: string) => void] {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()

  const raw = search?.get('tab') ?? defaultTab
  const initial = validTabs.includes(raw) ? raw : defaultTab
  const [tab, setTab] = useState<string>(initial)

  // Keep state in sync if the URL changes externally (back button, link, etc).
  useEffect(() => {
    const fromUrl = search?.get('tab') ?? defaultTab
    const next = validTabs.includes(fromUrl) ? fromUrl : defaultTab
    setTab(next)
  }, [search, defaultTab, validTabs])

  const update = (next: string) => {
    if (!validTabs.includes(next)) return
    setTab(next)
    const params = new URLSearchParams(search?.toString() ?? '')
    params.set('tab', next)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return [tab, update]
}
