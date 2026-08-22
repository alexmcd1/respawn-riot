'use client'

// The Dog Parade — little Boston terriers + a dachshund trot along the
// bottom of the /wedding page and pop speech bubbles cheering the
// couple on. Pure client-side whimsy: a fixed, pointer-events-none
// overlay so it never blocks anything on the page.
//
// The dogs don't bark randomly — they cycle through the family's
// cheers: "Go Mom!", "Go get married!", "We love you!", "Barkin' mad!".

import { useEffect, useState } from 'react'
import styles from './DogParade.module.css'

const PHRASES = ['Go Mom!', 'Go get married!', 'We love you!', "Barkin' mad!"]

type Kind = 'boston' | 'dachshund'
type DogConfig = {
  id: string
  kind: Kind
  dir: 'right' | 'left'
  bottom: number // px from bottom of viewport
  width: number // px
  dur: number // run duration in seconds
  delay: number // start offset in seconds
  staticLeft: string // where it stands under reduced-motion
}

const DOGS: DogConfig[] = [
  { id: 'boston-a', kind: 'boston',    dir: 'right', bottom: 12, width: 72, dur: 18, delay: 0,  staticLeft: '8%' },
  { id: 'doxie',    kind: 'dachshund', dir: 'left',  bottom: 38, width: 108, dur: 24, delay: 4, staticLeft: '44%' },
  { id: 'boston-b', kind: 'boston',    dir: 'right', bottom: 62, width: 58, dur: 15, delay: 8,  staticLeft: '77%' },
]

export default function DogParade() {
  const [barks, setBarks] = useState<Record<string, string>>({})
  const [reduced, setReduced] = useState(false)

  // Detect prefers-reduced-motion so the dogs can stand still.
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(m.matches)
    const onChange = () => setReduced(m.matches)
    m.addEventListener?.('change', onChange)
    return () => m.removeEventListener?.('change', onChange)
  }, [])

  // Cheer loop — every ~2.6s a random dog says the next phrase in the
  // cycle (in order, so all four cheers get their turn). The bubble
  // clears after 2.5s.
  useEffect(() => {
    let i = 0
    const id = window.setInterval(() => {
      const dog = DOGS[Math.floor(Math.random() * DOGS.length)]
      const phrase = PHRASES[i % PHRASES.length]
      i++
      setBarks((b) => ({ ...b, [dog.id]: phrase }))
      window.setTimeout(() => {
        setBarks((b) => {
          const n = { ...b }
          if (n[dog.id] === phrase) delete n[dog.id]
          return n
        })
      }, 2500)
    }, 2600)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
    >
      {DOGS.map((dog) => {
        const runClass = reduced
          ? ''
          : dog.dir === 'right'
            ? styles.runRight
            : styles.runLeft
        const phrase = barks[dog.id]
        return (
          <div
            key={dog.id}
            className={runClass}
            style={{
              position: 'absolute',
              bottom: dog.bottom,
              left: reduced ? dog.staticLeft : 0,
              width: dog.width,
              animationDuration: reduced ? undefined : `${dog.dur}s`,
              animationDelay: reduced ? undefined : `${dog.delay}s`,
              willChange: 'transform',
            }}
          >
            {/* Speech bubble (keyed by phrase so it re-pops each cheer) */}
            {phrase && (
              <div
                key={phrase}
                className={styles.bubble}
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  marginBottom: 8,
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                }}
              >
                <div className="relative rounded-xl border-2 border-rose-400 bg-white px-3 py-1.5 font-display text-[13px] uppercase tracking-wide text-black shadow-[0_4px_16px_-4px_rgba(244,63,94,0.6)]">
                  {phrase}
                  {/* little tail pointing down at the dog */}
                  <span
                    className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b-2 border-r-2 border-rose-400 bg-white"
                    aria-hidden="true"
                  />
                </div>
              </div>
            )}

            {/* Dog — the facer flips left-runners so they face where they go */}
            <div style={{ transform: dog.dir === 'left' ? 'scaleX(-1)' : undefined }}>
              <div className={reduced ? undefined : styles.bobber}>
                {dog.kind === 'boston' ? <BostonTerrier /> : <Dachshund />}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Boston terrier (side profile, facing right) ─────────────────────

function BostonTerrier() {
  return (
    <svg viewBox="0 0 80 66" width="100%" height="auto" role="img" aria-label="Boston terrier">
      {/* far (offside) legs — lighter, static, for depth */}
      <rect x="30" y="43" width="7" height="16" rx="3" fill="#3d3d3d" />
      <rect x="49" y="43" width="7" height="16" rx="3" fill="#3d3d3d" />

      {/* back leg (animated) */}
      <g className={styles.legBack}>
        <rect x="22" y="43" width="8" height="17" rx="3.5" fill="#1b1b1b" />
        <rect x="22" y="55" width="8" height="5" rx="2.5" fill="#fdfdfd" />
      </g>

      {/* tail */}
      <polygon points="16,30 7,26 16,39" fill="#1b1b1b" />

      {/* body */}
      <rect x="15" y="26" width="46" height="23" rx="11" fill="#1b1b1b" />

      {/* white chest blaze */}
      <rect x="47" y="33" width="15" height="17" rx="7" fill="#fdfdfd" />

      {/* head */}
      <circle cx="60" cy="24" r="15" fill="#1b1b1b" />

      {/* bat ears */}
      <polygon points="49,15 55,1 61,16" fill="#1b1b1b" />
      <polygon points="62,16 69,2 74,17" fill="#1b1b1b" />

      {/* white face blaze */}
      <rect x="58" y="9" width="5" height="18" rx="2.5" fill="#fdfdfd" />

      {/* muzzle */}
      <rect x="64" y="24" width="15" height="14" rx="6.5" fill="#fdfdfd" />
      {/* nose */}
      <circle cx="78" cy="28" r="2.6" fill="#111" />
      {/* mouth line */}
      <path d="M70 34 q4 3 8 1" stroke="#bbb" strokeWidth="1" fill="none" strokeLinecap="round" />

      {/* eye */}
      <circle cx="57" cy="22" r="3" fill="#fdfdfd" />
      <circle cx="58" cy="22" r="1.5" fill="#111" />

      {/* pink collar */}
      <rect x="49" y="33" width="15" height="4.5" rx="2.25" fill="#ff4d8d" />
      <circle cx="56" cy="38.5" r="2" fill="#ffd23f" />

      {/* front leg (animated) */}
      <g className={styles.legFront}>
        <rect x="50" y="43" width="8" height="17" rx="3.5" fill="#1b1b1b" />
        <rect x="50" y="55" width="8" height="5" rx="2.5" fill="#fdfdfd" />
      </g>
    </svg>
  )
}

// ─── Dachshund (side profile, facing right) ──────────────────────────

function Dachshund() {
  return (
    <svg viewBox="0 0 116 50" width="100%" height="auto" role="img" aria-label="Dachshund">
      {/* tail — long, curling up at the back */}
      <path
        d="M16 24 C 9 22, 5 15, 3 8"
        stroke="#3a2c28"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />

      {/* far legs — lighter, static */}
      <rect x="30" y="31" width="6" height="13" rx="3" fill="#5a453f" />
      <rect x="74" y="31" width="6" height="13" rx="3" fill="#5a453f" />

      {/* back leg (animated) */}
      <g className={styles.legBack}>
        <rect x="21" y="30" width="7" height="15" rx="3.5" fill="#3a2c28" />
        <rect x="21" y="41" width="7" height="4.5" rx="2.25" fill="#e8ded9" />
      </g>

      {/* long body */}
      <rect x="14" y="17" width="78" height="16" rx="8" fill="#3a2c28" />

      {/* tan chest patch */}
      <rect x="78" y="24" width="16" height="10" rx="4.5" fill="#8a6555" />

      {/* head */}
      <circle cx="96" cy="21" r="11" fill="#3a2c28" />
      {/* snout */}
      <rect x="99" y="17" width="16" height="9" rx="4.5" fill="#3a2c28" />
      {/* nose */}
      <circle cx="114" cy="21" r="2.5" fill="#140f0e" />
      {/* mouth */}
      <path d="M104 25 q5 2 9 0" stroke="#1d1513" strokeWidth="1" fill="none" strokeLinecap="round" />

      {/* floppy ear */}
      <path
        d="M90 15 q9 -3 11 5 q1 9 -6 13 q-8 1 -8 -8 q0 -8 3 -10 z"
        fill="#2a1e1b"
      />

      {/* eye */}
      <circle cx="97" cy="18" r="2.3" fill="#fdfdfd" />
      <circle cx="98" cy="18" r="1.2" fill="#111" />

      {/* pink collar */}
      <rect x="83" y="22" width="5" height="12" rx="2.5" fill="#ff4d8d" />
      <circle cx="85.5" cy="34" r="2" fill="#ffd23f" />

      {/* front leg (animated) */}
      <g className={styles.legFront}>
        <rect x="80" y="30" width="7" height="15" rx="3.5" fill="#3a2c28" />
        <rect x="80" y="41" width="7" height="4.5" rx="2.25" fill="#e8ded9" />
      </g>
    </svg>
  )
}
