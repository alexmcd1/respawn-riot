'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

type Slide = {
  href: string
  tag: string                 // small label (e.g. "RESPAWN CREATURES")
  title: string               // big slide title
  blurb: string               // 1-line description
  cta: string                 // CTA button text
  emoji: string               // visual placeholder (replace with real art later)
  accentBorder: string        // tailwind border-* class for slide frame
  accentText: string          // tailwind text-* for accents
  accentBg: string            // tailwind bg-* for CTA button
  glow: string                // boxShadow rgba string for slide frame glow
  bgGradient: string          // tailwind gradient classes for slide background
}

const slides: Slide[] = [
  {
    href: '/game',
    tag: 'IN-HOUSE · KID_GHOST',
    title: 'RC: Respawn Creatures',
    blurb: 'Hatch, feed, train, fight. Pick from three species, evolve through six stages.',
    cta: 'Play RC',
    emoji: '🥚',
    accentBorder: 'border-lime-400/60',
    accentText: 'text-lime-300',
    accentBg: 'bg-lime-400 hover:bg-lime-300',
    glow: 'rgba(163,230,53,0.35)',
    bgGradient: 'from-lime-500/20 via-cyan-500/10 to-transparent',
  },
  {
    href: '/trading-cards',
    tag: 'CREATOR · ZOKU21',
    title: 'TDC: Trading Digital Cards',
    blurb: 'Open anime-themed packs, trade with NPCs, build out a collection.',
    cta: 'Open a pack',
    emoji: '🃏',
    accentBorder: 'border-amber-400/60',
    accentText: 'text-amber-300',
    accentBg: 'bg-amber-400 hover:bg-amber-300',
    glow: 'rgba(251,191,36,0.35)',
    bgGradient: 'from-amber-500/20 via-fuchsia-500/10 to-transparent',
  },
  {
    href: '/jjk-fight',
    tag: 'CREATOR · ZOKU21 · NEW',
    title: 'Jujutsu Shenanigans',
    blurb: '1v1 cursed-energy fighter. Six characters, domain expansions, AI opponent.',
    cta: 'Pick a fighter',
    emoji: '👁',
    accentBorder: 'border-fuchsia-400/60',
    accentText: 'text-fuchsia-300',
    accentBg: 'bg-fuchsia-500 hover:bg-fuchsia-400',
    glow: 'rgba(217,70,239,0.40)',
    bgGradient: 'from-fuchsia-500/20 via-purple-500/10 to-transparent',
  },
  {
    href: '/pc-builder',
    tag: 'CREATOR · ZOKU21 · NEW',
    title: 'PC Builder',
    blurb: 'Pick parts, check compatibility, see estimated 1080p / 1440p / 4K performance.',
    cta: 'Build a rig',
    emoji: '🖥',
    accentBorder: 'border-cyan-400/60',
    accentText: 'text-cyan-300',
    accentBg: 'bg-cyan-400 hover:bg-cyan-300',
    glow: 'rgba(34,211,238,0.40)',
    bgGradient: 'from-cyan-500/20 via-blue-500/10 to-transparent',
  },
  {
    href: '/stars-brawl',
    tag: 'CREATOR · ZOKU21 · NEW',
    title: 'Stars Brawl',
    blurb: 'Top-down brawler. Six characters, supers, walled arena. 1v1 the AI.',
    cta: 'Pick a brawler',
    emoji: '⭐',
    accentBorder: 'border-yellow-400/60',
    accentText: 'text-yellow-300',
    accentBg: 'bg-yellow-400 hover:bg-yellow-300',
    glow: 'rgba(250,204,21,0.40)',
    bgGradient: 'from-yellow-500/20 via-orange-500/10 to-transparent',
  },
]

const AUTO_MS = 5500

export default function GameCarousel() {
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)

  const goTo = useCallback((next: number) => {
    setIdx(((next % slides.length) + slides.length) % slides.length)
  }, [])

  const next = useCallback(() => goTo(idx + 1), [goTo, idx])
  const prev = useCallback(() => goTo(idx - 1), [goTo, idx])

  // Auto-advance, pause on hover/focus + when tab hidden
  useEffect(() => {
    if (paused) return
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % slides.length)
    }, AUTO_MS)
    return () => clearInterval(id)
  }, [paused])

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // Keyboard: left/right when carousel has focus
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
    if (e.key === 'ArrowRight') { e.preventDefault(); next() }
  }

  const slide = slides[idx]

  return (
    <section
      className="relative px-6 py-10 sm:py-14"
      aria-roledescription="carousel"
      aria-label="Featured games"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={onKey}
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-display text-xs tracking-[0.3em] text-fuchsia-400">
              ▌ FEATURED GAMES
            </p>
            <h2 className="mt-2 font-display text-3xl tracking-[0.04em] sm:text-4xl">
              PLAY SOMETHING NOW
            </h2>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={prev}
              aria-label="Previous slide"
              className="rounded-md border border-white/20 bg-black/40 px-3 py-2 font-display text-sm tracking-widest text-white/80 transition hover:border-white hover:text-white"
            >
              ◀
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next slide"
              className="rounded-md border border-white/20 bg-black/40 px-3 py-2 font-display text-sm tracking-widest text-white/80 transition hover:border-white hover:text-white"
            >
              ▶
            </button>
          </div>
        </div>

        {/* Slide frame */}
        <div
          className={`relative mt-6 overflow-hidden rounded-3xl border bg-gradient-to-br ${slide.bgGradient} ${slide.accentBorder}`}
          style={{ boxShadow: `0 0 50px ${slide.glow}` }}
          aria-live="polite"
        >
          {/* slide */}
          <div className="grid items-center gap-6 p-6 sm:grid-cols-[180px_1fr] sm:gap-10 sm:p-10">
            <div className="mx-auto flex h-32 w-32 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black text-7xl shadow-inner sm:mx-0 sm:h-44 sm:w-44 sm:text-8xl">
              {slide.emoji}
            </div>

            <div className="text-center sm:text-left">
              <p className={`font-display text-xs tracking-[0.3em] ${slide.accentText}`}>
                {slide.tag}
              </p>
              <h3 className="mt-2 font-display text-2xl leading-tight tracking-wide sm:text-4xl">
                {slide.title}
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/75 sm:mx-0 sm:text-base">
                {slide.blurb}
              </p>

              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                <Link
                  href={slide.href}
                  className={`rounded-xl px-6 py-3 font-display text-sm tracking-[0.25em] text-black transition hover:scale-[1.04] ${slide.accentBg}`}
                >
                  ▶ {slide.cta.toUpperCase()}
                </Link>
                <span className="font-display text-xs tracking-[0.3em] text-white/40">
                  {(idx + 1).toString().padStart(2, '0')} / {slides.length.toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>

          {/* mobile prev/next overlay */}
          <button
            type="button"
            onClick={prev}
            aria-label="Previous slide"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md border border-white/20 bg-black/60 px-2 py-3 font-display text-sm text-white/80 sm:hidden"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next slide"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-white/20 bg-black/60 px-2 py-3 font-display text-sm text-white/80 sm:hidden"
          >
            ▶
          </button>
        </div>

        {/* Dots */}
        <div className="mt-5 flex items-center justify-center gap-2">
          {slides.map((s, i) => (
            <button
              key={s.href}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}: ${s.title}`}
              aria-current={i === idx}
              className={`h-1.5 rounded-full transition-all ${
                i === idx
                  ? 'w-8 bg-fuchsia-400'
                  : 'w-3 bg-white/25 hover:bg-white/45'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
