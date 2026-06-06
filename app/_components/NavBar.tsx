'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import UserMenu from './UserMenu'

type NavLink = {
  href: string
  label: string
  text: string // base text color
  glow: string // hover glow + border color
  num: string  // tiny channel number
}

const links: NavLink[] = [
  { href: '/',              label: 'Home',     text: 'text-white',         glow: 'hover:border-white hover:text-white shadow-white/40',                num: '00' },
  { href: '/anime',         label: 'Anime',    text: 'text-fuchsia-300',   glow: 'hover:border-fuchsia-400 hover:text-fuchsia-300 shadow-fuchsia-500/40', num: '01' },
  { href: '/music',         label: 'Music',    text: 'text-pink-300',      glow: 'hover:border-pink-400 hover:text-pink-300 shadow-pink-500/40',       num: '02' },
  { href: '/games',         label: 'Games',    text: 'text-cyan-300',      glow: 'hover:border-cyan-400 hover:text-cyan-300 shadow-cyan-500/40',       num: '03' },
  { href: '/orlando',       label: 'Orlando',  text: 'text-orange-300',    glow: 'hover:border-orange-400 hover:text-orange-300 shadow-orange-500/40', num: '04' },
  { href: '/quest-list',    label: 'Quests',   text: 'text-violet-300',    glow: 'hover:border-violet-400 hover:text-violet-300 shadow-violet-500/40', num: '05' },
  { href: '/food',          label: 'Food',     text: 'text-red-300',       glow: 'hover:border-red-400 hover:text-red-300 shadow-red-500/40',          num: '06' },
  { href: '/cram',          label: 'Cram',     text: 'text-emerald-300',   glow: 'hover:border-emerald-400 hover:text-emerald-300 shadow-emerald-500/40', num: '07' },
  { href: '/creativity',    label: 'Create',   text: 'text-fuchsia-300',   glow: 'hover:border-fuchsia-400 hover:text-fuchsia-300 shadow-fuchsia-500/40', num: '08' },
  // Buddies/chat used to live here as channel 09, but it didn't pull
  // its weight as a top-level destination — the floating buddy list
  // surfaces the feature on every page, and dedicated management now
  // lives at /account. The route still exists so the floating widget's
  // "open full view" link continues to work.
]

const tickerItems = [
  '★ NEW — GAMES HUB · ALL FIVE TITLES IN ONE PLACE',
  '🎵 NEW — MUSIC: POP PUNK + LIVE TOUR DATES',
  '✶ ANIME — TRENDING + COMING SOON',
  '🍴 FOOD: RECIPES · EAT OUT · IN HOUSE · SHOPPING',
  '☼ ORLANDO LIVE WEATHER + PARK NEWS',
  '⚔ QUESTLIST BY KID_GHOST',
  '➕ CRAM · LATE-NIGHT STUDY HALL · GRADES 5–8',
  '✦ DEVLOG · WHAT SHIPPED SITE-WIDE',
  '⚡ JOIN THE RIOT',
]

export default function NavBar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href)

  return (
    <header className="sticky top-0 z-50">
      {/* Top bar — z-20 vs the ticker's z-10 so the UserMenu dropdown
          (which is trapped inside the top bar's backdrop-blur stacking
          context) paints above the ticker. Without explicit z-indices
          on these two sibling stacking contexts, source order wins and
          the ticker hides the top of the dropdown. */}
      <div className="relative z-20 border-b border-fuchsia-500/40 bg-black/85 backdrop-blur-md">
        {/* faint scanlines */}
        <div className="pointer-events-none absolute inset-0 opacity-30 [background:repeating-linear-gradient(to_bottom,rgba(255,255,255,0.04)_0px,rgba(255,255,255,0.04)_1px,transparent_1px,transparent_3px)]" />
        {/* edge glow */}
        <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent" />

        <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          {/* Logo */}
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="group flex items-center gap-2"
            aria-label="Respawn Riot home"
          >
            <span className="relative h-9 w-9 overflow-hidden rounded-full border border-fuchsia-500/60 bg-black transition group-hover:border-fuchsia-300 group-hover:shadow-[0_0_12px_rgba(217,70,239,0.6)]">
              <Image
                src="/mascot/sticker.png"
                alt="The Kid Ghost — site mascot"
                fill
                sizes="40px"
                className="object-cover"
                priority
              />
            </span>
            <span
              className="font-display text-2xl tracking-[0.22em] text-white transition group-hover:text-fuchsia-300 sm:text-[26px]"
            >
              <span className="glitch-flash" data-text="RESPAWN">RESPAWN</span>
              <span className="mx-1.5 text-fuchsia-400">/</span>
              <span className="glitch-flash" data-text="RIOT">RIOT</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1.5 lg:flex">
            {links.map((l) => {
              const active = isActive(l.href)
              // Static asset targets (e.g. /math.html) aren't Next.js routes,
              // so skip the prefetch attempt (would 404).
              const isStatic = l.href.endsWith('.html')
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  prefetch={isStatic ? false : undefined}
                  className={[
                    'neon-btn group relative inline-flex items-center gap-2 rounded-md border bg-black/40 px-3 py-2 font-display text-[15px] tracking-[0.18em] uppercase shadow-[0_0_0_0_currentColor]',
                    'border-white/15',
                    l.glow,
                    active ? `${l.text} border-current bg-white/[0.06]` : `text-white/70`,
                  ].join(' ')}
                >
                  <span className={`text-[10px] tabular-nums ${active ? 'text-current' : 'text-white/30'}`}>
                    {l.num}
                  </span>
                  <span className="under-reveal pb-0.5">{l.label}</span>
                  {active && (
                    <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor] blink" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* CTA + mobile button */}
          <div className="flex items-center gap-2">
            {/* User account: SIGN IN button when logged out, avatar menu
                when logged in. Replaces the old "JOIN THE RIOT" CTA —
                newsletter signup now lives in the site footer. */}
            <UserMenu />
            <button
              aria-label="Toggle menu"
              className="rounded-md border border-white/20 px-3 py-2 font-display text-sm tracking-[0.2em] text-white/80 lg:hidden"
              onClick={() => setOpen((o) => !o)}
            >
              {open ? 'CLOSE' : 'MENU'}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {open && (
          <nav className="relative grid grid-cols-2 gap-2 border-t border-fuchsia-500/30 px-4 pb-4 pt-3 lg:hidden">
            {links.map((l) => {
              const active = isActive(l.href)
              const isStatic = l.href.endsWith('.html')
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  prefetch={isStatic ? false : undefined}
                  onClick={() => setOpen(false)}
                  className={[
                    'neon-btn flex items-center justify-between rounded-md border bg-black/40 px-3 py-2 font-display text-[15px] tracking-[0.2em] uppercase',
                    'border-white/15',
                    l.glow,
                    active ? `${l.text} border-current bg-white/[0.06]` : 'text-white/75',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-2">
                    <span className={`text-[10px] tabular-nums ${active ? 'text-current' : 'text-white/30'}`}>{l.num}</span>
                    <span>{l.label}</span>
                  </span>
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor] blink" />}
                </Link>
              )
            })}
            {/* Mobile drawer footer: link to newsletter signup so the
                signup path remains discoverable from any page. */}
            <Link
              href="/#join"
              onClick={() => setOpen(false)}
              className="col-span-2 rounded-md border border-white/15 bg-black/40 px-4 py-3 text-center font-display text-xs tracking-[0.25em] text-white/70 hover:border-fuchsia-400/60 hover:text-fuchsia-200"
            >
              ✉ NEWSLETTER
            </Link>
          </nav>
        )}
      </div>

      {/* Ticker strip — sits on a solid-black base with backdrop blur so
          scrolling content underneath doesn't bleed through and make the
          marquee text unreadable. The colored gradient + diagonal hatch
          layer on top for the channel-glow vibe without compromising
          legibility. */}
      <div className="relative z-10 border-b border-white/10 bg-black/90 backdrop-blur-md">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-fuchsia-500/15 via-pink-500/10 to-cyan-500/15" />
        <div className="pointer-events-none absolute inset-0 opacity-40 [background:repeating-linear-gradient(-45deg,rgba(255,0,128,0.10)_0,rgba(255,0,128,0.10)_10px,transparent_10px,transparent_20px)]" />
        <div className="marquee relative py-1.5 font-display text-[12px] tracking-[0.35em] text-white/85">
          <div className="marquee-track">
            {[...tickerItems, ...tickerItems].map((t, i) => (
              <span key={i} className="whitespace-nowrap">
                {t} <span className="mx-3 text-fuchsia-400">/</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
