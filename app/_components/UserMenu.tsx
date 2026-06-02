'use client'

// User menu shown in the top nav. Renders a SIGN IN button when logged
// out, an avatar bubble when logged in (click → dropdown with email +
// Sign out). Uses next-auth's useSession() for state.

import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import { openSignIn } from './SignInModal'

export default function UserMenu({ compact = false }: { compact?: boolean }) {
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const [profileName, setProfileName] = useState<string | null>(null)
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

  // Once signed in, fetch the user's username + computed display name
  // so the chip shows their chosen handle (not just the email local
  // part). The fetch runs in the background — the chip starts with the
  // email-derived name and upgrades when the request resolves.
  useEffect(() => {
    if (status !== 'authenticated') return
    let cancelled = false
    fetch('/api/account')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data?.ok && typeof data.displayName === 'string') {
          setProfileName(data.displayName)
        }
      })
      .catch(() => {
        // Best effort — fall back to email split silently
      })
    return () => { cancelled = true }
  }, [status])

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

  // Prefer the user's chosen username (loaded async from /api/account),
  // fall back to the email's local part while the fetch is in flight.
  const handle = profileName ?? email.split('@')[0]
  const initial = handle[0]?.toUpperCase() ?? '?'
  const shortName = handle.length > 10 ? `${handle.slice(0, 10)}…` : handle

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Account menu — signed in as ${email}`}
        aria-expanded={open}
        title={`Signed in as ${email}`}
        className="flex items-center gap-2 rounded-full border-2 border-emerald-400/70 bg-emerald-500/10 py-1 pl-1 pr-3 shadow-[0_0_12px_-2px_rgba(52,211,153,0.6)] transition hover:border-emerald-400 hover:shadow-[0_0_16px_-2px_rgba(52,211,153,0.8)]"
      >
        {/* Avatar with status dot — green ring + corner dot make the
            "signed in" state unmistakable, even on mobile where the
            text label is short. */}
        <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-500 font-display text-sm text-black">
          {initial}
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-black"
          />
        </span>
        {!compact && (
          <span className="font-display text-xs tracking-widest text-emerald-200">
            <span className="text-emerald-400">●</span> {shortName}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-fuchsia-500/40 bg-[#0c0c0c] shadow-[0_10px_40px_-10px_rgba(217,70,239,0.5)]">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="font-display text-[10px] tracking-[0.3em] text-fuchsia-300">
              SIGNED IN AS
            </p>
            <p className="mt-1 truncate font-display text-base text-white" title={handle}>
              {handle}
            </p>
            {profileName && profileName !== email.split('@')[0] && (
              <p className="mt-0.5 truncate font-mono text-[11px] text-white/45" title={email}>
                {email}
              </p>
            )}
          </div>
          <div className="px-2 py-2 text-xs text-white/55">
            Your favorites, recipes, ratings + quests sync across devices.
          </div>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block border-t border-white/10 px-4 py-3 font-display text-sm tracking-[0.2em] text-white/70 hover:bg-fuchsia-500/10 hover:text-fuchsia-200"
          >
            ⚙ ACCOUNT &amp; USERNAME
          </Link>
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
