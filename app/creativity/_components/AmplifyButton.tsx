'use client'

// Toggle amplify (upvote) on a transmission. Optimistically updates the
// score/state locally and reverts on failure. Opens the sign-in modal
// for unauthenticated users.

import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { openSignIn } from '../../_components/SignInModal'

export default function AmplifyButton({
  postId,
  initialScore,
  initialAmplified,
}: {
  postId: number
  initialScore: number
  initialAmplified?: boolean
}) {
  const { status } = useSession()
  const [score, setScore] = useState(initialScore)
  const [amplified, setAmplified] = useState(!!initialAmplified)
  const [busy, setBusy] = useState(false)

  async function toggle() {
    if (status !== 'authenticated') {
      openSignIn()
      return
    }
    if (busy) return
    // Optimistic
    const prevScore = score
    const prevAmp = amplified
    setBusy(true)
    setAmplified(!amplified)
    setScore(amplified ? score - 1 : score + 1)
    try {
      const res = await fetch(`/api/creativity/posts/${postId}/amplify`, {
        method: 'POST',
      })
      const data = await res.json().catch(() => ({}))
      if (!data.ok) {
        // Revert + bubble up
        setScore(prevScore)
        setAmplified(prevAmp)
        if (typeof data.error === 'string') alert(data.error)
      } else {
        // Sync to server truth
        setScore(typeof data.score === 'number' ? data.score : prevScore)
        setAmplified(!!data.amplified)
      }
    } catch {
      setScore(prevScore)
      setAmplified(prevAmp)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={amplified}
      aria-label={amplified ? 'Remove amplify' : 'Amplify this transmission'}
      className={`flex flex-col items-center gap-0.5 rounded-lg border px-2 py-1.5 font-mono transition ${
        amplified
          ? 'border-fuchsia-400 bg-fuchsia-500/15 text-fuchsia-100 shadow-[0_0_12px_-2px_rgba(217,70,239,0.6)]'
          : 'border-white/15 bg-black/30 text-white/65 hover:border-fuchsia-400/60 hover:text-fuchsia-200'
      } disabled:opacity-50`}
    >
      <span className="text-base leading-none">▲</span>
      <span className="font-display text-xs tabular-nums">{score}</span>
    </button>
  )
}
