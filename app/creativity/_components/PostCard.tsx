'use client'

import Link from 'next/link'
import { relativeTime, type PostListItem } from '../../_lib/creativity'
import AmplifyButton from './AmplifyButton'

export default function PostCard({ post }: { post: PostListItem }) {
  return (
    <li className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-fuchsia-400/40 hover:bg-white/[0.05]">
      <div className="flex gap-3 p-3 sm:p-4">
        {/* Amplify column */}
        <div className="shrink-0">
          <AmplifyButton
            postId={post.id}
            initialScore={post.score}
            initialAmplified={post.viewerAmplified}
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <Link
            href={`/creativity/${post.id}`}
            className="block group"
            aria-label={`Open transmission: ${post.title}`}
          >
            <h3 className="font-display text-lg leading-tight tracking-wide text-white group-hover:text-fuchsia-200 sm:text-xl">
              {post.title}
            </h3>
          </Link>
          {post.bodyExcerpt && (
            <p className="mt-1 line-clamp-2 text-sm text-white/65">
              {post.bodyExcerpt}
            </p>
          )}
          {/* Meta row */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
            <span className="text-white/45">
              by{' '}
              <span className="text-fuchsia-300/85">
                {post.authorName}
              </span>
            </span>
            <span className="text-white/35">·</span>
            <span className="text-white/45">{relativeTime(post.createdAt)}</span>
            <span className="text-white/35">·</span>
            <Link
              href={`/creativity/${post.id}#replies`}
              className="text-cyan-300/85 hover:text-cyan-200"
            >
              {post.commentCount} {post.commentCount === 1 ? 'reply' : 'replies'}
            </Link>
          </div>
          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {post.tags.map((t) => (
                <Link
                  key={t}
                  href={`/creativity?tag=${encodeURIComponent(t)}`}
                  className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-cyan-200 hover:bg-cyan-500/20"
                >
                  ◢ {t}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}
