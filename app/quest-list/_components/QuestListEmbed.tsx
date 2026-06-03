'use client'

// Auto-resizing QuestList iframe — with a viewport-relative cap.
//
// Behavior:
//   - Content fits within viewport → iframe is exactly content-tall.
//     No scrollbar anywhere on the page.
//   - Content exceeds viewport     → iframe caps at the available
//     viewport height and gets its own inner scrollbar. (Inevitable —
//     a 500-task list can't fit on a phone screen no matter what we do.)
//
// The cap is what stops the "iframe keeps growing as you scroll"
// runaway from a feedback loop between the parent height-setter and
// the iframe's min-h-full body. With the cap and no per-cycle buffer,
// the height settles to a stable equilibrium within one or two ticks.

import { useEffect, useRef, useState } from 'react'

type QlistMsg = { type: 'qlist-height'; height: number }

// Floor and reserved chrome — the cap is `window.innerHeight - HERO_OFFSET_PX`
// (the visible space below the page hero), but never less than MIN_HEIGHT_PX
// so the embed doesn't collapse on tiny landscape phones.
const MIN_HEIGHT_PX  = 560
const HERO_OFFSET_PX = 160  // covers NavBar + hero + breathing room

export default function QuestListEmbed() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  // Last height the IFRAME reported. null = haven't heard from it yet.
  const [contentHeight, setContentHeight] = useState<number | null>(null)
  // Hard cap = available viewport height. Re-measured on resize.
  const [cap, setCap] = useState<number>(MIN_HEIGHT_PX)

  // Cap tracking — viewport size changes on window resize and on
  // mobile-browser chrome collapse, so re-measure each time.
  useEffect(() => {
    const measure = () => {
      const h = Math.max(MIN_HEIGHT_PX, (window.innerHeight || 800) - HERO_OFFSET_PX)
      setCap(h)
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
    }
  }, [])

  // Listen for height reports from QuestList. Source-check + drop
  // sub-pixel changes so micro-fluctuations don't cause re-renders.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!iframeRef.current) return
      if (e.source !== iframeRef.current.contentWindow) return
      const data = e.data as QlistMsg | null | undefined
      if (data?.type !== 'qlist-height') return
      const reported = Number(data.height)
      if (!Number.isFinite(reported) || reported <= 0) return
      setContentHeight((prev) => {
        const next = Math.ceil(reported)
        if (prev != null && Math.abs(prev - next) < 2) return prev
        return next
      })
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // Choose the effective iframe height:
  //   - First render (no height reported yet) → fallback to cap so the
  //     iframe doesn't pop in as a hairline
  //   - Otherwise → min(content, cap), bounded below by MIN_HEIGHT_PX
  const effective =
    contentHeight == null
      ? cap
      : Math.min(cap, Math.max(MIN_HEIGHT_PX, contentHeight))

  // When the iframe is at its cap (content exceeds viewport) we WANT
  // the iframe's own scrollbar to take over. When the iframe matches
  // content exactly there's nothing to scroll and the attribute is
  // moot. Leave scrolling at default ("auto") and let the browser
  // make the call.
  return (
    <section className="px-0 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-5xl overflow-hidden border-y border-violet-400/30 bg-black sm:rounded-2xl sm:border sm:shadow-[0_0_40px_rgba(139,92,246,0.18)]">
        <iframe
          ref={iframeRef}
          src="/games/questlist/index.html"
          title="QuestList by kid_ghost"
          className="block w-full"
          style={{ height: `${effective}px`, border: 0 }}
        />
      </div>
    </section>
  )
}
