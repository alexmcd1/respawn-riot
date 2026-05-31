'use client'

// Sign-in modal: magic-link only (no passwords, no OAuth).
// Mounted globally so any "Sign in" button can open it via a custom
// 'respawn:open-signin' event.

import { signIn } from 'next-auth/react'
import { useEffect, useState } from 'react'

export const OPEN_SIGNIN_EVENT = 'respawn:open-signin'

type Stage = 'form' | 'sending' | 'sent' | 'error'

export default function SignInModal() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [stage, setStage] = useState<Stage>('form')
  const [errorMsg, setErrorMsg] = useState('')

  // Listen for the global open event
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onOpen = () => {
      setOpen(true)
      setStage('form')
      setErrorMsg('')
    }
    window.addEventListener(OPEN_SIGNIN_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_SIGNIN_EVENT, onOpen)
  }, [])

  // Close on ESC
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStage('sending')
    setErrorMsg('')
    try {
      const result = await signIn('resend', {
        email: email.trim(),
        redirect: false,
      })
      if (result?.error) {
        setStage('error')
        setErrorMsg(
          result.error === 'EmailSignin'
            ? "Couldn't send the sign-in email. Check the address and try again."
            : `Sign-in failed: ${result.error}`
        )
        return
      }
      setStage('sent')
    } catch {
      setStage('error')
      setErrorMsg('Network error — try again.')
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-title"
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-fuchsia-500/40 bg-[#0a0a0a] p-6 shadow-[0_0_40px_-10px_rgba(217,70,239,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-md border border-white/10 px-2 py-1 text-xs text-white/60 hover:border-white/30 hover:text-white"
        >
          ✕
        </button>

        <p className="font-display text-[10px] tracking-[0.3em] text-fuchsia-300">
          ▌ RESPAWN / RIOT
        </p>
        <h2 id="signin-title" className="mt-2 font-display text-3xl tracking-wide text-white">
          {stage === 'sent' ? 'CHECK YOUR EMAIL' : 'SIGN IN'}
        </h2>

        {stage === 'form' && (
          <>
            <p className="mt-3 text-sm text-white/65">
              Enter your email. We&apos;ll send a one-tap sign-in link.
              No passwords, no spam.
            </p>
            <form onSubmit={onSubmit} className="mt-5 space-y-3">
              <input
                type="email"
                autoComplete="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-fuchsia-400"
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-6 py-3 font-display text-sm tracking-[0.25em] text-black hover:scale-[1.02] transition"
              >
                ✦ SEND SIGN-IN LINK
              </button>
            </form>
            <p className="mt-4 text-xs text-white/50">
              Signing in syncs your saved recipes, restaurant ratings,
              shopping list, quest tracker, and favorite bands across
              devices. You can keep using the site without signing in —
              this is purely additive.
            </p>
          </>
        )}

        {stage === 'sending' && (
          <p className="mt-6 text-sm text-white/65">Sending the link…</p>
        )}

        {stage === 'sent' && (
          <>
            <p className="mt-3 text-sm text-white/85">
              We sent a sign-in link to{' '}
              <strong className="text-fuchsia-300">{email}</strong>.
            </p>
            <p className="mt-2 text-sm text-white/55">
              Click the link in that email to finish signing in. Link is
              good for 24 hours. Check your spam folder if it doesn&apos;t
              arrive in a minute or two.
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 w-full rounded-xl border border-white/15 px-4 py-2.5 font-display text-sm tracking-[0.2em] text-white/80 hover:border-white/30 hover:text-white"
            >
              CLOSE
            </button>
          </>
        )}

        {stage === 'error' && (
          <>
            <p className="mt-4 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
              ▲ {errorMsg}
            </p>
            <button
              type="button"
              onClick={() => setStage('form')}
              className="mt-4 w-full rounded-xl border border-white/15 px-4 py-2.5 font-display text-sm tracking-[0.2em] text-white/80 hover:border-white/30 hover:text-white"
            >
              ← TRY AGAIN
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// Helper for other components: fire this to open the modal from anywhere.
export function openSignIn() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OPEN_SIGNIN_EVENT))
}
