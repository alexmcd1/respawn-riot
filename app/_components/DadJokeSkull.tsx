'use client'

// ═════════════════════════════════════════════════════════════════════════
//
//   THE KID GHOST'S DAD JOKE POPPER
//
//   A little punk-rock skull mascot that peeks in from the side of the
//   screen every ~5–12 minutes, types out a dad joke, switches to its
//   laughing face for the punchline, then peeks back out.
//
//   Roughly 1 in 10 appearances replaces the joke with a "MESSAGE FROM
//   OUR SPONSOR" — a centered modal with sparks, soft glow, and a happy
//   confetti chime. Trigger explicitly with ?skull=sponsor in the URL.
//
//   URL test params:
//     ?skull=now     → fire a joke ~500ms after load (instead of waiting)
//     ?skull=sponsor → fire the sponsor experience ~500ms after load
//
//   Assets (replaceable PNGs, with shipped SVG fallbacks):
//     /skull/talking.png    ← Kid Ghost talking pose
//     /skull/laughing.png   ← Kid Ghost laughing pose
//     /skull/sponsor.png    ← sponsor-modal hero image (landscape, ~3:2)
//
// ═════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { playConfetti } from './chat/sounds'

// ─── Joke pool ──────────────────────────────────────────────────────────
const JOKES: Array<{ setup: string; punchline: string }> = [
  // Skeleton / skull
  { setup: "why don't skeletons fight each other?",      punchline: "they don't have the guts." },
  { setup: "what did the skeleton order at the bar?",     punchline: "a beer... and a mop." },
  { setup: "why are skeletons so calm?",                  punchline: "nothing gets under their skin." },
  { setup: "how do skeletons text?",                      punchline: "on a bone phone." },
  { setup: "why didn't the skeleton go to the dance?",    punchline: "he had nobody to go with." },
  { setup: "what's a skeleton's favorite instrument?",    punchline: "the trom-bone." },
  // Pop punk / music
  { setup: "why did the bassist get banned from the library?", punchline: "too many overdue notes." },
  { setup: "what did the guitar say to the drummer?",     punchline: "stop hitting on me." },
  { setup: "why did the band break up?",                  punchline: "artistic differences. they couldn't agree on the bass." },
  { setup: "why don't ghosts mosh?",                      punchline: "no body to throw around." },
  { setup: "I tried to start a band called 'pop up.'",    punchline: "we kept getting blocked." },
  { setup: "what's a punk's favorite kind of bread?",     punchline: "sour-dough." },
  // Classic dad
  { setup: "why don't scientists trust atoms?",           punchline: "they make up everything." },
  { setup: "I'm reading a book on anti-gravity.",         punchline: "it's impossible to put down." },
  { setup: "what do you call fake spaghetti?",            punchline: "an impasta." },
  { setup: "I told my computer I needed a break.",        punchline: "it said it had a hard drive." },
  { setup: "why did the bicycle fall over?",              punchline: "it was two-tired." },
  { setup: "how does the moon cut its hair?",             punchline: "eclipse it." },
  { setup: "what do you call cheese that isn't yours?",   punchline: "nacho cheese." },
  { setup: "I told my dog a joke about tails.",           punchline: "he didn't get the wag of it." },

  // ── 50 more added per request — punk / music / skull / classic dad
  // More punk
  { setup: "why did the punk bring a ladder to the show?",                 punchline: "he heard the bands were up-and-coming." },
  { setup: "what's a punk's favorite vegetable?",                          punchline: "a mosh-room." },
  { setup: "why was the mosh pit so quiet?",                               punchline: "someone brought a librarian." },
  { setup: "why don't punks ever get cold?",                               punchline: "their hair stands on end." },
  { setup: "why did the punk get a job at the bank?",                      punchline: "he loved the safety pins." },
  { setup: "why don't punks play hide and seek?",                          punchline: "they refuse to conform." },
  { setup: "what kind of pizza does a punk order?",                        punchline: "anti-pasta." },
  { setup: "why was the punk band always early?",                          punchline: "they hated the establishment hours." },
  { setup: "what did the studded belt say to the leather jacket?",         punchline: "we make quite a pair." },
  { setup: "why did the punk's plant die?",                                punchline: "he refused to root for anything." },
  { setup: "what do you call a punk with perfect attendance?",             punchline: "a contradiction." },
  { setup: "why did the punk spray-paint every wall in town?",             punchline: "he was just trying to make a name for himself." },
  { setup: "what's a punk's favorite math class?",                         punchline: "di-vision." },
  { setup: "why did the punk go to therapy?",                              punchline: "mom said he had issues with authority." },
  { setup: "why did the punk fail driver's ed?",                           punchline: "too many illegal moshes." },
  // More music
  { setup: "why did the music note get arrested?",                         punchline: "it was up to no treble." },
  { setup: "why did the bass player bring a ladder?",                      punchline: "to reach the high notes." },
  { setup: "what's a vampire's favorite key?",                             punchline: "B-flat." },
  { setup: "why did the singer get locked out?",                           punchline: "she lost her keys." },
  { setup: "why did the chord break up with the melody?",                  punchline: "things got too pitchy." },
  { setup: "why was the metalhead at the library?",                        punchline: "he came for the riffs." },
  { setup: "why was the bandleader holding a ruler?",                      punchline: "to measure the bars." },
  { setup: "why did the orchestra split up?",                              punchline: "too much treble at home." },
  { setup: "what did the album say to the speaker?",                       punchline: "you blow me away." },
  { setup: "why don't songs ever lose arguments?",                         punchline: "they always have the last note." },
  { setup: "what kind of music do drummers listen to?",                    punchline: "beats me." },
  { setup: "what did the snare drum say to the kick drum?",                punchline: "I'll back you up." },
  // More skull / skeleton
  { setup: "how do skeletons start a band?",                               punchline: "they put out a bone-fide ad." },
  { setup: "why don't skeletons gamble?",                                  punchline: "no skin in the game." },
  { setup: "what did the skeleton order at the BBQ?",                      punchline: "spare ribs." },
  { setup: "why was the skeleton bad at lying?",                           punchline: "he was completely transparent." },
  { setup: "why did the skeleton skip the dance battle?",                  punchline: "he was bone-tired." },
  { setup: "why don't skeletons mosh?",                                    punchline: "too many breakdowns." },
  { setup: "what did the skeleton say at karaoke?",                        punchline: "I haven't got the heart for it." },
  { setup: "why did the skeleton stay home from school?",                  punchline: "his heart wasn't in it." },
  { setup: "what do skeletons say before dinner?",                         punchline: "bone appétit." },
  { setup: "why don't skeletons get into fights?",                         punchline: "they always lose by a hair." },
  // More classic dad
  { setup: "why don't eggs tell jokes?",                                   punchline: "they'd crack each other up." },
  { setup: "what did the ocean say to the shore?",                         punchline: "nothing. it just waved." },
  { setup: "why don't scientists trust stairs?",                           punchline: "they're always up to something." },
  { setup: "what's the best time to go to the dentist?",                   punchline: "tooth-hurty." },
  { setup: "why don't lobsters share?",                                    punchline: "they're shellfish." },
  { setup: "why did the calendar feel insecure?",                          punchline: "its days were numbered." },
  { setup: "what's a tornado's favorite game?",                            punchline: "twister." },
  { setup: "what do you call a sad strawberry?",                           punchline: "a blueberry." },
  { setup: "why don't programmers like nature?",                           punchline: "too many bugs." },
  { setup: "why did the picture go to jail?",                              punchline: "it was framed." },
  { setup: "what kind of shoes do ninjas wear?",                           punchline: "sneakers." },
  { setup: "what do you call a fish wearing a crown?",                     punchline: "a king-fish." },
  { setup: "why did the cookie go to the doctor?",                         punchline: "it was feeling crummy." },
]

// ─── Tuning ─────────────────────────────────────────────────────────────
const HIDDEN_ON = ['/sign-in']

const FIRST_APPEARANCE_MS = 12_000       // seconds after page load before first peek
const MIN_GAP_MS          = 5  * 60_000  // soonest the next one can fire (in-session)
const MAX_GAP_MS          = 12 * 60_000  // latest the next one will fire (in-session)
const ENTER_ANIM_MS       = 600
const SETUP_HOLD_MS       = 4_800        // time on screen during "talking"
const LAUGH_HOLD_MS       = 5_200        // time on screen during "laughing"
const LEAVE_ANIM_MS       = 500
const TYPEWRITER_MS_PER_CHAR = 28

// Sponsor easter egg
const SPONSOR_CHANCE      = 0.10         // ~1 in 10 appearances → sponsor instead of joke
const SPONSOR_POP_IN_MS   = 550          // matches .sponsor-pop-in keyframe duration
const SPONSOR_HOLD_MS     = 7_500        // total visible time after pop-in completes
const SPONSOR_POP_OUT_MS  = 400          // matches .sponsor-pop-out keyframe duration

// Test escape hatch — append ?skull=<mode> to any URL to force the
// first appearance to fire after ~500ms with the requested mode:
//   ?skull=now     → normal joke (any random joke from the pool)
//   ?skull=sponsor → sponsor-modal experience
const TEST_QUERY_PARAM = 'skull'

type Side = 'left' | 'right'
type Phase =
  | 'hidden'
  // joke phases
  | 'entering' | 'talking' | 'laughing' | 'leaving'
  // sponsor phases
  | 'sponsor-in' | 'sponsor-show' | 'sponsor-out'

type Spark = {
  /** Final x-offset from spark spawn point, in px */ dx: number
  /** Final y-offset from spark spawn point, in px */ dy: number
  /** Spawn position around modal — 0..1 fraction of the modal perimeter */ pos: number
  /** Animation duration in seconds */              dur: number
  /** Animation delay in seconds */                 delay: number
  /** Hex color (pink or cyan) */                   color: string
}

const SPARK_COUNT = 18

/** Generate a fresh set of sparks each time the sponsor opens. Positions
 *  spread around the modal perimeter; each flies outward at the angle
 *  matching its anchor point so they look like they're radiating from
 *  the modal's edge, not just the center. */
function generateSparks(): Spark[] {
  return Array.from({ length: SPARK_COUNT }, (_, i) => {
    const pos = (i + Math.random() * 0.6) / SPARK_COUNT
    // Convert perimeter fraction to an angle for the outward velocity.
    const angle = pos * Math.PI * 2 - Math.PI / 2
    const distance = 140 + Math.random() * 100
    return {
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      pos,
      dur: 1.0 + Math.random() * 0.7,
      delay: Math.random() * 0.35,
      color: i % 2 === 0 ? '#ff2eb3' : '#22d3ee',
    }
  })
}

/** Map perimeter fraction (0..1) to a {top,left} CSS position around a
 *  rectangle's border. Used to anchor each spark to the modal edge. */
function perimeterPosition(pos: number): { top: string; left: string } {
  // pos 0..0.25 = top edge, 0.25..0.5 = right edge, 0.5..0.75 = bottom, 0.75..1 = left
  if (pos < 0.25) return { top: '0%', left: `${(pos / 0.25) * 100}%` }
  if (pos < 0.5)  return { top: `${((pos - 0.25) / 0.25) * 100}%`, left: '100%' }
  if (pos < 0.75) return { top: '100%', left: `${100 - ((pos - 0.5) / 0.25) * 100}%` }
  return { top: `${100 - ((pos - 0.75) / 0.25) * 100}%`, left: '0%' }
}

export default function DadJokeSkull() {
  const pathname = usePathname() ?? ''
  const hiddenOnPath = HIDDEN_ON.some((p) => pathname.startsWith(p))

  // URL escape-hatch — read off window.location so we don't drag in
  // useSearchParams (which would propagate dynamic rendering up to
  // the layout). Only used inside useEffect → SSR doesn't see it.
  const [forceMode, setForceMode] = useState<'none' | 'now' | 'sponsor'>('none')
  useEffect(() => {
    try {
      const v = new URLSearchParams(window.location.search).get(TEST_QUERY_PARAM)
      if (v === 'now') setForceMode('now')
      else if (v === 'sponsor') setForceMode('sponsor')
      else setForceMode('none')
    } catch { /* ignore */ }
  }, [pathname])

  const [phase, setPhase] = useState<Phase>('hidden')
  const [side, setSide] = useState<Side>('right')
  const [joke, setJoke] = useState<{ setup: string; punchline: string } | null>(null)
  const [sparks, setSparks] = useState<Spark[]>([])
  // Per-image PNG-404 fallback to the bundled SVG.
  const [pngFailed, setPngFailed] = useState<{ talking: boolean; laughing: boolean; sponsor: boolean }>({
    talking: false, laughing: false, sponsor: false,
  })

  const timeoutsRef = useRef<number[]>([])
  const lastJokeIdxRef = useRef<number>(-1)
  const isFirstAppearanceRef = useRef<boolean>(true)

  const clearTimers = useCallback(() => {
    for (const id of timeoutsRef.current) window.clearTimeout(id)
    timeoutsRef.current = []
  }, [])

  const later = useCallback((fn: () => void, ms: number) => {
    timeoutsRef.current.push(window.setTimeout(fn, ms))
  }, [])

  const pickJoke = useCallback(() => {
    if (JOKES.length <= 1) return JOKES[0]
    let idx = lastJokeIdxRef.current
    while (idx === lastJokeIdxRef.current) {
      idx = Math.floor(Math.random() * JOKES.length)
    }
    lastJokeIdxRef.current = idx
    return JOKES[idx]
  }, [])

  const scheduleNext = useCallback(() => {
    const nextMs = MIN_GAP_MS + Math.random() * (MAX_GAP_MS - MIN_GAP_MS)
    later(() => startAppearance(), nextMs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [later])

  const startJoke = useCallback(() => {
    clearTimers()
    setJoke(pickJoke())
    setSide(Math.random() > 0.5 ? 'left' : 'right')
    setPhase('entering')
    later(() => setPhase('talking'),  ENTER_ANIM_MS)
    later(() => setPhase('laughing'), ENTER_ANIM_MS + SETUP_HOLD_MS)
    later(() => setPhase('leaving'),  ENTER_ANIM_MS + SETUP_HOLD_MS + LAUGH_HOLD_MS)
    later(() => {
      setPhase('hidden')
      scheduleNext()
    }, ENTER_ANIM_MS + SETUP_HOLD_MS + LAUGH_HOLD_MS + LEAVE_ANIM_MS)
  }, [clearTimers, later, pickJoke, scheduleNext])

  const startSponsor = useCallback(() => {
    clearTimers()
    setSparks(generateSparks())
    setPhase('sponsor-in')
    // Tiny delay before audio so it lines up with the pop-in scale peak.
    later(() => playConfetti(), 120)
    later(() => setPhase('sponsor-show'), SPONSOR_POP_IN_MS)
    later(() => setPhase('sponsor-out'),  SPONSOR_POP_IN_MS + SPONSOR_HOLD_MS)
    later(() => {
      setPhase('hidden')
      scheduleNext()
    }, SPONSOR_POP_IN_MS + SPONSOR_HOLD_MS + SPONSOR_POP_OUT_MS)
  }, [clearTimers, later, scheduleNext])

  /** Dispatcher — decides joke vs sponsor each appearance. On the very
   *  first appearance, the URL ?skull=sponsor / ?skull=now flag forces
   *  the choice. After that, recurrence uses a 10% random sponsor roll. */
  const startAppearance = useCallback(() => {
    const isFirst = isFirstAppearanceRef.current
    isFirstAppearanceRef.current = false
    const wantsSponsor =
      (isFirst && forceMode === 'sponsor') ||
      (!(isFirst && forceMode === 'now') && Math.random() < SPONSOR_CHANCE)
    if (wantsSponsor) startSponsor()
    else startJoke()
  }, [forceMode, startSponsor, startJoke])

  const dismiss = useCallback(() => {
    clearTimers()
    // Use the leave animation appropriate to the current phase.
    if (phase === 'sponsor-in' || phase === 'sponsor-show') {
      setPhase('sponsor-out')
      later(() => {
        setPhase('hidden')
        scheduleNext()
      }, SPONSOR_POP_OUT_MS)
    } else {
      setPhase('leaving')
      later(() => {
        setPhase('hidden')
        scheduleNext()
      }, LEAVE_ANIM_MS)
    }
  }, [clearTimers, later, scheduleNext, phase])

  const advanceToPunchline = useCallback(() => {
    setPhase((cur) => {
      if (cur !== 'talking') return cur
      clearTimers()
      later(() => setPhase('leaving'), LAUGH_HOLD_MS)
      later(() => {
        setPhase('hidden')
        scheduleNext()
      }, LAUGH_HOLD_MS + LEAVE_ANIM_MS)
      return 'laughing'
    })
  }, [clearTimers, later, scheduleNext])

  // First-appearance scheduler
  useEffect(() => {
    if (hiddenOnPath) return
    const initialDelay = forceMode === 'none' ? FIRST_APPEARANCE_MS : 500
    const id = window.setTimeout(startAppearance, initialDelay)
    return () => {
      window.clearTimeout(id)
      clearTimers()
    }
  }, [hiddenOnPath, forceMode, startAppearance, clearTimers])

  if (hiddenOnPath || phase === 'hidden') return null

  // ─── Sponsor render branch ────────────────────────────────────────────
  if (phase === 'sponsor-in' || phase === 'sponsor-show' || phase === 'sponsor-out') {
    const popClass = phase === 'sponsor-out' ? 'sponsor-pop-out' : 'sponsor-pop-in'
    return (
      <>
        {/* Backdrop — click anywhere outside the modal to dismiss */}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss sponsor message"
          className="fixed inset-0 z-40 cursor-default border-0 bg-black/65 p-0 backdrop-blur-sm"
        />

        {/* Centered modal */}
        <div
          role="dialog"
          aria-live="polite"
          aria-label="Message from our sponsor"
          className={`pointer-events-none fixed left-1/2 top-1/2 z-50 ${popClass}`}
          style={{ width: 'min(560px, 92vw)' }}
        >
          {/* Inner glow border — soft rounded corners, breathing pink+cyan glow */}
          <div className="pointer-events-auto relative sponsor-glow overflow-hidden rounded-3xl border border-fuchsia-400/60 bg-[#0a0510]">
            {/* Close button */}
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-fuchsia-400/70 bg-black/70 text-fuchsia-200 transition hover:bg-fuchsia-500 hover:text-black"
            >
              ✕
            </button>

            {/* Header */}
            <div className="px-5 pt-4 pb-2">
              <p className="font-display text-[10px] tracking-[0.35em] text-fuchsia-300">
                ▌ MESSAGE FROM OUR SPONSOR
              </p>
            </div>

            {/* Sponsor image — landscape aspect; fills width */}
            <div className="relative w-full" style={{ aspectRatio: '3 / 2' }}>
              <Image
                src={pngFailed.sponsor ? '/skull/sponsor.svg' : '/skull/sponsor.png'}
                alt="A message from our sponsor"
                fill
                sizes="(min-width: 600px) 560px, 92vw"
                style={{ objectFit: 'cover' }}
                priority
                onError={() => setPngFailed((p) => ({ ...p, sponsor: true }))}
              />
            </div>

            {/* Footer caption */}
            <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-3">
              <p className="font-mono text-[11px] leading-snug text-white/55">
                we now return to your regularly scheduled chaos
              </p>
              <button
                type="button"
                onClick={dismiss}
                className="font-display text-[10px] tracking-[0.25em] text-cyan-300 hover:text-cyan-100"
              >
                ↻ BACK
              </button>
            </div>
          </div>

          {/* Sparks — each anchored to a point on the modal perimeter,
              flying outward at the matching angle. Pointer-events disabled
              so they don't intercept clicks aimed at the close button. */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {sparks.map((s, i) => {
              const pos = perimeterPosition(s.pos)
              return (
                <span
                  key={i}
                  className="skull-spark"
                  style={{
                    top: pos.top,
                    left: pos.left,
                    backgroundColor: s.color,
                    boxShadow: `0 0 12px 2px ${s.color}`,
                    ['--dx' as string]: `${s.dx}px`,
                    ['--dy' as string]: `${s.dy}px`,
                    ['--dur' as string]: `${s.dur}s`,
                    ['--delay' as string]: `${s.delay}s`,
                  } as React.CSSProperties}
                />
              )
            })}
          </div>
        </div>
      </>
    )
  }

  // ─── Joke render branch ───────────────────────────────────────────────
  if (!joke) return null

  const visible = phase === 'entering' || phase === 'talking' || phase === 'laughing'
  const laughing = phase === 'laughing'

  const peekedOutX = side === 'right' ? '110%' : '-110%'
  const peekedInX  = side === 'right' ? '20%'  : '-20%'
  const translateX = visible ? peekedInX : peekedOutX
  const transitionMs = phase === 'leaving' ? LEAVE_ANIM_MS : ENTER_ANIM_MS

  return (
    <>
      {/* Skull — click target */}
      <button
        type="button"
        onClick={laughing ? dismiss : advanceToPunchline}
        aria-label={laughing ? 'Dismiss the Kid Ghost' : 'Skip to the punchline'}
        className="fixed z-40 cursor-pointer border-none bg-transparent p-0"
        style={{
          top: '42%',
          [side]: 0,
          transform: `translate(${translateX}, -50%)`,
          transition: `transform ${transitionMs}ms cubic-bezier(0.22, 1.4, 0.36, 1)`,
          width: 140,
          height: 140,
        }}
      >
        <span
          className={laughing ? 'skull-wiggle block h-full w-full' : 'skull-bob block h-full w-full'}
          style={{
            position: 'relative',
            filter: laughing
              ? 'drop-shadow(0 0 14px rgba(34, 211, 238, 0.65)) drop-shadow(0 0 18px rgba(255, 46, 179, 0.45))'
              : 'drop-shadow(0 0 12px rgba(255, 46, 179, 0.55))',
          }}
        >
          <Image
            src={
              laughing
                ? (pngFailed.laughing ? '/skull/laughing.svg' : '/skull/laughing.png')
                : (pngFailed.talking  ? '/skull/talking.svg'  : '/skull/talking.png')
            }
            alt={laughing ? 'Kid Ghost laughing at his own joke' : 'Kid Ghost telling a joke'}
            fill
            sizes="140px"
            style={{ objectFit: 'contain' }}
            onError={() => {
              setPngFailed((prev) =>
                laughing ? { ...prev, laughing: true } : { ...prev, talking: true }
              )
            }}
          />
        </span>
      </button>

      {/* Speech bubble */}
      {(phase === 'talking' || phase === 'laughing') && (
        <div
          className="font-display fixed z-50"
          role="dialog"
          aria-live="polite"
          style={{
            top: 'calc(42% - 90px)',
            [side === 'right' ? 'right' : 'left']: 140,
            maxWidth: 260,
            pointerEvents: 'auto',
          }}
        >
          <div className="relative rounded-2xl border-2 border-fuchsia-400 bg-black/95 px-4 py-3 shadow-[0_0_24px_-4px_rgba(255,46,179,0.7)]">
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="absolute -right-2.5 -top-2.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-fuchsia-400 bg-black text-xs text-fuchsia-200 transition hover:bg-fuchsia-500 hover:text-black"
            >
              ✕
            </button>

            <p className="font-mono text-[13px] leading-snug text-white">
              <Typewriter text={laughing ? joke.punchline : joke.setup} />
            </p>

            <p className="mt-2 font-display text-[10px] tracking-[0.25em] text-fuchsia-300/70">
              {laughing ? 'HAHAHA · TAP TO DISMISS' : '▸ TAP FOR PUNCHLINE'}
            </p>

            {/* Speech-bubble tail */}
            <span
              aria-hidden
              className="absolute"
              style={{
                top: '50%',
                marginTop: -10,
                width: 0,
                height: 0,
                borderTop:    '10px solid transparent',
                borderBottom: '10px solid transparent',
                ...(side === 'right'
                  ? { right: -12, borderLeft: '12px solid #ec4899' }
                  : { left:  -12, borderRight: '12px solid #ec4899' }),
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}

// ─── Typewriter ─────────────────────────────────────────────────────────
function Typewriter({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    setDisplayed('')
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      if (i >= text.length) {
        setDisplayed(text)
        window.clearInterval(id)
      } else {
        setDisplayed(text.slice(0, i))
      }
    }, TYPEWRITER_MS_PER_CHAR)
    return () => window.clearInterval(id)
  }, [text])
  return <span>{displayed}</span>
}
