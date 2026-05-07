'use client'
import dynamic from 'next/dynamic'

const PhaserGame = dynamic(() => import('./PhaserGame'), { ssr: false })

export default function GamePage() {
  return (
    <main
      style={{
        background: '#0d0d1a',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <PhaserGame />
    </main>
  )
}
