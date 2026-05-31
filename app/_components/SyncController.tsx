'use client'

// Mounted once in the root layout. Watches the auth session — when the
// user is signed in, it:
//   1. Pulls each registered store's remote value, merges with local,
//      pushes merged back (handles first-sign-in-on-device case).
//   2. Subscribes to every store's change event so future local writes
//      get debounce-pushed to the server.
//
// When signed out: no-ops. The stores work like they always did
// (localStorage only).

import { useSession } from 'next-auth/react'
import { useEffect, useRef } from 'react'
import { getRegistry, mergeOnSignIn, schedulePush } from '../_lib/syncedStore'

// Side-effect import: each lib must call registerSyncedStore() when it
// imports. The single import below pulls them all in.
import '../_lib/syncedStoreRegistry'

export default function SyncController() {
  const { status } = useSession()
  const initialMergeDone = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (status !== 'authenticated') {
      initialMergeDone.current.clear()
      return
    }

    const registry = getRegistry()
    const cleanups: Array<() => void> = []

    // Step 1: initial merge per store (only once per session)
    for (const [kind, spec] of registry) {
      if (!initialMergeDone.current.has(kind)) {
        initialMergeDone.current.add(kind)
        void mergeOnSignIn(spec)
      }

      // Step 2: subscribe to local writes → debounced push
      const onChange = () => schedulePush(spec)
      window.addEventListener(spec.event, onChange)
      cleanups.push(() =>
        window.removeEventListener(spec.event, onChange)
      )
    }

    return () => {
      for (const c of cleanups) c()
    }
  }, [status])

  return null
}
