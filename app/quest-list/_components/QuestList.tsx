'use client'

// Native React port of public/games/questlist/index.html.
//
// What landed:
//   * Full task lifecycle — add, edit, delete, complete (with pencil
//     scribble + scratch sound), uncomplete (refunds XP)
//   * Player progression — XP, levels, coins, streak, best streak,
//     level-up modal, XP floaters, HUD pop on every change
//   * Achievements + toast
//   * Projects, tags, status tabs, search, sort
//   * Confetti on completion
//   * Cross-device cloud sync via /api/sync/questlist with the same
//     careful "looksTouched" check that the iframe app used (NEVER
//     auto-wipe local data on first sync — that fix is preserved)
//   * Sound effects via Web Audio
//   * Export/Import JSON, Reset
//
// What's deferred (the standalone /games/questlist/index.html still
// has these — sync state shape is preserved so they keep working
// over there):
//   * Gmail integration (OAuth, multi-account, demo mode)
//   * Voice-command parsing for QuickAdd
//   * Profile modal (avatar editor)
//
// Tone-down vs the iframe app:
//   * Softer overall palette — same fuchsia/cyan accent system as
//     the rest of the site, less saturation
//   * Strip emoji glyphs from sidebar nav, settings toggles, and
//     achievement badges in favor of monochrome typographic marks
//   * Pop animations stay (HUD heartbeat) but no body-class
//     gradient intensification

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import {
  ACHIEVEMENTS,
  LEVEL_XP,
  PRIORITIES,
  STRIKE_MS,
  daysBetween,
  levelForXP,
  makeDefaultState,
  migrateGmailState,
  todayISO,
  uid,
  type Achievement,
  type Player,
  type Priority,
  type QuestState,
  type Task,
} from '../_lib/questlist-data'
import { useSound } from '../_lib/questlist-sound'
import styles from './QuestList.module.css'

const LS_KEY = 'questlist.v1'
const SYNC_KIND = 'questlist'
const SYNC_LAST_KEY = 'questlist.v1.lastSync'
const SYNC_DEBOUNCE_MS = 900

// ─── Helpers ───────────────────────────────────────────────────────

function loadInitial(): QuestState {
  if (typeof window === 'undefined') return makeDefaultState()
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        ...makeDefaultState(),
        ...parsed,
        gmail: migrateGmailState(parsed.gmail),
      }
    }
  } catch {}
  return makeDefaultState()
}

/** Does state have meaningful user data beyond DEFAULT? Used by the
 *  sync code to avoid clobbering offline-built tasks on first sign-in. */
function looksTouched(s: QuestState | null): boolean {
  if (!s) return false
  const xp = s.player?.xp ?? 0
  const taskCount = Array.isArray(s.tasks) ? s.tasks.length : 0
  const projCount = Array.isArray(s.projects) ? s.projects.length : 0
  return xp > 0 || taskCount > 3 || projCount > 4
}

type Filter = {
  status: 'active' | 'done' | 'all' | 'today' | 'overdue'
  project: string
  tag: string
  q: string
  sort: 'smart' | 'dueAsc' | 'prio' | 'newest' | 'oldest'
}

type ToastMsg = { type: 'info' | 'achievement' | 'error'; title: string; body: string }
type XpFloater = { id: string; x: number; y: number; amount: number }

// ─── Root component ───────────────────────────────────────────────

export default function QuestList() {
  const [state, setState] = useState<QuestState>(() => loadInitial())

  // Persist locally on every change.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state))
    } catch {}
  }, [state])

  const playSound = useSound(state.settings.soundOn)

  // ─── Cloud sync ──────────────────────────────────────────────────
  // Strategy preserved from the iframe app, including the safety check
  // that prevents fresh-device adopt from wiping offline tasks.
  const skipNextPutRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/sync/${SYNC_KIND}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data || !data.ok || !data.value) return
        const serverAt = data.updated_at
          ? new Date(data.updated_at).getTime()
          : 0
        let localAt = 0
        try {
          localAt = parseInt(localStorage.getItem(SYNC_LAST_KEY) || '0', 10) || 0
        } catch {}
        let localState: QuestState | null = null
        try {
          localState = JSON.parse(localStorage.getItem(LS_KEY) || 'null')
        } catch {}
        const localTouched = looksTouched(localState)
        const hasPriorSync = localAt > 0
        const shouldAdopt = hasPriorSync ? serverAt > localAt : !localTouched
        if (shouldAdopt) {
          try {
            if (localState) {
              localStorage.setItem(
                'questlist.v1.preSync',
                JSON.stringify({
                  savedAt: Date.now(),
                  reason: hasPriorSync ? 'newer-server-state' : 'fresh-device-adopt',
                  state: localState,
                }),
              )
            }
          } catch {}
          skipNextPutRef.current = true
          const incoming = data.value as QuestState
          setState({
            ...makeDefaultState(),
            ...incoming,
            gmail: migrateGmailState(incoming.gmail),
          })
          try {
            localStorage.setItem(SYNC_LAST_KEY, String(serverAt))
          } catch {}
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (skipNextPutRef.current) {
      skipNextPutRef.current = false
      return
    }
    const id = window.setTimeout(() => {
      fetch(`/api/sync/${SYNC_KIND}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: state }),
        credentials: 'include',
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data || !data.ok || !data.updated_at) return
          const serverAt = new Date(data.updated_at).getTime()
          try {
            localStorage.setItem(SYNC_LAST_KEY, String(serverAt))
          } catch {}
        })
        .catch(() => {})
    }, SYNC_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [state])

  // ─── UI state ────────────────────────────────────────────────────

  const [filter, setFilter] = useState<Filter>({
    status: 'active', project: 'All', tag: '', q: '', sort: 'smart',
  })
  const [confettiKey, setConfettiKey] = useState(0)
  const [xpFloaters, setXpFloaters] = useState<XpFloater[]>([])
  const [toast, setToast] = useState<ToastMsg | null>(null)
  const [showLevelUp, setShowLevelUp] = useState<number | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [strikingIds, setStrikingIds] = useState<Set<string>>(() => new Set())

  // ─── Derived ─────────────────────────────────────────────────────

  const isoToday = useMemo(() => todayISO(), [])

  const stats = useMemo(() => {
    const completedTotal = state.tasks.filter((t) => t.done).length
    const activeTotal = state.tasks.filter((t) => !t.done).length
    const highDone = state.tasks.filter((t) => t.done && t.priority === 'high').length
    const todayDone = state.tasks.filter((t) => t.done && t.completedOn === isoToday).length
    return { completedTotal, activeTotal, highDone, todayDone }
  }, [state.tasks, isoToday])

  const levelInfo = useMemo(() => levelForXP(state.player.xp), [state.player.xp])

  // Level-up effect — fires once when the computed level rises.
  const prevLevelRef = useRef<number | null>(null)
  useEffect(() => {
    if (prevLevelRef.current !== null && levelInfo.level > prevLevelRef.current) {
      window.setTimeout(() => {
        playSound('levelup')
        setShowLevelUp(levelInfo.level)
        window.setTimeout(() => setShowLevelUp(null), 1600)
      }, 250)
    }
    prevLevelRef.current = levelInfo.level
  }, [levelInfo.level, playSound])

  const showToast = useCallback((t: ToastMsg) => {
    setToast(t)
    window.setTimeout(() => setToast(null), 2400)
  }, [])

  const allTags = useMemo(() => {
    const s = new Set<string>()
    state.tasks.forEach((t) => (t.tags || []).forEach((x) => s.add(x)))
    return [...s].sort()
  }, [state.tasks])

  const visibleTasks = useMemo(() => {
    let list = [...state.tasks]
    if (filter.status === 'active') list = list.filter((t) => !t.done)
    else if (filter.status === 'done') list = list.filter((t) => t.done)
    else if (filter.status === 'today') list = list.filter((t) => !t.done && t.due === isoToday)
    else if (filter.status === 'overdue')
      list = list.filter((t) => !t.done && t.due && t.due < isoToday)
    if (filter.project !== 'All')
      list = list.filter((t) => (t.project || 'Inbox') === filter.project)
    if (filter.tag) list = list.filter((t) => (t.tags || []).includes(filter.tag))
    if (filter.q) {
      const q = filter.q.toLowerCase()
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.notes || '').toLowerCase().includes(q),
      )
    }
    const prioVal: Record<Priority, number> = { high: 3, medium: 2, low: 1 }
    const sortFns: Record<Filter['sort'], (a: Task, b: Task) => number> = {
      smart: (a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1
        const ao = a.due && a.due < isoToday && !a.done ? 1 : 0
        const bo = b.due && b.due < isoToday && !b.done ? 1 : 0
        if (ao !== bo) return bo - ao
        if (prioVal[b.priority] !== prioVal[a.priority]) return prioVal[b.priority] - prioVal[a.priority]
        if (a.due && b.due) return a.due.localeCompare(b.due)
        if (a.due) return -1
        if (b.due) return 1
        return b.created - a.created
      },
      dueAsc: (a, b) => (a.due || '9999').localeCompare(b.due || '9999'),
      prio: (a, b) => prioVal[b.priority] - prioVal[a.priority],
      newest: (a, b) => b.created - a.created,
      oldest: (a, b) => a.created - b.created,
    }
    list.sort(sortFns[filter.sort])
    return list
  }, [state.tasks, filter, isoToday])

  // ─── Task actions ────────────────────────────────────────────────

  const addTask = useCallback(
    (data: Partial<Task> & { title: string }) => {
      const t: Task = {
        id: uid(),
        title: data.title.trim(),
        notes: data.notes || '',
        priority: data.priority || 'medium',
        due: data.due || '',
        tags: data.tags || [],
        project: data.project || 'Inbox',
        done: false,
        created: Date.now(),
      }
      setState((s) => ({ ...s, tasks: [t, ...s.tasks] }))
      playSound('add')
    },
    [playSound],
  )

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }))
  }, [])

  const deleteTask = useCallback(
    (id: string) => {
      setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }))
      playSound('delete')
    },
    [playSound],
  )

  const finalizeCompletion = useCallback(
    (task: Task, rowEl: HTMLElement | null) => {
      const gained = PRIORITIES[task.priority].xp
      const coinsEarned = Math.max(1, Math.round(gained / 5))

      // XP floater
      const rect = rowEl?.getBoundingClientRect?.()
      const floaterId = uid()
      if (rect) {
        setXpFloaters((f) => [
          ...f,
          { id: floaterId, x: rect.left + 28, y: rect.top + 10, amount: gained },
        ])
        window.setTimeout(
          () => setXpFloaters((f) => f.filter((x) => x.id !== floaterId)),
          900,
        )
      }

      setState((s) => {
        const { lastCompleteDay, streak, bestStreak, xp } = s.player
        let newStreak = 1
        if (lastCompleteDay) {
          const d = daysBetween(isoToday, lastCompleteDay)
          if (d === 0) newStreak = streak
          else if (d === 1) newStreak = streak + 1
          else newStreak = 1
        }
        const newXP = xp + gained
        const next: QuestState = {
          ...s,
          tasks: s.tasks.map((t) =>
            t.id === task.id ? { ...t, done: true, completedOn: isoToday } : t,
          ),
          player: {
            ...s.player,
            xp: newXP,
            coins: s.player.coins + coinsEarned,
            streak: newStreak,
            bestStreak: Math.max(bestStreak, newStreak),
            lastCompleteDay: isoToday,
            achievements: { ...s.player.achievements },
          },
        }
        const computedStats = {
          completedTotal: next.tasks.filter((t) => t.done).length,
          highDone: next.tasks.filter((t) => t.done && t.priority === 'high').length,
        }
        ACHIEVEMENTS.forEach((a: Achievement) => {
          if (!next.player.achievements[a.id] && a.check(next.player, computedStats)) {
            next.player.achievements[a.id] = Date.now()
            window.setTimeout(() => {
              playSound('achievement')
              showToast({ type: 'achievement', title: 'Achievement unlocked', body: a.label })
            }, 200)
          }
        })
        return next
      })

      playSound('complete')
      if (state.settings.confettiOn) setConfettiKey((k) => k + 1)
    },
    [isoToday, playSound, showToast, state.settings.confettiOn],
  )

  const completeTask = useCallback(
    (task: Task, rowEl: HTMLElement | null) => {
      if (task.done) {
        const refund = PRIORITIES[task.priority].xp
        setState((s) => ({
          ...s,
          tasks: s.tasks.map((t) =>
            t.id === task.id ? { ...t, done: false, completedOn: null } : t,
          ),
          player: { ...s.player, xp: Math.max(0, s.player.xp - refund) },
        }))
        return
      }
      if (strikingIds.has(task.id)) return
      setStrikingIds((s) => {
        const n = new Set(s)
        n.add(task.id)
        return n
      })
      playSound('pencil')
      window.setTimeout(() => {
        setStrikingIds((s) => {
          const n = new Set(s)
          n.delete(task.id)
          return n
        })
        finalizeCompletion(task, rowEl)
      }, STRIKE_MS)
    },
    [strikingIds, playSound, finalizeCompletion],
  )

  // ─── Projects ────────────────────────────────────────────────────

  const addProject = useCallback((name: string) => {
    const n = name.trim()
    if (!n) return
    setState((s) => (s.projects.includes(n) ? s : { ...s, projects: [...s.projects, n] }))
  }, [])

  const deleteProject = useCallback((name: string) => {
    if (name === 'Inbox') return
    setState((s) => ({
      ...s,
      projects: s.projects.filter((p) => p !== name),
      tasks: s.tasks.map((t) => (t.project === name ? { ...t, project: 'Inbox' } : t)),
    }))
  }, [])

  // ─── Import / export / reset ────────────────────────────────────

  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `questlist-${isoToday}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [state, isoToday])

  const importJSON = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string)
          if (!parsed.tasks) throw new Error('Invalid file')
          const isMergeMode = !parsed.player && !parsed.settings
          if (isMergeMode) {
            setState((s) => {
              const existing = new Set(s.projects)
              const newProjects = (parsed.projects || []).filter(
                (p: string) => !existing.has(p),
              )
              return {
                ...s,
                tasks: [...parsed.tasks, ...s.tasks],
                projects: [...s.projects, ...newProjects],
              }
            })
            showToast({
              type: 'info', title: 'Synced',
              body: `Added ${parsed.tasks.length} task${parsed.tasks.length === 1 ? '' : 's'}`,
            })
          } else {
            setState({ ...makeDefaultState(), ...parsed })
            showToast({
              type: 'info', title: 'Import complete',
              body: `Loaded ${parsed.tasks.length} tasks`,
            })
          }
        } catch (e) {
          showToast({
            type: 'error', title: 'Import failed',
            body: String((e as Error).message || e),
          })
        }
      }
      reader.readAsText(file)
    },
    [showToast],
  )

  const resetAll = useCallback(() => {
    if (confirm('Reset all data? This cannot be undone.')) setState(makeDefaultState())
  }, [])

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      {/* Top HUD bar */}
      <header
        className={`flex items-center gap-3 rounded-2xl border border-white/10 ${styles.glass} px-4 py-3 sm:px-5`}
      >
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          className="md:hidden rounded-md border border-white/15 bg-black/40 p-2 text-white/70"
          aria-label="Toggle sidebar"
        >
          ☰
        </button>
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500/80 to-fuchsia-500/80 shadow-md shadow-fuchsia-500/30">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/45">
              QuestList
            </div>
            <div className="font-display text-sm tracking-wide text-white sm:text-base">
              Gamified Tasks
            </div>
          </div>
        </div>
        <div className="flex-1" />
        <PlayerHUD player={state.player} levelInfo={levelInfo} />
      </header>

      {/* Body */}
      <div className="grid gap-5 md:grid-cols-[280px_1fr]">
        {/* Sidebar — full on desktop, slide-in on mobile */}
        <aside
          className={[
            'rounded-2xl border border-white/10 p-4 md:block',
            styles.glass,
            sidebarOpen
              ? 'fixed inset-x-4 top-24 z-40 max-h-[80dvh] overflow-y-auto'
              : 'hidden',
          ].join(' ')}
        >
          <Sidebar
            state={state}
            filter={filter}
            setFilter={setFilter}
            allTags={allTags}
            addProject={addProject}
            deleteProject={deleteProject}
            onExport={exportJSON}
            onImport={importJSON}
            onReset={resetAll}
            toggleSound={() =>
              setState((s) => ({ ...s, settings: { ...s.settings, soundOn: !s.settings.soundOn } }))
            }
            toggleConfetti={() =>
              setState((s) => ({ ...s, settings: { ...s.settings, confettiOn: !s.settings.confettiOn } }))
            }
            onCloseMobile={() => setSidebarOpen(false)}
          />
        </aside>

        {/* Main column */}
        <main className="flex flex-col gap-4">
          <QuickAdd projects={state.projects} onAdd={addTask} />
          <div className="flex flex-wrap items-center gap-2">
            <StatusTabs filter={filter} setFilter={setFilter} tasks={state.tasks} isoToday={isoToday} />
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <input
                placeholder="Search…"
                className={`w-36 rounded-md ${styles.glassLite} px-3 py-2 font-mono text-sm text-white placeholder:text-white/30 focus:outline-none md:w-56`}
                value={filter.q}
                onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))}
              />
              <select
                value={filter.sort}
                onChange={(e) => setFilter((f) => ({ ...f, sort: e.target.value as Filter['sort'] }))}
                className={`rounded-md ${styles.glassLite} px-2 py-2 font-mono text-xs text-white/85 focus:outline-none`}
              >
                <option value="smart">Smart</option>
                <option value="dueAsc">Due date</option>
                <option value="prio">Priority</option>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
          </div>

          {/* Task list */}
          <TaskList
            tasks={visibleTasks}
            strikingIds={strikingIds}
            onComplete={completeTask}
            onEdit={(t) => setEditing(t)}
            onDelete={deleteTask}
            isoToday={isoToday}
          />

          {/* Achievements */}
          <Achievements player={state.player} />

          <footer className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-white/35">
            Autosaved locally · synced across devices when signed in
          </footer>
        </main>
      </div>

      {/* Overlays */}
      <Confetti burstKey={confettiKey} />
      {xpFloaters.map((f) => (
        <div
          key={f.id}
          className={`pointer-events-none fixed z-50 text-lg font-bold text-emerald-300 ${styles.xpBurst}`}
          style={{ left: f.x, top: f.y, transform: 'translate(-50%, 0)' }}
        >
          +{f.amount} XP
        </div>
      ))}
      {showLevelUp && (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center">
          <div className={`absolute h-40 w-40 rounded-full bg-violet-500/30 ${styles.pulseRing}`} />
          <div
            className={`relative rounded-2xl border border-white/10 px-6 py-4 text-center shadow-2xl ${styles.glass} ${styles.levelUpPop}`}
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/55">
              Level Up
            </div>
            <div className="bg-gradient-to-r from-violet-300 to-pink-300 bg-clip-text font-display text-3xl font-extrabold tracking-wide text-transparent">
              Lv {showLevelUp}
            </div>
          </div>
        </div>
      )}
      {toast && <Toast toast={toast} />}
      {editing && (
        <EditModal
          task={editing}
          projects={state.projects}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            updateTask(editing.id, patch)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

// ─── PlayerHUD ────────────────────────────────────────────────────

function usePopKey<T>(value: T) {
  const [key, setKey] = useState(0)
  const prevRef = useRef(value)
  useEffect(() => {
    if (prevRef.current !== value) {
      prevRef.current = value
      setKey((k) => k + 1)
    }
  }, [value])
  return key
}

function PlayerHUD({
  player,
  levelInfo,
}: {
  player: Player
  levelInfo: { level: number; inLevel: number; need: number }
}) {
  const pct = Math.min(100, Math.round((levelInfo.inLevel / levelInfo.need) * 100))
  const streakKey = usePopKey(player.streak)
  const coinsKey = usePopKey(player.coins)
  const levelKey = usePopKey(levelInfo.level)
  const xpKey = usePopKey(player.xp)

  return (
    <div className="flex items-center gap-3">
      <div className={`hidden items-center gap-2 rounded-xl ${styles.glassLite} px-3 py-1.5 sm:flex`}>
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber-300">
          STR
        </span>
        <span className="text-sm">
          <b key={streakKey} className={`inline-block ${styles.pop}`}>
            {player.streak}
          </b>
        </span>
      </div>
      <div className={`hidden items-center gap-2 rounded-xl ${styles.glassLite} px-3 py-1.5 sm:flex`}>
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-yellow-300">
          $
        </span>
        <span className="text-sm">
          <b key={coinsKey} className={`inline-block ${styles.pop}`}>
            {player.coins}
          </b>
        </span>
      </div>
      <div className={`flex min-w-[170px] items-center gap-3 rounded-xl ${styles.glassLite} px-3 py-1.5`}>
        <div
          key={levelKey}
          className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500/80 to-fuchsia-500/80 text-[11px] font-bold text-white shadow-md shadow-fuchsia-500/30 ${styles.pop}`}
        >
          Lv{levelInfo.level}
        </div>
        <div className="flex-1">
          <div key={xpKey} className={`h-2 overflow-hidden rounded-full bg-white/10 ${styles.pop}`}>
            <div
              className={`h-full ${styles.gradientBar} ${styles.shimmer}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-white/50">
            {levelInfo.inLevel}/{levelInfo.need} XP
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────

function Sidebar({
  state, filter, setFilter, allTags,
  addProject, deleteProject,
  onExport, onImport, onReset,
  toggleSound, toggleConfetti, onCloseMobile,
}: {
  state: QuestState
  filter: Filter
  setFilter: React.Dispatch<React.SetStateAction<Filter>>
  allTags: string[]
  addProject: (name: string) => void
  deleteProject: (name: string) => void
  onExport: () => void
  onImport: (file: File) => void
  onReset: () => void
  toggleSound: () => void
  toggleConfetti: () => void
  onCloseMobile: () => void
}) {
  const [newProj, setNewProj] = useState('')
  const fileRef = useRef<HTMLInputElement | null>(null)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between md:hidden">
        <div className="font-display text-sm tracking-wide text-white">Menu</div>
        <button type="button" className="text-white/60" onClick={onCloseMobile}>✕</button>
      </div>

      <Section title="Projects">
        <div className="space-y-1">
          <NavItem
            active={filter.project === 'All'}
            onClick={() => setFilter((f) => ({ ...f, project: 'All' }))}
            mark="▤"
          >
            All Projects
          </NavItem>
          {state.projects.map((p) => (
            <NavItem
              key={p}
              active={filter.project === p}
              onClick={() => setFilter((f) => ({ ...f, project: p }))}
              mark={p === 'Inbox' ? '▣' : '▢'}
              trailing={
                p !== 'Inbox' && (
                  <button
                    type="button"
                    className="text-white/35 opacity-0 transition group-hover:opacity-100 hover:text-rose-400"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`Delete project "${p}"? Tasks move to Inbox.`))
                        deleteProject(p)
                    }}
                    title="Delete project"
                  >
                    ✕
                  </button>
                )
              }
            >
              {p}
            </NavItem>
          ))}
        </div>
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            addProject(newProj)
            setNewProj('')
          }}
        >
          <input
            value={newProj}
            onChange={(e) => setNewProj(e.target.value)}
            placeholder="New project…"
            className={`flex-1 rounded-md ${styles.glassLite} px-2 py-1.5 font-mono text-sm text-white placeholder:text-white/30 focus:outline-none`}
          />
          <button
            type="submit"
            className="rounded-md bg-violet-500/80 px-2.5 py-1.5 font-display text-sm text-white hover:bg-violet-500"
          >
            +
          </button>
        </form>
      </Section>

      <Section title="Tags">
        <div className="flex flex-wrap gap-1.5">
          <Chip active={filter.tag === ''} onClick={() => setFilter((f) => ({ ...f, tag: '' }))}>
            All
          </Chip>
          {allTags.map((t) => (
            <Chip
              key={t}
              active={filter.tag === t}
              onClick={() => setFilter((f) => ({ ...f, tag: filter.tag === t ? '' : t }))}
            >
              #{t}
            </Chip>
          ))}
          {allTags.length === 0 && (
            <span className="font-mono text-[11px] text-white/40">No tags yet.</span>
          )}
        </div>
      </Section>

      <Section title="Settings">
        <div className="space-y-1">
          <ToggleRow label="Sound" on={state.settings.soundOn} onToggle={toggleSound} />
          <ToggleRow label="Confetti" on={state.settings.confettiOn} onToggle={toggleConfetti} />
        </div>
      </Section>

      <Section title="Data">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onExport}
            className={`rounded-md ${styles.glassLite} px-3 py-2 font-mono text-xs uppercase tracking-[0.2em] text-white/80 hover:bg-white/[0.07]`}
          >
            Export
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={`rounded-md ${styles.glassLite} px-3 py-2 font-mono text-xs uppercase tracking-[0.2em] text-white/80 hover:bg-white/[0.07]`}
          >
            Import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onImport(f)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={onReset}
            className="col-span-2 rounded-md border border-rose-500/30 px-3 py-2 font-mono text-xs uppercase tracking-[0.2em] text-rose-300 hover:bg-rose-500/10"
          >
            Reset all data
          </button>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-white/40">
        {title}
      </div>
      <div className="mt-2">{children}</div>
    </section>
  )
}

function NavItem({
  active, onClick, mark, children, trailing,
}: {
  active: boolean
  onClick: () => void
  mark: string
  children: React.ReactNode
  trailing?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition',
        active ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/5 hover:text-white',
      ].join(' ')}
    >
      <span className="font-mono text-xs text-white/40">{mark}</span>
      <span className="flex-1 truncate text-left">{children}</span>
      {trailing}
    </button>
  )
}

function Chip({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-full border px-2.5 py-0.5 font-mono text-[11px]',
        active
          ? 'border-violet-400/50 bg-violet-500/20 text-violet-100'
          : 'border-white/10 bg-white/[0.03] text-white/55 hover:text-white',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function ToggleRow({
  label, on, onToggle,
}: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-white/80 hover:bg-white/5"
    >
      <span className="flex-1 text-left">{label}</span>
      <span
        className={`relative inline-flex h-5 w-9 rounded-full transition ${
          on ? 'bg-violet-500' : 'bg-white/10'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
            on ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  )
}

// ─── QuickAdd ────────────────────────────────────────────────────

function QuickAdd({
  projects, onAdd,
}: {
  projects: string[]
  onAdd: (data: Partial<Task> & { title: string }) => void
}) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [due, setDue] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [project, setProject] = useState('Inbox')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const tags = tagInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean)
    onAdd({ title, priority, due, tags, project })
    setTitle('')
    setTagInput('')
    setDue('')
  }

  return (
    <form
      onSubmit={submit}
      className={`rounded-2xl border border-white/10 ${styles.glass} p-4 sm:p-5`}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a quest… (e.g. Finish proposal)"
        className={`w-full rounded-md ${styles.glassLite} px-3 py-2.5 text-base text-white placeholder:text-white/30 focus:outline-none`}
        autoComplete="off"
      />
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <FieldLabel label="Priority">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className={`w-full rounded-md ${styles.glassLite} px-2 py-1.5 font-mono text-xs text-white/85 focus:outline-none`}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </FieldLabel>
        <FieldLabel label="Project">
          <select
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className={`w-full rounded-md ${styles.glassLite} px-2 py-1.5 font-mono text-xs text-white/85 focus:outline-none`}
          >
            {projects.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </FieldLabel>
        <FieldLabel label="Due">
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className={`w-full rounded-md ${styles.glassLite} px-2 py-1.5 font-mono text-xs text-white/85 focus:outline-none [color-scheme:dark]`}
          />
        </FieldLabel>
        <FieldLabel label="Tags (comma)">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="work, urgent"
            className={`w-full rounded-md ${styles.glassLite} px-2 py-1.5 font-mono text-xs text-white placeholder:text-white/30 focus:outline-none`}
          />
        </FieldLabel>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          className="rounded-md bg-gradient-to-br from-fuchsia-500 to-pink-500 px-4 py-2 font-display text-sm uppercase tracking-[0.2em] text-black hover:scale-[1.02]"
        >
          + Add quest
        </button>
      </div>
    </form>
  )
}

function FieldLabel({
  label, children,
}: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.22em] text-white/45">
        {label}
      </span>
      {children}
    </label>
  )
}

// ─── StatusTabs ──────────────────────────────────────────────────

function StatusTabs({
  filter, setFilter, tasks, isoToday,
}: {
  filter: Filter
  setFilter: React.Dispatch<React.SetStateAction<Filter>>
  tasks: Task[]
  isoToday: string
}) {
  const counts = useMemo(() => {
    const active = tasks.filter((t) => !t.done).length
    const today = tasks.filter((t) => !t.done && t.due === isoToday).length
    const overdue = tasks.filter((t) => !t.done && t.due && t.due < isoToday).length
    const done = tasks.filter((t) => t.done).length
    return { active, today, overdue, done, all: tasks.length }
  }, [tasks, isoToday])

  const TABS: Array<{ id: Filter['status']; label: string; count: number }> = [
    { id: 'active', label: 'Active', count: counts.active },
    { id: 'today', label: 'Today', count: counts.today },
    { id: 'overdue', label: 'Overdue', count: counts.overdue },
    { id: 'done', label: 'Done', count: counts.done },
    { id: 'all', label: 'All', count: counts.all },
  ]

  return (
    <div className="flex flex-wrap gap-1.5">
      {TABS.map((t) => {
        const active = filter.status === t.id
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter((f) => ({ ...f, status: t.id }))}
            className={[
              'rounded-md border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.22em] transition',
              active
                ? 'border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-100'
                : 'border-white/10 bg-black/30 text-white/55 hover:border-fuchsia-400/30 hover:text-white',
            ].join(' ')}
          >
            {t.label} <span className="ml-1 text-white/40">{t.count}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── TaskList + TaskRow ──────────────────────────────────────────

function TaskList({
  tasks, strikingIds, onComplete, onEdit, onDelete, isoToday,
}: {
  tasks: Task[]
  strikingIds: Set<string>
  onComplete: (t: Task, el: HTMLElement | null) => void
  onEdit: (t: Task) => void
  onDelete: (id: string) => void
  isoToday: string
}) {
  if (tasks.length === 0) {
    return (
      <div
        className={`rounded-xl border border-dashed border-white/10 ${styles.glassLite} p-6 text-center text-sm text-white/45`}
      >
        Nothing here. Add a quest above to get started.
      </div>
    )
  }
  return (
    <ul className="space-y-2">
      {tasks.map((t) => (
        <TaskRow
          key={t.id}
          task={t}
          striking={strikingIds.has(t.id)}
          onComplete={onComplete}
          onEdit={onEdit}
          onDelete={onDelete}
          isoToday={isoToday}
        />
      ))}
    </ul>
  )
}

function TaskRow({
  task, striking, onComplete, onEdit, onDelete, isoToday,
}: {
  task: Task
  striking: boolean
  onComplete: (t: Task, el: HTMLElement | null) => void
  onEdit: (t: Task) => void
  onDelete: (id: string) => void
  isoToday: string
}) {
  const ref = useRef<HTMLLIElement | null>(null)
  const prio = PRIORITIES[task.priority]
  const overdue = !task.done && task.due && task.due < isoToday
  const dueToday = !task.done && task.due === isoToday

  return (
    <li
      ref={ref}
      className={`group relative flex items-start gap-3 rounded-xl border border-white/10 ${styles.glassLite} p-3 sm:p-3.5 ${
        task.done ? 'opacity-60' : ''
      }`}
    >
      {/* Complete circle */}
      <button
        type="button"
        onClick={() => onComplete(task, ref.current)}
        aria-label={task.done ? 'Mark as not done' : 'Complete task'}
        className={[
          'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition',
          task.done
            ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
            : 'border-white/25 hover:border-fuchsia-400 hover:bg-fuchsia-500/10',
        ].join(' ')}
      >
        {task.done ? '✓' : ''}
      </button>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="relative inline-block max-w-full">
          <span
            className={`block text-[15px] leading-snug ${
              task.done ? 'text-white/55' : 'text-white/90'
            }`}
          >
            {task.title}
          </span>
          {/* Strike-through bar + pencil tip — runs once on completion. */}
          {(striking || task.done) && (
            <>
              <span
                className={`${styles.strikeBar} ${
                  striking ? styles.strikeBarAnimate : styles.strikeBarStatic
                }`}
              />
              {striking && (
                <span className={styles.pencilTipMove}>
                  <svg width="20" height="20" viewBox="0 0 24 24" className="block">
                    <rect x="8" y="3" width="8" height="12" fill="#f6c246" stroke="#8a6a1a" strokeWidth="0.4" />
                    <rect x="8" y="3" width="8" height="2" fill="#d89a22" />
                    <rect x="8" y="15" width="8" height="1.4" fill="#c9c9cf" />
                    <rect x="8" y="16" width="8" height="2" fill="#d9493a" />
                    <polygon points="8,3 12,-1 16,3" fill="#f2dcaf" stroke="#8a6a1a" strokeWidth="0.4" />
                    <polygon points="10.8,0.4 12,-1 13.2,0.4" fill="#2b2b2b" />
                    <rect x="9.2" y="5" width="1.2" height="10" fill="#fff" opacity="0.35" />
                  </svg>
                </span>
              )}
            </>
          )}
        </div>

        {task.notes && (
          <p className="mt-1 text-xs text-white/55 line-clamp-2">{task.notes}</p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] ${prio.chipClass}`}
          >
            {prio.label}
          </span>
          <span className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">
            {task.project}
          </span>
          {task.due && (
            <span
              className={[
                'rounded-md border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em]',
                overdue
                  ? 'border-rose-400/40 bg-rose-500/10 text-rose-200'
                  : dueToday
                    ? 'border-amber-400/40 bg-amber-500/10 text-amber-200'
                    : 'border-white/10 bg-white/[0.03] text-white/55',
              ].join(' ')}
            >
              {overdue ? 'OVERDUE · ' : dueToday ? 'TODAY · ' : ''}
              {task.due}
            </span>
          )}
          {(task.tags || []).map((t) => (
            <span
              key={t}
              className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] text-white/60"
            >
              #{t}
            </span>
          ))}
        </div>
      </div>

      {/* Row actions */}
      <div className="flex shrink-0 flex-col gap-1 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="rounded border border-white/10 bg-black/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/65 hover:text-white"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm(`Delete "${task.title}"?`)) onDelete(task.id)
          }}
          className="rounded border border-rose-400/30 bg-rose-500/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-rose-300 hover:bg-rose-500/15"
        >
          Del
        </button>
      </div>
    </li>
  )
}

// ─── Achievements ────────────────────────────────────────────────

function Achievements({ player }: { player: Player }) {
  const unlocked = ACHIEVEMENTS.filter((a) => player.achievements[a.id])
  const locked = ACHIEVEMENTS.filter((a) => !player.achievements[a.id])

  return (
    <section className={`mt-4 rounded-2xl border border-white/10 ${styles.glass} p-4 sm:p-5`}>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base tracking-wide text-white">Achievements</h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/45">
          {unlocked.length} / {ACHIEVEMENTS.length}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {[...unlocked, ...locked].map((a) => {
          const got = !!player.achievements[a.id]
          return (
            <div
              key={a.id}
              className={[
                'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left',
                got
                  ? 'border-amber-400/40 bg-amber-500/[0.08] text-white/85'
                  : 'border-white/10 bg-white/[0.02] text-white/35',
              ].join(' ')}
              title={a.desc}
            >
              <span
                className={`font-display text-base ${got ? 'text-amber-300' : 'text-white/30'}`}
              >
                {a.icon}
              </span>
              <div className="min-w-0">
                <div className="truncate text-xs">{a.label}</div>
                <div className="truncate font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
                  {a.desc}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {unlocked.length === 0 && (
        <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
          Complete tasks to earn your first badge.
        </p>
      )}
    </section>
  )
}

// ─── EditModal ───────────────────────────────────────────────────

function EditModal({
  task, projects, onClose, onSave,
}: {
  task: Task
  projects: string[]
  onClose: () => void
  onSave: (patch: Partial<Task>) => void
}) {
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes || '')
  const [priority, setPriority] = useState<Priority>(task.priority)
  const [due, setDue] = useState(task.due || '')
  const [project, setProject] = useState(task.project)
  const [tagInput, setTagInput] = useState((task.tags || []).join(', '))

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl border border-white/10 bg-[#0d111c] p-5 shadow-[0_25px_80px_rgba(0,0,0,0.5)]`}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg tracking-wide text-white">Edit quest</h2>
          <button type="button" onClick={onClose} className="text-white/55 hover:text-white">
            ✕
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <FieldLabel label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full rounded-md ${styles.glassLite} px-3 py-2 text-sm text-white focus:outline-none`}
            />
          </FieldLabel>
          <FieldLabel label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={`w-full rounded-md ${styles.glassLite} px-3 py-2 font-mono text-xs text-white focus:outline-none`}
            />
          </FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            <FieldLabel label="Priority">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className={`w-full rounded-md ${styles.glassLite} px-2 py-1.5 font-mono text-xs text-white/85 focus:outline-none`}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </FieldLabel>
            <FieldLabel label="Project">
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className={`w-full rounded-md ${styles.glassLite} px-2 py-1.5 font-mono text-xs text-white/85 focus:outline-none`}
              >
                {projects.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel label="Due">
              <input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className={`w-full rounded-md ${styles.glassLite} px-2 py-1.5 font-mono text-xs text-white/85 focus:outline-none [color-scheme:dark]`}
              />
            </FieldLabel>
            <FieldLabel label="Tags">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                className={`w-full rounded-md ${styles.glassLite} px-2 py-1.5 font-mono text-xs text-white focus:outline-none`}
              />
            </FieldLabel>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/15 px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-white/65 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave({
                title: title.trim() || task.title,
                notes,
                priority,
                due,
                project,
                tags: tagInput.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean),
              })
            }}
            className="rounded-md bg-gradient-to-br from-fuchsia-500 to-pink-500 px-5 py-2 font-display text-xs uppercase tracking-[0.22em] text-black hover:scale-[1.02]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Toast ───────────────────────────────────────────────────────

function Toast({ toast }: { toast: ToastMsg }) {
  const tint =
    toast.type === 'achievement'
      ? 'border-amber-400/50 bg-amber-500/15 text-amber-100'
      : toast.type === 'error'
        ? 'border-rose-400/50 bg-rose-500/15 text-rose-100'
        : 'border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-100'
  return (
    <div
      className={`pointer-events-none fixed bottom-8 left-1/2 z-50 max-w-[90vw] rounded-xl border px-5 py-3 backdrop-blur-md ${tint} ${styles.toast}`}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] opacity-75">
        {toast.title}
      </div>
      <div className="mt-0.5 font-display text-sm">{toast.body}</div>
    </div>
  )
}

// ─── Confetti ────────────────────────────────────────────────────

function Confetti({ burstKey }: { burstKey: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  useEffect(() => {
    if (!burstKey) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    const colors = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f472b6']
    const parts = Array.from({ length: 90 }, () => ({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 80,
      y: window.innerHeight / 2 - 50 + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 9,
      vy: Math.random() * -8 - 4,
      g: 0.22 + Math.random() * 0.1,
      size: 4 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1,
    }))
    const start = performance.now()
    const loop = (now: number) => {
      const t = (now - start) / 1000
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      parts.forEach((p) => {
        p.vy += p.g
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr
        p.life = Math.max(0, 1 - t / 2.2)
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.globalAlpha = p.life
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5)
        ctx.restore()
      })
      if (t < 2.4) rafRef.current = requestAnimationFrame(loop)
      else ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [burstKey])
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50"
      style={{ position: 'fixed' } as CSSProperties}
    />
  )
}
