'use client'

// Native React port of the old public/games/math.html.
// No more iframe — this renders inline as part of the /cram page so
// the look-and-feel matches the rest of Respawn Riot.
//
// What changed from the HTML version:
//   * Tailwind utility classes (matched to site palette) replace the
//     hand-rolled CSS for layout and chrome. The site's standard
//     punk-noir vibe (low-saturation black + white/[0.06] cards +
//     fuchsia accent) replaces the more saturated original palette.
//   * Streak gradients on <body> are gone — they were the most "bright"
//     part of the old version. Replaced with a subtle card-glow ring
//     that intensifies only on the milestone toast.
//   * State + UI is React, not document.getElementById string-templating.
//   * Question logic is unchanged — same 50+ generators, same pool
//     build, same scoring. Lives in app/cram/_lib/questions.ts.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  buildPool,
  parseUserAnswer,
  answerText,
  shuffle,
  round,
  type Question,
} from '../_lib/questions'
import styles from './MathFlashcards.module.css'

// ─── Constants ─────────────────────────────────────────────────────

const SESSION_SIZE = 50
const GRADES: Array<{ n: 5 | 6 | 7 | 8; label: string }> = [
  { n: 5, label: '5th' },
  { n: 6, label: '6th' },
  { n: 7, label: '7th (Exam)' },
  { n: 8, label: '8th' },
]

type MissedQuestion = Question & { yours: string; correctText: string }

// ─── Component ─────────────────────────────────────────────────────

export default function MathFlashcards() {
  // Pool is built once on mount — buildPool() uses Math.random which is
  // hydration-unsafe to run in the initial state initializer (server vs
  // client diverge). Defer to a useEffect, render a tiny placeholder
  // until ready.
  const [pool, setPool] = useState<Question[] | null>(null)
  useEffect(() => {
    setPool(buildPool())
  }, [])

  const [grade, setGrade] = useState<5 | 6 | 7 | 8>(7)
  const [topic, setTopic] = useState<string>('All')
  const [workingSet, setWorkingSet] = useState<Question[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [missed, setMissed] = useState<MissedQuestion[]>([])
  const [feedback, setFeedback] = useState<{ right: boolean; text: string } | null>(null)
  const [picked, setPicked] = useState<string | null>(null) // MC choice
  const [userAnswer, setUserAnswer] = useState('')
  const [shuffledOpts, setShuffledOpts] = useState<string[]>([])

  // Toggleable tool panels
  const [showWorkspace, setShowWorkspace] = useState(false)
  const [showCalc, setShowCalc] = useState(false)
  const [workspaceText, setWorkspaceText] = useState('')

  // Streak toast
  const [streakToast, setStreakToast] = useState<string | null>(null)

  // Topics available for the current grade
  const gradeTopics = useMemo(() => {
    if (!pool) return ['All']
    return ['All', ...new Set(pool.filter((q) => q.grade === grade).map((q) => q.topic))]
  }, [pool, grade])

  const startSession = useCallback(
    (g: 5 | 6 | 7 | 8 = grade, t: string = topic) => {
      if (!pool) return
      let candidates = pool.filter((q) => q.grade === g)
      if (t !== 'All') candidates = candidates.filter((q) => q.topic === t)
      shuffle(candidates)
      setWorkingSet(candidates.slice(0, Math.min(SESSION_SIZE, candidates.length)))
      setCurrentIdx(0)
      setCorrectCount(0)
      setWrongCount(0)
      setStreak(0)
      setBestStreak(0)
      setMissed([])
      setFeedback(null)
      setPicked(null)
      setUserAnswer('')
      setShowWorkspace(false)
      setShowCalc(false)
      setWorkspaceText('')
    },
    [pool, grade, topic],
  )

  // Initial session once the pool finishes building.
  const didInit = useRef(false)
  useEffect(() => {
    if (pool && !didInit.current) {
      didInit.current = true
      startSession(grade, topic)
    }
  }, [pool, grade, topic, startSession])

  // Re-shuffle MC options when the current question changes.
  const current = workingSet[currentIdx]
  useEffect(() => {
    if (current?.type === 'mc' && current.options) {
      setShuffledOpts(shuffle([...current.options]))
    } else {
      setShuffledOpts([])
    }
    setFeedback(null)
    setPicked(null)
    setUserAnswer('')
  }, [current])

  // ─── Answer handlers ──────────────────────────────────────────────

  const handleSubmit = useCallback(
    (chosen?: string) => {
      if (!current || feedback) return
      let isRight = false
      let yours = ''
      if (current.type === 'mc' && chosen != null) {
        isRight = chosen === current.correct
        yours = chosen
        setPicked(chosen)
      } else if (current.type === 'numeric') {
        const raw = userAnswer
        yours = raw
        const val = parseUserAnswer(raw)
        const tol = current.tolerance ?? 0.001
        isRight = !isNaN(val) && Math.abs(val - (current.answer ?? 0)) <= tol
      }

      const correctTxt = answerText(current)

      if (isRight) {
        setCorrectCount((c) => c + 1)
        setStreak((s) => {
          const next = s + 1
          setBestStreak((b) => Math.max(b, next))
          maybeFireStreakToast(next)
          return next
        })
        ding()
        setFeedback({ right: true, text: '' })
      } else {
        setWrongCount((w) => w + 1)
        setStreak(0)
        setMissed((m) => [...m, { ...current, yours, correctText: correctTxt }])
        setFeedback({ right: false, text: correctTxt })
      }
    },
    [current, feedback, userAnswer],
  )

  const handleSkip = useCallback(() => {
    if (!current) return
    if (!feedback) {
      // Skipping without answering = wrong + adds to review list
      const correctTxt = answerText(current)
      setWrongCount((w) => w + 1)
      setStreak(0)
      setMissed((m) => [...m, { ...current, yours: '(skipped)', correctText: correctTxt }])
    }
    setCurrentIdx((i) => i + 1)
  }, [current, feedback])

  const handleNext = useCallback(() => {
    setCurrentIdx((i) => i + 1)
  }, [])

  // Pre-fill workspace with a stacked arithmetic problem if the current
  // question has an `expr` field (decimal +/-/×, integer ops, etc.)
  const stackOnPaper = useCallback(() => {
    if (!current?.expr) return
    setShowWorkspace(true)
    const m = current.expr.match(/^(-?\d*\.?\d+)\s*([+\-*/])\s*(-?\d*\.?\d+)$/)
    if (!m) return
    let a = m[1]; const op = m[2]; let b = m[3]
    const opSym: Record<string, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' }
    const decimals = (s: string) => (s.split('.')[1] || '').length
    const da = decimals(a); const db = decimals(b); const dmax = Math.max(da, db)
    if (op !== '/') {
      if (da < dmax) a = a + (da === 0 ? '.' : '') + '0'.repeat(dmax - da)
      if (db < dmax) b = b + (db === 0 ? '.' : '') + '0'.repeat(dmax - db)
    }
    const width = Math.max(a.length, b.length) + 2
    const pad = (n: string) => n.padStart(width)
    const line = '─'.repeat(width)
    let text: string
    if (op === '/') text = `       ${pad(a).trim()}\n  ${b} ) ${a}\n`
    else text = `${pad(a)}\n${opSym[op]} ${pad(b).slice(2)}\n${line}\n`
    setWorkspaceText(text)
  }, [current])

  // ─── Streak feedback ──────────────────────────────────────────────

  const maybeFireStreakToast = useCallback((n: number) => {
    if (n === 5) {
      setStreakToast('Streak · 5 in a row')
      spawnParticles(15)
      boom(1)
      setTimeout(() => setStreakToast(null), 1500)
    } else if (n === 10) {
      setStreakToast('On Fire · 10 streak')
      spawnParticles(28)
      boom(2)
      setTimeout(() => setStreakToast(null), 1500)
    } else if (n === 15 || (n > 15 && n % 5 === 0)) {
      setStreakToast(`Unstoppable · ${n} in a row`)
      spawnParticles(45)
      boom(3)
      setTimeout(() => setStreakToast(null), 1500)
    }
  }, [])

  // ─── Render ────────────────────────────────────────────────────────

  if (!pool) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-white/40 font-mono text-xs tracking-[0.3em]">
        loading question pool…
      </div>
    )
  }

  const sessionLen = workingSet.length
  const qNum = Math.min(currentIdx + 1, sessionLen || 1)
  const progressPct =
    sessionLen === 0 ? 0 : Math.round((currentIdx / sessionLen) * 100)
  const summary = currentIdx >= sessionLen && sessionLen > 0
  const empty = sessionLen === 0

  return (
    <section className="px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        {/* ─── Header card: grade selector + stats + topic pills ─── */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
          {/* Grades */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GRADES.map((g) => {
              const active = g.n === grade
              return (
                <button
                  key={g.n}
                  type="button"
                  onClick={() => {
                    setGrade(g.n)
                    setTopic('All')
                    startSession(g.n, 'All')
                  }}
                  className={[
                    'rounded-md border px-3 py-2.5 text-left transition',
                    active
                      ? 'border-fuchsia-400/60 bg-fuchsia-500/10 text-white shadow-[0_0_18px_-6px_rgba(255,46,179,0.6)]'
                      : 'border-white/10 bg-black/30 text-white/70 hover:border-fuchsia-400/40 hover:text-white',
                  ].join(' ')}
                >
                  <span className="block font-display text-xl leading-none tracking-[0.04em]">
                    {g.n}
                  </span>
                  <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.25em] text-white/55">
                    {g.label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Stats row */}
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 sm:grid-cols-6">
            <StatPill label="Question" value={qNum} />
            <StatPill label="Correct" value={correctCount} valueClass="text-cyan-200" />
            <StatPill label="Wrong" value={wrongCount} valueClass="text-rose-200" />
            <StatPill
              label="Streak"
              value={streak}
              valueClass={streak >= 3 ? 'text-fuchsia-200' : 'text-white/70'}
            />
            <StatPill label="Best" value={bestStreak} />
            <StatPill label="Of" value={sessionLen} />
          </div>

          {/* Topic pills */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {gradeTopics.map((t) => {
              const active = t === topic
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTopic(t)
                    startSession(grade, t)
                  }}
                  className={[
                    'rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] transition',
                    active
                      ? 'border-fuchsia-400/70 bg-fuchsia-500/15 text-fuchsia-100'
                      : 'border-white/10 bg-black/30 text-white/55 hover:border-fuchsia-400/40 hover:text-white/85',
                  ].join(' ')}
                >
                  {t}
                </button>
              )
            })}
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-pink-500 to-cyan-400 transition-[width] duration-300"
              style={{ width: `${summary ? 100 : progressPct}%` }}
            />
          </div>
        </div>

        {/* ─── Empty state, summary, or active question card ─── */}
        {empty ? (
          <EmptyState />
        ) : summary ? (
          <SummaryCard
            correctCount={correctCount}
            sessionLen={sessionLen}
            bestStreak={bestStreak}
            grade={grade}
            missed={missed}
            onRestart={() => startSession(grade, topic)}
          />
        ) : (
          current && (
            <QuestionCard
              q={current}
              streak={streak}
              feedback={feedback}
              picked={picked}
              shuffledOpts={shuffledOpts}
              userAnswer={userAnswer}
              setUserAnswer={setUserAnswer}
              onSubmit={handleSubmit}
              onNext={handleNext}
              onSkip={handleSkip}
              showWorkspace={showWorkspace}
              showCalc={showCalc}
              toggleWorkspace={() => setShowWorkspace((v) => !v)}
              toggleCalc={() => setShowCalc((v) => !v)}
              stackOnPaper={stackOnPaper}
              workspaceText={workspaceText}
              setWorkspaceText={setWorkspaceText}
            />
          )
        )}
      </div>

      {/* Streak toast — center of viewport, very brief. */}
      {streakToast && (
        <div
          className={`fixed left-1/2 top-1/3 z-50 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-fuchsia-400/60 bg-black/85 px-6 py-4 text-center font-display text-xl tracking-[0.15em] uppercase text-fuchsia-200 shadow-[0_0_50px_-8px_rgba(255,46,179,0.7)] backdrop-blur-md ${styles.streakPop}`}
          aria-live="polite"
        >
          {streakToast}
        </div>
      )}
    </section>
  )
}

// ─── Subcomponents ───────────────────────────────────────────────────

function StatPill({
  label,
  value,
  valueClass = 'text-white/85',
}: {
  label: string
  value: number
  valueClass?: string
}) {
  return (
    <div className="text-center">
      <strong className={`block font-display text-xl leading-none tracking-[0.04em] ${valueClass}`}>
        {value}
      </strong>
      <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.25em] text-white/45">
        {label}
      </span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/55">
      No questions for this filter. Try selecting &ldquo;All&rdquo; topics or a
      different grade.
    </div>
  )
}

function QuestionCard({
  q, streak, feedback, picked, shuffledOpts,
  userAnswer, setUserAnswer,
  onSubmit, onNext, onSkip,
  showWorkspace, showCalc,
  toggleWorkspace, toggleCalc, stackOnPaper,
  workspaceText, setWorkspaceText,
}: {
  q: Question
  streak: number
  feedback: { right: boolean; text: string } | null
  picked: string | null
  shuffledOpts: string[]
  userAnswer: string
  setUserAnswer: (v: string) => void
  onSubmit: (chosen?: string) => void
  onNext: () => void
  onSkip: () => void
  showWorkspace: boolean
  showCalc: boolean
  toggleWorkspace: () => void
  toggleCalc: () => void
  stackOnPaper: () => void
  workspaceText: string
  setWorkspaceText: (v: string) => void
}) {
  const numericRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (q.type === 'numeric') numericRef.current?.focus()
  }, [q])

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-[0_8px_32px_-12px_rgba(255,46,179,0.18)] sm:p-6">
      {/* Tag row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-amber-200">
          {q.topic}
        </span>
        <span className="rounded-md border border-fuchsia-400/40 bg-fuchsia-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-fuchsia-200">
          Grade {q.grade}
        </span>
        {streak >= 3 && (
          <span className="rounded-md border border-fuchsia-400/60 bg-fuchsia-500/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-fuchsia-200">
            · {streak} streak
          </span>
        )}
      </div>

      {/* Question */}
      <p className="mt-4 text-lg leading-relaxed text-white/90">
        {q.q}
      </p>
      {q.data && (
        <pre className="mt-3 whitespace-pre-wrap rounded-md border border-white/10 bg-black/40 px-4 py-3 font-mono text-sm text-cyan-200">
          {q.data}
        </pre>
      )}

      {/* Tool bar */}
      <div className="mt-4 flex flex-wrap gap-2">
        <ToolButton onClick={toggleWorkspace} active={showWorkspace}>
          Scratch paper
        </ToolButton>
        <ToolButton onClick={toggleCalc} active={showCalc}>
          Calculator
        </ToolButton>
        {q.expr && (
          <ToolButton onClick={stackOnPaper} active={false}>
            Stack on paper
          </ToolButton>
        )}
      </div>

      {showWorkspace && (
        <div className="mt-3 rounded-md border border-dashed border-cyan-400/30 bg-black/40 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/50">
            ▌ Work it out
          </p>
          <textarea
            spellCheck={false}
            value={workspaceText}
            onChange={(e) => setWorkspaceText(e.target.value)}
            className={`mt-2 block min-h-[140px] w-full resize-y rounded-md border border-white/10 px-3 py-2 font-mono text-base leading-6 text-white whitespace-pre ${styles.scratchPaper}`}
          />
          <button
            type="button"
            onClick={() => setWorkspaceText('')}
            className="mt-2 rounded-md border border-cyan-400/40 bg-transparent px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-200 hover:bg-cyan-500/10"
          >
            Clear
          </button>
        </div>
      )}

      {showCalc && <Calculator />}

      {/* Answer area */}
      <div className="mt-4">
        {q.type === 'mc' ? (
          <div className="flex flex-col gap-2">
            {shuffledOpts.map((opt) => {
              const isCorrect = opt === q.correct
              const isWrongPick = picked === opt && opt !== q.correct
              const showResult = feedback !== null
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={feedback !== null}
                  onClick={() => onSubmit(opt)}
                  className={[
                    'rounded-xl border px-4 py-3 text-left transition',
                    showResult && isCorrect
                      ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-100'
                      : showResult && isWrongPick
                        ? 'border-rose-400/50 bg-rose-500/10 text-rose-100'
                        : 'border-white/10 bg-black/30 text-white/85 hover:border-fuchsia-400/50 hover:bg-fuchsia-500/[0.06]',
                    feedback !== null && 'cursor-not-allowed',
                  ].join(' ')}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <input
                ref={numericRef}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                autoCapitalize="off"
                value={userAnswer}
                disabled={feedback !== null}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSubmit()
                }}
                placeholder="Type your answer…"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-base text-white placeholder:text-white/30 focus:border-fuchsia-400/60 focus:bg-fuchsia-500/[0.04] focus:outline-none disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => onSubmit()}
                disabled={feedback !== null}
                className="shrink-0 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500 px-5 py-3 font-display text-sm uppercase tracking-[0.18em] text-black transition hover:scale-[1.02] disabled:opacity-50"
              >
                Submit
              </button>
            </div>
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
              {q.isFraction
                ? 'Type as fraction (3/4) or decimal (0.75)'
                : 'Type a number. Decimals OK.'}
            </p>
          </>
        )}
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`mt-4 rounded-xl border-l-4 px-4 py-3 ${
            feedback.right
              ? 'border-emerald-400 bg-emerald-500/10'
              : 'border-amber-400 bg-amber-500/10'
          }`}
        >
          <p
            className={`font-mono text-[10px] uppercase tracking-[0.25em] ${
              feedback.right ? 'text-emerald-200' : 'text-amber-200'
            }`}
          >
            {feedback.right ? '▌ Correct' : `▌ Not quite — answer: ${feedback.text}`}
          </p>
          {q.tip && (
            <p className="mt-2 text-sm italic text-white/75">{q.tip}</p>
          )}
        </div>
      )}

      {/* Bottom controls */}
      <div className="mt-5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onSkip}
          className="rounded-md border border-white/15 bg-black/30 px-4 py-2 font-display text-xs uppercase tracking-[0.22em] text-white/70 hover:border-white/30 hover:text-white"
        >
          Skip →
        </button>
        {feedback && (
          <button
            type="button"
            onClick={onNext}
            autoFocus
            className="rounded-md bg-fuchsia-500 px-5 py-2 font-display text-xs uppercase tracking-[0.22em] text-black hover:bg-fuchsia-400"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  )
}

function ToolButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-md border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] transition',
        active
          ? 'border-cyan-400/60 bg-cyan-500/10 text-cyan-100'
          : 'border-white/10 bg-black/30 text-white/60 hover:border-cyan-400/40 hover:text-cyan-100',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function SummaryCard({
  correctCount,
  sessionLen,
  bestStreak,
  grade,
  missed,
  onRestart,
}: {
  correctCount: number
  sessionLen: number
  bestStreak: number
  grade: 5 | 6 | 7 | 8
  missed: MissedQuestion[]
  onRestart: () => void
}) {
  const pct = sessionLen === 0 ? 0 : Math.round((correctCount / sessionLen) * 100)
  let msg = 'Outstanding!'
  if (pct < 60) msg = "Keep practicing — you've got this."
  else if (pct < 80) msg = 'Good job. A little more review and you’re set.'
  else if (pct < 95) msg = 'Great work. Review the tips below.'

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center sm:p-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-fuchsia-300">
        ▌ Session Complete
      </p>
      <h2 className="mt-2 font-display text-3xl uppercase tracking-[0.04em] text-white sm:text-4xl">
        {msg}
      </h2>
      <p className="mt-4 font-display text-5xl tracking-[0.04em] text-cyan-200 sm:text-6xl">
        {correctCount} / {sessionLen}
      </p>
      <p className="mt-1 font-mono text-xs uppercase tracking-[0.22em] text-white/55">
        {pct}% correct · Best streak {bestStreak} · Grade {grade}
      </p>

      {missed.length > 0 && (
        <div className="mt-6 text-left">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber-300">
            ▌ Review · {missed.length} missed
          </p>
          <div
            className={`mt-3 max-h-[320px] space-y-2 overflow-y-auto pr-1 ${styles.reviewList}`}
          >
            {missed.map((m, i) => (
              <div
                key={i}
                className="rounded-md border-l-2 border-amber-400/60 bg-amber-500/[0.06] p-3 text-sm"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-200">
                  Grade {m.grade} · {m.topic}
                </p>
                <p className="mt-1 text-white/85">{m.q}</p>
                {m.data && (
                  <pre className="mt-1 whitespace-pre-wrap rounded bg-black/30 px-2 py-1 font-mono text-xs text-cyan-200">
                    {m.data}
                  </pre>
                )}
                <p className="mt-1 text-emerald-300">
                  ✓ Correct: {m.correctText}
                </p>
                {m.yours && (
                  <p className="text-rose-300">Your answer: {m.yours}</p>
                )}
                <p className="mt-1 text-xs italic text-white/65">{m.tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onRestart}
        className="mt-6 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500 px-5 py-3 font-display text-sm uppercase tracking-[0.22em] text-black transition hover:scale-[1.02]"
      >
        New session · 50 fresh questions
      </button>
    </div>
  )
}

// ─── Calculator subcomponent ─────────────────────────────────────────

function Calculator() {
  const [display, setDisplay] = useState('0')
  const [prev, setPrev] = useState('')
  const [op, setOp] = useState<string | null>(null)
  const [prevValue, setPrevValue] = useState<number | null>(null)
  const [justEvaled, setJustEvaled] = useState(false)

  const doEval = useCallback(() => {
    if (op === null || prevValue === null) return
    const cur = parseFloat(display)
    let r = 0
    switch (op) {
      case '+': r = prevValue + cur; break
      case '−': r = prevValue - cur; break
      case '×': r = prevValue * cur; break
      case '÷': r = cur === 0 ? NaN : prevValue / cur; break
    }
    setPrev(`${prevValue} ${op} ${cur} =`)
    setDisplay(String(+r.toFixed(8)))
    setPrevValue(r)
    setJustEvaled(true)
  }, [op, prevValue, display])

  const press = useCallback((k: string) => {
    if (k === 'C') {
      setDisplay('0'); setPrev(''); setOp(null); setPrevValue(null); setJustEvaled(false)
    } else if (/[0-9]/.test(k)) {
      if (display === '0' || justEvaled) { setDisplay(k); setJustEvaled(false) }
      else setDisplay((d) => d + k)
    } else if (k === '.') {
      if (justEvaled) { setDisplay('0.'); setJustEvaled(false) }
      else if (!display.includes('.')) setDisplay((d) => d + '.')
    } else if (k === '±') {
      setDisplay(String(-parseFloat(display)))
    } else if (k === '%') {
      setDisplay(String(parseFloat(display) / 100))
    } else if (['+', '−', '×', '÷'].includes(k)) {
      if (op !== null && !justEvaled) doEval()
      const v = parseFloat(display)
      setOp(k); setPrevValue(v); setPrev(`${v} ${k}`); setJustEvaled(true)
    } else if (k === '=') {
      doEval(); setOp(null)
    }
  }, [display, justEvaled, op, doEval])

  const LAYOUT = ['C', '±', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', '.', '=']

  return (
    <div className="mt-3 rounded-md border border-dashed border-cyan-400/30 bg-black/40 p-3">
      <div className="rounded-md border border-white/10 bg-black/60 px-3 py-3 text-right font-mono text-cyan-200">
        <p className="min-h-[14px] text-[11px] text-white/45">{prev}</p>
        <p className="mt-1 text-xl break-words">{display}</p>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {LAYOUT.map((k) => {
          const isOp = ['+', '−', '×', '÷', '%', '±'].includes(k)
          const isEq = k === '='
          const isClr = k === 'C'
          const wide = k === '0'
          return (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              className={[
                'rounded-md border px-3 py-3 font-mono text-base transition active:scale-95',
                wide && 'col-span-2',
                isOp
                  ? 'border-amber-400/40 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25'
                  : isEq
                    ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25'
                    : isClr
                      ? 'border-rose-400/40 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25'
                      : 'border-white/10 bg-black/30 text-white/90 hover:bg-white/[0.05]',
              ].filter(Boolean).join(' ')}
            >
              {k}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tiny Web Audio sound effects ────────────────────────────────────

let audioCtx: AudioContext | null = null
function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    audioCtx = new AC()
  }
  return audioCtx
}

function ding() {
  try {
    const ctx = getCtx(); if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08)
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
    osc.connect(gain); gain.connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + 0.3)
  } catch { /* swallow — audio is best-effort */ }
}

function boom(level = 1) {
  try {
    const ctx = getCtx(); if (!ctx) return
    const dur = 0.35 + level * 0.18
    const osc = ctx.createOscillator(); const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(120 + level * 18, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + dur)
    gain.gain.setValueAtTime(0.45, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
    osc.connect(gain); gain.connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + dur)
  } catch { /* swallow */ }
}

function spawnParticles(count: number) {
  if (typeof window === 'undefined') return
  const colors = ['#ff2eb3', '#ec4899', '#22d3ee']
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div')
    p.className = styles.particle
    p.style.background = colors[i % colors.length]
    p.style.left = window.innerWidth / 2 + (Math.random() - 0.5) * 80 + 'px'
    p.style.top = window.innerHeight / 3 + 'px'
    document.body.appendChild(p)
    const ang = Math.random() * Math.PI * 2
    const vel = 160 + Math.random() * 220
    const dx = Math.cos(ang) * vel
    const dy = Math.sin(ang) * vel - 160
    p.animate(
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy + 350}px) scale(0.3)`, opacity: 0 },
      ],
      { duration: 1200 + Math.random() * 400, easing: 'cubic-bezier(.3,.7,.4,1)' },
    ).onfinish = () => p.remove()
  }
}
