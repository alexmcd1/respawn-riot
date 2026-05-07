'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const links: { href: string; label: string; accent: string }[] = [
  { href: '/', label: 'Home', accent: 'text-white' },
  { href: '/anime', label: 'Anime', accent: 'text-fuchsia-400' },
  { href: '/pop-punk', label: 'Pop Punk', accent: 'text-pink-400' },
  { href: '/gaming', label: 'Gaming', accent: 'text-cyan-400' },
  { href: '/game', label: 'Lumling', accent: 'text-lime-400' },
  { href: '/trading-cards', label: 'TDC', accent: 'text-amber-400' },
]

export default function NavBar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-black uppercase tracking-[0.25em] text-white hover:text-fuchsia-400"
          onClick={() => setOpen(false)}
        >
          Respawn<span className="text-fuchsia-500">/</span>Riot
        </Link>

        <button
          aria-label="Toggle menu"
          className="rounded-md border border-white/15 px-3 py-1 text-sm text-white/80 sm:hidden"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Close' : 'Menu'}
        </button>

        <nav className="hidden gap-1 sm:flex">
          {links.map((link) => {
            const active =
              link.href === '/'
                ? pathname === '/'
                : pathname?.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm font-bold uppercase tracking-widest transition ${
                  active
                    ? `bg-white/10 ${link.accent}`
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-white/10 px-4 pb-4 pt-2 sm:hidden">
          {links.map((link) => {
            const active =
              link.href === '/'
                ? pathname === '/'
                : pathname?.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`rounded-md px-3 py-2 text-sm font-bold uppercase tracking-widest ${
                  active
                    ? `bg-white/10 ${link.accent}`
                    : 'text-white/75 hover:bg-white/5 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>
      )}
    </header>
  )
}
