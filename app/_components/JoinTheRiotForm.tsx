'use client'

import { useState } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'already' | 'error'

export default function JoinTheRiotForm() {
  const [email, setEmail] = useState('')
  const [honeypot, setHoneypot] = useState('') // bots fill, humans don't
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')

  const locked = status === 'loading' || status === 'success' || status === 'already'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (locked) return
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, honeypot }),
      })
      const data = await res.json().catch(() => ({} as Record<string, unknown>))

      if (!res.ok || data.ok !== true) {
        setStatus('error')
        setErrorMsg(typeof data.error === 'string' ? data.error : 'Something glitched. Try again.')
        return
      }

      setStatus(data.alreadySubscribed === true ? 'already' : 'success')
      setEmail('')
    } catch {
      setStatus('error')
      setErrorMsg('Network error — try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto mt-8 w-full max-w-xl">
      {/* Honeypot — visually hidden but accessible to dumb bots */}
      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label>
          Don&apos;t fill this in:
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          disabled={locked}
          aria-label="Email address"
          className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-fuchsia-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={locked}
          className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-6 py-3 font-display text-base tracking-[0.2em] text-black transition hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(255,46,179,0.6)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
        >
          {status === 'loading' ? 'JOINING…' : status === 'success' || status === 'already' ? 'YOU’RE IN' : 'SIGN UP'}
        </button>
      </div>

      {/* Status row */}
      <div className="mt-3 min-h-[1.25rem] text-sm">
        {status === 'success' && (
          <p className="font-display tracking-[0.15em] text-fuchsia-300">
            ▌ YOU&apos;RE IN. WELCOME TO THE RIOT.
          </p>
        )}
        {status === 'already' && (
          <p className="font-display tracking-[0.15em] text-cyan-300">
            ▌ ALREADY ON THE LIST. —kg
          </p>
        )}
        {status === 'error' && (
          <p className="font-display tracking-[0.15em] text-red-300">
            ▲ {errorMsg}
          </p>
        )}
      </div>
    </form>
  )
}
