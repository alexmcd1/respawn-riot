'use client'

// Live countdown to the wedding date. Reads WEDDING_AT from the details
// file. Renders "date TBD" gracefully until a date is set. Client-side
// so the ticking numbers update every second without a server round-trip.

import { useEffect, useState } from 'react'

function diff(target: number) {
  const now = Date.now()
  const ms = Math.max(0, target - now)
  const days = Math.floor(ms / 86_400_000)
  const hours = Math.floor((ms % 86_400_000) / 3_600_000)
  const mins = Math.floor((ms % 3_600_000) / 60_000)
  const secs = Math.floor((ms % 60_000) / 1000)
  return { days, hours, mins, secs, done: ms === 0 }
}

export default function Countdown({ weddingAt }: { weddingAt: string | null }) {
  const target = weddingAt ? new Date(weddingAt).getTime() : null

  // Start null so SSR + first client render match; fill in after mount.
  const [t, setT] = useState<ReturnType<typeof diff> | null>(null)

  useEffect(() => {
    if (target === null) return
    setT(diff(target))
    const id = window.setInterval(() => setT(diff(target)), 1000)
    return () => window.clearInterval(id)
  }, [target])

  if (target === null) {
    return (
      <div className="rounded-2xl border border-fuchsia-400/30 bg-black/40 px-6 py-5 text-center backdrop-blur-md">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-fuchsia-200/80">
          The date
        </p>
        <p className="mt-2 font-display text-3xl uppercase tracking-[0.06em] text-white">
          Coming Soon
        </p>
        <p className="mt-1 text-sm text-white/55">
          Set <code className="text-fuchsia-300">WEDDING_AT</code> in the details
          file and this countdown goes live.
        </p>
      </div>
    )
  }

  if (t?.done) {
    return (
      <div className="rounded-2xl border border-fuchsia-400/40 bg-fuchsia-500/10 px-6 py-6 text-center backdrop-blur-md">
        <p className="font-display text-3xl uppercase tracking-[0.06em] text-white">
          Married.
        </p>
        <p className="mt-1 text-sm text-white/70">Til death do us rock.</p>
      </div>
    )
  }

  const units = t
    ? [
        { v: t.days, l: 'Days' },
        { v: t.hours, l: 'Hrs' },
        { v: t.mins, l: 'Min' },
        { v: t.secs, l: 'Sec' },
      ]
    : [
        { v: 0, l: 'Days' },
        { v: 0, l: 'Hrs' },
        { v: 0, l: 'Min' },
        { v: 0, l: 'Sec' },
      ]

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {units.map((u) => (
        <div
          key={u.l}
          className="rounded-xl border border-fuchsia-400/30 bg-black/40 px-2 py-3 text-center backdrop-blur-md sm:px-4 sm:py-4"
        >
          <div className="font-display text-2xl leading-none tracking-[0.02em] text-white tabular-nums sm:text-4xl">
            {String(u.v).padStart(2, '0')}
          </div>
          <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.3em] text-fuchsia-200/70 sm:text-[10px]">
            {u.l}
          </div>
        </div>
      ))}
    </div>
  )
}
