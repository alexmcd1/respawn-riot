'use client'

// Markdown renderer for transmission bodies + comments.
// Uses rehype-sanitize to drop anything dangerous (no raw HTML, no
// inline scripts, no event handlers). remark-gfm gives us tables +
// task lists + strikethrough + autolinked URLs.

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'

export default function PostBody({
  source,
  compact = false,
}: {
  source: string
  compact?: boolean
}) {
  return (
    <div
      className={
        compact
          ? 'prose-tight text-sm text-white/85'
          : 'prose-tight text-base text-white/90'
      }
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          // Style overrides so it matches the rest of the site without
          // pulling in Tailwind's prose plugin.
          h1: ({ children }) => <h2 className="mt-4 mb-2 font-display text-xl text-white">{children}</h2>,
          h2: ({ children }) => <h3 className="mt-3 mb-2 font-display text-lg text-white">{children}</h3>,
          h3: ({ children }) => <h4 className="mt-3 mb-2 font-display text-base text-white">{children}</h4>,
          p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-fuchsia-300 underline underline-offset-2 hover:text-fuchsia-200"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="my-2 list-disc pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal pl-5">{children}</ol>,
          li: ({ children }) => <li className="my-0.5">{children}</li>,
          code: ({ children }) => (
            <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-[0.85em] text-cyan-200">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="my-3 overflow-x-auto rounded-lg border border-white/10 bg-black/50 p-3 font-mono text-xs text-cyan-100">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-fuchsia-400/60 bg-fuchsia-500/5 px-3 py-1 italic text-white/75">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-white/10" />,
          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
          em: ({ children }) => <em className="text-white/85">{children}</em>,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  )
}
