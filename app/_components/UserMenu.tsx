'use client'

// User menu shown in the top nav. Renders a SIGN IN button when logged
// out, an avatar bubble when logged in (click → dropdown with email +
// Sign out). Uses next-auth's useSession() for state.

import { signOut, useSession } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import { openSignIn } from './SignInModal'

export default function UserMenu({ compact = false }: { compact?: boolean }) {
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Click outside to close
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  // Loading flash: just render a placeholder so layout doesn't shift
  if (status === 'loading') {
    return (
      <span
        aria-hidden="true"
        className={
          compact
            ? 'h-8 w-8 rounded-full border border-white/10 bg-black/40'
            : 'h-9 w-24 rounded-md border border-white/10 bg-black/40'
        }
      />
    )
  }

  if (status !== 'authenticated' || !session?.user?.email) {
    return (
      <button
        type="button"
        onClick={() => openSignIn()}
        className={
          compact
            ? 'rounded-md border-2 border-fuchsia-400 bg-black px-3 py-1.5 font-display text-xs tracking-[0.2em] text-fuchsia-300 hover:bg-fuchsia-500/10'
            : 'rounded-md bg-gradient-to-r from-fuchsia-500 to-pink-500 px-4 py-2 font-display text-sm tracking-[0.2em] text-black transition hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(255,46,179,0.6)]'
        }
      >
        ✦ SIGN IN
      </button>
    )
  }

  const email = session.user.email
  const initial = email[0]?.toUpperCase() ?? '?'

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-fuchsia-400/40 bg-black/40 py-1 pl-1 pr-3 transition hover:border-fuchsia-400 hover:shadow-[0_0_12px_rgba(217,70,239,0.5)]"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-500 font-display text-sm text-black">
          {initial}
        </span>
        {!compact && (
          <span className="hidden font-display text-xs tracking-widest text-white/85 sm:inline">
            {email.split('@')[0]}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-fuchsia-500/40 bg-[#0c0c0c] shadow-[0_10px_40px_-10px_rgba(217,70,239,0.5)]">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="font-display text-[10px] tracking-[0.3em] text-fuchsia-300">
              SIGNED IN AS
            </p>
            <p className="mt-1 truncate text-sm text-white" title={email}>
              {email}
            </p>
          </div>
          <div className="px-2 py-2 text-xs text-white/55">
            Your favorites, recipes, ratings + quests sync across devices.
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              void signOut({ callbackUrl: '/' })
            }}
            className="block w-full border-t border-white/10 px-4 py-3 text-left font-display text-sm tracking-[0.2em] text-white/70 hover:bg-fuchsia-500/10 hover:text-fuchsia-200"
          >
            SIGN OUT →
          </button>
        </div>
      )}
    </div>
  )
}
