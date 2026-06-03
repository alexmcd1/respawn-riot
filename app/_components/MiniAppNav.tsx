'use client'

// Sticky sub-nav for tabbed "mini-apps" (Food, Music, etc).
// Sits just below the main NavBar; pill-style buttons swap content
// in place so a single page can host multiple features without the
// long-scroll grab-bag pattern.
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

const COLOR: Record<MiniAppNavColor, { text: string; border: string; bg: string }> = {
  red:     { text: 'text-red-100',     border: 'border-red-400',     bg: 'bg-red-500/15' },
  pink:    { text: 'text-pink-100',    border: 'border-pink-400',    bg: 'bg-pink-500/15' },
  cyan:    { text: 'text-cyan-100',    border: 'border-cyan-400',    bg: 'bg-cyan-500/15' },
  emerald: { text: 'text-emerald-100', border: 'border-emerald-400', bg: 'bg-emerald-500/15' },
  fuchsia: { text: 'text-fuchsia-100', border: 'border-fuchsia-400', bg: 'bg-fuchsia-500/15' },
  violet:  { text: 'text-violet-100',  border: 'border-violet-400',  bg: 'bg-violet-500/15' },
  amber:   { text: 'text-amber-100',   border: 'border-amber-400',   bg: 'bg-amber-500/15' },
  lime:    { text: 'text-lime-100',    border: 'border-lime-400',    bg: 'bg-lime-500/15' },
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
  // strip ~30px = ~91px total) with a small buffer. Was top-[88px]
  // which left a 3px sliver of the tab row hidden behind the
  // ticker on most viewports — that's the "overlap" users reported
  // on /orlando and similar mini-app pages.
  return (
    <div className="sticky top-24 z-30 border-b border-white/10 bg-black/85 backdrop-blur-md">
      <nav
        aria-label="Section"
        className="mx-auto max-w-7xl px-2 sm:px-6"
      >
        <ul className="-mx-2 flex gap-1.5 overflow-x-auto px-2 py-2 sm:gap-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((t) => {
            const active = t.id === activeTab
            return (
              <li key={t.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onChange(t.id)}
                  aria-pressed={active}
                  className={[
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-display text-[11px] uppercase tracking-[0.22em] whitespace-nowrap transition sm:px-4 sm:text-xs',
                    active
                      ? `${c.border} ${c.bg} ${c.text} shadow-[0_0_10px_-2px_currentColor]`
                      : 'border-white/10 bg-black/40 text-white/65 hover:border-white/30 hover:text-white',
                  ].join(' ')}
                >
                  {t.icon && <span className="text-[13px]">{t.icon}</span>}
                  <span>{t.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
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
