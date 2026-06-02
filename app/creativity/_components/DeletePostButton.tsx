'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function DeletePostButton({
  postId,
  isAdminAction = false,
}: {
  postId: number
  /** True when the signed-in user is an admin removing someone else's
   *  post (not deleting their own). Different copy + amber color. */
  isAdminAction?: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function onDelete() {
    const verb = isAdminAction ? "Remove this transmission as moderator" : "Delete this transmission"
    if (!confirm(`${verb}?`)) return
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
      className={
        isAdminAction
          ? "rounded-md border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
          : "text-white/40 hover:text-red-300 disabled:opacity-50"
      }
    >
      {isAdminAction ? "⚙ MOD REMOVE" : "delete"}
    </button>
  )
}
