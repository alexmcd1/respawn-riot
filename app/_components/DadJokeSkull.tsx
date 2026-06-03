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

  // ── 50 more added per request — same flavor (punk / music / skull /
  //    classic dad), kept clean (bad puns, not raunchy).

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
