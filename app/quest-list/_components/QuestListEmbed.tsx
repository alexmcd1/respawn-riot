'use client'

// Auto-resizing QuestList iframe.
//
// The iframe receives a postMessage from inside QuestList every time
// the document height changes (initial load + ResizeObserver in
// public/games/questlist/index.html), and we resize the iframe to
// match. Net result: NO inner iframe scrollbar — the outer page
// becomes the only scroll surface and the embed reads as a native
// section of the page instead of a window-inside-a-window.
//
// Before the first height message arrives we fall back to a sensible
// viewport-height so the iframe doesn't render as a hairline.

import { useEffect, useRef, useState } from 'react'

type QlistMsg = { type: 'qlist-height'; height: number }

const FALLBACK_HEIGHT = 'calc(100dvh - 160px)' // initial guess until QuestList reports back
const MIN_HEIGHT_PX = 600                       // floor — don't shrink below this

export default function QuestListEmbed() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [height, setHeight] = useState<string>(FALLBACK_HEIGHT)

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      // Only accept from our own iframe — drop any other postMessage
      // chatter (browser extensions, third-party scripts on parent
      // pages, etc.).
      if (!iframeRef.current) return
      if (e.source !== iframeRef.current.contentWindow) return
      const data = e.data as QlistMsg | null | undefined
      if (data?.type !== 'qlist-height') return
      const reported = Number(data.height)
      if (!Number.isFinite(reported) || reported <= 0) return
      // Add a small buffer to avoid sub-pixel cutoff on rounding.
      const target = Math.max(MIN_HEIGHT_PX, Math.ceil(reported) + 4)
      setHeight(`${target}px`)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  return (
    <section className="px-0 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-5xl overflow-hidden border-y border-violet-400/30 bg-black sm:rounded-2xl sm:border sm:shadow-[0_0_40px_rgba(139,92,246,0.18)]">
        <iframe
          ref={iframeRef}
          src="/games/questlist/index.html"
          title="QuestList by kid_ghost"
          // scrolling="no" is deprecated but still respected — combined
          // with the auto-resize there should be nothing to scroll
          // inside the iframe anyway, but this belt-and-suspenders kills
          // any browser-specific fallback scrollbar that might still
          // appear during the very first paint before the height
          // message has been received.
          scrolling="no"
          className="block w-full"
          style={{ height, border: 0 }}
        />
      </div>
    </section>
  )
}
