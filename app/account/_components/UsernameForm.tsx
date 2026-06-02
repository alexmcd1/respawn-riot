'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  USERNAME_MAX,
  USERNAME_MIN,
  USERNAME_PATTERN,
} from '../../_lib/username'

type Status =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'ok'; msg: string }
  | { kind: 'error'; msg: string }

export default function UsernameForm({
  initialUsername,
}: {
  initialUsername: string
}) {
  const router = useRouter()
  const [value, setValue] = useState(initialUsername)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  const dirty = value.trim() !== initialUsername.trim()
  const localValid =
    value.trim().length === 0 || USERNAME_PATTERN.test(value.trim())

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus({ kind: 'saving' })
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: value.trim() === '' ? null : value.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!data.ok) {
        setStatus({
          kind: 'error',
          msg: typeof data.error === 'string' ? data.error : 'Save failed.',
        })
        return
      }
      setStatus({
        kind: 'ok',
        msg:
          data.username == null
            ? 'Username cleared.'
            : `Saved as ${data.username}.`,
      })
      // Refresh server-side data on the page so the "Display name" tile updates
      router.refresh()
    } catch {
      setStatus({ kind: 'error', msg: 'Network error.' })
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/[0.08] via-pink-500/[0.04] to-transparent p-5"
    >
      <p className="font-display text-[10px] tracking-[0.3em] text-fuchsia-300">
        ▌ USERNAME
      </p>
      <p className="mt-2 text-sm text-white/75">
        Pick a name that&apos;ll show up on your transmissions and replies.
      </p>

      <div className="mt-4 flex gap-2">
        <span className="flex items-center px-2 font-display text-base text-white/45">
          @
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (status.kind !== 'idle') setStatus({ kind: 'idle' })
          }}
          minLength={USERNAME_MIN}
          maxLength={USERNAME_MAX}
          placeholder="kid_ghost"
          autoComplete="off"
          aria-invalid={!localValid}
          className={`flex-1 rounded-xl border bg-black/40 px-4 py-3 font-mono text-base text-white outline-none placeholder:text-white/35 focus:border-fuchsia-400 ${
            !localValid ? 'border-red-400/60' : 'border-white/15'
          }`}
        />
        <button
          type="submit"
          disabled={status.kind === 'saving' || !dirty || !localValid}
          className="rounded-xl bg-fuchsia-500 px-5 py-3 font-display text-sm tracking-[0.25em] text-black hover:bg-fuchsia-400 disabled:opacity-40"
        >
          {status.kind === 'saving' ? '…' : 'SAVE'}
        </button>
      </div>

      <p className="mt-2 text-[11px] text-white/45">
        {USERNAME_MIN}–{USERNAME_MAX} chars. Letters, numbers, _, -.
        Can&apos;t start or end with _ or -. Leave empty to clear.
      </p>

      {status.kind === 'ok' && (
        <p className="mt-3 rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-2 text-sm text-emerald-100">
          ✓ {status.msg}
        </p>
      )}
      {status.kind === 'error' && (
        <p className="mt-3 rounded-lg border border-red-400/40 bg-red-500/10 p-2 text-sm text-red-200">
          ▲ {status.msg}
        </p>
      )}
    </form>
  )
}
