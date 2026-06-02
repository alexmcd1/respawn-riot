'use client'

// "+ NEW TRANSMISSION" form. Collapsible to keep the list view tidy.
// Auth-gated — sign-in modal opens for unauthenticated users.

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { openSignIn } from '../../_components/SignInModal'
import {
  MAX_TAGS_PER_POST,
  POST_BODY_MAX,
  POST_BODY_MIN,
  POST_TITLE_MAX,
  POST_TITLE_MIN,
  normalizeTag,
} from '../../_lib/creativity'

export default function NewPostForm() {
  const { status } = useSession()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function openForm() {
    if (status !== 'authenticated') {
      openSignIn()
      return
    }
    setOpen(true)
  }

  function addTagChip(raw: string) {
    const n = normalizeTag(raw)
    if (!n) { setTagInput(''); return }
    if (tags.includes(n)) { setTagInput(''); return }
    if (tags.length >= MAX_TAGS_PER_POST) { setTagInput(''); return }
    setTags([...tags, n])
    setTagInput('')
  }

  function onTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault()
      addTagChip(tagInput)
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1))
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (title.trim().length < POST_TITLE_MIN || title.trim().length > POST_TITLE_MAX) {
      setError(`Title must be ${POST_TITLE_MIN}–${POST_TITLE_MAX} characters.`)
      return
    }
    if (body.trim().length < POST_BODY_MIN || body.trim().length > POST_BODY_MAX) {
      setError(`Body must be ${POST_BODY_MIN}–${POST_BODY_MAX} characters.`)
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/creativity/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), tags }),
      })
      const data = await res.json().catch(() => ({}))
      if (!data.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not broadcast.')
        return
      }
      // Reset + redirect to the new transmission
      setTitle('')
      setBody('')
      setTags([])
      setOpen(false)
      router.push(`/creativity/${data.id}`)
    } catch {
      setError('Network error. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={openForm}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-fuchsia-500/40 bg-fuchsia-500/5 px-4 py-4 font-display text-sm tracking-[0.25em] text-fuchsia-200 transition hover:border-fuchsia-400 hover:bg-fuchsia-500/10"
      >
        ✦ NEW TRANSMISSION
      </button>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-2xl border border-fuchsia-500/40 bg-black/30 p-4 shadow-[0_0_24px_-8px_rgba(217,70,239,0.6)]"
    >
      <div className="flex items-baseline justify-between">
        <p className="font-display text-[10px] tracking-[0.3em] text-fuchsia-300">
          ▌ NEW TRANSMISSION
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[11px] uppercase tracking-widest text-white/45 hover:text-white"
        >
          × cancel
        </button>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={POST_TITLE_MAX}
        placeholder="Title — what's the idea?"
        required
        className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 font-display text-base tracking-wide text-white outline-none placeholder:text-white/35 focus:border-fuchsia-400"
      />

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={POST_BODY_MAX}
        placeholder={`Markdown welcome. **bold** *italic* \`code\` [link](url)\n\nWhat's the spark? What are you trying to make? Where do you need help?`}
        rows={8}
        required
        className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 font-mono text-sm text-white outline-none placeholder:text-white/35 focus:border-fuchsia-400"
      />
      <div className="flex justify-between text-[11px] text-white/45">
        <span>Markdown: **bold** *italic* `code` [link](url)</span>
        <span>{body.length} / {POST_BODY_MAX}</span>
      </div>

      {/* Tags */}
      <div>
        <label className="font-display text-[10px] tracking-[0.3em] text-fuchsia-300">
          ▌ FREQUENCIES <span className="text-white/40">(up to {MAX_TAGS_PER_POST}, press enter to add)</span>
        </label>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 rounded-xl border border-white/15 bg-black/40 px-2 py-2 focus-within:border-fuchsia-400">
          {tags.map((t) => (
            <span
              key={t}
              className="flex items-center gap-1 rounded-full border border-cyan-400/40 bg-cyan-500/10 pl-2.5 pr-1 font-mono text-[11px] uppercase text-cyan-100"
            >
              ◢ {t}
              <button
                type="button"
                onClick={() => setTags(tags.filter((x) => x !== t))}
                aria-label={`Remove ${t}`}
                className="rounded-full px-1.5 py-0.5 text-cyan-300/60 hover:text-red-300"
              >
                ✕
              </button>
            </span>
          ))}
          {tags.length < MAX_TAGS_PER_POST && (
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={onTagKeyDown}
              onBlur={() => tagInput && addTagChip(tagInput)}
              placeholder={tags.length === 0 ? 'game-dev, music, art, story-idea…' : 'add another'}
              className="min-w-[10ch] flex-1 bg-transparent px-1 py-1 font-mono text-xs text-white outline-none placeholder:text-white/35"
            />
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
          ▲ {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-6 py-3 font-display text-base tracking-[0.25em] text-black hover:scale-[1.01] transition disabled:opacity-50"
      >
        {submitting ? 'TRANSMITTING…' : '✦ TRANSMIT'}
      </button>
    </form>
  )
}
