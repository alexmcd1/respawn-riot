'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

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
  { href: '/pop-punk',      label: 'Pop Punk', text: 'text-pink-300',      glow: 'hover:border-pink-400 hover:text-pink-300 shadow-pink-500/40',       num: '02' },
  { href: '/gaming',        label: 'Gaming',   text: 'text-cyan-300',      glow: 'hover:border-cyan-400 hover:text-cyan-300 shadow-cyan-500/40',       num: '03' },
  { href: '/game',          label: 'RC',       text: 'text-lime-300',      glow: 'hover:border-lime-400 hover:text-lime-300 shadow-lime-500/40',       num: '04' },
  { href: '/trading-cards', label: 'TDC',      text: 'text-amber-300',     glow: 'hover:border-amber-400 hover:text-amber-300 shadow-amber-500/40',    num: '05' },
  { href: '/orlando',       label: 'Orlando',  text: 'text-orange-300',    glow: 'hover:border-orange-400 hover:text-orange-300 shadow-orange-500/40', num: '06' },
  { href: '/quest-list',    label: 'Quests',   text: 'text-violet-300',    glow: 'hover:border-violet-400 hover:text-violet-300 shadow-violet-500/40', num: '07' },
]

const tickerItems = [
  '★ NEW DROPS — STARS BRAWL · PC BUILDER · JJK FIGHT',
  '✶ SPRING 2026 ANIME RANKED',
  '☠ POP PUNK HEADLINES',
  '◢ RC — RESPAWN CREATURES DEVLOG',
  '☼ ORLANDO LIVE WEATHER + PARK NEWS',
  '⚔ QUESTLIST BY KID_GHOST',
  '⚡ JOIN THE RIOT',
]

export default function NavBar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href)

  return (
    <header className="sticky top-0 z-50">
      {/* Top bar */}
      <div className="relative border-b border-fuchsia-500/40 bg-black/85 backdrop-blur-md">
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
              return (
                <Link
                  key={l.href}
                  href={l.href}
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
            <Link
              href="/#join"
              className="hidden rounded-md bg-gradient-to-r from-fuchsia-500 to-pink-500 px-4 py-2 font-display text-sm tracking-[0.2em] text-black transition hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(255,46,179,0.6)] sm:inline-block"
            >
              JOIN THE RIOT
            </Link>
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
              return (
                <Link
                  key={l.href}
                  href={l.href}
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
            <Link
              href="/#join"
              onClick={() => setOpen(false)}
              className="col-span-2 rounded-md bg-gradient-to-r from-fuchsia-500 to-pink-500 px-4 py-3 text-center font-display text-sm tracking-[0.25em] text-black"
            >
              JOIN THE RIOT
            </Link>
          </nav>
        )}
      </div>

      {/* Ticker strip */}
      <div className="relative border-b border-white/10 bg-gradient-to-r from-fuchsia-500/15 via-pink-500/10 to-cyan-500/15">
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
