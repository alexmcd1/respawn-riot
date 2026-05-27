'use client'

import { useEffect, useState } from 'react'

// Floating "back to top" button. Lives in the root layout so every
// page gets it. Stays hidden until the user has scrolled enough to
// actually need it (shorter pages never show the button).

const SHOW_AFTER_PX = 600

export default function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_PX)
    onScroll() // set initial state if loaded mid-scroll
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function jumpUp() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <button
      type="button"
      onClick={jumpUp}
      aria-label="Back to top"
      tabIndex={visible ? 0 : -1}
      className={[
        'fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full',
        'border border-fuchsia-400/60 bg-black/70 text-fuchsia-200 backdrop-blur',
        'shadow-[0_0_20px_rgba(217,70,239,0.35)] transition-all duration-200',
        'hover:bg-fuchsia-500/20 hover:text-fuchsia-100 active:scale-95',
        'sm:bottom-6 sm:right-6 sm:h-14 sm:w-14',
        visible
          ? 'pointer-events-auto translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-4 opacity-0',
      ].join(' ')}
    >
      <span className="sr-only">Back to top</span>
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 14l6-6 6 6" />
      </svg>
    </button>
  )
}
