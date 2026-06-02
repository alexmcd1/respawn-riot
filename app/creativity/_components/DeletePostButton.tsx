'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function DeletePostButton({ postId }: { postId: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function onDelete() {
    if (!confirm('Delete this transmission?')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/creativity/posts/${postId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!data.ok) {
        alert(typeof data.error === 'string' ? data.error : 'Could not delete.')
        return
      }
      router.push('/creativity')
      router.refresh()
    } catch {
      alert('Network error.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={busy}
      className="text-white/40 hover:text-red-300 disabled:opacity-50"
    >
      delete
    </button>
  )
}
