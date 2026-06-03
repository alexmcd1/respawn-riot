'use client'

// ═════════════════════════════════════════════════════════════════════════
//
//   THE KID GHOST'S DAD JOKE POPPER
//
//   A little punk-rock skull mascot that peeks in from the side of the
//   screen every ~5–12 minutes, types out a dad joke setup, then swaps
//   to its laughing face for the punchline (with a body-shake animation)
//   and slides back out.
//
//   Click the skull → skip ahead to the punchline.
//   Click the × on the bubble → dismiss this round early.
//   Click the laughing skull → dismiss.
//
//   State machine:
//     hidden → entering → talking → laughing → leaving → hidden → ...
//
//   Each appearance picks a random JOKE (no immediate repeats) and a
//   random side (left/right). localStorage tracks the last appearance
//   so a fresh page load shortly after one doesn't fire another right
//   away. The component mounts once at the root layout, runs on every
//   page except /sign-in.
//
//   Assets — drop these in /public/skull/:
//     talking.png    ← image used during entering + talking phases
//     laughing.png   ← image used during laughing phase (with .skull-wiggle)
//
// ═════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

// ─── Joke pool ──────────────────────────────────────────────────────────
// Mix of skeleton-coded, punk/music, and classic dad. New jokes welcome —
// just append. The picker avoids repeating the same one twice in a row.
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

// Test escape hatch — append ?skull=now to any URL to force the skull
// to appear ~500ms after page load instead of waiting the normal delay.
const TEST_QUERY_PARAM = 'skull'
const TEST_QUERY_VALUE = 'now'

type Side = 'left' | 'right'
type Phase = 'hidden' | 'entering' | 'talking' | 'laughing' | 'leaving'

export default function DadJokeSkull() {
  const pathname = usePathname() ?? ''
  const hiddenOnPath = HIDDEN_ON.some((p) => pathname.startsWith(p))
  // Read the test query param straight off window.location. Using
  // Next's useSearchParams() hook here would propagate dynamic-rendering
  // requirements through the root layout into every page on the site,
  // killing static generation for pages that opt into it. window-read
  // is fine because this is a client component and the value is only
  // used inside useEffect (after mount, so SSR doesn't see it).
  const [forceShow, setForceShow] = useState(false)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      setForceShow(params.get(TEST_QUERY_PARAM) === TEST_QUERY_VALUE)
    } catch { /* ignore */ }
  }, [pathname])

  const [phase, setPhase] = useState<Phase>('hidden')
  const [side, setSide] = useState<Side>('right')
  const [joke, setJoke] = useState<{ setup: string; punchline: string } | null>(null)
  // Tracks per-image whether the .png 404'd. If so we fall back to the
  // SVG placeholder shipped at /skull/<name>.svg. Once a .png fails it
  // stays "failed" for the rest of the session — no point retrying.
  const [pngFailed, setPngFailed] = useState<{ talking: boolean; laughing: boolean }>({
    talking: false,
    laughing: false,
  })

  // Pending timeouts — cleared on dismiss / unmount so a closed bubble
  // doesn't reopen itself a moment later from a stale scheduler.
  const timeoutsRef = useRef<number[]>([])
  const lastJokeIdxRef = useRef<number>(-1)

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
    // startAppearance referenced via closure below — eslint disabled OK
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [later])

  const startAppearance = useCallback(() => {
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

  const dismiss = useCallback(() => {
    clearTimers()
    setPhase('leaving')
    later(() => {
      setPhase('hidden')
      scheduleNext()
    }, LEAVE_ANIM_MS)
  }, [clearTimers, later, scheduleNext])

  const advanceToPunchline = useCallback(() => {
    // Only meaningful during the talking phase — otherwise click is a dismiss.
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

  // First-appearance scheduler. Simple per-page-load timer: every fresh
  // page load fires after FIRST_APPEARANCE_MS regardless of when the
  // skull last appeared. (Earlier versions gated this on a localStorage
  // timestamp to prevent multi-tab lockstep firing, but the gating made
  // single-tab use feel broken — load page, see skull at 12s, reload,
  // wait 5+ min for next appearance, conclude the feature is broken.
  // In-session recurrence still uses MIN_GAP/MAX_GAP via scheduleNext.)
  //
  // Test escape hatch: ?skull=now fires after 500ms for verification.
  useEffect(() => {
    if (hiddenOnPath) return
    const initialDelay = forceShow ? 500 : FIRST_APPEARANCE_MS
    const id = window.setTimeout(startAppearance, initialDelay)
    return () => {
      window.clearTimeout(id)
      clearTimers()
    }
  }, [hiddenOnPath, forceShow, startAppearance, clearTimers])

  if (hiddenOnPath || phase === 'hidden' || !joke) return null

  const visible = phase === 'entering' || phase === 'talking' || phase === 'laughing'
  const laughing = phase === 'laughing'

  // Peek positions: 20% sticking past the edge keeps ~80% visible —
  // looks like the skull is leaning into the frame from the wall.
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
              // PNG isn't in the repo yet — fall back to the SVG placeholder
              // shipped at /skull/<name>.svg. Stays "failed" for the rest
              // of the session so we don't retry the 404 repeatedly.
              setPngFailed((prev) =>
                laughing ? { ...prev, laughing: true } : { ...prev, talking: true }
              )
            }}
          />
        </span>
      </button>

      {/* Speech bubble — positioned next to the skull, with a tail
          pointing toward it. Sits ABOVE the skull vertically because
          the skull is mid-height and the bubble feels more natural
          coming off the upper-side of the face. */}
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

            {/* Tail of the speech bubble — CSS triangle pointing at the
                skull. Border-color matches the bubble border so it reads
                as part of the same shape. */}
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
// Reveal text one character at a time. Restarts whenever `text` changes
// (so swapping from setup → punchline retypes from the start).
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
