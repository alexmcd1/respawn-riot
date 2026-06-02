'use client'

// Threaded comments — recursive renderer with inline reply boxes.
// Depth is visualized via a left indent + a tinted accent bar.

import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { openSignIn } from '../../_components/SignInModal'
import {
  COMMENT_BODY_MAX,
  COMMENT_BODY_MIN,
  MAX_COMMENT_DEPTH,
  relativeTime,
  type CommentNode,
} from '../../_lib/creativity'
import PostBody from './PostBody'

export default function CommentThread({
  postId,
  initialComments,
}: {
  postId: number
  initialComments: CommentNode[]
}) {
  const [comments, setComments] = useState<CommentNode[]>(initialComments)

  // Insert a new reply into the tree without re-fetching.
  function attachReply(reply: CommentNode) {
    if (reply.parentId == null) {
      setComments([reply, ...comments])
      return
    }
    const insert = (nodes: CommentNode[]): CommentNode[] =>
      nodes.map((n) => {
        if (n.id === reply.parentId) {
          return { ...n, replies: [...n.replies, reply] }
        }
        return { ...n, replies: insert(n.replies) }
      })
    setComments(insert(comments))
  }

  function markDeleted(commentId: number) {
    const walk = (nodes: CommentNode[]): CommentNode[] =>
      nodes.map((n) => {
        if (n.id === commentId) {
          return { ...n, body: '[deleted]', deletedAt: new Date().toISOString(), viewerCanDelete: false }
        }
        return { ...n, replies: walk(n.replies) }
      })
    setComments(walk(comments))
  }

  return (
    <div className="space-y-4">
      {/* Top-level reply box */}
      <ReplyBox postId={postId} parentId={null} onPosted={attachReply} variant="top" />

      {comments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-white/45">
          No replies yet. First signal?
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              postId={postId}
              onReplyPosted={attachReply}
              onDeleted={markDeleted}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function CommentItem({
  comment,
  postId,
  onReplyPosted,
  onDeleted,
}: {
  comment: CommentNode
  postId: number
  onReplyPosted: (c: CommentNode) => void
  onDeleted: (id: number) => void
}) {
  const [replying, setReplying] = useState(false)
  const canReplyDeeper = comment.depth < MAX_COMMENT_DEPTH
  const isDeleted = comment.deletedAt != null

  // Tinted left accent based on depth so threads are visually scannable
  const depthAccent = [
    'border-fuchsia-400/50',
    'border-cyan-400/40',
    'border-amber-400/40',
    'border-emerald-400/40',
    'border-pink-400/40',
    'border-violet-400/40',
  ][comment.depth % 6]

  async function onDelete() {
    if (!confirm('Delete this reply?')) return
    const res = await fetch(`/api/creativity/comments/${comment.id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (data.ok) onDeleted(comment.id)
    else if (typeof data.error === 'string') alert(data.error)
  }

  return (
    <li>
      <article className={`rounded-xl border-l-2 ${depthAccent} bg-white/[0.025] p-3`}>
        <div className="flex items-baseline justify-between gap-2 text-[11px]">
          <p>
            <span className="font-display text-fuchsia-300/85">{comment.authorName}</span>
            <span className="ml-2 text-white/40">{relativeTime(comment.createdAt)}</span>
            {isDeleted && (
              <span className="ml-2 rounded bg-white/5 px-1.5 py-0.5 text-white/35">
                deleted
              </span>
            )}
          </p>
          {comment.viewerCanDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="text-white/40 hover:text-red-300"
            >
              delete
            </button>
          )}
        </div>
        <div className="mt-2">
          {isDeleted ? (
            <p className="text-sm italic text-white/45">[deleted]</p>
          ) : (
            <PostBody source={comment.body} compact />
          )}
        </div>
        {!isDeleted && (
          <div className="mt-2 flex items-center gap-2 text-[11px]">
            {canReplyDeeper ? (
              <button
                type="button"
                onClick={() => setReplying((r) => !r)}
                className="font-display tracking-widest text-cyan-300/85 hover:text-cyan-200"
              >
                {replying ? '× CANCEL' : '↳ REPLY'}
              </button>
            ) : (
              <span className="text-white/40 italic">max thread depth — continue inline</span>
            )}
          </div>
        )}
        {replying && (
          <div className="mt-3">
            <ReplyBox
              postId={postId}
              parentId={comment.id}
              onPosted={(c) => {
                onReplyPosted(c)
                setReplying(false)
              }}
              variant="nested"
            />
          </div>
        )}
      </article>

      {comment.replies.length > 0 && (
        <ul className="ml-3 mt-2 space-y-2 sm:ml-5">
          {comment.replies.map((child) => (
            <CommentItem
              key={child.id}
              comment={child}
              postId={postId}
              onReplyPosted={onReplyPosted}
              onDeleted={onDeleted}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

function ReplyBox({
  postId,
  parentId,
  onPosted,
  variant,
}: {
  postId: number
  parentId: number | null
  onPosted: (c: CommentNode) => void
  variant: 'top' | 'nested'
}) {
  const { status } = useSession()
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status !== 'authenticated') {
      openSignIn()
      return
    }
    setError('')
    if (body.trim().length < COMMENT_BODY_MIN || body.trim().length > COMMENT_BODY_MAX) {
      setError(`Reply must be ${COMMENT_BODY_MIN}–${COMMENT_BODY_MAX} characters.`)
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/creativity/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body.trim(), parentId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!data.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Failed to post.')
        return
      }
      const c = data.comment
      const node: CommentNode = {
        id: c.id,
        postId: c.postId,
        parentId: c.parentId,
        authorId: c.authorId,
        authorName: c.authorName,
        body: c.body,
        depth: c.depth,
        createdAt: c.createdAt,
        deletedAt: null,
        viewerCanDelete: true,
        replies: [],
      }
      onPosted(node)
      setBody('')
    } catch {
      setError('Network error.')
    } finally {
      setSubmitting(false)
    }
  }

  const placeholder =
    variant === 'top'
      ? 'Drop a signal. Markdown welcome.'
      : 'Reply…'

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={COMMENT_BODY_MAX}
        placeholder={placeholder}
        rows={variant === 'top' ? 4 : 3}
        className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 font-mono text-sm text-white outline-none placeholder:text-white/35 focus:border-fuchsia-400"
      />
      {error && (
        <p className="rounded border border-red-400/40 bg-red-500/10 px-2 py-1 text-xs text-red-200">
          ▲ {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-white/40">
          {body.length} / {COMMENT_BODY_MAX}
        </span>
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="rounded-lg bg-fuchsia-500 px-4 py-1.5 font-display text-xs tracking-[0.25em] text-black hover:bg-fuchsia-400 disabled:opacity-50"
        >
          {submitting ? '…' : variant === 'top' ? 'TRANSMIT' : 'REPLY'}
        </button>
      </div>
    </form>
  )
}
