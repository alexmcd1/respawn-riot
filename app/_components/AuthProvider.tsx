'use client'

// Thin wrapper around next-auth's SessionProvider so we can use
// useSession() in any client component. Mounted once in the root
// layout. Sessions are JWT-backed so this doesn't hit the DB on
// every page load.

import { SessionProvider } from 'next-auth/react'

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <SessionProvider>{children}</SessionProvider>
}
