'use client'
import { useEffect, useRef } from 'react'

// ─── Shared game state ────────────────────────────────────────────────────────
const G: any = {
  species: 0,            // 0=dino, 1=water, 2=lion
  stage: 0,
  name: '???',
  hp: 20, maxHp: 20,
  atk: 5, def: 3, spd: 4,
  hunger: 80, happy: 80,
  xp: 0,
  level: 1, wins: 0, lastFed: 0,
  day: 1,
  inventory: [] as any[],
  maxInv: 100,
  chests: {} as any,
  badges: [] as string[],   // badge IDs collected (one per boss beaten, max 8)
  bossesBeaten: 0,          // raw boss defeats (used as the next-badge index)
  ninjasBeaten: 0,          // master-ninja trial progress (0..10)
  worldX: undefined as any,
}

// ─── Badges (one per defeated boss) ───────────────────────────────────────────
const BADGES = [
  { id: 'forest',  name: 'Forest Crest',  color: 0x44aa55, glyph: '✿' },
  { id: 'tide',    name: 'Tide Crest',    color: 0x44aaff, glyph: '~' },
  { id: 'ember',   name: 'Ember Crest',   color: 0xff7744, glyph: '▲' },
  { id: 'shadow',  name: 'Shadow Crest',  color: 0x6644aa, glyph: '◐' },
  { id: 'thunder', name: 'Thunder Crest', color: 0xffdd44, glyph: '⚡' },
  { id: 'crystal', name: 'Crystal Crest', color: 0x88eeff, glyph: '◆' },
  { id: 'wind',    name: 'Wind Crest',    color: 0xddffdd, glyph: '⤴' },
  { id: 'star',    name: 'Star Crest',    color: 0xffffaa, glyph: '★' },
]

function awardNextBadge(): { id: string, name: string, color: number, glyph: string } | null {
  if (G.badges.length >= BADGES.length) return null
  const next = BADGES[G.badges.length]
  G.badges.push(next.id)
  return next
}

// ─── Level / XP / evolution helpers ───────────────────────────────────────────
// Level required to evolve OUT of each stage. Index = current stage.
//   stage 1 -> 2 at lvl 4, 2 -> 3 at lvl 9, 3 -> 4 at lvl 16,
//   4 -> 5 at lvl 26, 5 is the final ascended form.
const EVO_LEVEL = [0, 4, 9, 16, 26, 999]
function xpToLevel(level: number) { return 20 + level * 10 }

// Apply XP gain. Returns flags so callers can show feedback / evolve.
function gainXp(amount: number) {
  const prevLevel = G.level
  G.xp += amount
  while (G.xp >= xpToLevel(G.level)) {
    G.xp -= xpToLevel(G.level)
    G.level += 1
    G.maxHp += 3; G.hp = Math.min(G.maxHp, G.hp + 3)
    G.atk += 1; G.def += 1
    if (G.level % 2 === 0) G.spd += 1
  }
  return {
    leveled: G.level > prevLevel,
    levelsGained: G.level - prevLevel,
    shouldEvolve: G.stage < 5 && G.level >= EVO_LEVEL[G.stage],
  }
}

const W = 480, H = 320

// ─── Audio: chiptune theme song ───────────────────────────────────────────────
const NOTE: any = {
  C2:65.41, D2:73.42, E2:82.41, F2:87.31, G2:98.00, A2:110.00, B2:123.47,
  C3:130.81, D3:146.83, E3:164.81, F3:174.61, G3:196.00, A3:220.00, B3:246.94,
  C4:261.63, D4:293.66, E4:329.63, F4:349.23, G4:392.00, A4:440.00, B4:493.88,
  C5:523.25, D5:587.33, E5:659.25, F5:698.46, G5:783.99, A5:880.00, B5:987.77,
  C6:1046.50, D6:1174.66, E6:1318.51, R: 0,
}

// Sequential chiptune tracks. Theme advances through them after each loop
// to build variety and let the soundtrack rise/fall in mood.
type Track = { name: string; bpm: number; melody: [string, number][]; bass: [string, number][] }

const TRACKS: Track[] = [
  // 1. Heroic Adventure — C major (I-V-vi-IV), 16 bars
  {
    name: 'Heroic Adventure',
    bpm: 132,
    melody: [
      ['C5',1],['E5',1],['G5',1],['E5',1],
      ['D5',1],['G5',1],['B5',1],['G5',1],
      ['A4',1],['C5',1],['E5',1],['C5',1],
      ['F5',1],['A5',1],['C6',1],['A5',1],
      ['G5',0.5],['E5',0.5],['C5',1],['E5',1],['G5',1],
      ['A5',1],['G5',1],['D5',1],['G5',1],
      ['C6',1],['B5',1],['A5',1],['G5',1],
      ['F5',0.5],['G5',0.5],['A5',1],['G5',1],['C5',1],
      ['G4',1],['C5',1],['E5',1],['G5',1],
      ['B4',1],['D5',1],['G5',1],['B5',1],
      ['A4',1],['C5',1],['E5',1],['A5',1],
      ['F4',1],['A4',1],['C5',1],['F5',1],
      ['E5',0.5],['F5',0.5],['G5',1],['A5',1],['B5',1],
      ['C6',2],['B5',1],['A5',1],
      ['G5',1],['F5',1],['E5',1],['D5',1],
      ['C5',2],['G4',1],['C5',1],
    ],
    bass: [
      ['C3',4],['G2',4],['A2',4],['F2',4],
      ['C3',4],['G2',4],['A2',4],['F2',4],
      ['C3',4],['G2',4],['A2',4],['F2',4],
      ['C3',4],['F2',4],['G2',4],['C3',4],
    ],
  },
  // 2. Mystery — A minor, contemplative, 8 bars at slower tempo
  {
    name: 'Mystery',
    bpm: 110,
    melody: [
      ['A4',2],['C5',2],
      ['E5',2],['C5',2],
      ['F5',2],['E5',2],
      ['D5',2],['A4',2],
      ['C5',1],['E5',1],['G5',1],['E5',1],
      ['A5',2],['G5',2],
      ['F5',1],['E5',1],['D5',1],['C5',1],
      ['A4',2],['E4',2],
    ],
    bass: [
      ['A2',4],['F2',4],['D3',4],['A2',4],
      ['C3',4],['D3',4],['A2',4],['A2',4],
    ],
  },
  // 3. Building Storm — A minor, urgent driving rhythm
  {
    name: 'Building Storm',
    bpm: 130,
    melody: [
      ['A4',0.5],['A4',0.5],['C5',1],['E5',1],['A5',1],
      ['G5',0.5],['F5',0.5],['E5',1],['D5',1],['C5',1],
      ['F4',0.5],['F4',0.5],['A4',1],['C5',1],['F5',1],
      ['E5',0.5],['D5',0.5],['C5',1],['B4',1],['A4',1],
      ['G5',1],['A5',1],['G5',1],['E5',1],
      ['F5',1],['G5',1],['F5',1],['D5',1],
      ['E5',1],['C5',1],['A4',1],['C5',1],
      ['A4',2],['E4',1],['A4',1],
    ],
    bass: [
      ['A2',4],['F2',4],['A2',4],['F2',4],
      ['G2',4],['F2',4],['A2',4],['A2',4],
    ],
  },
  // 4. Triumphant March — C major, bold and confident
  {
    name: 'Triumphant March',
    bpm: 138,
    melody: [
      ['C5',1],['G5',1],['E5',1],['C5',1],
      ['D5',1],['G5',1],['F5',1],['D5',1],
      ['E5',1],['A5',1],['G5',1],['E5',1],
      ['F5',1],['B5',1],['A5',1],['F5',1],
      ['G5',1],['C6',1],['B5',1],['G5',1],
      ['F5',1],['E5',1],['D5',1],['C5',1],
      ['B4',1],['D5',1],['G5',1],['C6',1],
      ['G4',2],['C5',2],
    ],
    bass: [
      ['C3',4],['G2',4],['A2',4],['F2',4],
      ['C3',4],['F2',4],['G2',4],['C3',4],
    ],
  },
  // 5. Wonder — C major, slow and dreamy
  {
    name: 'Wonder',
    bpm: 96,
    melody: [
      ['C5',2],['E5',2],
      ['G5',2],['E5',2],
      ['F5',2],['A5',2],
      ['G5',2],['C5',2],
      ['E5',1],['G5',1],['C6',1],['G5',1],
      ['A5',2],['F5',2],
      ['E5',1],['D5',1],['C5',1],['G4',1],
      ['C5',2],['G4',2],
    ],
    bass: [
      ['C3',4],['C3',4],['F2',4],['C3',4],
      ['C3',4],['F2',4],['G2',4],['C3',4],
    ],
  },
]

class Theme {
  ctx?: any
  master?: any
  isMuted = false
  trackIdx = 0
  melodyAt = 0; bassAt = 0
  melodyTime = 0; bassTime = 0
  schedTimer: any = null
  curTrack(): Track { return TRACKS[this.trackIdx] }
  beatLen() { return 60 / this.curTrack().bpm }

  start() {
    if (this.ctx) return
    if (typeof window === 'undefined') return
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    try {
      this.ctx = new Ctx()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.isMuted ? 0 : 0.16
      this.master.connect(this.ctx.destination)
      const now = this.ctx.currentTime + 0.05
      this.melodyTime = now; this.bassTime = now
      this.melodyAt = 0; this.bassAt = 0; this.trackIdx = 0
      this.tick()
    } catch (e) {}
  }

  tick = () => {
    if (!this.ctx || !this.master) return
    const cutoff = this.ctx.currentTime + 1.5

    // Schedule melody notes; advance to the next track when current loop ends.
    while (this.melodyTime < cutoff) {
      const t = this.curTrack()
      const [n, b] = t.melody[this.melodyAt]
      const dur = b * this.beatLen()
      const f = NOTE[n] || 0
      if (f > 0) this.note('square', f, this.melodyTime, dur, 0.18)
      this.melodyTime += dur
      this.melodyAt += 1
      if (this.melodyAt >= t.melody.length) {
        this.trackIdx = (this.trackIdx + 1) % TRACKS.length
        this.melodyAt = 0
        // Bass restarts in lockstep with the new track.
        this.bassAt = 0
        this.bassTime = this.melodyTime
      }
    }

    // Bass uses whatever the current track is at the time it's scheduled.
    while (this.bassTime < cutoff) {
      const t = this.curTrack()
      const [n, b] = t.bass[this.bassAt]
      const dur = b * this.beatLen()
      const f = NOTE[n] || 0
      if (f > 0) this.note('triangle', f, this.bassTime, dur, 0.22)
      this.bassTime += dur
      this.bassAt += 1
      if (this.bassAt >= t.bass.length) this.bassAt = 0
    }

    this.schedTimer = setTimeout(this.tick, 250)
  }

  note(type: string, freq: number, t: number, dur: number, peak: number) {
    if (!this.ctx || !this.master) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(peak, t + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur * 0.95, 0.05))
    osc.connect(gain).connect(this.master)
    osc.start(t)
    osc.stop(t + dur + 0.05)
  }

  toggleMute() {
    this.isMuted = !this.isMuted
    if (this.master && this.ctx) this.master.gain.setValueAtTime(this.isMuted ? 0 : 0.16, this.ctx.currentTime)
  }

  // Triumphant ascending arpeggio for level-ups
  chime() {
    if (!this.ctx || !this.master) return
    const t = this.ctx.currentTime + 0.02
    this.note('square', NOTE.C5, t,        0.10, 0.30)
    this.note('square', NOTE.E5, t + 0.08, 0.10, 0.30)
    this.note('square', NOTE.G5, t + 0.16, 0.10, 0.30)
    this.note('square', NOTE.C6, t + 0.24, 0.22, 0.35)
    this.note('triangle', NOTE.C4, t,        0.30, 0.25)
    this.note('triangle', NOTE.G4, t + 0.24, 0.30, 0.25)
  }

  stop() {
    if (this.schedTimer) clearTimeout(this.schedTimer)
    try { this.ctx?.close() } catch (e) {}
    this.ctx = undefined; this.master = undefined
  }
}

const theme = new Theme()

// ─── Items + inventory ────────────────────────────────────────────────────────
const ITEMS: any = {
  berry: { name: 'Berry',   color: 0xff5577, desc: '+5 HP',    effect: () => { if (G.hp < G.maxHp) { G.hp = Math.min(G.maxHp, G.hp + 5); return true } return false } },
  apple: { name: 'Apple',   color: 0xff8844, desc: '+12 FOOD', effect: () => { if (G.hunger < 100) { G.hunger = Math.min(100, G.hunger + 12); return true } return false } },
  shard: { name: 'Crystal', color: 0x88ddff, desc: '+5 XP',    effect: () => { gainXp(5); return true } },
  herb:  { name: 'Herb',    color: 0x88dd66, desc: '+8 MOOD',  effect: () => { if (G.happy < 100) { G.happy = Math.min(100, G.happy + 8); return true } return false } },
  coin:  { name: 'Coin',    color: 0xffdd44, desc: 'Currency',   effect: () => false },
}

function invTotal() { return G.inventory.reduce((s: number, x: any) => s + x.qty, 0) }
function invAdd(id: string, qty = 1) {
  if (!ITEMS[id]) return false
  if (invTotal() + qty > G.maxInv) return false
  const slot = G.inventory.find((x: any) => x.id === id)
  if (slot) slot.qty += qty
  else G.inventory.push({ id, qty })
  return true
}
function invRemove(id: string, qty = 1) {
  const slot = G.inventory.find((x: any) => x.id === id)
  if (!slot || slot.qty < qty) return false
  slot.qty -= qty
  if (slot.qty <= 0) G.inventory = G.inventory.filter((x: any) => x.id !== id)
  return true
}
function invUse(id: string) {
  const item = ITEMS[id]
  if (!item) return false
  if (item.effect()) { invRemove(id, 1); return true }
  return false
}

// ─── Creature drawing — dinosaur lineage (Egg → Tyranex) ──────────────────────
function drawDino(g: any, stage: number, x: number, y: number) {
  const c = SPECIES[0].stageColors[stage]
  const p = SPECIES[0].stagePulse[stage]
  g.clear()

  if (stage === 0) {
    // Dino egg with dark green spots
    g.fillStyle(0x000000, 0.18); g.fillEllipse(x, y + 22, 30, 8)
    g.fillStyle(0xeeeeff);       g.fillEllipse(x, y, 30, 38)
    g.fillStyle(0xffffff, 0.55); g.fillEllipse(x - 6, y - 8, 10, 14)
    g.fillStyle(0x44aa55, 0.85)
    g.fillCircle(x + 5, y + 4, 4); g.fillCircle(x - 7, y + 9, 3)
    g.fillCircle(x + 3, y - 6, 3); g.fillCircle(x - 4, y - 1, 2)
    g.fillStyle(0x2a7a35, 0.6); g.fillCircle(x + 5, y + 4, 2)

  } else if (stage === 1) {
    // Hatchling — chubby baby dino, big head, oversized eyes
    g.fillStyle(0x000000, 0.2); g.fillEllipse(x, y + 22, 26, 7)

    // Tail nub
    g.fillStyle(c)
    g.fillTriangle(x + 8, y + 6, x + 18, y + 12, x + 8, y + 14)

    // Body
    g.fillStyle(c); g.fillEllipse(x, y + 4, 22, 24)
    // Belly
    g.fillStyle(p, 0.55); g.fillEllipse(x - 1, y + 8, 12, 14)

    // Legs
    g.fillStyle(c)
    g.fillRoundedRect(x - 7, y + 13, 5, 9, 2)
    g.fillRoundedRect(x + 2, y + 13, 5, 9, 2)
    g.fillStyle(0x1a1a3a)
    g.fillRect(x - 8, y + 20, 7, 3); g.fillRect(x + 1, y + 20, 7, 3)

    // Head
    g.fillStyle(c); g.fillCircle(x - 2, y - 8, 13)
    // Snout
    g.fillStyle(c); g.fillEllipse(x + 7, y - 6, 10, 8)
    g.fillStyle(p, 0.4); g.fillEllipse(x + 7, y - 4, 8, 5)

    // Eyes (huge)
    g.fillStyle(0xffffff)
    g.fillCircle(x - 5, y - 10, 4); g.fillCircle(x + 3, y - 10, 4)
    g.fillStyle(0x1a1a3a)
    g.fillCircle(x - 4, y - 9, 2.2); g.fillCircle(x + 4, y - 9, 2.2)
    g.fillStyle(0xffffff)
    g.fillCircle(x - 3, y - 10, 0.9); g.fillCircle(x + 5, y - 10, 0.9)

    // Nostril
    g.fillStyle(0x1a1a3a); g.fillCircle(x + 11, y - 7, 0.7)

    // Tiny head spike
    g.fillStyle(p)
    g.fillTriangle(x - 5, y - 19, x - 2, y - 24, x + 1, y - 19)

  } else if (stage === 2) {
    // Saurling — juvenile, small spikes, longer tail
    g.fillStyle(0x000000, 0.22); g.fillEllipse(x, y + 26, 32, 8)

    // Tail
    g.fillStyle(c)
    g.fillTriangle(x + 6, y + 8, x + 24, y + 4, x + 12, y + 16)
    g.fillTriangle(x + 14, y + 4, x + 26, y - 2, x + 20, y + 8)
    g.fillStyle(p)
    g.fillTriangle(x + 22, y - 1, x + 28, y - 6, x + 25, y + 2)

    // Body
    g.fillStyle(c); g.fillEllipse(x - 1, y + 6, 26, 26)
    g.fillStyle(p, 0.5); g.fillEllipse(x - 1, y + 10, 14, 16)

    // Back spikes
    g.fillStyle(p)
    g.fillTriangle(x - 9, y - 4, x - 7, y - 11, x - 5, y - 4)
    g.fillTriangle(x - 3, y - 6, x - 1, y - 14, x + 1, y - 6)
    g.fillTriangle(x + 3, y - 4, x + 5, y - 11, x + 7, y - 4)

    // Legs
    g.fillStyle(c)
    g.fillRoundedRect(x - 9, y + 15, 6, 11, 2)
    g.fillRoundedRect(x + 2, y + 15, 6, 11, 2)
    g.fillStyle(0x1a1a3a)
    g.fillRect(x - 10, y + 24, 8, 3); g.fillRect(x + 1, y + 24, 8, 3)
    // Foot claws
    g.fillStyle(0xeeeeff)
    for (let i = 0; i < 3; i++) {
      g.fillTriangle(x - 10 + i*3, y + 27, x - 9 + i*3, y + 29, x - 8 + i*3, y + 27)
      g.fillTriangle(x + 1 + i*3, y + 27, x + 2 + i*3, y + 29, x + 3 + i*3, y + 27)
    }

    // Tiny arms
    g.fillStyle(c)
    g.fillRoundedRect(x - 14, y + 4, 4, 8, 2)
    g.fillRoundedRect(x + 9, y + 4, 4, 8, 2)

    // Head
    g.fillStyle(c); g.fillCircle(x - 4, y - 8, 12)
    // Snout (longer)
    g.fillStyle(c); g.fillRoundedRect(x + 1, y - 11, 14, 9, 3)
    g.fillStyle(p, 0.4); g.fillRoundedRect(x + 1, y - 7, 12, 4, 2)

    // Mouth line
    g.lineStyle(1, 0x1a1a3a, 0.7)
    g.beginPath(); g.moveTo(x + 2, y - 4); g.lineTo(x + 14, y - 3); g.strokePath()

    // Eyes
    g.fillStyle(0xffffff); g.fillEllipse(x - 6, y - 10, 6, 5)
    g.fillStyle(0x1a1a3a); g.fillCircle(x - 5, y - 10, 2)
    g.fillStyle(0xffffff); g.fillCircle(x - 5, y - 11, 0.8)

    // Brow horn
    g.fillStyle(p); g.fillTriangle(x - 8, y - 18, x - 5, y - 23, x - 2, y - 18)
    // Nostril
    g.fillStyle(0x1a1a3a); g.fillCircle(x + 13, y - 8, 0.8)

  } else if (stage === 3) {
    // Raptus — teen raptor, fierce, full tail and big spikes
    g.fillStyle(0x000000, 0.22); g.fillEllipse(x, y + 32, 42, 10)

    // Long tail
    g.fillStyle(c)
    g.fillTriangle(x + 6, y + 10, x + 28, y + 4, x + 14, y + 18)
    g.fillTriangle(x + 16, y + 4, x + 32, y - 6, x + 24, y + 4)
    g.fillTriangle(x + 22, y - 4, x + 36, y - 16, x + 28, y - 4)
    g.fillStyle(p)
    g.fillTriangle(x + 30, y - 14, x + 38, y - 22, x + 34, y - 14)

    // Body
    g.fillStyle(c); g.fillEllipse(x - 2, y + 4, 28, 32)
    // Belly + scale lines
    g.fillStyle(p, 0.55); g.fillEllipse(x - 2, y + 10, 16, 22)
    g.lineStyle(0.5, 0x1a3a4a, 0.6)
    for (let i = 0; i < 4; i++) {
      g.beginPath(); g.moveTo(x - 7, y + 2 + i * 5); g.lineTo(x + 5, y + 2 + i * 5); g.strokePath()
    }

    // Back spikes (5)
    g.fillStyle(p)
    for (let i = 0; i < 5; i++) {
      const sx = x - 12 + i * 5
      const sh = i === 2 ? 13 : 9
      g.fillTriangle(sx - 2, y - 8, sx, y - 8 - sh, sx + 2, y - 8)
    }
    g.fillStyle(0xffffff, 0.5)
    for (let i = 0; i < 5; i++) {
      const sx = x - 12 + i * 5
      const sh = i === 2 ? 8 : 5
      g.fillTriangle(sx - 1, y - 8, sx, y - 8 - sh, sx + 1, y - 8)
    }

    // Strong legs
    g.fillStyle(c)
    g.fillEllipse(x - 8, y + 22, 9, 14)
    g.fillEllipse(x + 4, y + 22, 9, 14)
    g.fillStyle(0x1a1a3a)
    g.fillRect(x - 13, y + 30, 11, 4)
    g.fillRect(x - 1, y + 30, 11, 4)
    g.fillStyle(0xeeeeff)
    for (let i = 0; i < 3; i++) {
      g.fillTriangle(x - 13 + i*4, y + 34, x - 11 + i*4, y + 37, x - 9 + i*4, y + 34)
      g.fillTriangle(x - 1 + i*4, y + 34, x + 1 + i*4, y + 37, x + 3 + i*4, y + 34)
    }

    // Arms with hand-claws
    g.fillStyle(c)
    g.fillEllipse(x - 14, y + 4, 5, 11)
    g.fillEllipse(x + 10, y + 4, 5, 11)
    g.fillStyle(0xeeeeff)
    g.fillTriangle(x - 16, y + 9, x - 14, y + 13, x - 12, y + 9)
    g.fillTriangle(x + 8, y + 9, x + 10, y + 13, x + 12, y + 9)

    // Head (more dino-like)
    g.fillStyle(c); g.fillEllipse(x - 6, y - 12, 18, 14)
    // Long snout
    g.fillStyle(c); g.fillRoundedRect(x - 2, y - 14, 18, 10, 3)
    g.fillStyle(p, 0.4); g.fillRoundedRect(x - 2, y - 9, 16, 4, 2)

    // Teeth
    g.fillStyle(0xffffff)
    for (let i = 0; i < 4; i++) {
      g.fillTriangle(x + 1 + i*4, y - 4, x + 2 + i*4, y - 1, x + 3 + i*4, y - 4)
    }
    g.lineStyle(1, 0x1a1a3a, 0.8)
    g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x + 16, y - 4); g.strokePath()

    // Eyes (fierce yellow)
    g.fillStyle(0xffdd33); g.fillEllipse(x - 5, y - 14, 6, 5)
    g.fillStyle(0x1a1a3a); g.fillEllipse(x - 4, y - 14, 3, 5)
    g.fillStyle(0xffffff); g.fillCircle(x - 3, y - 15, 0.8)

    // Nostril
    g.fillStyle(0x1a1a3a); g.fillCircle(x + 14, y - 11, 1)

    // Brow horn
    g.fillStyle(p); g.fillTriangle(x - 9, y - 20, x - 5, y - 27, x - 1, y - 20)

  } else if (stage === 4) {
    // Tyranex — apex predator, glowing eyes, wings, huge spikes
    g.fillStyle(c, 0.12); g.fillCircle(x, y, 60)
    g.fillStyle(c, 0.08); g.fillCircle(x, y, 72)

    g.fillStyle(0x000000, 0.28); g.fillEllipse(x, y + 38, 56, 12)

    // Massive tail
    g.fillStyle(c)
    g.fillTriangle(x + 8, y + 16, x + 38, y + 4, x + 18, y + 26)
    g.fillTriangle(x + 22, y + 4, x + 48, y - 10, x + 32, y + 8)
    g.fillTriangle(x + 32, y - 8, x + 54, y - 28, x + 42, y - 4)
    g.fillStyle(p)
    g.fillTriangle(x + 48, y - 24, x + 58, y - 36, x + 52, y - 22)
    g.fillTriangle(x + 44, y - 18, x + 54, y - 30, x + 50, y - 16)

    // Wings (dragon flair)
    g.fillStyle(c, 0.55)
    g.fillTriangle(x - 14, y - 8, x - 38, y - 32, x - 8, y + 10)
    g.fillTriangle(x + 14, y - 8, x + 38, y - 32, x + 8, y + 10)
    g.fillStyle(p, 0.4)
    g.fillTriangle(x - 14, y - 8, x - 30, y - 24, x - 10, y + 6)
    g.fillTriangle(x + 14, y - 8, x + 30, y - 24, x + 10, y + 6)
    // Wing bones
    g.lineStyle(1, p, 0.6)
    g.beginPath(); g.moveTo(x - 14, y - 8); g.lineTo(x - 36, y - 30); g.strokePath()
    g.beginPath(); g.moveTo(x + 14, y - 8); g.lineTo(x + 36, y - 30); g.strokePath()

    // Body
    g.fillStyle(c); g.fillEllipse(x - 2, y + 6, 36, 40)
    // Belly + ribs
    g.fillStyle(p, 0.55); g.fillEllipse(x - 2, y + 14, 22, 28)
    g.lineStyle(1, 0x441100, 0.55)
    for (let i = 0; i < 5; i++) {
      g.beginPath(); g.moveTo(x - 9, y + 2 + i * 6); g.lineTo(x + 5, y + 2 + i * 6); g.strokePath()
    }

    // HUGE back spikes
    g.fillStyle(p)
    for (let i = 0; i < 6; i++) {
      const sx = x - 16 + i * 6
      const sh = (i === 2 || i === 3) ? 18 : 12
      g.fillTriangle(sx - 3, y - 10, sx, y - 10 - sh, sx + 3, y - 10)
    }
    g.fillStyle(0xffdd44, 0.7)
    for (let i = 0; i < 6; i++) {
      const sx = x - 16 + i * 6
      const sh = (i === 2 || i === 3) ? 12 : 8
      g.fillTriangle(sx - 1, y - 10, sx, y - 10 - sh, sx + 1, y - 10)
    }

    // Strong legs
    g.fillStyle(c)
    g.fillEllipse(x - 12, y + 26, 12, 18)
    g.fillEllipse(x + 6, y + 26, 12, 18)
    g.fillStyle(0x1a1a3a)
    g.fillRect(x - 18, y + 36, 14, 5)
    g.fillRect(x, y + 36, 14, 5)
    g.fillStyle(0xeeeeff)
    for (let i = 0; i < 3; i++) {
      g.fillTriangle(x - 18 + i*5, y + 41, x - 16 + i*5, y + 45, x - 14 + i*5, y + 41)
      g.fillTriangle(x + i*5, y + 41, x + 2 + i*5, y + 45, x + 4 + i*5, y + 41)
    }

    // Arms with claws
    g.fillStyle(c)
    g.fillEllipse(x - 18, y + 4, 7, 14)
    g.fillEllipse(x + 14, y + 4, 7, 14)
    g.fillStyle(0xeeeeff)
    g.fillTriangle(x - 22, y + 11, x - 18, y + 16, x - 14, y + 11)
    g.fillTriangle(x + 10, y + 11, x + 14, y + 16, x + 18, y + 11)

    // Head
    g.fillStyle(c); g.fillEllipse(x - 6, y - 16, 22, 18)
    // Long snout
    g.fillStyle(c); g.fillRoundedRect(x, y - 18, 22, 12, 4)
    g.fillStyle(p, 0.4); g.fillRoundedRect(x, y - 12, 20, 5, 2)

    // Sharp teeth (top + bottom)
    g.fillStyle(0xffffff)
    for (let i = 0; i < 5; i++) {
      g.fillTriangle(x + 2 + i*4, y - 6, x + 3 + i*4, y - 2, x + 4 + i*4, y - 6)
      g.fillTriangle(x + 2 + i*4, y - 8, x + 3 + i*4, y - 12, x + 4 + i*4, y - 8)
    }

    // Glowing eyes
    g.fillStyle(0xff3333); g.fillEllipse(x - 7, y - 18, 7, 6)
    g.fillStyle(0xffaa00); g.fillEllipse(x - 7, y - 18, 4, 4)
    g.fillStyle(0xffffff); g.fillCircle(x - 6, y - 19, 1)

    // Nostril
    g.fillStyle(0x1a1a3a); g.fillCircle(x + 18, y - 14, 1.5)

    // Massive horns
    g.fillStyle(p)
    g.fillTriangle(x - 12, y - 24, x - 8, y - 38, x - 4, y - 22)
    g.fillTriangle(x - 16, y - 22, x - 18, y - 36, x - 8, y - 22)
    g.fillStyle(0xffdd44, 0.7)
    g.fillTriangle(x - 11, y - 24, x - 8, y - 34, x - 5, y - 22)

  } else { // stage 5 — Goraxis, ascended apex
    // Triple aura
    g.fillStyle(c, 0.14); g.fillCircle(x, y, 78)
    g.fillStyle(c, 0.10); g.fillCircle(x, y, 92)
    g.fillStyle(p, 0.06); g.fillCircle(x, y, 110)
    g.fillStyle(0x000000, 0.32); g.fillEllipse(x, y + 42, 64, 14)

    // Massive tail
    g.fillStyle(c)
    g.fillTriangle(x + 10, y + 18, x + 44, y + 4, x + 22, y + 30)
    g.fillTriangle(x + 26, y + 4, x + 56, y - 14, x + 38, y + 8)
    g.fillTriangle(x + 36, y - 12, x + 64, y - 36, x + 50, y - 4)
    g.fillStyle(p)
    g.fillTriangle(x + 56, y - 32, x + 70, y - 46, x + 62, y - 28)

    // Four wings: outer + inner pair on each side
    g.fillStyle(c, 0.6)
    g.fillTriangle(x - 16, y - 12, x - 46, y - 42, x - 8, y + 12)
    g.fillTriangle(x + 16, y - 12, x + 46, y - 42, x + 8, y + 12)
    g.fillStyle(p, 0.55)
    g.fillTriangle(x - 14, y - 4, x - 32, y - 26, x - 6, y + 12)
    g.fillTriangle(x + 14, y - 4, x + 32, y - 26, x + 6, y + 12)

    // Body
    g.fillStyle(c); g.fillEllipse(x - 2, y + 6, 42, 46)
    g.fillStyle(p, 0.55); g.fillEllipse(x - 2, y + 14, 26, 32)
    g.lineStyle(1, p, 0.7)
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(x - 10, y + 4 + i * 6); g.lineTo(x + 6, y + 4 + i * 6); g.strokePath() }

    // Eight back spikes with golden cores
    g.fillStyle(p)
    for (let i = 0; i < 8; i++) {
      const sx = x - 22 + i * 6, sh = (i === 3 || i === 4) ? 22 : 14
      g.fillTriangle(sx - 3, y - 12, sx, y - 12 - sh, sx + 3, y - 12)
    }
    g.fillStyle(0xffdd44, 0.75)
    for (let i = 0; i < 8; i++) {
      const sx = x - 22 + i * 6, sh = (i === 3 || i === 4) ? 14 : 9
      g.fillTriangle(sx - 1, y - 12, sx, y - 12 - sh, sx + 1, y - 12)
    }

    // Strong legs
    g.fillStyle(c); g.fillEllipse(x - 14, y + 28, 14, 20); g.fillEllipse(x + 8, y + 28, 14, 20)
    g.fillStyle(0x1a1a3a); g.fillRect(x - 21, y + 38, 16, 5); g.fillRect(x + 1, y + 38, 16, 5)
    g.fillStyle(0xffdd44)
    for (let i = 0; i < 4; i++) {
      g.fillTriangle(x - 21 + i*4, y + 43, x - 19 + i*4, y + 47, x - 17 + i*4, y + 43)
      g.fillTriangle(x + 1 + i*4, y + 43, x + 3 + i*4, y + 47, x + 5 + i*4, y + 43)
    }

    // Arms
    g.fillStyle(c); g.fillEllipse(x - 20, y + 4, 8, 16); g.fillEllipse(x + 16, y + 4, 8, 16)
    g.fillStyle(0xffdd44)
    g.fillTriangle(x - 24, y + 12, x - 20, y + 18, x - 16, y + 12)
    g.fillTriangle(x + 12, y + 12, x + 16, y + 18, x + 20, y + 12)

    // Head
    g.fillStyle(c); g.fillEllipse(x - 6, y - 18, 24, 20)
    g.fillStyle(c); g.fillRoundedRect(x, y - 20, 24, 14, 5)
    g.fillStyle(p, 0.4); g.fillRoundedRect(x, y - 14, 22, 5, 2)
    // Teeth
    g.fillStyle(0xffffff)
    for (let i = 0; i < 6; i++) {
      g.fillTriangle(x + 2 + i*4, y - 6, x + 3 + i*4, y - 2, x + 4 + i*4, y - 6)
      g.fillTriangle(x + 2 + i*4, y - 8, x + 3 + i*4, y - 12, x + 4 + i*4, y - 8)
    }
    // Glowing eyes (hot magenta)
    g.fillStyle(0xffffff); g.fillEllipse(x - 7, y - 20, 8, 7)
    g.fillStyle(0xff44dd); g.fillEllipse(x - 7, y - 20, 5, 5)
    g.fillStyle(0xffaaff); g.fillCircle(x - 7, y - 20, 2)
    g.fillStyle(0xffffff); g.fillCircle(x - 6, y - 21, 1.2)
    g.fillStyle(0x1a1a3a); g.fillCircle(x + 20, y - 16, 1.5)

    // Crown of three horns
    g.fillStyle(p)
    g.fillTriangle(x - 18, y - 24, x - 22, y - 40, x - 12, y - 22)
    g.fillTriangle(x - 12, y - 26, x - 8, y - 44, x - 4, y - 24)
    g.fillTriangle(x - 4, y - 24, x + 2, y - 38, x + 6, y - 22)
    g.fillStyle(0xffdd44, 0.75)
    g.fillTriangle(x - 8, y - 26, x - 6, y - 40, x - 4, y - 24)

    // Forehead crystal
    g.fillStyle(0xff66dd); g.fillCircle(x - 6, y - 30, 4)
    g.fillStyle(0xffaaff); g.fillCircle(x - 6, y - 30, 2)
    g.fillStyle(0xffffff); g.fillCircle(x - 5, y - 31, 0.8)

    // Floating aura particles
    g.fillStyle(p, 0.7); g.fillCircle(x + 32, y - 24, 1.5); g.fillCircle(x - 34, y + 18, 1.5)
    g.fillStyle(0xffffff, 0.65); g.fillCircle(x + 28, y + 28, 1); g.fillCircle(x - 28, y - 32, 1)
  }
}

// ─── Creature drawing — water dragon lineage (Egg → Leviarus) ─────────────────
function drawWater(g: any, stage: number, x: number, y: number) {
  const c = SPECIES[1].stageColors[stage]
  const p = SPECIES[1].stagePulse[stage]
  g.clear()

  if (stage === 0) {
    g.fillStyle(0x000000, 0.18); g.fillEllipse(x, y + 22, 30, 8)
    g.fillStyle(0xeef9ff);       g.fillEllipse(x, y, 30, 38)
    g.fillStyle(0xffffff, 0.6);  g.fillEllipse(x - 6, y - 8, 10, 14)
    g.fillStyle(0x4488dd, 0.85)
    g.fillCircle(x + 5, y + 3, 4); g.fillCircle(x - 7, y + 8, 3); g.fillCircle(x + 3, y - 6, 3)
    g.fillStyle(0x88ccee, 0.8); g.fillCircle(x - 4, y, 2); g.fillCircle(x + 8, y + 7, 2)
    g.lineStyle(1, 0x4488dd, 0.7)
    g.beginPath(); g.moveTo(x - 10, y + 12); g.lineTo(x - 6, y + 10); g.lineTo(x - 2, y + 12); g.lineTo(x + 2, y + 10); g.lineTo(x + 6, y + 12); g.lineTo(x + 10, y + 10); g.strokePath()

  } else if (stage === 1) {
    // Tadrake — round tadpole-y dragon baby
    g.fillStyle(0x000000, 0.2); g.fillEllipse(x, y + 18, 26, 6)
    // Tail
    g.fillStyle(c); g.fillTriangle(x - 8, y, x - 22, y - 4, x - 18, y + 6)
    g.fillStyle(p); g.fillTriangle(x - 16, y - 3, x - 26, y - 8, x - 18, y + 1)
    g.fillTriangle(x - 16, y + 2, x - 26, y + 6, x - 18, y - 2)
    // Body
    g.fillStyle(c); g.fillEllipse(x, y, 24, 20)
    g.fillStyle(p, 0.55); g.fillEllipse(x - 1, y + 4, 14, 10)
    // Side fins
    g.fillStyle(c)
    g.fillTriangle(x - 4, y + 8, x - 10, y + 14, x + 2, y + 12)
    g.fillTriangle(x + 4, y + 8, x + 12, y + 12, x, y + 12)
    // Top dorsal
    g.fillStyle(p); g.fillTriangle(x - 4, y - 8, x, y - 14, x + 4, y - 8)
    // Eyes
    g.fillStyle(0xffffff); g.fillCircle(x - 5, y - 4, 4); g.fillCircle(x + 5, y - 4, 4)
    g.fillStyle(0x1a1a3a); g.fillCircle(x - 4, y - 4, 2.2); g.fillCircle(x + 6, y - 4, 2.2)
    g.fillStyle(0xffffff); g.fillCircle(x - 3, y - 5, 0.9); g.fillCircle(x + 7, y - 5, 0.9)
    // Mouth
    g.fillStyle(0xff8888, 0.55); g.fillEllipse(x, y + 4, 5, 2)
    // Bubbles
    g.fillStyle(0xddffff, 0.6); g.fillCircle(x + 12, y - 12, 2)
    g.fillStyle(0xddffff, 0.4); g.fillCircle(x + 14, y - 16, 1)

  } else if (stage === 2) {
    // Aquilis — small dragon-fish
    g.fillStyle(0x000000, 0.22); g.fillEllipse(x, y + 22, 32, 7)
    // Tail
    g.fillStyle(c); g.fillTriangle(x + 8, y + 4, x + 22, y - 4, x + 18, y + 12)
    g.fillStyle(p)
    g.fillTriangle(x + 16, y - 4, x + 26, y - 12, x + 22, y - 4)
    g.fillTriangle(x + 16, y + 8, x + 26, y + 14, x + 22, y + 4)
    // Body
    g.fillStyle(c); g.fillEllipse(x - 2, y + 4, 28, 22)
    // Dorsal fin run
    g.fillStyle(p)
    g.fillTriangle(x - 12, y - 4, x - 8, y - 12, x - 4, y - 4)
    g.fillTriangle(x - 4, y - 4, x, y - 14, x + 4, y - 4)
    g.fillTriangle(x + 4, y - 4, x + 8, y - 12, x + 12, y - 4)
    g.fillStyle(p, 0.55); g.fillEllipse(x - 2, y + 8, 18, 12)
    // Side fins
    g.fillStyle(c)
    g.fillTriangle(x - 6, y + 10, x - 14, y + 18, x, y + 14)
    g.fillTriangle(x + 4, y + 10, x + 12, y + 18, x - 2, y + 14)
    // Gills
    g.lineStyle(1, 0x1a3a5a, 0.7)
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(x - 12 + i*2, y + 2); g.lineTo(x - 12 + i*2, y + 8); g.strokePath() }
    // Head/snout
    g.fillStyle(c); g.fillEllipse(x - 14, y + 2, 10, 14)
    // Whiskers
    g.lineStyle(1, p, 0.85)
    g.beginPath(); g.moveTo(x - 18, y + 4); g.lineTo(x - 26, y + 6); g.lineTo(x - 30, y + 12); g.strokePath()
    g.beginPath(); g.moveTo(x - 18, y + 8); g.lineTo(x - 26, y + 12); g.lineTo(x - 30, y + 16); g.strokePath()
    // Eye
    g.fillStyle(0xffffff); g.fillEllipse(x - 14, y - 2, 5, 4)
    g.fillStyle(0x1a1a3a); g.fillCircle(x - 13, y - 2, 1.8)
    g.fillStyle(0xffffff); g.fillCircle(x - 12, y - 3, 0.8)
    // Mouth
    g.fillStyle(0xff8888, 0.4); g.fillEllipse(x - 16, y + 4, 4, 2)

  } else if (stage === 3) {
    // Hydrabane — serpentine dragon
    g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + 28, 44, 9)
    // Tail
    g.fillStyle(c); g.fillEllipse(x + 16, y, 12, 14); g.fillEllipse(x + 26, y - 6, 10, 10)
    g.fillStyle(p); g.fillTriangle(x + 28, y - 12, x + 38, y - 20, x + 32, y - 6)
    g.fillTriangle(x + 28, y, x + 38, y + 8, x + 32, y - 4)
    // Body
    g.fillStyle(c); g.fillEllipse(x, y + 6, 30, 26)
    // Scale dots
    g.fillStyle(p, 0.55)
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) g.fillCircle(x - 12 + i*5, y + j*5 - 2, 1)
    g.fillStyle(p, 0.5); g.fillEllipse(x - 2, y + 12, 18, 16)
    // Dorsal spikes
    g.fillStyle(p)
    for (let i = 0; i < 5; i++) {
      const sx = x - 12 + i*5; const sh = i === 2 ? 14 : 10
      g.fillTriangle(sx - 2, y - 4, sx, y - 4 - sh, sx + 2, y - 4)
    }
    // Side fin
    g.fillStyle(c); g.fillTriangle(x - 8, y + 12, x - 18, y + 22, x, y + 16)
    // Head
    g.fillStyle(c); g.fillEllipse(x - 14, y + 2, 16, 14)
    g.fillStyle(c); g.fillRoundedRect(x - 22, y - 2, 14, 10, 3)
    // Horns
    g.fillStyle(p)
    g.fillTriangle(x - 12, y - 8, x - 10, y - 16, x - 6, y - 6)
    g.fillTriangle(x - 10, y - 6, x - 14, y - 14, x - 18, y - 6)
    // Whiskers
    g.lineStyle(1, p, 0.85)
    g.beginPath(); g.moveTo(x - 22, y + 4); g.lineTo(x - 32, y + 8); g.lineTo(x - 38, y + 18); g.strokePath()
    g.beginPath(); g.moveTo(x - 22, y + 8); g.lineTo(x - 32, y + 14); g.lineTo(x - 38, y + 22); g.strokePath()
    // Eye
    g.fillStyle(0xffdd33); g.fillEllipse(x - 14, y - 2, 5, 4)
    g.fillStyle(0x1a1a3a); g.fillEllipse(x - 13, y - 2, 3, 4)
    g.fillStyle(0xffffff); g.fillCircle(x - 12, y - 3, 0.8)
    // Teeth
    g.fillStyle(0xffffff)
    for (let i = 0; i < 3; i++) g.fillTriangle(x - 21 + i*4, y + 6, x - 20 + i*4, y + 9, x - 19 + i*4, y + 6)
    g.lineStyle(1, 0x1a1a3a, 0.7)
    g.beginPath(); g.moveTo(x - 22, y + 6); g.lineTo(x - 8, y + 6); g.strokePath()
    g.fillStyle(0x1a1a3a); g.fillCircle(x - 22, y + 1, 1)

  } else if (stage === 4) {
    // Leviarus — apex water dragon with antlers and pearl
    g.fillStyle(c, 0.12); g.fillCircle(x, y, 60)
    g.fillStyle(c, 0.08); g.fillCircle(x, y, 75)
    g.fillStyle(0x000000, 0.28); g.fillEllipse(x, y + 36, 56, 12)
    // Tail (multiple coils)
    g.fillStyle(c)
    g.fillEllipse(x + 22, y + 4, 16, 18); g.fillEllipse(x + 36, y - 6, 14, 12); g.fillEllipse(x + 46, y - 18, 10, 10)
    g.fillStyle(p)
    g.fillTriangle(x + 46, y - 22, x + 60, y - 36, x + 52, y - 18)
    g.fillTriangle(x + 46, y - 14, x + 60, y - 28, x + 52, y - 14)
    // Side fins
    g.fillStyle(c, 0.7)
    g.fillTriangle(x - 6, y + 12, x - 18, y + 28, x + 6, y + 24)
    g.fillTriangle(x + 8, y + 16, x + 22, y + 32, x + 16, y + 20)
    // Body
    g.fillStyle(c); g.fillEllipse(x, y + 6, 38, 36)
    // Scale shimmer
    g.fillStyle(p, 0.55)
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) g.fillCircle(x - 14 + i*6, y - 6 + j*5, 1.5)
    g.fillStyle(p, 0.55); g.fillEllipse(x - 2, y + 14, 24, 22)
    g.lineStyle(1, p, 0.7)
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x - 10, y + 4 + i*5); g.lineTo(x + 6, y + 4 + i*5); g.strokePath() }
    // Dorsal mane
    g.fillStyle(p)
    for (let i = 0; i < 7; i++) {
      const sx = x - 18 + i*6; const sh = (i === 2 || i === 3 || i === 4) ? 20 : 14
      g.fillTriangle(sx - 3, y - 8, sx, y - 8 - sh, sx + 3, y - 8)
    }
    g.fillStyle(0xddffff, 0.65)
    for (let i = 0; i < 7; i++) {
      const sx = x - 18 + i*6; const sh = (i === 2 || i === 3 || i === 4) ? 14 : 10
      g.fillTriangle(sx - 1, y - 8, sx, y - 8 - sh, sx + 1, y - 8)
    }
    // Head
    g.fillStyle(c); g.fillEllipse(x - 18, y, 22, 18)
    g.fillStyle(c); g.fillRoundedRect(x - 30, y - 4, 18, 12, 4)
    g.fillStyle(p, 0.4); g.fillRoundedRect(x - 30, y + 1, 16, 5, 2)
    // Antlers
    g.fillStyle(p)
    g.fillTriangle(x - 14, y - 12, x - 10, y - 24, x - 6, y - 10)
    g.fillTriangle(x - 18, y - 10, x - 22, y - 22, x - 14, y - 8)
    g.fillTriangle(x - 22, y - 6, x - 30, y - 18, x - 22, y - 4)
    g.fillStyle(0xffdd66, 0.7); g.fillTriangle(x - 12, y - 12, x - 9, y - 21, x - 7, y - 10)
    // Whiskers
    g.lineStyle(1.5, p, 0.9)
    g.beginPath(); g.moveTo(x - 30, y); g.lineTo(x - 44, y - 4); g.lineTo(x - 52, y + 8); g.strokePath()
    g.beginPath(); g.moveTo(x - 30, y + 6); g.lineTo(x - 44, y + 12); g.lineTo(x - 50, y + 24); g.strokePath()
    // Glowing eye
    g.fillStyle(0x88eeff); g.fillEllipse(x - 18, y - 4, 7, 6)
    g.fillStyle(0xffffff); g.fillCircle(x - 17, y - 4, 2)
    g.fillStyle(0x1a1a3a); g.fillCircle(x - 16, y - 5, 0.6)
    // Teeth
    g.fillStyle(0xffffff)
    for (let i = 0; i < 5; i++) g.fillTriangle(x - 28 + i*4, y + 6, x - 27 + i*4, y + 10, x - 26 + i*4, y + 6)
    g.fillStyle(0x1a1a3a); g.fillCircle(x - 28, y + 1, 1.2)
    // Pearl orb
    g.fillStyle(0xffffff, 0.9); g.fillCircle(x - 38, y + 18, 5)
    g.fillStyle(0x88eeff, 0.5); g.fillCircle(x - 38, y + 18, 7)

  } else { // stage 5 — Abyssarus, abyssal sovereign with three orbs and storm aura
    // Layered cyan + violet aura
    g.fillStyle(c, 0.14); g.fillCircle(x, y, 78)
    g.fillStyle(0x66ccff, 0.10); g.fillCircle(x, y, 92)
    g.fillStyle(p, 0.07); g.fillCircle(x, y, 108)
    g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 40, 60, 14)

    // Three flowing tail coils
    g.fillStyle(c)
    g.fillEllipse(x + 22, y + 4, 18, 22)
    g.fillEllipse(x + 38, y - 8, 16, 14)
    g.fillEllipse(x + 50, y - 22, 12, 12)
    g.fillStyle(p)
    g.fillTriangle(x + 50, y - 26, x + 64, y - 42, x + 56, y - 22)
    g.fillTriangle(x + 48, y - 16, x + 62, y - 32, x + 56, y - 14)
    g.fillTriangle(x + 54, y - 26, x + 60, y - 8, x + 64, y - 32)

    // Larger flowing fins
    g.fillStyle(c, 0.7)
    g.fillTriangle(x - 8, y + 14, x - 22, y + 34, x + 8, y + 28)
    g.fillTriangle(x + 10, y + 18, x + 28, y + 36, x + 18, y + 22)
    g.fillStyle(p, 0.5)
    g.fillTriangle(x - 6, y + 16, x - 16, y + 30, x + 4, y + 24)

    // Body
    g.fillStyle(c); g.fillEllipse(x, y + 6, 42, 40)
    g.fillStyle(p, 0.55)
    for (let i = 0; i < 7; i++) for (let j = 0; j < 5; j++) g.fillCircle(x - 16 + i*6, y - 8 + j*5, 1.5)
    g.fillStyle(p, 0.55); g.fillEllipse(x - 2, y + 14, 26, 26)
    g.lineStyle(1, p, 0.7)
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(x - 12, y + 4 + i*5); g.lineTo(x + 6, y + 4 + i*5); g.strokePath() }

    // Tall dorsal mane
    g.fillStyle(p)
    for (let i = 0; i < 8; i++) {
      const sx = x - 22 + i * 6, sh = (i === 3 || i === 4) ? 22 : 14
      g.fillTriangle(sx - 3, y - 8, sx, y - 8 - sh, sx + 3, y - 8)
    }
    g.fillStyle(0xddeeff, 0.7)
    for (let i = 0; i < 8; i++) {
      const sx = x - 22 + i * 6, sh = (i === 3 || i === 4) ? 14 : 9
      g.fillTriangle(sx - 1, y - 8, sx, y - 8 - sh, sx + 1, y - 8)
    }

    // Heads — central + two smaller side heads on stems
    // Side heads
    g.fillStyle(c)
    g.fillEllipse(x - 28, y - 18, 14, 12)  // upper-left head
    g.fillEllipse(x - 22, y + 16, 14, 12)  // lower-left head
    g.fillStyle(0x88eeff)
    g.fillCircle(x - 30, y - 20, 1.5); g.fillCircle(x - 24, y + 14, 1.5)

    // Main head + snout
    g.fillStyle(c); g.fillEllipse(x - 16, y, 22, 18)
    g.fillStyle(c); g.fillRoundedRect(x - 28, y - 4, 18, 12, 4)
    g.fillStyle(p, 0.4); g.fillRoundedRect(x - 28, y + 1, 16, 5, 2)

    // Crown of antlers (3 prongs)
    g.fillStyle(p)
    g.fillTriangle(x - 14, y - 14, x - 12, y - 30, x - 8, y - 10)
    g.fillTriangle(x - 18, y - 10, x - 24, y - 26, x - 14, y - 8)
    g.fillTriangle(x - 22, y - 6, x - 32, y - 22, x - 22, y - 4)
    g.fillStyle(0xffdd66, 0.7); g.fillTriangle(x - 13, y - 14, x - 11, y - 28, x - 9, y - 10)

    // Long flowing whiskers
    g.lineStyle(1.5, p, 0.95)
    g.beginPath(); g.moveTo(x - 28, y); g.lineTo(x - 44, y - 6); g.lineTo(x - 56, y + 6); g.strokePath()
    g.beginPath(); g.moveTo(x - 28, y + 6); g.lineTo(x - 44, y + 12); g.lineTo(x - 56, y + 26); g.strokePath()

    // Glowing eye
    g.fillStyle(0xddccff); g.fillEllipse(x - 16, y - 4, 7, 6)
    g.fillStyle(0xffffff); g.fillCircle(x - 15, y - 4, 2)
    g.fillStyle(0x1a1a3a); g.fillCircle(x - 14, y - 5, 0.6)
    // Teeth
    g.fillStyle(0xffffff)
    for (let i = 0; i < 5; i++) g.fillTriangle(x - 26 + i*4, y + 6, x - 25 + i*4, y + 10, x - 24 + i*4, y + 6)
    g.fillStyle(0x1a1a3a); g.fillCircle(x - 26, y + 1, 1.2)

    // Three guardian pearls (signature)
    const pearl = (px: number, py: number) => {
      g.fillStyle(0xffffff, 0.95); g.fillCircle(px, py, 5)
      g.fillStyle(0xaaeeff, 0.6); g.fillCircle(px, py, 7)
      g.fillStyle(0xffffff); g.fillCircle(px - 1, py - 1, 1.5)
    }
    pearl(x - 36, y + 18)
    pearl(x + 18, y + 32)
    pearl(x + 36, y + 18)

    // Aura sparkles
    g.fillStyle(0xddccff, 0.6); g.fillCircle(x + 26, y - 28, 1.5); g.fillCircle(x - 32, y - 30, 1.5)
  }
}

// ─── Creature drawing — lion turtle lineage (Egg → Lion Turtle) ───────────────
function drawLion(g: any, stage: number, x: number, y: number) {
  const c = SPECIES[2].stageColors[stage]
  const p = SPECIES[2].stagePulse[stage]
  g.clear()

  const hex = (cx: number, cy: number, r: number) => {
    g.beginPath()
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3
      const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py)
    }
    g.closePath(); g.strokePath()
  }

  if (stage === 0) {
    g.fillStyle(0x000000, 0.18); g.fillEllipse(x, y + 22, 30, 8)
    g.fillStyle(0xf0e0c4);       g.fillEllipse(x, y, 30, 38)
    g.fillStyle(0xffffff, 0.5);  g.fillEllipse(x - 6, y - 8, 10, 14)
    g.fillStyle(0x668844, 0.75); g.fillEllipse(x + 4, y + 4, 8, 5); g.fillEllipse(x - 7, y + 10, 6, 4); g.fillEllipse(x + 6, y - 8, 5, 4)
    g.fillStyle(0x4a6a3a, 0.7); g.fillCircle(x + 6, y + 4, 2); g.fillCircle(x - 8, y + 11, 1.5)
    g.lineStyle(1, 0x886030, 0.65); hex(x, y + 2, 5)

  } else if (stage === 1) {
    // Cubshell — baby lion turtle peeking out of shell
    g.fillStyle(0x000000, 0.22); g.fillEllipse(x, y + 22, 30, 7)
    // Shell
    g.fillStyle(c); g.fillEllipse(x, y, 28, 22)
    g.fillStyle(p, 0.55); g.fillEllipse(x - 4, y - 4, 14, 10)
    g.lineStyle(1, 0x886030, 0.7); hex(x, y + 2, 6)
    // Head
    g.fillStyle(0xddc090); g.fillCircle(x, y + 12, 8)
    // Tiny mane
    g.fillStyle(0xc89460, 0.85); g.fillCircle(x - 6, y + 8, 4); g.fillCircle(x + 6, y + 8, 4); g.fillCircle(x, y + 6, 4)
    g.fillStyle(0xeed6a8); g.fillEllipse(x, y + 12, 12, 10)
    // Eyes
    g.fillStyle(0x1a1a3a); g.fillCircle(x - 3, y + 11, 1.6); g.fillCircle(x + 3, y + 11, 1.6)
    g.fillStyle(0xffffff); g.fillCircle(x - 2, y + 10, 0.6); g.fillCircle(x + 4, y + 10, 0.6)
    // Nose
    g.fillStyle(0x1a1a3a); g.fillTriangle(x - 1, y + 14, x + 1, y + 14, x, y + 16)
    // Mouth
    g.lineStyle(1, 0x1a1a3a, 0.7)
    g.beginPath(); g.moveTo(x, y + 16); g.lineTo(x - 2, y + 18); g.strokePath()
    g.beginPath(); g.moveTo(x, y + 16); g.lineTo(x + 2, y + 18); g.strokePath()
    // Front legs
    g.fillStyle(0xddc090); g.fillRoundedRect(x - 13, y + 8, 5, 8, 2); g.fillRoundedRect(x + 8, y + 8, 5, 8, 2)
    g.fillStyle(0x1a1a3a); g.fillRect(x - 14, y + 14, 7, 3); g.fillRect(x + 7, y + 14, 7, 3)

  } else if (stage === 2) {
    // Maneshield — bigger shell, full mane, visible legs
    g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + 26, 36, 8)
    // Shell
    g.fillStyle(c); g.fillEllipse(x, y - 4, 32, 24)
    g.fillStyle(p, 0.5); g.fillEllipse(x - 6, y - 10, 16, 10)
    g.lineStyle(1, 0x886030, 0.75); hex(x, y - 4, 5); hex(x - 9, y - 1, 4); hex(x + 9, y - 1, 4)
    // Mane ring
    g.fillStyle(0xc89460)
    g.fillCircle(x - 8, y + 6, 5); g.fillCircle(x + 8, y + 6, 5)
    g.fillCircle(x - 4, y + 2, 5); g.fillCircle(x + 4, y + 2, 5); g.fillCircle(x, y + 8, 5)
    g.fillStyle(0xddb070, 0.7); g.fillCircle(x - 6, y + 4, 3); g.fillCircle(x + 6, y + 4, 3)
    // Head
    g.fillStyle(0xddc090); g.fillCircle(x, y + 8, 9)
    g.fillStyle(0xeed6a8); g.fillEllipse(x, y + 10, 14, 10)
    // Eyes
    g.fillStyle(0xffeebb); g.fillEllipse(x - 4, y + 8, 4, 3); g.fillEllipse(x + 4, y + 8, 4, 3)
    g.fillStyle(0x1a1a3a); g.fillCircle(x - 4, y + 8, 1.5); g.fillCircle(x + 4, y + 8, 1.5)
    g.fillStyle(0xffffff); g.fillCircle(x - 3, y + 7, 0.6); g.fillCircle(x + 5, y + 7, 0.6)
    // Nose
    g.fillStyle(0x1a1a3a); g.fillTriangle(x - 1, y + 12, x + 1, y + 12, x, y + 14)
    // Whiskers
    g.lineStyle(0.5, 0x885e2e, 0.6)
    for (let i = 0; i < 3; i++) {
      g.beginPath(); g.moveTo(x - 4, y + 12 + i); g.lineTo(x - 11, y + 13 + i*1.5); g.strokePath()
      g.beginPath(); g.moveTo(x + 4, y + 12 + i); g.lineTo(x + 11, y + 13 + i*1.5); g.strokePath()
    }
    // Legs
    g.fillStyle(c); g.fillRoundedRect(x - 16, y + 12, 6, 10, 2); g.fillRoundedRect(x + 10, y + 12, 6, 10, 2)
    g.fillStyle(0x1a1a3a); g.fillRect(x - 17, y + 20, 8, 3); g.fillRect(x + 9, y + 20, 8, 3)
    g.fillStyle(0xeeeeff)
    for (let i = 0; i < 3; i++) {
      g.fillTriangle(x - 17 + i*3, y + 23, x - 16 + i*3, y + 25, x - 15 + i*3, y + 23)
      g.fillTriangle(x + 9 + i*3, y + 23, x + 10 + i*3, y + 25, x + 11 + i*3, y + 23)
    }
    // Tail
    g.fillStyle(0xddc090); g.fillTriangle(x - 18, y - 2, x - 24, y - 4, x - 18, y + 4)

  } else if (stage === 3) {
    // Roarshell — large lion-faced turtle with full mane
    g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + 30, 44, 10)
    // Shell
    g.fillStyle(c); g.fillEllipse(x, y - 4, 40, 30)
    g.fillStyle(p, 0.5); g.fillEllipse(x - 8, y - 12, 18, 12)
    g.lineStyle(1, 0x886030, 0.85)
    hex(x, y - 8, 6); hex(x - 11, y - 4, 5); hex(x + 11, y - 4, 5); hex(x - 6, y + 4, 4); hex(x + 6, y + 4, 4)
    // Full mane
    g.fillStyle(0xb88040)
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6 - Math.PI / 2
      g.fillCircle(x + Math.cos(a) * 11, y + 10 + Math.sin(a) * 7.7, 5)
    }
    g.fillStyle(0xc89460, 0.7)
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 - Math.PI / 2
      g.fillCircle(x + Math.cos(a) * 8, y + 10 + Math.sin(a) * 5.6, 3)
    }
    // Head
    g.fillStyle(0xddc090); g.fillEllipse(x, y + 10, 18, 16)
    g.fillStyle(0xeed6a8); g.fillEllipse(x, y + 13, 14, 10)
    // Eyes
    g.fillStyle(0xffdd55); g.fillEllipse(x - 5, y + 9, 5, 4); g.fillEllipse(x + 5, y + 9, 5, 4)
    g.fillStyle(0x1a1a3a); g.fillEllipse(x - 4, y + 9, 3, 4); g.fillEllipse(x + 6, y + 9, 3, 4)
    g.fillStyle(0xffffff); g.fillCircle(x - 3, y + 8, 0.8); g.fillCircle(x + 7, y + 8, 0.8)
    // Nose
    g.fillStyle(0x1a1a3a); g.fillTriangle(x - 2, y + 13, x + 2, y + 13, x, y + 16)
    // Mouth + fangs
    g.lineStyle(1, 0x1a1a3a, 0.85)
    g.beginPath(); g.moveTo(x - 4, y + 17); g.lineTo(x, y + 16); g.lineTo(x + 4, y + 17); g.strokePath()
    g.fillStyle(0xffffff)
    g.fillTriangle(x - 2, y + 16, x - 1, y + 19, x, y + 16)
    g.fillTriangle(x, y + 16, x + 1, y + 19, x + 2, y + 16)
    // Whiskers
    g.lineStyle(0.5, 0x885e2e, 0.7)
    for (let i = 0; i < 3; i++) {
      g.beginPath(); g.moveTo(x - 5, y + 14 + i); g.lineTo(x - 14, y + 14 + i*2); g.strokePath()
      g.beginPath(); g.moveTo(x + 5, y + 14 + i); g.lineTo(x + 14, y + 14 + i*2); g.strokePath()
    }
    // Strong front legs
    g.fillStyle(c); g.fillEllipse(x - 16, y + 18, 8, 14); g.fillEllipse(x + 16, y + 18, 8, 14)
    g.fillStyle(0x1a1a3a); g.fillRect(x - 21, y + 26, 11, 4); g.fillRect(x + 11, y + 26, 11, 4)
    g.fillStyle(0xeeeeff)
    for (let i = 0; i < 3; i++) {
      g.fillTriangle(x - 21 + i*4, y + 30, x - 19 + i*4, y + 33, x - 17 + i*4, y + 30)
      g.fillTriangle(x + 11 + i*4, y + 30, x + 13 + i*4, y + 33, x + 15 + i*4, y + 30)
    }
    // Tail with tuft
    g.fillStyle(0xddc090); g.fillTriangle(x - 22, y, x - 30, y - 2, x - 22, y + 6)
    g.fillStyle(0xb88040); g.fillCircle(x - 30, y, 3)

  } else if (stage === 4) {
    // Lion Turtle — ancient guardian
    g.fillStyle(c, 0.15); g.fillCircle(x, y, 65)
    g.fillStyle(0xddc090, 0.1); g.fillCircle(x, y, 80)
    g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 38, 60, 12)
    // Shell
    g.fillStyle(c); g.fillEllipse(x, y - 6, 56, 40)
    g.fillStyle(p, 0.55); g.fillEllipse(x - 12, y - 16, 22, 14)
    g.lineStyle(2, 0x4a3a1a, 0.85); g.strokeEllipse(x, y - 6, 56, 40)
    g.lineStyle(1, 0x4a3a1a, 0.85)
    hex(x, y - 12, 7); hex(x - 14, y - 10, 6); hex(x + 14, y - 10, 6)
    hex(x - 6, y - 2, 5); hex(x + 6, y - 2, 5); hex(x - 18, y + 2, 5); hex(x + 18, y + 2, 5); hex(x, y + 8, 5)
    // City spires on shell
    g.fillStyle(0x886030, 0.85)
    g.fillTriangle(x - 8, y - 26, x - 4, y - 32, x, y - 26)
    g.fillTriangle(x - 2, y - 26, x + 2, y - 30, x + 6, y - 26)
    g.fillTriangle(x + 4, y - 26, x + 8, y - 32, x + 12, y - 26)
    g.fillStyle(0x4a3a1a, 0.6); g.fillRect(x - 10, y - 24, 22, 2)
    // Magnificent mane
    g.fillStyle(0xa07030)
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8 - Math.PI / 2
      const r = 16 + (i % 3) * 2
      g.fillCircle(x + Math.cos(a) * r * 0.9, y + 12 + Math.sin(a) * r * 0.7, 6)
    }
    g.fillStyle(0xb88040, 0.85)
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6 - Math.PI / 2
      g.fillCircle(x + Math.cos(a) * 12 * 0.9, y + 12 + Math.sin(a) * 12 * 0.7, 5)
    }
    g.fillStyle(0xddb070, 0.6)
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 - Math.PI / 2
      g.fillCircle(x + Math.cos(a) * 7, y + 12 + Math.sin(a) * 7 * 0.7, 3)
    }
    // Head
    g.fillStyle(0xc8a878); g.fillEllipse(x, y + 14, 22, 18)
    g.fillStyle(0xeed6a8); g.fillEllipse(x, y + 16, 18, 12)
    // Glowing wise eyes
    g.fillStyle(0x44ff88); g.fillEllipse(x - 6, y + 12, 6, 5); g.fillEllipse(x + 6, y + 12, 6, 5)
    g.fillStyle(0xffffff); g.fillCircle(x - 5, y + 11, 1); g.fillCircle(x + 7, y + 11, 1)
    // Nose
    g.fillStyle(0x1a1a3a); g.fillTriangle(x - 3, y + 16, x + 3, y + 16, x, y + 19)
    // Mouth (wise expression)
    g.lineStyle(1, 0x4a2a0a, 0.85)
    g.beginPath(); g.moveTo(x - 5, y + 21); g.lineTo(x, y + 20); g.lineTo(x + 5, y + 21); g.strokePath()
    // Long whiskers
    g.lineStyle(1, 0x4a2a0a, 0.7)
    for (let i = 0; i < 3; i++) {
      g.beginPath(); g.moveTo(x - 6, y + 17 + i); g.lineTo(x - 18, y + 18 + i*2); g.strokePath()
      g.beginPath(); g.moveTo(x + 6, y + 17 + i); g.lineTo(x + 18, y + 18 + i*2); g.strokePath()
    }
    // Legs
    g.fillStyle(c); g.fillEllipse(x - 22, y + 24, 12, 18); g.fillEllipse(x + 22, y + 24, 12, 18)
    g.fillStyle(p, 0.4); g.fillEllipse(x - 22, y + 22, 8, 12); g.fillEllipse(x + 22, y + 22, 8, 12)
    g.fillStyle(0x1a1a3a); g.fillRect(x - 28, y + 34, 14, 5); g.fillRect(x + 14, y + 34, 14, 5)
    g.fillStyle(0xffdd44)
    for (let i = 0; i < 3; i++) {
      g.fillTriangle(x - 28 + i*5, y + 39, x - 26 + i*5, y + 43, x - 24 + i*5, y + 39)
      g.fillTriangle(x + 14 + i*5, y + 39, x + 16 + i*5, y + 43, x + 18 + i*5, y + 39)
    }
    // Tail
    g.fillStyle(0xc8a878); g.fillEllipse(x + 32, y, 14, 8); g.fillTriangle(x + 36, y, x + 48, y - 4, x + 40, y + 6)
    g.fillStyle(0xffdd44, 0.85); g.fillCircle(x + 48, y - 2, 4)
    g.fillStyle(0xb88040, 0.7); g.fillCircle(x + 48, y - 2, 2)

  } else { // stage 5 — World Turtle, vast ancient guardian carrying a forest
    // Mighty aura
    g.fillStyle(c, 0.16); g.fillCircle(x, y, 70)
    g.fillStyle(0xffdd44, 0.10); g.fillCircle(x, y, 86)
    g.fillStyle(p, 0.06); g.fillCircle(x, y, 102)
    g.fillStyle(0x000000, 0.32); g.fillEllipse(x, y + 42, 68, 14)

    // Massive shell (wider, taller)
    g.fillStyle(c); g.fillEllipse(x, y - 8, 64, 46)
    g.fillStyle(p, 0.55); g.fillEllipse(x - 14, y - 20, 26, 16)
    g.lineStyle(2, 0x2a2a14, 0.9); g.strokeEllipse(x, y - 8, 64, 46)
    g.lineStyle(1, 0x2a2a14, 0.85)
    hex(x, y - 14, 8); hex(x - 16, y - 12, 7); hex(x + 16, y - 12, 7)
    hex(x - 8, y - 4, 6); hex(x + 8, y - 4, 6)
    hex(x - 22, y + 4, 5); hex(x + 22, y + 4, 5); hex(x, y + 10, 6)

    // Forest grove on the shell — trunks + canopies
    g.fillStyle(0x4a2a10)
    g.fillRect(x - 10, y - 32, 3, 7); g.fillRect(x - 2, y - 36, 3, 8); g.fillRect(x + 6, y - 32, 3, 7)
    g.fillStyle(0x1a4422, 0.92)
    g.fillCircle(x - 9, y - 36, 5); g.fillCircle(x - 1, y - 40, 6); g.fillCircle(x + 7, y - 36, 5)
    g.fillStyle(0x2a6a32, 0.85); g.fillCircle(x - 1, y - 42, 4)
    g.fillStyle(0xffdd44, 0.6); g.fillCircle(x - 9, y - 36, 1.4); g.fillCircle(x + 7, y - 36, 1.4)
    // Tiny stream / ground line on shell
    g.fillStyle(0x88ddff, 0.6); g.fillRect(x - 14, y - 28, 28, 1.5)

    // Magnificent flowing mane (golden)
    g.fillStyle(0x886020)
    for (let i = 0; i < 18; i++) {
      const a = i * Math.PI / 9 - Math.PI / 2
      const r = 19 + (i % 3) * 3
      g.fillCircle(x + Math.cos(a) * r * 0.92, y + 14 + Math.sin(a) * r * 0.7, 7)
    }
    g.fillStyle(0xb88040, 0.85)
    for (let i = 0; i < 14; i++) {
      const a = i * Math.PI / 7 - Math.PI / 2
      g.fillCircle(x + Math.cos(a) * 14 * 0.9, y + 14 + Math.sin(a) * 14 * 0.7, 5)
    }
    g.fillStyle(0xffdd44, 0.7)
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5 - Math.PI / 2
      g.fillCircle(x + Math.cos(a) * 8, y + 14 + Math.sin(a) * 8 * 0.7, 3)
    }

    // Head (regal)
    g.fillStyle(0xc8a878); g.fillEllipse(x, y + 16, 26, 22)
    g.fillStyle(0xeed6a8); g.fillEllipse(x, y + 18, 22, 14)
    // Glowing emerald eyes
    g.fillStyle(0x44ff99); g.fillEllipse(x - 7, y + 13, 7, 6); g.fillEllipse(x + 7, y + 13, 7, 6)
    g.fillStyle(0xffffff); g.fillCircle(x - 6, y + 11, 1.4); g.fillCircle(x + 8, y + 11, 1.4)
    g.fillStyle(0x1a1a3a); g.fillCircle(x - 6, y + 12, 0.5); g.fillCircle(x + 8, y + 12, 0.5)
    // Nose
    g.fillStyle(0x1a1a3a); g.fillTriangle(x - 3, y + 18, x + 3, y + 18, x, y + 21)
    // Wise mouth
    g.lineStyle(1, 0x4a2a0a, 0.9)
    g.beginPath(); g.moveTo(x - 6, y + 23); g.lineTo(x, y + 22); g.lineTo(x + 6, y + 23); g.strokePath()
    // Long whiskers
    g.lineStyle(1, 0x4a2a0a, 0.75)
    for (let i = 0; i < 4; i++) {
      g.beginPath(); g.moveTo(x - 7, y + 19 + i); g.lineTo(x - 22, y + 21 + i*2); g.strokePath()
      g.beginPath(); g.moveTo(x + 7, y + 19 + i); g.lineTo(x + 22, y + 21 + i*2); g.strokePath()
    }
    // Crown horns
    g.fillStyle(p)
    g.fillTriangle(x - 12, y + 4, x - 8, y - 4, x - 4, y + 4)
    g.fillTriangle(x + 4, y + 4, x + 8, y - 4, x + 12, y + 4)
    g.fillStyle(0xffdd44)
    g.fillTriangle(x - 11, y + 4, x - 8, y - 2, x - 5, y + 4)
    g.fillTriangle(x + 5, y + 4, x + 8, y - 2, x + 11, y + 4)

    // Massive legs
    g.fillStyle(c); g.fillEllipse(x - 26, y + 28, 14, 22); g.fillEllipse(x + 26, y + 28, 14, 22)
    g.fillStyle(p, 0.4); g.fillEllipse(x - 26, y + 24, 10, 14); g.fillEllipse(x + 26, y + 24, 10, 14)
    g.fillStyle(0x1a1a3a); g.fillRect(x - 33, y + 38, 16, 6); g.fillRect(x + 17, y + 38, 16, 6)
    g.fillStyle(0xffdd44)
    for (let i = 0; i < 4; i++) {
      g.fillTriangle(x - 33 + i*5, y + 44, x - 31 + i*5, y + 48, x - 29 + i*5, y + 44)
      g.fillTriangle(x + 17 + i*5, y + 44, x + 19 + i*5, y + 48, x + 21 + i*5, y + 44)
    }

    // Tail with golden tuft
    g.fillStyle(0xc8a878); g.fillEllipse(x + 36, y - 2, 16, 10)
    g.fillTriangle(x + 42, y - 2, x + 56, y - 6, x + 48, y + 8)
    g.fillStyle(0xffdd44, 0.9); g.fillCircle(x + 56, y - 4, 5)
    g.fillStyle(0x886030, 0.7); g.fillCircle(x + 56, y - 4, 2.5)

    // Aura motes
    g.fillStyle(0xffdd44, 0.7); g.fillCircle(x + 32, y - 30, 1.5); g.fillCircle(x - 36, y + 14, 1.5)
    g.fillStyle(0x88ffaa, 0.6); g.fillCircle(x + 40, y + 30, 1); g.fillCircle(x - 36, y - 22, 1)
  }
}

// ─── Species registry + dispatcher ────────────────────────────────────────────
const SPECIES = [
  {
    label: 'DINO',
    desc: 'Fierce hunter',
    stageNames:  ['Egg', 'Nubclaw', 'Saurling', 'Raptus', 'Tyranex', 'Goraxis'],
    stageColors: [0xd4c5f9, 0x77dd66, 0x44aa55, 0x4488cc, 0xcc4422, 0xff66dd],
    stagePulse:  [0xeeeeff, 0xaaff99, 0x88dd77, 0x77bbdd, 0xff8844, 0xffbbff],
    draw: drawDino,
  },
  {
    label: 'WATER DRAGON',
    desc: 'Mystic serpent',
    stageNames:  ['Egg', 'Tadrake', 'Aquilis', 'Hydrabane', 'Leviarus', 'Abyssarus'],
    stageColors: [0xc5e8f9, 0x66ccdd, 0x4499bb, 0x2266aa, 0x66ccff, 0xaa66ff],
    stagePulse:  [0xddf5ff, 0xaaeeff, 0x88ddee, 0x77aaff, 0xddffff, 0xddccff],
    draw: drawWater,
  },
  {
    label: 'LION TURTLE',
    desc: 'Ancient guardian',
    stageNames:  ['Egg', 'Cubshell', 'Maneshield', 'Roarshell', 'Lion Turtle', 'World Turtle'],
    stageColors: [0xf0e0c4, 0xc8a878, 0xb8884a, 0x886a3a, 0x6a8a4a, 0x4a6a3a],
    stagePulse:  [0xfff0d0, 0xddc090, 0xddb070, 0xc09858, 0xaacc77, 0xffdd44],
    draw: drawLion,
  },
]

function sp() { return SPECIES[G.species] }
function drawCreature(g: any, stage: number, x: number, y: number) { sp().draw(g, stage, x, y) }

// ─── Sprite-art helpers (CC0 pixel art for each species) ─────────────────────
// Texture keys to test for per species. Falls back to procedural drawCreature
// if none of these exist (offline, 404, or asset never loaded).
const SPRITE_KEYS = ['dino_idle_1', 'water_idle_1', 'turtle_walk']
function hasSprite(scene: any, speciesIdx: number) {
  return !!(scene.textures && scene.textures.exists(SPRITE_KEYS[speciesIdx]))
}
// Create a sprite object for the current species at the floor position. The
// caller still needs to setVisible(false) the procedural Graphics if it
// substitutes the sprite for it. Tweaked per-species scales so each creature
// roughly matches the procedural footprint.
function makeSpritePlayer(scene: any, speciesIdx: number, x: number, floorY: number) {
  if (speciesIdx === 0) return scene.add.image(x, floorY, 'dino_idle_1').setScale(0.085).setOrigin(0.5, 1)
  if (speciesIdx === 1) return scene.add.image(x, floorY - 6, 'water_idle_1').setScale(0.5).setOrigin(0.5, 1)
  if (speciesIdx === 2) return scene.add.sprite(x, floorY, 'turtle_walk', 0).setScale(0.55).setOrigin(0.5, 1)
  return null
}
// Update the sprite frame based on animation state.
function updateSpritePlayer(img: any, speciesIdx: number, t: number, moving: boolean) {
  if (!img) return
  if (speciesIdx === 0) {
    img.setTexture(moving ? ('dino_run_' + ((Math.floor(t * 6) % 3) + 1)) : ('dino_idle_' + ((Math.floor(t * 1.6) % 2) + 1)))
  } else if (speciesIdx === 1) {
    // Fish gently alternates between its two idle frames (no run animation in source)
    img.setTexture((Math.floor(t * 2) % 2 === 0) ? 'water_idle_1' : 'water_idle_2')
  } else if (speciesIdx === 2) {
    // Turtle: cycle all 6 walk frames when moving, slow alternation at rest
    const f = moving ? (Math.floor(t * 8) % 6) : (Math.floor(t * 1.5) % 2)
    img.setFrame(f)
  }
}

// ─── PickScene — choose your companion ────────────────────────────────────────
function createPickScene(Phaser: any) {
  return class PickScene extends Phaser.Scene {
    constructor() { super('PickScene') }

    preload() {
      // CC0 sprite art (see public/sprites/CREDITS.md). Loaded once per game
      // session by the first scene. Other scenes can reference these by key.
      this.load.image('kenney_tiles',       '/sprites/kenney_tiles.png')
      this.load.image('kenney_backgrounds', '/sprites/kenney_backgrounds.png')
      this.load.image('kenney_characters',  '/sprites/kenney_characters.png')
      // Player sprites — one set per species
      this.load.image('dino_idle_1', '/sprites/dino/idle_1.png')
      this.load.image('dino_idle_2', '/sprites/dino/idle_2.png')
      this.load.image('dino_run_1',  '/sprites/dino/run_1.png')
      this.load.image('dino_run_2',  '/sprites/dino/run_2.png')
      this.load.image('dino_run_3',  '/sprites/dino/run_3.png')
      this.load.image('water_idle_1', '/sprites/water/fish_idle.png')
      this.load.image('water_idle_2', '/sprites/water/fish_idle_alt.png')
      // Turtle walk cycle is a 6-frame strip; slice it via spritesheet
      this.load.spritesheet('turtle_walk', '/sprites/turtle/turtle_walk.png', { frameWidth: 66, frameHeight: 66 })
      // Parallax background layers
      this.load.image('bg_sky',           '/sprites/bg/sky.png')
      this.load.image('bg_clouds',        '/sprites/bg/clouds.png')
      this.load.image('bg_mountains_far', '/sprites/bg/mountains_far.png')
      this.load.image('bg_mountains_mid', '/sprites/bg/mountains_mid.png')
      this.load.image('bg_mountains_near','/sprites/bg/mountains_near.png')
      this.load.image('bg_trees',         '/sprites/bg/trees.png')
    }

    create() {
      this.add.rectangle(W / 2, H / 2, W, H, 0x0d0d1a)
      // Twinkling stars
      for (let i = 0; i < 50; i++) {
        const s = this.add.circle(
          Phaser.Math.Between(0, W), Phaser.Math.Between(0, H),
          Phaser.Math.Between(1, 2), 0xffffff, Math.random() * 0.6 + 0.1
        )
        this.tweens.add({ targets: s, alpha: 0.1, duration: Phaser.Math.Between(800, 2200), yoyo: true, repeat: -1 })
      }

      this.add.text(W / 2, 24, 'CHOOSE YOUR COMPANION', { fontSize: '13px', color: '#ffdd66', letterSpacing: 4, fontStyle: 'bold' }).setOrigin(0.5)
      this.add.text(W / 2, 42, '— a partner for adventures ahead —', { fontSize: '8px', color: '#888899', letterSpacing: 2 }).setOrigin(0.5)

      const cardX = [80, 240, 400]
      const cardY = H / 2 + 18

      SPECIES.forEach((s: any, idx: number) => {
        const cx = cardX[idx]
        const card = this.add.rectangle(cx, cardY, 140, 200, 0x10142a, 0.9).setStrokeStyle(1, 0x33446a).setInteractive({ useHandCursor: true })

        // Sprite preview — dino card uses the real CC0 sprite, others stay procedural.
        const g = this.add.graphics()
        // Picker card sprite preview: real CC0 art if loaded, otherwise procedural.
        if (hasSprite(this, idx)) {
          const previewKey = idx === 0 ? 'dino_idle_1' : idx === 1 ? 'water_idle_1' : 'turtle_walk'
          const previewScale = idx === 0 ? 0.09 : idx === 1 ? 0.55 : 0.65
          const obj = idx === 2
            ? this.add.sprite(cx, cardY - 38, previewKey, 0).setScale(previewScale).setOrigin(0.5, 0.5)
            : this.add.image(cx, cardY - 38, previewKey).setScale(previewScale).setOrigin(0.5, 0.5)
          // Subtle bob so the previews feel alive
          this.tweens.add({ targets: obj, y: obj.y - 2, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
        } else {
          s.draw(g, 1, cx, cardY - 38)
        }

        // Subtle floating animation per card
        this.tweens.add({ targets: g, y: -4, duration: 1500 + idx * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

        // Name
        this.add.text(cx, cardY + 32, s.label, { fontSize: '11px', color: '#eeeeff', fontStyle: 'bold', letterSpacing: 1 }).setOrigin(0.5)
        this.add.text(cx, cardY + 48, s.desc, { fontSize: '8px', color: '#99aacc' }).setOrigin(0.5)

        // Final-form preview text (use the actual last stage so this stays
        // correct as evolution chains grow).
        this.add.text(cx, cardY + 68, '→ ' + s.stageNames[s.stageNames.length - 1], { fontSize: '8px', color: '#ffdd66', fontStyle: 'italic' }).setOrigin(0.5)

        // Tap-to-pick label
        const pickT = this.add.text(cx, cardY + 86, '[ TAP TO CHOOSE ]', { fontSize: '8px', color: '#66aaff' }).setOrigin(0.5)
        this.tweens.add({ targets: pickT, alpha: 0.4, duration: 800, yoyo: true, repeat: -1 })

        card.on('pointerover', () => card.setStrokeStyle(2, 0x88ccff))
        card.on('pointerout',  () => card.setStrokeStyle(1, 0x33446a))
        card.on('pointerdown', () => {
          theme.start()
          G.species = idx
          this.cameras.main.flash(400, 200, 200, 255)
          this.time.delayedCall(450, () => this.scene.start('EggScene'))
        })
      })

      this.add.text(W / 2, H - 12, 'A retro adventure awaits — be brave, be curious.', { fontSize: '8px', color: '#556677', fontStyle: 'italic' }).setOrigin(0.5)
    }
  }
}

// ─── EggScene ─────────────────────────────────────────────────────────────────
function createEggScene(Phaser: any) {
  return class EggScene extends Phaser.Scene {
    private t = 0
    private hProg = 0
    private hatching = false
    private glowG: any
    private eggG: any
    private hFill: any
    private eX = W / 2
    private eY = H / 2 - 8

    constructor() { super('EggScene') }

    create() {
      this.add.rectangle(W / 2, H / 2, W, H, 0x0d0d1a)
      for (let i = 0; i < 60; i++) {
        const s = this.add.circle(
          Phaser.Math.Between(0, W), Phaser.Math.Between(0, H),
          Phaser.Math.Between(1, 2), 0xffffff, Math.random() * 0.7 + 0.1
        )
        this.tweens.add({ targets: s, alpha: Math.random() * 0.3 + 0.05, duration: Phaser.Math.Between(700, 2500), yoyo: true, repeat: -1 })
      }
      this.add.text(W / 2, 22, 'RESPAWN  CREATURES', { fontSize: '13px', color: '#aaaaff', letterSpacing: 5 }).setOrigin(0.5)
      this.add.text(W / 2, 38, '— hatch your companion —', { fontSize: '8px', color: '#444466', letterSpacing: 2 }).setOrigin(0.5)

      this.glowG = this.add.graphics()
      this.eggG = this.add.graphics()
      drawCreature(this.eggG, 0, this.eX, this.eY)

      this.add.text(W / 2, H / 2 + 56, 'Your egg is trembling...', { fontSize: '10px', color: '#ccccff' }).setOrigin(0.5)
      const tap = this.add.text(W / 2, H / 2 + 72, '[ click to help it hatch ]', { fontSize: '9px', color: '#7777aa' }).setOrigin(0.5)
      this.tweens.add({ targets: tap, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 })

      this.add.rectangle(W / 2, H - 36, 204, 12, 0x111133)
      this.hFill = this.add.rectangle(W / 2 - 100, H - 36, 2, 10, 0x8866ff).setOrigin(0, 0.5)
      this.add.text(W / 2, H - 50, 'HATCH PROGRESS', { fontSize: '7px', color: '#5544aa', letterSpacing: 2 }).setOrigin(0.5)

      this.tweens.add({ targets: this.eggG, rotation: 0.08, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
      this.input.on('pointerdown', () => {
        this.hProg = Math.min(100, this.hProg + 14)
        this.cameras.main.shake(80, 0.006)
        this.spawnCrack()
      })
    }

    spawnCrack() {
      const g = this.add.graphics()
      const cx = this.eX + Phaser.Math.Between(-12, 12)
      const cy = this.eY + Phaser.Math.Between(-14, 10)
      g.lineStyle(1, 0xddddff, 0.7)
      g.beginPath(); g.moveTo(cx, cy)
      g.lineTo(cx + Phaser.Math.Between(-8, 8), cy + Phaser.Math.Between(5, 12))
      g.strokePath()
    }

    update(_: number, dt: number) {
      this.t += dt * 0.002
      this.glowG.clear()
      this.glowG.fillStyle(0x8866ff, 0.06 + Math.sin(this.t) * 0.04)
      this.glowG.fillCircle(this.eX, this.eY, 54)
      this.hProg = Math.min(100, this.hProg + dt * 0.016)
      this.hFill.width = Math.max(2, (this.hProg / 100) * 200)
      if (this.hProg >= 100 && !this.hatching) {
        this.hatching = true
        this.cameras.main.flash(500, 180, 140, 255)
        this.cameras.main.shake(500, 0.02)
        this.time.delayedCall(700, () => {
          G.stage = 1; G.name = sp().stageNames[1]
          this.scene.start('HomeScene')
        })
      }
    }
  }
}

// ─── HomeScene — interactive retro space jungle hub ──────────────────────────
function createHomeScene(Phaser: any) {
  return class HomeScene extends Phaser.Scene {
    private t = 0
    private cGfx: any
    private cImg: any        // Sprite-art player image (used when species = dino)
    private cImgX = 0        // Tweened offset added to cImg position by action animations
    private cImgY = 0
    private cX = 100
    private floorY = 252
    private bars: Record<string, any> = {}
    private cursors: any; private wasd: any
    private zones: any[] = []
    private nearZone: any = null
    private promptT: any
    private msgT: any
    private msgTime = 0
    private nameT: any; private dayT: any; private bagT: any
    private musicT: any
    private SPEED = 1.6
    private touchLeft = false; private touchRight = false

    constructor() { super('HomeScene') }

    create() {
      this.t = 0
      this.cX = 100

      // Sky
      this.add.rectangle(W/2, H/2, W, H, 0x0d0a26)
      // Stars
      for (let i = 0; i < 70; i++) {
        const s = this.add.circle(
          Phaser.Math.Between(0, W), Phaser.Math.Between(28, 200),
          Phaser.Math.Between(1, 2), 0xffffff, Math.random() * 0.7 + 0.1
        )
        this.tweens.add({ targets: s, alpha: 0.1, duration: Phaser.Math.Between(800, 2400), yoyo: true, repeat: -1 })
      }
      // Moons / planets
      this.add.circle(80, 90, 12, 0x4a3a6a, 0.6)
      this.add.circle(78, 87, 10, 0x6a5a8a, 0.45)
      this.add.circle(380, 60, 8, 0xff8866, 0.55)
      this.add.circle(382, 58, 6, 0xffaa88, 0.4)

      // Background mountain silhouettes
      const bgG = this.add.graphics()
      bgG.fillStyle(0x1a1a3a, 0.7)
      bgG.fillTriangle(-10, 240, 90, 150, 200, 240)
      bgG.fillTriangle(140, 240, 250, 130, 360, 240)
      bgG.fillTriangle(300, 240, 400, 160, 500, 240)

      // Mid-ground tree silhouettes
      const treeG = this.add.graphics()
      treeG.fillStyle(0x0a2218, 0.85)
      for (let i = 0; i < 9; i++) {
        const tx = 24 + i * 56 + (i%2)*16
        const ty = 230 - (i%3)*4
        treeG.fillTriangle(tx - 12, ty, tx, ty - 32, tx + 12, ty)
        treeG.fillRect(tx - 2, ty - 4, 4, 4)
      }

      // Floor
      this.add.rectangle(W/2, this.floorY + 30, W, 80, 0x2a3a1a)
      this.add.rectangle(W/2, this.floorY, W, 4, 0x4a6a2a)
      // Floor speckle
      const fg = this.add.graphics()
      fg.fillStyle(0x4a6a2a, 0.5)
      for (let i = 0; i < 30; i++) {
        const fx = Phaser.Math.Between(0, W)
        fg.fillCircle(fx, this.floorY + 4 + Phaser.Math.Between(0, 30), 1)
      }
      // Foreground crystals
      for (let i = 0; i < 6; i++) {
        const cx = 24 + i * 86
        const cg = this.add.graphics()
        cg.fillStyle(0x88ddff, 0.3); cg.fillTriangle(cx - 4, this.floorY + 22, cx, this.floorY + 8, cx + 4, this.floorY + 22)
        cg.fillStyle(0xddeeff, 0.55); cg.fillTriangle(cx - 1, this.floorY + 22, cx, this.floorY + 12, cx + 2, this.floorY + 22)
      }

      // Define and draw zones
      // Zone x positions are clamped between 40 and 440 so the player (whose
      // own cX is clamped to 20..460) can always be within 30 units of any
      // zone. Edge zones (Fruit Tree, Doorway) used to be unreachable.
      this.zones = [
        { x: 50,  label: 'Fruit Tree',   prompt: '[SPACE] EAT',     action: () => this.pickFruit(),  draw: this.drawFruitTree.bind(this) },
        { x: 130, label: 'Punching Bag', prompt: '[SPACE] TRAIN',   action: () => this.train(),     draw: this.drawBag.bind(this) },
        { x: 210, label: 'Fidget Rings', prompt: '[SPACE] PLAY',    action: () => this.fidget(),    draw: this.drawFidget.bind(this) },
        { x: 290, label: 'Bed',          prompt: '[SPACE] SLEEP',   action: () => this.sleep(),     draw: this.drawBed.bind(this) },
        { x: 370, label: 'Doorway',      prompt: '[SPACE] EXPLORE', action: () => { G.worldX = undefined; this.scene.start('WorldScene') }, draw: this.drawDoor.bind(this) },
      ]
      // Master Ninja Trial gate — appears once you've collected all 8 badges.
      if ((G.badges?.length || 0) >= BADGES.length) {
        this.zones.push({
          x: 450,
          label: 'Trial Gate',
          prompt: '[SPACE] NINJA TRIAL',
          action: () => {
            G.ninjasBeaten = 0
            this.scene.start('BattleScene', { isBoss: false, fromWorld: false, fromNinja: true })
          },
          draw: this.drawTrialGate.bind(this),
        })
      }
      for (const z of this.zones) {
        z.gfx = this.add.graphics()
        z.draw(z)
        z.label_text = this.add.text(z.x, this.floorY - 56, z.label, { fontSize: '7px', color: '#aaccee', letterSpacing: 1 }).setOrigin(0.5)
      }

      // Top HUD — taller two-row layout so labels and values don't collide
      this.add.rectangle(W/2, 20, W, 40, 0x060810, 0.96)
      this.add.rectangle(W/2, 40, W, 1, 0x224488)

      // Identity column (left)
      this.nameT = this.add.text(6, 7, '', { fontSize: '10px', color: '#eeeeff', fontStyle: 'bold', letterSpacing: 1 })
      this.dayT  = this.add.text(6, 23, '', { fontSize: '8px', color: '#7799cc' })

      // Stat bars in a 2x2 grid (label above bar). Bumped y values down so the
      // labels (rendered at y - 6 inside mkBar) stay inside the HUD bar.
      this.mkBar(110, 13, 'HP',   0x44ff88)
      this.mkBar(110, 28, 'FOOD', 0xff9944)
      this.mkBar(206, 13, 'XP',   0x44aaff)
      this.mkBar(206, 28, 'MOOD', 0xff44bb)

      // Right-side action buttons (each centered vertically in the 40px bar)
      const codexBtn = this.add.rectangle(W - 158, 20, 56, 28, 0x2a1a44, 0.94).setInteractive({ useHandCursor: true }).setStrokeStyle(1, 0x886699)
      this.add.text(W - 158, 20, 'CODEX', { fontSize: '9px', color: '#ddccff', fontStyle: 'bold', letterSpacing: 1 }).setOrigin(0.5)
      codexBtn.on('pointerdown', () => this.openCodex())

      const bagBtn = this.add.rectangle(W - 92, 20, 64, 28, 0x1a2a44, 0.94).setInteractive({ useHandCursor: true }).setStrokeStyle(1, 0x556699)
      this.bagT = this.add.text(W - 92, 20, '', { fontSize: '9px', color: '#ddccaa', fontStyle: 'bold' }).setOrigin(0.5)
      bagBtn.on('pointerdown', () => this.openBag())

      const mb = this.add.rectangle(W - 28, 20, 50, 28, 0x1a1a2a, 0.94).setInteractive({ useHandCursor: true }).setStrokeStyle(1, 0x556699)
      this.musicT = this.add.text(W - 28, 20, theme.isMuted ? '♪ OFF' : '♪ ON', { fontSize: '9px', color: theme.isMuted ? '#778899' : '#aaccee', fontStyle: 'bold' }).setOrigin(0.5)
      mb.on('pointerdown', () => {
        theme.toggleMute()
        this.musicT.setText(theme.isMuted ? '♪ OFF' : '♪ ON').setColor(theme.isMuted ? '#778899' : '#aaccee')
      })

      // Player creature — graphics for procedural species, image for dino sprite.
      this.cGfx = this.add.graphics()
      if (hasSprite(this, G.species)) {
        this.cImg = makeSpritePlayer(this, G.species, this.cX, this.floorY)
        this.cGfx.setVisible(false)
      }
      this.drawC()

      // Prompt + msg
      this.promptT = this.add.text(W/2, this.floorY - 76, '', { fontSize: '9px', color: '#ffdd66', fontStyle: 'bold' }).setOrigin(0.5).setAlpha(0)
      this.msgT = this.add.text(W/2, 50, '', { fontSize: '9px', color: '#ffeeaa', backgroundColor: '#000814', padding: { x: 6, y: 3 } as any }).setOrigin(0.5).setAlpha(0)

      // Bottom strip + touch controls
      this.add.rectangle(W/2, H - 16, W, 32, 0x080814, 0.92).setDepth(8)

      // Movement pad — left
      const lBtn = this.add.rectangle(28, H - 16, 40, 26, 0x1a2a44, 0.9).setStrokeStyle(1, 0x556699).setInteractive({ useHandCursor: true }).setDepth(9)
      this.add.text(28, H - 16, '◀', { fontSize: '14px', color: '#aaccee', fontStyle: 'bold' }).setOrigin(0.5).setDepth(10)
      const startL = () => this.touchLeft = true
      const stopL  = () => this.touchLeft = false
      lBtn.on('pointerdown', startL); lBtn.on('pointerup', stopL); lBtn.on('pointerout', stopL); lBtn.on('pointerupoutside', stopL)

      // Movement pad — right
      const rBtn = this.add.rectangle(72, H - 16, 40, 26, 0x1a2a44, 0.9).setStrokeStyle(1, 0x556699).setInteractive({ useHandCursor: true }).setDepth(9)
      this.add.text(72, H - 16, '▶', { fontSize: '14px', color: '#aaccee', fontStyle: 'bold' }).setOrigin(0.5).setDepth(10)
      const startR = () => this.touchRight = true
      const stopR  = () => this.touchRight = false
      rBtn.on('pointerdown', startR); rBtn.on('pointerup', stopR); rBtn.on('pointerout', stopR); rBtn.on('pointerupoutside', stopR)

      // Action button
      const aBtn = this.add.rectangle(W - 40, H - 16, 70, 26, 0x2a4a1a, 0.92).setStrokeStyle(1, 0x66aa44).setInteractive({ useHandCursor: true }).setDepth(9)
      this.add.text(W - 40, H - 16, 'ACTION', { fontSize: '9px', color: '#ccffaa', fontStyle: 'bold', letterSpacing: 1 }).setOrigin(0.5).setDepth(10)
      aBtn.on('pointerdown', () => this.tryActivate())

      // Tiny hint between pads and action
      this.add.text(W/2, H - 16, 'tap a zone, hit ACTION', { fontSize: '7px', color: '#556677' }).setOrigin(0.5).setDepth(10)

      // Keyboard (still works)
      this.cursors = this.input.keyboard.createCursorKeys()
      this.wasd = this.input.keyboard.addKeys('W,A,S,D')
      this.input.keyboard.on('keydown-SPACE', () => this.tryActivate())
      this.input.keyboard.on('keydown-E',     () => this.tryActivate())
      this.input.keyboard.on('keydown-B',     () => this.openBag())
      this.input.keyboard.on('keydown-C',     () => this.openCodex())

      this.updHUD()

      if (G.stage < 5 && G.level >= EVO_LEVEL[G.stage]) this.time.delayedCall(300, () => this.evolve())
    }

    drawC(moving: boolean = false) {
      const bob = Math.sin(this.t * 2) * 1.5
      if (this.cImg) {
        this.cImg.setX(this.cX + this.cImgX).setY(this.floorY + bob + this.cImgY)
        updateSpritePlayer(this.cImg, G.species, this.t, moving)
      } else {
        this.cGfx.clear()
        drawCreature(this.cGfx, G.stage, this.cX, this.floorY - 22 + bob)
      }
    }

    // Bounce helpers: tween offsets if using sprite, transform if procedural.
    bounceY(amount: number, repeat = 0) {
      if (this.cImg) this.tweens.add({ targets: this, cImgY: amount, duration: 180, yoyo: true, repeat, onComplete: () => { this.cImgY = 0 } })
      else this.tweens.add({ targets: this.cGfx, y: amount, duration: 180, yoyo: true, repeat })
    }
    bounceX(amount: number, repeat = 0) {
      if (this.cImg) this.tweens.add({ targets: this, cImgX: amount, duration: 80, yoyo: true, repeat, onComplete: () => { this.cImgX = 0 } })
      else this.tweens.add({ targets: this.cGfx, x: amount, duration: 80, yoyo: true, repeat })
    }

    mkBar(x: number, y: number, label: string, color: number) {
      // Label sits above the bar so it never collides with the fill colors.
      this.add.text(x, y - 6, label, { fontSize: '7px', color: '#aabbcc', fontStyle: 'bold', letterSpacing: 1 }).setOrigin(0, 0.5)
      this.add.rectangle(x, y + 2, 80, 5, 0x0a1528).setOrigin(0, 0.5)
      const f = this.add.rectangle(x, y + 2, 0, 4, color).setOrigin(0, 0.5)
      this.bars[label] = { f, mw: 80 }
      this.updBar(label)
    }
    updBar(k: string) {
      const b = this.bars[k]; if (!b) return
      let p = 0
      if (k === 'HP')   p = G.hp / G.maxHp
      if (k === 'FOOD') p = G.hunger / 100
      if (k === 'MOOD') p = G.happy / 100
      if (k === 'XP')   p = G.xp / xpToLevel(G.level)
      b.f.width = Math.max(0, p) * b.mw
    }
    updHUD() {
      ;['HP','FOOD','MOOD','XP'].forEach(k => this.updBar(k))
      const badgeCount = G.badges?.length || 0
      this.nameT.setText(G.name + '   Lv.' + G.level + '   ★' + badgeCount + '/' + BADGES.length)
      this.dayT.setText('Day ' + G.day + '   ·   Stage ' + G.stage)
      this.bagT.setText('BAG ' + invTotal() + '/' + G.maxInv)
    }

    drawFruitTree(z: any) {
      const g = z.gfx, x = z.x, fy = this.floorY
      g.fillStyle(0x4a2810); g.fillRect(x - 3, fy - 30, 6, 30)
      g.fillStyle(0x0a2218); g.fillCircle(x - 6, fy - 36, 12); g.fillCircle(x + 6, fy - 36, 12)
      g.fillStyle(0x1a4422); g.fillCircle(x, fy - 44, 11)
      g.fillStyle(0x2a5532, 0.7); g.fillCircle(x - 2, fy - 42, 6)
      g.fillStyle(0xff5577); g.fillCircle(x - 8, fy - 32, 2)
      g.fillStyle(0xff7788); g.fillCircle(x + 8, fy - 30, 2)
      g.fillStyle(0xff8844); g.fillCircle(x - 2, fy - 28, 2)
    }

    drawBag(z: any) {
      const g = z.gfx, x = z.x, fy = this.floorY
      // Hook + chain
      g.fillStyle(0x666666); g.fillRect(x - 1, fy - 60, 2, 28)
      // Bag body
      g.fillStyle(0x884422); g.fillRoundedRect(x - 8, fy - 36, 16, 36, 6)
      g.fillStyle(0xaa5533, 0.7); g.fillEllipse(x - 3, fy - 26, 4, 18)
      g.fillStyle(0x4a2010); g.fillRect(x - 8, fy - 18, 16, 2)
      // Backwards baseball cap on top
      g.fillStyle(0xcc3333); g.fillEllipse(x, fy - 42, 14, 5)
      g.fillStyle(0xee5555); g.fillRoundedRect(x - 6, fy - 46, 12, 6, 2)
      g.fillStyle(0xcc3333); g.fillRect(x - 9, fy - 42, 4, 3)  // brim back
    }

    drawFidget(z: any) {
      const g = z.gfx, x = z.x, fy = this.floorY
      g.lineStyle(2, 0x88ccff, 0.85); g.strokeCircle(x, fy - 30, 13)
      g.lineStyle(1.5, 0xff66bb, 0.85); g.strokeCircle(x, fy - 30, 9)
      g.fillStyle(0xffdd44); g.fillCircle(x, fy - 30, 3)
      g.fillStyle(0xddeeff, 0.7); g.fillCircle(x - 18, fy - 38, 1.2); g.fillCircle(x + 14, fy - 22, 1.2)
    }

    drawBed(z: any) {
      const g = z.gfx, x = z.x, fy = this.floorY
      g.fillStyle(0x4a3a2a); g.fillRect(x - 16, fy - 14, 32, 14)
      g.fillStyle(0x6a5a3a); g.fillRect(x - 16, fy - 14, 32, 3)
      g.fillStyle(0xeebbcc); g.fillRoundedRect(x - 14, fy - 12, 28, 8, 3)
      g.fillStyle(0xddaaaa); g.fillRoundedRect(x + 6, fy - 22, 10, 8, 3)
      g.fillStyle(0xeeeebb); g.fillCircle(x, fy - 38, 5)
      g.fillStyle(0x4a3a2a); g.fillCircle(x + 2, fy - 39, 4)
    }

    drawDoor(z: any) {
      const g = z.gfx, x = z.x, fy = this.floorY
      g.fillStyle(0x4a3a5a); g.fillRoundedRect(x - 14, fy - 50, 28, 50, 14)
      g.fillStyle(0x1a0a2a); g.fillRoundedRect(x - 11, fy - 45, 22, 45, 11)
      g.fillStyle(0x88ddff, 0.7); g.fillCircle(x - 7, fy - 26, 1.5)
      g.fillStyle(0xff66bb, 0.6); g.fillCircle(x + 5, fy - 16, 1.2)
      g.fillStyle(0xffdd44); g.fillRect(x + 7, fy - 28, 2, 4)
    }

    drawTrialGate(z: any) {
      const g = z.gfx, x = z.x, fy = this.floorY
      // Stone torii-style gate with crimson banner
      g.fillStyle(0x4a0a1a); g.fillRect(x - 16, fy - 56, 32, 4)        // top crossbar
      g.fillStyle(0x6a0a1a); g.fillRect(x - 18, fy - 60, 36, 5)        // top crown
      g.fillStyle(0x4a0a1a); g.fillRect(x - 14, fy - 50, 4, 50)        // left pillar
      g.fillStyle(0x4a0a1a); g.fillRect(x + 10, fy - 50, 4, 50)        // right pillar
      // Glowing rune in the middle
      g.fillStyle(0xff3366, 0.85); g.fillCircle(x, fy - 30, 5)
      g.fillStyle(0xffdd44, 0.9); g.fillCircle(x, fy - 30, 2)
      // Hanging banner
      g.fillStyle(0x880020); g.fillRect(x - 4, fy - 48, 8, 14)
      g.fillStyle(0xffdd44); g.fillRect(x - 1, fy - 44, 2, 6)
    }

    tryActivate() { if (this.nearZone) this.nearZone.action() }

    // Reset transform + cancel pending tweens before kicking off a new bounce.
    resetSprite() {
      this.tweens.killTweensOf(this.cGfx)
      this.tweens.killTweensOf(this)  // kills our cImgX / cImgY tweens
      this.cGfx.x = 0; this.cGfx.y = 0
      this.cImgX = 0; this.cImgY = 0
      if (this.cImg) this.cImg.setAlpha(1)
    }

    // Floating "+N STAT" label near the creature, with the matching bar pulsed.
    showStatGain(stat: string, amount: number) {
      const palette: any = { HP: '#44ff88', FOOD: '#ff9944', MOOD: '#ff44bb', XP: '#44aaff', 'MAX HP': '#ffdd44' }
      const color = palette[stat] || '#ffffff'
      const t = this.add.text(
        this.cX + 16 + Phaser.Math.Between(-4, 4),
        this.floorY - 36 + Phaser.Math.Between(-4, 4),
        '+' + amount + ' ' + stat,
        { fontSize: '11px', color, fontStyle: 'bold', stroke: '#000814', strokeThickness: 2 }
      ).setOrigin(0, 0.5).setDepth(15)
      this.tweens.add({ targets: t, y: t.y - 32, alpha: 0, duration: 1200, ease: 'Quad.easeOut', onComplete: () => t.destroy() })
      // Pulse the corresponding bar
      const bar = this.bars[stat === 'MAX HP' ? 'HP' : stat]
      if (bar?.f) {
        const orig = bar.f.fillColor
        bar.f.setFillStyle(0xffffff)
        this.time.delayedCall(140, () => bar.f.setFillStyle(orig))
      }
    }

    pickFruit() {
      const r = Math.random()
      const itemId = r < 0.55 ? 'berry' : (r < 0.85 ? 'apple' : 'herb')
      const item = ITEMS[itemId]
      let line: string
      // Apply effect manually so we can give specific +HP/+Hunger/+Happy feedback.
      if (itemId === 'berry') {
        if (G.hp >= G.maxHp) line = 'HP already full'
        else { const gained = Math.min(5, G.maxHp - G.hp); G.hp += gained; this.showStatGain('HP', gained); line = 'Ate a Berry' }
      } else if (itemId === 'apple') {
        if (G.hunger >= 100) line = 'Food already full'
        else { const gained = Math.min(12, 100 - G.hunger); G.hunger += gained; this.showStatGain('FOOD', gained); line = 'Ate an Apple' }
      } else {
        if (G.happy >= 100) line = 'Mood already full'
        else { const gained = Math.min(8, 100 - G.happy); G.happy += gained; this.showStatGain('MOOD', gained); line = 'Ate a Herb' }
      }
      if (invAdd(itemId, 1)) line += '   (+1 in bag)'
      this.msg(line); this.updHUD()
      this.resetSprite()
      this.bounceY(-8)
    }

    train() {
      if (G.hunger <= 10) { this.msg('Out of FOOD! Eat at the Fruit Tree first.'); return }
      G.hunger = Math.max(0, G.hunger - 10); G.happy = Math.min(100, G.happy + 5)
      const xpAmt = 6
      let maxHpGain = 0
      if (Math.random() < 0.25) {
        G.maxHp += 1; G.hp = Math.min(G.maxHp, G.hp + 1); maxHpGain = 1
      }
      const r = gainXp(xpAmt)
      this.showStatGain('XP', xpAmt)
      if (maxHpGain) this.showStatGain('MAX HP', maxHpGain)
      this.msg(maxHpGain ? `+${xpAmt} XP   +1 MAX HP!` : `+${xpAmt} XP   -10 FOOD`)
      this.updHUD()

      // Player jab + camera shake
      this.resetSprite()
      this.bounceX(8, 2)
      this.cameras.main.shake(120, 0.005)

      // Bag swing animation + impact sparks
      const bagZone = this.zones.find((z: any) => z.label === 'Punching Bag')
      if (bagZone?.gfx) {
        this.tweens.killTweensOf(bagZone.gfx)
        bagZone.gfx.x = 0
        this.tweens.add({ targets: bagZone.gfx, x: { from: -3, to: 3 }, duration: 70, yoyo: true, repeat: 4, ease: 'Sine.easeInOut',
          onComplete: () => { bagZone.gfx.x = 0 } })
        for (let i = 0; i < 7; i++) {
          const sx = bagZone.x + Phaser.Math.Between(-10, 10)
          const sy = this.floorY - 28 + Phaser.Math.Between(-8, 8)
          const sp = this.add.circle(sx, sy, Phaser.Math.Between(1, 2), 0xffdd44).setDepth(12)
          this.tweens.add({
            targets: sp,
            x: sx + Phaser.Math.Between(-22, 22),
            y: sy - Phaser.Math.Between(8, 20),
            alpha: 0,
            duration: Phaser.Math.Between(300, 500),
            onComplete: () => sp.destroy(),
          })
        }
      }

      if (r.leveled) this.showLevelUp(r.levelsGained)
      if (r.shouldEvolve) this.time.delayedCall(900, () => this.evolve())
    }

    fidget() {
      G.happy = Math.min(100, G.happy + Phaser.Math.Between(5, 12))
      G.hunger = Math.max(0, G.hunger - 3)
      let line = 'You played and felt happy!'
      if (Math.random() < 0.3 && invAdd('shard', 1)) line = 'Found a Crystal!  Open BAG (B) to use it for +5 XP'
      const r = gainXp(3)
      this.msg(line); this.updHUD()
      this.resetSprite()
      this.bounceY(-12, 1)
      if (r.leveled) this.showLevelUp(r.levelsGained)
      if (r.shouldEvolve) this.time.delayedCall(900, () => this.evolve())
    }

    sleep() {
      G.day += 1
      G.hp = G.maxHp
      G.hunger = 100
      G.happy = 100
      this.cameras.main.fadeOut(450, 0, 0, 0)
      this.time.delayedCall(500, () => {
        this.cameras.main.fadeIn(450, 0, 0, 0)
        this.msg('Day ' + G.day + ' begins. Fully rested  HP/FOOD/MOOD restored')
        this.updHUD()
      })
    }

    openBag()   { this.scene.launch('InventoryScene', { from: 'HomeScene' }); this.scene.pause() }
    openCodex() { this.scene.launch('CodexScene',     { from: 'HomeScene' }); this.scene.pause() }

    showLevelUp(levels: number) {
      theme.chime()
      this.cameras.main.flash(450, 255, 230, 120)
      this.cameras.main.shake(180, 0.005)
      const lvlTxt = levels > 1 ? `LEVEL UP x${levels}!` : 'LEVEL UP!'
      const t = this.add.text(this.cX, this.floorY - 90,
        lvlTxt + '\nLv.' + G.level + '   +HP +ATK +DEF',
        { fontSize: '12px', color: '#ffdd44', fontStyle: 'bold', align: 'center', stroke: '#5a3a00', strokeThickness: 2 }
      ).setOrigin(0.5).setDepth(20)
      this.tweens.add({ targets: t, y: t.y - 50, alpha: 0, duration: 1800, ease: 'Cubic.easeOut', onComplete: () => t.destroy() })
      // Sparkle particles
      for (let i = 0; i < 12; i++) {
        const sp = this.add.circle(this.cX + Phaser.Math.Between(-30, 30), this.floorY - 30, Phaser.Math.Between(1, 2), 0xffdd44)
        this.tweens.add({ targets: sp, y: sp.y - Phaser.Math.Between(40, 80), alpha: 0, duration: Phaser.Math.Between(700, 1400), onComplete: () => sp.destroy() })
      }
      this.updHUD()
    }

    evolve() {
      if (G.stage >= 5) return
      G.stage++; G.name = sp().stageNames[G.stage]
      G.maxHp += 15; G.hp = G.maxHp; G.atk += 4; G.def += 3; G.spd += 2
      this.cameras.main.flash(700, 255, 200, 100)
      this.cameras.main.shake(400, 0.015)
      theme.chime()
      const et = this.add.text(this.cX, this.floorY - 80, 'EVOLVED!\n' + G.name, { fontSize: '13px', color: '#ffdd44', align: 'center', fontStyle: 'bold', stroke: '#3a1a00', strokeThickness: 2 }).setOrigin(0.5).setDepth(20)
      this.tweens.add({ targets: et, y: et.y - 36, alpha: 0, duration: 2000, onComplete: () => et.destroy() })
      this.drawC(); this.updHUD()
    }

    msg(txt: string) {
      this.msgT.setText(txt).setAlpha(1)
      this.msgTime = 1400
    }

    update(time: number, dt: number) {
      this.t += dt * 0.002

      if (this.msgTime > 0) {
        this.msgTime -= dt
        if (this.msgTime <= 0) this.msgT.setAlpha(0)
      }

      let dx = 0
      if (this.cursors.left.isDown  || this.wasd.A.isDown || this.touchLeft)  dx -= 1
      if (this.cursors.right.isDown || this.wasd.D.isDown || this.touchRight) dx += 1
      if (dx !== 0) this.cX = Math.max(20, Math.min(W - 20, this.cX + dx * this.SPEED))
      // Flip dino sprite to face direction of travel
      if (this.cImg && dx !== 0) this.cImg.setFlipX(dx < 0)
      this.drawC(dx !== 0)

      const nz = this.zones.find((z: any) => Math.abs(z.x - this.cX) <= 36) || null
      if (nz !== this.nearZone) {
        this.nearZone = nz
        if (nz) this.promptT.setText(nz.prompt).setX(nz.x).setAlpha(1)
        else    this.promptT.setAlpha(0)
      }

      if (time - G.lastFed > 7000) {
        G.hunger = Math.max(0, G.hunger - 0.5); G.lastFed = time; this.updBar('HUNGER')
      }
    }
  }
}

// ─── WorldScene — side-scrolling exploration with items + chests ─────────────
function createWorldScene(Phaser: any) {
  return class WorldScene extends Phaser.Scene {
    private wWidth = 1800
    private floorY = 252
    private pX = 100
    private cGfx: any
    private cursors: any; private wasd: any; private escK: any
    private items: any[] = []
    private chests: any[] = []
    private signs: any[] = []
    private encZones: any[] = []
    private encCd = 0
    private hpT: any; private bagT: any
    private prompt: any; private msgT: any; private msgTime = 0
    private signT: any; private signTime = 0
    private nearTarget: any = null
    private nearSign: any = null
    private touchLeft = false; private touchRight = false
    private inputReadyAt = 0
    // Mini-map
    private mmBg: any; private mmPlayer: any
    // Biome boundaries (x positions where each region ends)
    private biomes: any[] = []

    constructor() { super('WorldScene') }

    create(data: any) {
      // Restore player position from previous WorldScene visit so battles
      // don't reset progress. Reset touch state explicitly so a stuck
      // pointer from BattleScene doesn't auto-walk on mobile.
      this.pX = (typeof G.worldX === 'number' && G.worldX >= 20 && G.worldX <= this.wWidth - 20) ? G.worldX : 100
      this.touchLeft = false
      this.touchRight = false
      this.items = []; this.chests = []; this.signs = []
      // Ignore pointer events that fire during the scene-start handoff.
      this.inputReadyAt = this.time.now + 350

      this.cameras.main.setBounds(0, 0, this.wWidth, H)

      // Persist x-position on every scene exit (battle, home, etc.)
      this.events.on('shutdown', () => { G.worldX = this.pX })

      // ─── Biomes — four regions with distinct color tinting ─────────────
      // Each entry: { name, x1, x2, sky, mountain, tree, ground, accent }
      this.biomes = [
        { name: 'Mossroot Forest',  x1: 0,    x2: 500,  sky: 0x081428, mountain: 0x1a1a3a, tree: 0x0a2218, ground: 0x2a3a1a, accent: 0x88ddff },
        { name: 'Twilight Grove',   x1: 500,  x2: 1000, sky: 0x180830, mountain: 0x2a1a4a, tree: 0x1a0a3a, ground: 0x2a1a3a, accent: 0xee88ff },
        { name: 'Ancient Ruins',    x1: 1000, x2: 1500, sky: 0x2a1808, mountain: 0x4a2a1a, tree: 0x3a2010, ground: 0x4a3a1a, accent: 0xffaa44 },
        { name: 'Boss Crucible',    x1: 1500, x2: this.wWidth, sky: 0x300a14, mountain: 0x4a0a14, tree: 0x2a0010, ground: 0x4a0820, accent: 0xff3366 },
      ]

      // Sky strips, one per biome — colored block per region
      for (const b of this.biomes) {
        this.add.rectangle((b.x1 + b.x2)/2, H/2, b.x2 - b.x1, H, b.sky).setDepth(-12)
      }
      // Parallax background — CC0 forest layers, each scrolling at a different
      // rate. setScrollFactor(0) pins them to the viewport, and we manually
      // shift tilePositionX to fake horizontal parallax depth.
      const usePx = this.textures.exists('bg_sky')
      const pxLayers: any = {}
      if (usePx) {
        const mk = (key: string, depth: number, alpha = 1) => {
          const t = this.add.tileSprite(W/2, H/2 + 12, W, H, key).setScrollFactor(0).setDepth(depth).setAlpha(alpha)
          return t
        }
        pxLayers.sky          = mk('bg_sky',           -11, 0.55)
        pxLayers.clouds       = mk('bg_clouds',        -10, 0.5)
        pxLayers.mountainsFar = mk('bg_mountains_far', -9,  0.45)
        pxLayers.mountainsMid = mk('bg_mountains_mid', -8,  0.5)
        pxLayers.mountainsNear= mk('bg_mountains_near',-7,  0.55)
        pxLayers.trees        = mk('bg_trees',         -6,  0.45)
        ;(this as any)._pxLayers = pxLayers
      }
      // Stars (twinkling, sprinkled across the whole map)
      for (let i = 0; i < 90; i++) {
        const s = this.add.circle(Phaser.Math.Between(0, this.wWidth), Phaser.Math.Between(20, 180), Phaser.Math.Between(1,2), 0xffffff, Math.random() * 0.6 + 0.1)
        this.tweens.add({ targets: s, alpha: 0.2, duration: Phaser.Math.Between(800, 2400), yoyo: true, repeat: -1 })
      }
      // Distant mountains, color per biome
      for (const b of this.biomes) {
        const farG = this.add.graphics()
        farG.fillStyle(b.mountain, 0.55)
        const span = b.x2 - b.x1
        const count = Math.max(2, Math.floor(span / 110))
        for (let i = 0; i < count; i++) {
          const cx = b.x1 + (i + 0.5) * (span / count)
          farG.fillTriangle(cx - 60, 240, cx, 130 + (i%3)*15, cx + 60, 240)
        }
      }
      // Mid-ground trees / pillars (per biome silhouette)
      for (const b of this.biomes) {
        const midG = this.add.graphics()
        midG.fillStyle(b.tree, 0.85)
        const span = b.x2 - b.x1
        const count = Math.max(3, Math.floor(span / 50))
        for (let i = 0; i < count; i++) {
          const tx = b.x1 + 24 + i * (span / count) + (i%2)*16
          const ty = 230 - (i%3)*4
          if (b.name === 'Ancient Ruins') {
            // Broken pillars
            midG.fillRect(tx - 4, ty - 36, 8, 36)
            midG.fillStyle(b.tree, 0.6); midG.fillRect(tx - 6, ty - 32, 12, 4)
            midG.fillStyle(b.tree, 0.85)
          } else if (b.name === 'Boss Crucible') {
            // Jagged spires
            midG.fillTriangle(tx - 10, ty, tx - 4, ty - 40, tx + 4, ty)
            midG.fillTriangle(tx + 4, ty, tx + 10, ty - 32, tx + 16, ty)
          } else {
            // Pine / dark trees
            midG.fillTriangle(tx - 14, ty, tx, ty - 36, tx + 14, ty)
            midG.fillRect(tx - 2, ty - 4, 4, 6)
          }
        }
      }
      // Floor strips per biome
      for (const b of this.biomes) {
        this.add.rectangle((b.x1 + b.x2)/2, this.floorY + 30, b.x2 - b.x1, 80, b.ground)
        this.add.rectangle((b.x1 + b.x2)/2, this.floorY, b.x2 - b.x1, 4, Phaser.Display.Color.IntegerToColor(b.ground).brighten(20).color)
      }

      // Foliage / ambient ground decorations per biome
      for (const b of this.biomes) {
        const fg = this.add.graphics()
        const span = b.x2 - b.x1
        if (b.name === 'Mossroot Forest' || b.name === 'Twilight Grove') {
          fg.fillStyle(b.tree, 0.75)
          for (let i = 0; i < Math.floor(span / 90); i++) {
            const bx = b.x1 + 40 + i * 90 + (i%2)*20
            fg.fillCircle(bx, this.floorY - 4, 6); fg.fillCircle(bx + 6, this.floorY - 6, 4); fg.fillCircle(bx - 4, this.floorY - 6, 4)
          }
        }
        // Sparkly accent crystals
        for (let i = 0; i < Math.floor(span / 160); i++) {
          const cx = b.x1 + 40 + i * 160
          fg.fillStyle(b.accent, 0.5)
          fg.fillTriangle(cx - 4, this.floorY + 20, cx, this.floorY + 6, cx + 4, this.floorY + 20)
        }
      }

      // Doorway home (left)
      const doorG = this.add.graphics()
      doorG.fillStyle(0x4a3a5a); doorG.fillRoundedRect(20, this.floorY - 50, 28, 50, 14)
      doorG.fillStyle(0x1a0a2a); doorG.fillRoundedRect(23, this.floorY - 45, 22, 45, 11)
      doorG.fillStyle(0xffdd44); doorG.fillRect(38, this.floorY - 28, 2, 4)
      this.add.text(34, this.floorY - 60, 'HOME', { fontSize: '8px', color: '#aaccee' }).setOrigin(0.5)

      // ─── Signposts — flavor text + tutorialization ─────────────────────
      const signSpots = [
        { x: 110,  text: 'Mossroot Forest\nWalk right to explore.\nWatch the green strips —\nwild creatures lurk.' },
        { x: 540,  text: 'Twilight Grove\nStronger foes here.\nKeep food + HP up.' },
        { x: 1040, text: 'Ancient Ruins\nGreat rewards.\nGreater danger.' },
        { x: 1480, text: 'BOSS CRUCIBLE\nReady your strongest form.\nNo retreat past this point.' },
      ]
      for (const s of signSpots) {
        const g = this.add.graphics()
        // Wooden post
        g.fillStyle(0x4a2810); g.fillRect(s.x - 1, this.floorY - 24, 3, 24)
        g.fillStyle(0x8a5a30); g.fillRoundedRect(s.x - 12, this.floorY - 42, 24, 16, 2)
        g.fillStyle(0x6a3a18); g.fillTriangle(s.x - 12, this.floorY - 26, s.x - 12, this.floorY - 30, s.x - 8, this.floorY - 26)
        g.fillStyle(0xeed6a8); g.fillRect(s.x - 9, this.floorY - 39, 18, 10)
        // Faint text icon (representing "info")
        g.fillStyle(0x4a2810); g.fillRect(s.x - 1, this.floorY - 36, 2, 4)
        this.signs.push({ x: s.x, text: s.text, gfx: g })
      }

      // Items along the path
      const itemSpots = [
        { x: 230, id: 'berry' }, { x: 400, id: 'apple' }, { x: 540, id: 'herb' },
        { x: 720, id: 'shard' }, { x: 880, id: 'berry' }, { x: 1020, id: 'apple' },
        { x: 1200, id: 'shard' }, { x: 1320, id: 'coin' }, { x: 1450, id: 'shard' },
      ]
      for (const it of itemSpots) {
        const g = this.add.graphics()
        this.drawItem(g, it.x, this.floorY - 6, ITEMS[it.id].color)
        // Bobbing animation
        this.tweens.add({ targets: g, y: -3, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
        // Sparkle particle (occasional)
        const sparkle = this.add.circle(it.x + Phaser.Math.Between(-6, 6), this.floorY - 8, 1, 0xffffff, 0.85)
        this.tweens.add({ targets: sparkle, alpha: 0, y: sparkle.y - 8, duration: 1000, repeat: -1, repeatDelay: Phaser.Math.Between(800, 2400) })
        this.items.push({ x: it.x, id: it.id, gfx: g, sparkle, taken: false })
      }

      // Chests with surrounding glow that pulses when you're nearby
      const chestSpots = [
        { x: 470,  id: 'world_chest_1', seed: [{ id: 'shard', qty: 3 }, { id: 'apple', qty: 2 }] },
        { x: 1140, id: 'world_chest_2', seed: [{ id: 'herb', qty: 2 }, { id: 'coin', qty: 5 }, { id: 'berry', qty: 2 }] },
      ]
      for (const cs of chestSpots) {
        if (!G.chests[cs.id]) G.chests[cs.id] = { items: cs.seed.map((x: any) => ({ ...x })) }
        const glow = this.add.graphics().setDepth(1)
        const g = this.add.graphics().setDepth(2)
        this.drawChest(g, cs.x, this.floorY - 6)
        this.chests.push({ x: cs.x, id: cs.id, gfx: g, glow, glowT: 0 })
      }

      // Encounter zones — gentler chances + clearer warning posts
      this.encZones = [
        { x1: 280, x2: 360,  ch: 14, label: 'WILD' },
        { x1: 620, x2: 740,  ch: 22, label: 'WILD' },
        { x1: 1080, x2: 1200, ch: 26, label: 'WILD' },
      ]
      const encG = this.add.graphics()
      for (const z of this.encZones) {
        // Warning ground stripe
        encG.fillStyle(0x44ff66, 0.20); encG.fillRect(z.x1, this.floorY - 2, z.x2 - z.x1, 6)
        // Warning sign at the start of the zone
        const sx = z.x1 - 8
        encG.fillStyle(0xffdd44); encG.fillTriangle(sx - 8, this.floorY - 18, sx + 8, this.floorY - 18, sx, this.floorY - 32)
        encG.fillStyle(0x000000); encG.fillRect(sx - 1, this.floorY - 28, 2, 5); encG.fillRect(sx - 1, this.floorY - 22, 2, 2)
        // Floating sparkles in the zone
        encG.fillStyle(0x66ff88, 0.6)
        for (let i = 0; i < 6; i++) {
          const tx = z.x1 + Phaser.Math.Between(0, z.x2 - z.x1), ty = this.floorY - 18 - Phaser.Math.Between(0, 12)
          encG.fillCircle(tx, ty, 1)
        }
      }

      // Boss zone (far right) — shows current boss tier so progression is visible.
      const bossG = this.add.graphics()
      bossG.fillStyle(0xaa0033, 0.4); bossG.fillRect(1700, this.floorY - 14, 80, 18)
      bossG.lineStyle(1, 0xff3366, 0.85)
      bossG.beginPath(); bossG.moveTo(1706, this.floorY - 5); bossG.lineTo(1716, this.floorY); bossG.lineTo(1726, this.floorY - 5); bossG.strokePath()
      const bossSkull = this.add.text(1740, this.floorY - 50, '☠', { fontSize: '20px', color: '#ff5577' }).setOrigin(0.5)
      this.tweens.add({ targets: bossSkull, scale: 1.2, duration: 700, yoyo: true, repeat: -1 })
      const bossTier = Math.min((G.bossesBeaten || 0) + 1, BADGES.length)
      const bossLabel = (G.badges?.length || 0) >= BADGES.length ? 'BOSS  ALL CLEAR' : `BOSS ${bossTier}/${BADGES.length}`
      this.add.text(1740, this.floorY - 30, bossLabel, { fontSize: '10px', color: '#ff5577', fontStyle: 'bold', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5)

      // Player — sprite for dino, procedural for other species
      this.cGfx = this.add.graphics().setDepth(3)
      if (hasSprite(this, G.species)) {
        ;(this as any).cImg = makeSpritePlayer(this, G.species, this.pX, this.floorY).setDepth(3)
        this.cGfx.setVisible(false)
      }
      this.drawPlayer()

      // HUD (fixed to camera) — taller two-row layout to match HOME
      this.add.rectangle(W/2, 20, W, 40, 0x060810, 0.96).setScrollFactor(0)
      this.add.rectangle(W/2, 40, W, 1, 0x224488).setScrollFactor(0)

      // Two-row identity readout on the left
      this.hpT = this.add.text(8, 7, '', { fontSize: '9px', color: '#eeeeff', fontStyle: 'bold' }).setScrollFactor(0)
      const subT = this.add.text(8, 23, '', { fontSize: '8px', color: '#7799cc' }).setScrollFactor(0)
      ;(this as any)._subT = subT  // updated alongside hpT in updHUD()

      // Right-side action buttons (centered vertically in the 40-px bar)
      const homeBg = this.add.rectangle(W - 158, 20, 56, 28, 0x1a3344, 0.95).setScrollFactor(0).setInteractive({ useHandCursor: true }).setStrokeStyle(1, 0x55aaff)
      this.add.text(W - 158, 20, '← HOME', { fontSize: '9px', color: '#aaccee', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0)
      homeBg.on('pointerdown', () => { if (this.time.now < this.inputReadyAt) return; G.worldX = this.pX; this.scene.start('HomeScene') })

      const bagBtn = this.add.rectangle(W - 92, 20, 64, 28, 0x1a2a44, 0.94).setScrollFactor(0).setInteractive({ useHandCursor: true }).setStrokeStyle(1, 0x556699)
      this.bagT = this.add.text(W - 92, 20, '', { fontSize: '9px', color: '#ddccaa', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0)
      bagBtn.on('pointerdown', () => this.openBag())

      const mb = this.add.rectangle(W - 28, 20, 50, 28, 0x1a1a2a, 0.94).setScrollFactor(0).setInteractive({ useHandCursor: true }).setStrokeStyle(1, 0x556699)
      const mt = this.add.text(W - 28, 20, theme.isMuted ? '♪ OFF' : '♪ ON', { fontSize: '9px', color: theme.isMuted ? '#778899' : '#aaccee', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0)
      mb.on('pointerdown', () => { theme.toggleMute(); mt.setText(theme.isMuted ? '♪ OFF' : '♪ ON').setColor(theme.isMuted ? '#778899' : '#aaccee') })

      // Bottom strip + touch controls
      this.add.rectangle(W/2, H - 16, W, 32, 0x080814, 0.92).setScrollFactor(0).setDepth(8)

      // Touch buttons: guard against pointerdown events that fire during the
      // scene-start handoff (browser still thinks finger is over the button).
      const lBtn = this.add.rectangle(28, H - 16, 40, 26, 0x1a2a44, 0.9).setScrollFactor(0).setStrokeStyle(1, 0x556699).setInteractive({ useHandCursor: true }).setDepth(9)
      this.add.text(28, H - 16, '◀', { fontSize: '14px', color: '#aaccee', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(10)
      const startL = () => { if (this.time.now < this.inputReadyAt) return; this.touchLeft = true }
      const stopL  = () => this.touchLeft = false
      lBtn.on('pointerdown', startL); lBtn.on('pointerup', stopL); lBtn.on('pointerout', stopL); lBtn.on('pointerupoutside', stopL)

      const rBtn = this.add.rectangle(72, H - 16, 40, 26, 0x1a2a44, 0.9).setScrollFactor(0).setStrokeStyle(1, 0x556699).setInteractive({ useHandCursor: true }).setDepth(9)
      this.add.text(72, H - 16, '▶', { fontSize: '14px', color: '#aaccee', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(10)
      const startR = () => { if (this.time.now < this.inputReadyAt) return; this.touchRight = true }
      const stopR  = () => this.touchRight = false
      rBtn.on('pointerdown', startR); rBtn.on('pointerup', stopR); rBtn.on('pointerout', stopR); rBtn.on('pointerupoutside', stopR)

      const aBtn = this.add.rectangle(W - 40, H - 16, 70, 26, 0x2a4a1a, 0.92).setScrollFactor(0).setStrokeStyle(1, 0x66aa44).setInteractive({ useHandCursor: true }).setDepth(9)
      this.add.text(W - 40, H - 16, 'ACTION', { fontSize: '9px', color: '#ccffaa', fontStyle: 'bold', letterSpacing: 1 }).setOrigin(0.5).setScrollFactor(0).setDepth(10)
      aBtn.on('pointerdown', () => { if (this.time.now < this.inputReadyAt) return; this.tryActivate() })

      this.add.text(W/2, H - 16, '◀ ▶ to walk · ACTION near a target', { fontSize: '7px', color: '#556677' }).setOrigin(0.5).setScrollFactor(0).setDepth(10)

      // ─── Mini-map progress bar ─────────────────────────────────────────
      // Lives just below the HUD top bar; shows player + chests + boss as
      // markers along a track that represents the whole 1800-wide world.
      const mmX = 88, mmY = 50, mmW = W - 176, mmH = 6
      this.add.rectangle(mmX, mmY, mmW, mmH, 0x0a1528, 0.95).setOrigin(0, 0.5).setScrollFactor(0).setStrokeStyle(1, 0x223355).setDepth(9)
      // Encounter zone overlays on the mini-map
      const mmG = this.add.graphics().setScrollFactor(0).setDepth(10)
      const mapX = (worldX: number) => mmX + (worldX / this.wWidth) * mmW
      mmG.fillStyle(0x44ff66, 0.35)
      for (const z of this.encZones) mmG.fillRect(mapX(z.x1), mmY - 3, (z.x2 - z.x1) / this.wWidth * mmW, 6)
      // Chest markers
      mmG.fillStyle(0xffdd44, 0.95)
      for (const c of this.chests) mmG.fillCircle(mapX(c.x), mmY, 2.5)
      // Boss marker
      mmG.fillStyle(0xff3366, 0.95); mmG.fillCircle(mapX(1740), mmY, 3)
      // Home marker (left)
      mmG.fillStyle(0xaaccee, 0.85); mmG.fillRect(mapX(34) - 1, mmY - 3, 2, 6)
      // Player marker — mutable
      this.mmPlayer = this.add.triangle(mapX(this.pX), mmY - 7, 0, -3, -3, 3, 3, 3, 0xffffff).setScrollFactor(0).setDepth(11)
      ;(this as any)._mmX = mmX; ;(this as any)._mmW = mmW

      // Prompt + msg + sign panel
      this.prompt = this.add.text(0, 0, '', { fontSize: '9px', color: '#ffdd66', fontStyle: 'bold' }).setOrigin(0.5).setAlpha(0)
      this.msgT  = this.add.text(W/2, 70, '', { fontSize: '9px', color: '#ffeeaa', backgroundColor: '#000814', padding: { x: 6, y: 3 } as any }).setOrigin(0.5).setAlpha(0).setScrollFactor(0)
      this.signT = this.add.text(W/2, H/2 - 60, '', { fontSize: '9px', color: '#ffeebb', backgroundColor: '#1a0e08', padding: { x: 8, y: 5 } as any, align: 'center', stroke: '#5a3a10', strokeThickness: 1 }).setOrigin(0.5).setAlpha(0).setScrollFactor(0).setDepth(12)

      this.cursors = this.input.keyboard.createCursorKeys()
      this.wasd = this.input.keyboard.addKeys('W,A,S,D')
      this.escK = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
      this.input.keyboard.on('keydown-SPACE', () => this.tryActivate())
      this.input.keyboard.on('keydown-E',     () => this.tryActivate())
      this.input.keyboard.on('keydown-B',     () => this.openBag())

      this.updHUD()

      // After a battle, give a generous safe window so the player can clear
      // the encounter zone instead of immediately re-triggering it.
      if (data?.result) {
        this.encCd = 5000
        const color = data.result === 'win' ? '#44ff88' : '#ff4444'
        const label = data.result === 'win' ? 'Victory!' : 'Defeated!'
        const rt = this.add.text(W/2, H/2, label, { fontSize: '15px', color, fontStyle: 'bold' }).setOrigin(0.5).setDepth(8).setScrollFactor(0)
        this.tweens.add({ targets: rt, y: rt.y - 40, alpha: 0, duration: 2000, onComplete: () => rt.destroy() })
      }

      // Initial camera position so the player isn't stuck off-screen
      this.cameras.main.scrollX = Phaser.Math.Clamp(this.pX - W/2, 0, this.wWidth - W)
    }

    drawItem(g: any, x: number, y: number, color: number) {
      g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 6, 8, 3)
      g.fillStyle(color); g.fillCircle(x, y, 4)
      g.fillStyle(0xffffff, 0.6); g.fillCircle(x - 1, y - 1, 1)
    }

    drawChest(g: any, x: number, y: number) {
      g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 14, 24, 4)
      g.fillStyle(0x6a4a2a); g.fillRoundedRect(x - 12, y, 24, 14, 2)
      g.fillStyle(0x886030); g.fillRoundedRect(x - 12, y - 6, 24, 8, 3)
      g.fillStyle(0xffdd44); g.fillRect(x - 1, y, 2, 5)
      g.fillStyle(0x4a3a1a, 0.5); g.fillRect(x - 12, y + 7, 24, 2)
    }

    drawPlayer(moving: boolean = false) {
      const cImg = (this as any).cImg
      if (cImg) {
        cImg.setX(this.pX).setY(this.floorY)
        updateSpritePlayer(cImg, G.species, (this as any)._t || 0, moving)
      } else {
        this.cGfx.clear()
        drawCreature(this.cGfx, G.stage, this.pX, this.floorY - 22)
      }
    }

    tryActivate() {
      if (!this.nearTarget) return
      const t = this.nearTarget
      // Always save position before scene transitions so a battle/chest/home
      // hop preserves the player's progress through the overworld.
      G.worldX = this.pX
      if (t.kind === 'home')       this.scene.start('HomeScene')
      else if (t.kind === 'chest') { this.scene.launch('ChestScene', { chestId: t.id, from: 'WorldScene' }); this.scene.pause() }
      else if (t.kind === 'boss')  { this.cameras.main.flash(280, 255, 100, 100); this.time.delayedCall(280, () => this.scene.start('BattleScene', { isBoss: true, fromWorld: true })) }
    }

    openBag() { this.scene.launch('InventoryScene', { from: 'WorldScene' }); this.scene.pause() }

    msg(txt: string) { this.msgT.setText(txt).setAlpha(1); this.msgTime = 1400 }

    showSign(text: string) {
      if (this.signT.text === text && this.signTime > 0) return  // already showing same
      this.signT.setText(text).setAlpha(1)
      this.signTime = 2200
    }

    updHUD() {
      this.hpT.setText(G.name + '   Lv.' + G.level)
      ;(this as any)._subT.setText('HP ' + G.hp + '/' + G.maxHp + '   ·   Day ' + G.day)
      this.bagT.setText('BAG ' + invTotal() + '/' + G.maxInv)
    }

    update(time: number, dt: number) {
      if (Phaser.Input.Keyboard.JustDown(this.escK)) { G.worldX = this.pX; this.scene.start('HomeScene'); return }

      let dx = 0
      if (this.cursors.left.isDown  || this.wasd.A.isDown || this.touchLeft)  dx -= 1
      if (this.cursors.right.isDown || this.wasd.D.isDown || this.touchRight) dx += 1
      // Track time for sprite animation framing
      ;(this as any)._t = ((this as any)._t || 0) + dt * 0.001
      const cImg = (this as any).cImg
      if (cImg && dx !== 0) cImg.setFlipX(dx < 0)
      if (dx !== 0) {
        this.pX = Math.max(20, Math.min(this.wWidth - 20, this.pX + dx * 1.7))
        this.cameras.main.scrollX = Phaser.Math.Clamp(this.pX - W/2, 0, this.wWidth - W)
      }
      this.drawPlayer(dx !== 0)

      // Parallax: shift each layer by a fraction of the camera scroll so that
      // far layers barely move and near layers move quickly, creating depth.
      const px = (this as any)._pxLayers
      if (px) {
        const sx = this.cameras.main.scrollX
        if (px.clouds)        px.clouds.tilePositionX        = sx * 0.05 + (this as any)._t * 8
        if (px.mountainsFar)  px.mountainsFar.tilePositionX  = sx * 0.12
        if (px.mountainsMid)  px.mountainsMid.tilePositionX  = sx * 0.28
        if (px.mountainsNear) px.mountainsNear.tilePositionX = sx * 0.45
        if (px.trees)         px.trees.tilePositionX         = sx * 0.7
      }

      // Mini-map: move the player triangle to the live world position
      if (this.mmPlayer) {
        const mmX = (this as any)._mmX, mmW = (this as any)._mmW
        this.mmPlayer.setX(mmX + (this.pX / this.wWidth) * mmW)
      }

      // Item pickups
      for (const it of this.items) {
        if (!it.taken && Math.abs(it.x - this.pX) < 14) {
          if (invAdd(it.id, 1)) {
            it.taken = true; it.gfx.destroy(); it.sparkle?.destroy()
            this.msg('Picked up ' + ITEMS[it.id].name)
            this.updHUD()
          } else this.msg('Bag is full!')
        }
      }

      // Chest glow when nearby
      for (const c of this.chests) {
        const dist = Math.abs(c.x - this.pX)
        const want = dist < 60
        c.glowT = (c.glowT || 0) + dt * 0.005
        c.glow.clear()
        if (want) {
          const a = 0.18 + Math.sin(c.glowT) * 0.12
          c.glow.fillStyle(0xffdd44, Math.max(0, a))
          c.glow.fillCircle(c.x, this.floorY - 6, 22)
          c.glow.fillStyle(0xffffff, Math.max(0, a * 0.6))
          c.glow.fillCircle(c.x, this.floorY - 6, 12)
        }
      }

      // Sign proximity — show flavor/tutorial text
      const ns = this.signs.find((s: any) => Math.abs(s.x - this.pX) < 30)
      if (ns && ns !== this.nearSign) {
        this.nearSign = ns
        this.showSign(ns.text)
      } else if (!ns && this.nearSign) {
        this.nearSign = null
      }

      // Encounter check — gentler probability + 1.5s post-trigger cooldown
      this.encCd -= dt
      if (this.encCd <= 0 && dx !== 0) {
        for (const z of this.encZones) {
          if (this.pX >= z.x1 && this.pX <= z.x2) {
            if (Phaser.Math.Between(1, 1000) <= z.ch * 2) {
              this.encCd = 1500
              G.worldX = this.pX  // PRESERVE position before battle!
              this.cameras.main.flash(280, 255, 255, 255)
              this.time.delayedCall(280, () => this.scene.start('BattleScene', { isBoss: false, fromWorld: true }))
              return
            }
          }
        }
      }

      // Targets
      let near: any = null
      if (this.pX < 56) near = { kind: 'home', x: 34, y: this.floorY - 70 }
      for (const c of this.chests) if (Math.abs(c.x - this.pX) < 22) near = { kind: 'chest', id: c.id, x: c.x, y: this.floorY - 32 }
      if (this.pX > 1700 && this.pX < 1780) near = { kind: 'boss', x: 1740, y: this.floorY - 70 }

      if (near !== this.nearTarget) {
        this.nearTarget = near
        if (near) {
          const lbl = near.kind === 'home' ? '[SPACE] HOME' : (near.kind === 'chest' ? '[SPACE] OPEN CHEST' : '[SPACE] CHALLENGE BOSS')
          this.prompt.setText(lbl).setX(near.x).setY(near.y).setAlpha(1)
        } else this.prompt.setAlpha(0)
      }

      if (this.msgTime > 0) {
        this.msgTime -= dt
        if (this.msgTime <= 0) this.msgT.setAlpha(0)
      }
      if (this.signTime > 0) {
        this.signTime -= dt
        if (this.signTime <= 0) this.signT.setAlpha(0)
      }
    }
  }
}

// ─── InventoryScene — backpack overlay ────────────────────────────────────────
function createInventoryScene(Phaser: any) {
  return class InventoryScene extends Phaser.Scene {
    private from = 'HomeScene'

    constructor() { super('InventoryScene') }
    init(data: any) { this.from = data?.from || 'HomeScene' }

    create() {
      this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.7).setInteractive()
      this.add.rectangle(W/2, H/2, 400, 248, 0x0a1428, 0.97).setStrokeStyle(2, 0x4466aa)
      this.add.rectangle(W/2, H/2 - 106, 400, 24, 0x1a2a4a)
      this.add.text(W/2, H/2 - 106, 'BACKPACK   ' + invTotal() + ' / ' + G.maxInv, { fontSize: '11px', color: '#ddeeff', fontStyle: 'bold', letterSpacing: 2 }).setOrigin(0.5)

      // Highlighted hint at the top so first-time players know what to do.
      this.add.text(W/2, H/2 - 88, '▶  TAP an item below to USE its effect  ◀', { fontSize: '8px', color: '#ffdd66', fontStyle: 'bold' }).setOrigin(0.5)

      const cols = 5, slotW = 70, slotH = 38
      const startX = W/2 - (cols * slotW) / 2 + slotW/2
      const startY = H/2 - 60
      const items = G.inventory.slice(0, 25)
      for (let i = 0; i < 25; i++) {
        const r = Math.floor(i / cols), c = i % cols
        const sx = startX + c * slotW, sy = startY + r * slotH
        const slot = this.add.rectangle(sx, sy, slotW - 4, slotH - 4, 0x14244a, 0.9).setStrokeStyle(1, 0x33446a)
        if (items[i]) {
          const it = items[i]; const def = ITEMS[it.id]
          slot.setInteractive({ useHandCursor: true })
          // Subtle pulse so they look interactive, not decorative.
          this.tweens.add({ targets: slot, fillAlpha: 0.7, duration: 900, yoyo: true, repeat: -1 })
          this.add.circle(sx, sy - 6, 6, def.color)
          this.add.text(sx, sy + 6, def.name + ' x' + it.qty, { fontSize: '7px', color: '#ddeeff' }).setOrigin(0.5)
          this.add.text(sx, sy + 13, def.desc, { fontSize: '6px', color: '#88ddaa' }).setOrigin(0.5)
          slot.on('pointerdown', () => {
            if (invUse(it.id)) {
              this.scene.stop()
              this.scene.resume(this.from)
              this.scene.launch('InventoryScene', { from: this.from }); this.scene.pause(this.from)
            } else {
              const tip = this.add.text(sx, sy - 18, 'Already maxed', { fontSize: '7px', color: '#ff8888', backgroundColor: '#000', padding: { x: 3, y: 1 } as any }).setOrigin(0.5)
              this.time.delayedCall(900, () => tip.destroy())
            }
          })
        }
      }

      // Empty-bag prompt
      if (invTotal() === 0) {
        this.add.text(W/2, H/2 - 20,
          'Your bag is empty.\nPick fruit at HOME, find items in the OVERWORLD,\nor open chests to fill it.',
          { fontSize: '9px', color: '#88aacc', align: 'center' }
        ).setOrigin(0.5)
      }

      this.add.text(W/2, H/2 + 108, 'Berries +HP   ·   Apples +FOOD   ·   Herbs +MOOD   ·   Crystals +XP', { fontSize: '7px', color: '#7788aa' }).setOrigin(0.5)
      const close = () => { this.scene.stop(); this.scene.resume(this.from) }
      // Tappable close button
      const xBtn = this.add.rectangle(W/2 + 188, H/2 - 106, 22, 18, 0x4a1010, 0.95).setStrokeStyle(1, 0xaa4444).setInteractive({ useHandCursor: true })
      this.add.text(W/2 + 188, H/2 - 106, '✕', { fontSize: '11px', color: '#ffaaaa', fontStyle: 'bold' }).setOrigin(0.5)
      xBtn.on('pointerdown', close)
      this.input.keyboard.on('keydown-ESC', close)
      this.input.keyboard.on('keydown-B',   close)
    }
  }
}

// ─── ChestScene — transfer items between chest and backpack ───────────────────
function createChestScene(Phaser: any) {
  return class ChestScene extends Phaser.Scene {
    private from = 'WorldScene'
    private chestId = ''

    constructor() { super('ChestScene') }
    init(data: any) {
      this.from = data?.from || 'WorldScene'
      this.chestId = data?.chestId || ''
    }

    create() {
      if (!G.chests[this.chestId]) G.chests[this.chestId] = { items: [] }
      this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.7).setInteractive()
      this.add.rectangle(W/2, H/2, 440, 250, 0x0a1428, 0.97).setStrokeStyle(2, 0x886030)
      this.add.rectangle(W/2, H/2 - 107, 440, 24, 0x4a3a1a)
      this.add.text(W/2, H/2 - 107, 'CHEST', { fontSize: '11px', color: '#ffdd99', fontStyle: 'bold', letterSpacing: 2 }).setOrigin(0.5)

      this.refresh()
      this.add.text(W/2, H/2 + 105, 'Tap an item to transfer', { fontSize: '8px', color: '#7788aa' }).setOrigin(0.5)

      const close = () => { this.scene.stop(); this.scene.resume(this.from) }
      const xBtn = this.add.rectangle(W/2 + 208, H/2 - 107, 22, 18, 0x4a1010, 0.95).setStrokeStyle(1, 0xaa4444).setInteractive({ useHandCursor: true })
      this.add.text(W/2 + 208, H/2 - 107, '✕', { fontSize: '11px', color: '#ffaaaa', fontStyle: 'bold' }).setOrigin(0.5)
      xBtn.on('pointerdown', close)
      this.input.keyboard.on('keydown-ESC', close)
      this.input.keyboard.on('keydown-B',   close)
    }

    refresh() {
      // destroy previous slot objects then redraw both columns
      const slots: any[] = (this as any)._slots || []
      slots.forEach(o => o.destroy())
      const newSlots: any[] = []

      const chest = G.chests[this.chestId]
      const lblL = this.add.text(W/2 - 100, H/2 - 80, 'IN CHEST  (' + chest.items.length + ')', { fontSize: '9px', color: '#ffdd99', fontStyle: 'bold' }).setOrigin(0.5)
      const lblR = this.add.text(W/2 + 100, H/2 - 80, 'IN BAG  ' + invTotal() + '/' + G.maxInv, { fontSize: '9px', color: '#ddeeff', fontStyle: 'bold' }).setOrigin(0.5)
      newSlots.push(lblL, lblR)

      const drawCol = (items: any[], baseX: number, fromChest: boolean) => {
        for (let i = 0; i < Math.min(items.length, 8); i++) {
          const it = items[i]; const def = ITEMS[it.id]
          const sy = H/2 - 56 + i * 18
          const slot = this.add.rectangle(baseX, sy, 150, 16, 0x14244a, 0.9).setStrokeStyle(1, 0x33446a).setInteractive({ useHandCursor: true })
          const dot = this.add.circle(baseX - 64, sy, 4, def.color)
          const txt = this.add.text(baseX - 56, sy - 4, def.name + ' x' + it.qty, { fontSize: '8px', color: '#ddeeff' })
          const arr = this.add.text(baseX + 60, sy - 4, fromChest ? '→' : '←', { fontSize: '9px', color: '#88ccff' })
          newSlots.push(slot, dot, txt, arr)
          slot.on('pointerdown', () => {
            if (fromChest) {
              if (invAdd(it.id, 1)) {
                it.qty -= 1
                if (it.qty <= 0) chest.items = chest.items.filter((x: any) => x.id !== it.id)
                this.refresh()
              }
            } else {
              if (invRemove(it.id, 1)) {
                const ex = chest.items.find((x: any) => x.id === it.id)
                if (ex) ex.qty += 1; else chest.items.push({ id: it.id, qty: 1 })
                this.refresh()
              }
            }
          })
        }
        if (items.length === 0) {
          newSlots.push(this.add.text(baseX, H/2 - 56, '(empty)', { fontSize: '8px', color: '#445566' }).setOrigin(0.5))
        }
      }

      drawCol(chest.items, W/2 - 100, true)
      drawCol(G.inventory, W/2 + 100, false)

      ;(this as any)._slots = newSlots
    }
  }
}

// ─── CodexScene — evolution chain + level info ───────────────────────────────
function createCodexScene(Phaser: any) {
  return class CodexScene extends Phaser.Scene {
    private from = 'HomeScene'
    constructor() { super('CodexScene') }
    init(data: any) { this.from = data?.from || 'HomeScene' }

    create() {
      this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.85)
      this.add.rectangle(W/2, H/2, W - 24, H - 24, 0x0a0f1e, 0.97).setStrokeStyle(2, 0x886699)
      this.add.rectangle(W/2, 26, W - 24, 22, 0x2a1a44)
      this.add.text(W/2, 26, 'CODEX  —  ' + sp().label, { fontSize: '11px', color: '#ddccff', fontStyle: 'bold', letterSpacing: 2 }).setOrigin(0.5)

      // Evolution chain across the top
      const stages = sp().stageNames
      const stageY = 90
      const cellW = (W - 40) / stages.length
      for (let i = 0; i < stages.length; i++) {
        const cx = 20 + cellW * (i + 0.5)
        const isCur = i === G.stage
        const slotBg = this.add.rectangle(cx, stageY, cellW - 8, 70, isCur ? 0x33224a : 0x14182a, 0.9).setStrokeStyle(1, isCur ? 0xffdd44 : 0x33446a)

        // Draw sprite at origin, then scale + translate so larger stage 4/5
        // forms fit cleanly inside the codex cell instead of spilling over.
        const g = this.add.graphics()
        sp().draw(g, i, 0, 0)
        g.setScale(0.55)
        g.setX(cx)
        g.setY(stageY - 8)

        this.add.text(cx, stageY + 22, stages[i], { fontSize: '8px', color: isCur ? '#ffdd44' : '#aaccee', fontStyle: isCur ? 'bold' : 'normal' }).setOrigin(0.5)
        const req = i === 0 ? 'Hatch' : (i === stages.length - 1 ? 'Final' : 'Lv ' + EVO_LEVEL[i])
        this.add.text(cx, stageY + 32, req, { fontSize: '7px', color: '#7799cc' }).setOrigin(0.5)

        if (i < stages.length - 1) {
          this.add.text(20 + cellW * (i + 1), stageY - 4, '→', { fontSize: '12px', color: '#556699' }).setOrigin(0.5)
        }
      }

      // Status panel
      this.add.rectangle(W/2, 200, W - 60, 56, 0x101a30, 0.92).setStrokeStyle(1, 0x33446a)
      this.add.text(W/2, 178, 'CURRENT STATUS', { fontSize: '9px', color: '#ffdd66', fontStyle: 'bold', letterSpacing: 2 }).setOrigin(0.5)
      const stat1 = `${G.name}   Lv.${G.level}   HP ${G.hp}/${G.maxHp}   XP ${Math.floor(G.xp)}/${xpToLevel(G.level)}`
      const stat2 = `ATK ${G.atk}   DEF ${G.def}   SPD ${G.spd}   Wins ${G.wins}   Day ${G.day}`
      this.add.text(W/2, 196, stat1, { fontSize: '9px', color: '#ddeeff', align: 'center' }).setOrigin(0.5)
      this.add.text(W/2, 210, stat2, { fontSize: '9px', color: '#aaccee', align: 'center' }).setOrigin(0.5)

      const evoNext = EVO_LEVEL[G.stage]
      const nextEvo = G.stage < 5 ? `Next evolution at Lv ${evoNext}  (${Math.max(0, evoNext - G.level)} levels to go)` : 'You have reached the final form!'
      this.add.text(W/2, 234, nextEvo, { fontSize: '9px', color: '#ffdd44', fontStyle: 'italic' }).setOrigin(0.5)

      this.add.text(W/2, 250, 'Each level: +3 HP   +1 ATK   +1 DEF   +1 SPD every 2 levels', { fontSize: '8px', color: '#88aacc' }).setOrigin(0.5)
      this.add.text(W/2, 262, 'XP: training (+6), wild battles (+18-44), bosses (+95-155), crystals (+5)', { fontSize: '8px', color: '#7788aa' }).setOrigin(0.5)

      // Badge collection row
      this.add.text(W/2, 280, 'BADGES', { fontSize: '9px', color: '#ffdd66', fontStyle: 'bold', letterSpacing: 2 }).setOrigin(0.5)
      const badgeY = 296
      const slotW = 30
      const startBX = W/2 - (BADGES.length * slotW) / 2 + slotW/2
      for (let i = 0; i < BADGES.length; i++) {
        const b = BADGES[i]
        const bx = startBX + i * slotW
        const owned = G.badges?.includes(b.id)
        this.add.circle(bx, badgeY, 9, owned ? b.color : 0x1a1a2a).setStrokeStyle(1, owned ? 0xffffff : 0x445566)
        this.add.text(bx, badgeY, b.glyph, { fontSize: '10px', color: owned ? '#ffffff' : '#445566', fontStyle: 'bold' }).setOrigin(0.5)
        this.add.text(bx, badgeY + 11, b.name.replace(' Crest',''), { fontSize: '6px', color: owned ? '#ffeebb' : '#445566' }).setOrigin(0.5)
      }
      const badgeCount = G.badges?.length || 0
      const trialMsg = badgeCount >= BADGES.length
        ? '★ MASTER NINJA TRIAL UNLOCKED — Visit the Trial Gate at HOME ★'
        : `Defeat the boss to earn the next badge.  ${badgeCount}/${BADGES.length} collected.`
      this.add.text(W/2, H - 24, trialMsg, { fontSize: '8px', color: badgeCount >= BADGES.length ? '#ff66bb' : '#88aacc', fontStyle: 'italic' }).setOrigin(0.5)

      const close = () => { this.scene.stop(); this.scene.resume(this.from) }
      const xBtn = this.add.rectangle(W - 26, 26, 22, 18, 0x4a1010, 0.95).setStrokeStyle(1, 0xaa4444).setInteractive({ useHandCursor: true })
      this.add.text(W - 26, 26, '✕', { fontSize: '11px', color: '#ffaaaa', fontStyle: 'bold' }).setOrigin(0.5)
      xBtn.on('pointerdown', close)
      this.input.keyboard.on('keydown-ESC', close)
      this.input.keyboard.on('keydown-C',   close)
    }
  }
}

// ─── BattleScene ──────────────────────────────────────────────────────────────
function createBattleScene(Phaser: any) {
  return class BattleScene extends Phaser.Scene {
    private isBoss = false; private fromWorld = false; private fromNinja = false
    private turn = 'player'; private animating = false
    private defending = false; private eDefending = false
    private enemy: any = {}
    private eGfx: any; private pGfx: any
    private eX = 0; private eY = 0; private pX = 0; private pY = 0
    private eHpF: any; private pHpF: any
    private eHpT: any; private pHpT: any
    private l1: any; private l2: any

    constructor() { super('BattleScene') }

    create(data: any) {
      this.isBoss    = data?.isBoss    || false
      this.fromWorld = data?.fromWorld || false
      this.fromNinja = data?.fromNinja || false
      this.turn = 'player'; this.animating = false
      this.defending = false; this.eDefending = false
      this.enemy = this.genEnemy()

      this.add.rectangle(W / 2, H / 2, W, H, this.isBoss ? 0x160008 : 0x081408)
      if (this.isBoss) {
        this.add.rectangle(W / 2, H * 0.65, W, H * 0.7, 0x200010)
      } else {
        this.add.rectangle(W / 2, H * 0.7, W, H * 0.6, 0x081a08)
        for (let i = 0; i < 5; i++) this.add.rectangle(i * 100, H * 0.6, 100, H * 0.4, 0x0a2010, 0.4).setOrigin(0)
      }
      this.add.rectangle(W / 2, 18, W, 36, 0x060810, 0.95)
      this.add.text(W / 2, 10, this.isBoss ? '  BOSS BATTLE  ' : '  WILD ENCOUNTER', { fontSize: '11px', color: this.isBoss ? '#ff3377' : '#77ff88', letterSpacing: 3 }).setOrigin(0.5)

      // Enemy sits in the upper-middle area, well clear of the right-side action panel.
      this.eX = W * 0.55; this.eY = H * 0.38
      this.eGfx = this.add.graphics()
      SPECIES[this.enemy.species].draw(this.eGfx, this.enemy.stage, this.eX, this.eY)
      this.eGfx.setScale(-1, 1); this.eGfx.x = this.eX * 2

      this.add.text(this.eX, H * 0.14, this.enemy.name, { fontSize: '11px', color: '#ffaaaa', fontStyle: 'bold' }).setOrigin(0.5)
      this.add.text(this.eX, H * 0.21, this.isBoss ? 'BOSS' : 'Lv.' + this.enemy.level, { fontSize: '8px', color: this.isBoss ? '#ff4488' : '#aaaaaa' }).setOrigin(0.5)
      this.add.rectangle(this.eX, H * 0.285, 102, 10, 0x2a0000)
      this.eHpF = this.add.rectangle(this.eX - 51, H * 0.285, 100, 8, 0xff4444).setOrigin(0, 0.5)
      this.eHpT = this.add.text(this.eX, H * 0.285, '' + this.enemy.hp + '/' + this.enemy.maxHp, { fontSize: '7px', color: '#fff' }).setOrigin(0.5)

      this.pX = W * 0.28; this.pY = H * 0.52
      this.pGfx = this.add.graphics()
      // Sprite art if loaded for current species; procedural fallback
      if (hasSprite(this, G.species)) {
        const pImg = makeSpritePlayer(this, G.species, this.pX, this.pY + 20)
        // Idle frame swap loop so the creature feels alive in battle
        let bt = 0
        this.time.addEvent({ delay: 200, loop: true, callback: () => {
          if (!pImg || !pImg.active) return
          bt += 0.2
          updateSpritePlayer(pImg, G.species, bt, false)
        }})
        ;(this as any).pImg = pImg
        this.pGfx = pImg  // tweens already target pGfx — point them at the image instead
      } else {
        drawCreature(this.pGfx, G.stage, this.pX, this.pY)
      }

      this.add.text(this.pX, H * 0.72, G.name, { fontSize: '11px', color: '#aaaaff', fontStyle: 'bold' }).setOrigin(0.5)
      this.add.text(this.pX, H * 0.79, 'Lv.' + G.level, { fontSize: '8px', color: '#7788cc' }).setOrigin(0.5)
      this.add.rectangle(this.pX, H * 0.855, 102, 10, 0x002200)
      this.pHpF = this.add.rectangle(this.pX - 51, H * 0.855, 100, 8, 0x44ff88).setOrigin(0, 0.5)
      this.pHpT = this.add.text(this.pX, H * 0.855, '' + G.hp + '/' + G.maxHp, { fontSize: '7px', color: '#fff' }).setOrigin(0.5)

      this.add.rectangle(W / 2, H - 26, W - 16, 36, 0x08101a, 0.93).setStrokeStyle(1, 0x1a3344)
      this.l1 = this.add.text(W / 2, H - 38, '', { fontSize: '9px', color: '#ccdeff', align: 'center', wordWrap: { width: W - 90 } }).setOrigin(0.5)
      this.l2 = this.add.text(W / 2, H - 24, '', { fontSize: '8px', color: '#99aacc', align: 'center', wordWrap: { width: W - 90 } }).setOrigin(0.5)

      const bx = W - 76
      this.add.rectangle(bx, H * 0.625, 118, H * 0.73, 0x08101a, 0.9)
      this.mkB(bx, H * 0.39, 'ATTACK',  0x0d2a1a, 0x44ff88, () => this.act('attack'))
      this.mkB(bx, H * 0.52, 'SPECIAL', 0x1a0d2a, 0xaa44ff, () => this.act('special'))
      this.mkB(bx, H * 0.65, 'DEFEND',  0x0d1a2a, 0x44aaff, () => this.act('defend'))
      this.mkB(bx, H * 0.78, 'RUN',     0x1a1005, 0xffaa44, () => this.act('run'))

      this.setLog('A wild ' + this.enemy.name + ' appeared!', this.isBoss ? 'A powerful boss challenges you!' : 'Choose your action...')
      this.eGfx.x += 30
      this.tweens.add({ targets: this.eGfx, x: this.eGfx.x - 30, duration: 550, ease: 'Back.easeOut' })
    }

    genEnemy() {
      const bossTier = G.bossesBeaten || 0  // 0..7+, scales boss difficulty up

      // Themed name pools — 10 per species so wild encounters feel varied.
      const namesBySpecies = [
        // Dino flavor
        ['Sharptooth','Crestrunner','Spinejaw','Clawfoot','Frillback','Marshcreeper','Boneripper','Plumeback','Rockshorn','Razorthorn'],
        // Water flavor
        ['Marshfin','Tideling','Coralfang','Drakefry','Brinepup','Kelpcrest','Stormjaw','Reefclaw','Mistsnake','Pearlfin'],
        // Lion-turtle / earth flavor
        ['Mossback','Stoneshell','Wildmane','Cubguard','Driftpaw','Grovekeeper','Boulderpaw','Hornshell','Sageclaw','Fernmane'],
      ]
      // Eight unique bosses, one per badge tier.
      const bossNames = [
        'VORAX', 'TITANEX', 'NECROSAUR', 'SHADOWFANG',
        'OBLIVIRA', 'TEMPESTRYX', 'GLOOMHELM', 'AETHERIX',
      ]
      // Ten Master Ninjas for the trial.
      const ninjaNames = [
        'Master Hayato', 'Master Sakura', 'Master Renji', 'Master Mei',
        'Master Kaito',  'Master Yumi',   'Master Tora',  'Master Aki',
        'Master Ryo',    'Grand Master Kuro',
      ]

      let name: string
      let s: number
      let species = Phaser.Math.Between(0, 2)

      if (this.fromNinja) {
        const idx = Math.min(9, G.ninjasBeaten || 0)
        name = ninjaNames[idx]
        species = idx % 3
        s = idx >= 9 ? 5 : 4
      } else if (this.isBoss) {
        name = bossNames[bossTier % bossNames.length]
        s = Math.min(5, 3 + Math.floor(bossTier / 2))   // 3, 3, 4, 4, 5, 5, 5, 5
      } else {
        name = namesBySpecies[species][Phaser.Math.Between(0, namesBySpecies[species].length - 1)]
        s = Phaser.Math.Clamp(G.stage - 1 + Phaser.Math.Between(0, 2), 1, 4)
      }

      // Difficulty scaling: bosses ramp with bossTier, ninjas ramp with idx.
      const bossMult  = this.isBoss   ? (2.0 + bossTier * 0.12)              : 1
      const ninjaMult = this.fromNinja ? (1.6 + (G.ninjasBeaten || 0) * 0.08) : 1
      const mult = Math.max(bossMult, ninjaMult, 1)
      const hp = Math.floor((14 + s * 12) * mult)
      return {
        name, species, stage: s, hp, maxHp: hp,
        atk: (3 + s * 3) * (this.isBoss ? 1.55 : (this.fromNinja ? 1.4 : 1)),
        def: 2 + s * 2,
        spd: 3 + s,
        level: Math.max(1, G.level + (this.isBoss ? 2 : (this.fromNinja ? 1 : Phaser.Math.Between(-1, 1)))),
      }
    }

    mkB(x: number, y: number, label: string, bg: number, col: number, cb: () => void) {
      const b = this.add.rectangle(x, y, 108, 22, bg).setInteractive({ useHandCursor: true }).setStrokeStyle(1, col)
      this.add.text(x, y, label, { fontSize: '9px', color: '#' + col.toString(16).padStart(6, '0') }).setOrigin(0.5)
      b.on('pointerover', () => b.setStrokeStyle(2, col))
      b.on('pointerout',  () => b.setStrokeStyle(1, col))
      b.on('pointerdown', cb)
    }

    setLog(a: string, b = '') { this.l1.setText(a); this.l2.setText(b) }

    updBars() {
      const er = Math.max(0, this.enemy.hp / this.enemy.maxHp)
      const pr = Math.max(0, G.hp / G.maxHp)
      this.eHpF.width = er * 100
      this.pHpF.width = pr * 100
      this.eHpF.fillColor = er > 0.5 ? 0xff4444 : (er > 0.25 ? 0xff8844 : 0xff2222)
      this.pHpF.fillColor = pr > 0.5 ? 0x44ff88 : (pr > 0.25 ? 0xffff44 : 0xff4444)
      this.eHpT.setText(Math.max(0, Math.floor(this.enemy.hp)) + '/' + this.enemy.maxHp)
      this.pHpT.setText(Math.max(0, Math.floor(G.hp)) + '/' + G.maxHp)
    }

    dmg(atk: number, def: number, sp: boolean) {
      // Old code only floored the (atk - def) part, then multiplied by a
      // 0.85-1.15 random factor — leaving a long decimal in the battle log
      // ("Dealt 6.506464... dmg"). Floor the whole expression instead.
      const base = (sp ? atk * 1.5 : atk) - def * 0.4
      return Math.max(1, Math.floor(base * (0.85 + Math.random() * 0.3)))
    }

    act(action: string) {
      if (this.animating || this.turn !== 'player') return
      this.animating = true; this.defending = false

      if (action === 'run') {
        if (Math.random() < 0.55) { this.setLog('Got away safely!'); this.time.delayedCall(900, () => this.end('run')) }
        else { this.setLog("Couldn't escape!", 'Enemy attacks!'); this.time.delayedCall(700, () => this.eTurn()) }
        return
      }
      if (action === 'defend') {
        this.defending = true
        this.setLog(G.name + ' takes a defensive stance!')
        this.tweens.add({ targets: this.pGfx, alpha: 0.5, duration: 180, yoyo: true, repeat: 2 })
        this.time.delayedCall(700, () => { this.setLog(G.name + ' is guarding...', "Enemy's turn!"); this.time.delayedCall(600, () => this.eTurn()) })
        return
      }
      const d   = this.dmg(G.atk, this.enemy.def, action === 'special')
      const lbl = action === 'special' ? 'Special Attack' : 'Attack'
      // Lunge: graphics tween its transform offset 0->40, image needs absolute pX+30
      const lungeX = (this as any).pImg ? (this.pX + 30) : 40
      this.tweens.add({ targets: this.pGfx, x: lungeX, duration: 180, ease: 'Power2', yoyo: true })
      this.time.delayedCall(180, () => {
        this.enemy.hp -= d
        this.cameras.main.shake(130, 0.01)
        this.tweens.add({ targets: this.eGfx, alpha: 0.15, duration: 90, yoyo: true, repeat: 2 })
        const left = Math.max(0, Math.floor(this.enemy.hp))
        this.setLog(G.name + ' uses ' + lbl + '!', 'Dealt ' + d + ' damage! ' + (this.enemy.hp <= 0 ? this.enemy.name + ' defeated!' : left + ' HP left'))
        this.updBars()
        if (this.enemy.hp <= 0) this.time.delayedCall(1200, () => this.end('win'))
        else this.time.delayedCall(950, () => this.eTurn())
      })
    }

    eTurn() {
      this.turn = 'enemy'
      const roll   = Math.random()
      const action = this.enemy.hp < this.enemy.maxHp * 0.3
        ? (roll < 0.7 ? 'special' : 'attack')
        : (roll < 0.6 ? 'attack' : (roll < 0.8 ? 'special' : 'defend'))

      if (action === 'defend') {
        this.eDefending = true
        this.setLog(this.enemy.name + ' braces itself!')
        this.time.delayedCall(750, () => { this.turn = 'player'; this.animating = false; this.setLog('Your turn!', 'Choose your action...') })
        return
      }
      const dm = this.defending ? G.def * 2 : G.def
      const d  = this.dmg(this.enemy.atk, dm, action === 'special')
      const lbl = action === 'special' ? 'Special Attack' : 'Attack'
      this.tweens.add({ targets: this.eGfx, x: this.eGfx.x - 40, duration: 180, ease: 'Power2', yoyo: true })
      this.time.delayedCall(180, () => {
        G.hp = Math.max(0, G.hp - d)
        this.cameras.main.shake(100, 0.008)
        this.tweens.add({ targets: this.pGfx, alpha: 0.15, duration: 90, yoyo: true, repeat: 2 })
        const sh = this.defending ? ' [Blocked!]' : ''
        this.setLog(this.enemy.name + ' uses ' + lbl + '!', 'Dealt ' + d + ' dmg' + sh + '. ' + G.name + ' has ' + G.hp + ' HP')
        this.updBars()
        if (G.hp <= 0) this.time.delayedCall(1200, () => this.end('lose'))
        else this.time.delayedCall(800, () => { this.turn = 'player'; this.animating = false; this.setLog('Your turn!', G.name + ' has ' + G.hp + ' HP') })
      })
    }

    end(result: string) {
      let badgeAwarded: any = null
      let allBadges = false
      let ninjaProgressed = false
      let ninjaCleared = false

      if (result === 'win') {
        const xp = this.isBoss
          ? 80 + this.enemy.stage * 15
          : 18 + this.enemy.stage * 5 + Phaser.Math.Between(0, 6)
        G.wins++; G.happy = Math.min(100, G.happy + 10)
        G.hp = Math.min(G.maxHp, G.hp + Math.floor(G.maxHp * 0.1))
        const r = gainXp(xp)
        this.cameras.main.flash(600, 255, 210, 50)
        this.setLog('Victory! +' + xp + ' XP', this.isBoss ? 'Boss defeated!' : '')

        if (r.leveled) {
          theme.chime()
          this.cameras.main.flash(450, 255, 230, 120)
          const lvl = this.add.text(W/2, H/2 - 30,
            'LEVEL UP!  Lv.' + G.level,
            { fontSize: '14px', color: '#ffdd44', fontStyle: 'bold', stroke: '#5a3a00', strokeThickness: 2 }
          ).setOrigin(0.5).setDepth(20)
          this.tweens.add({ targets: lvl, y: lvl.y - 40, alpha: 0, duration: 2000, onComplete: () => lvl.destroy() })
        }
        if (r.shouldEvolve && G.stage < 5) {
          G.stage++; G.name = sp().stageNames[G.stage]
          G.maxHp += 15; G.hp = G.maxHp; G.atk += 4; G.def += 3; G.spd += 2
          this.time.delayedCall(500, () => this.setLog('EVOLVED into ' + G.name + '!', 'Stats increased!'))
        }

        // Boss win: award the next badge in sequence and bump the boss counter.
        if (this.isBoss) {
          G.bossesBeaten = (G.bossesBeaten || 0) + 1
          badgeAwarded = awardNextBadge()
          allBadges = G.badges.length >= BADGES.length
          if (badgeAwarded) {
            theme.chime()
            this.cameras.main.flash(800, badgeAwarded.color >> 16 & 0xff, badgeAwarded.color >> 8 & 0xff, badgeAwarded.color & 0xff)
            const bt = this.add.text(W/2, H/2 - 70,
              'BADGE EARNED!\n' + badgeAwarded.glyph + '  ' + badgeAwarded.name + '  ' + badgeAwarded.glyph + '\n(' + G.badges.length + '/' + BADGES.length + ')',
              { fontSize: '13px', color: '#ffeebb', fontStyle: 'bold', align: 'center', stroke: '#3a1a00', strokeThickness: 3 }
            ).setOrigin(0.5).setDepth(25)
            this.tweens.add({ targets: bt, y: bt.y - 30, alpha: 0, duration: 3200, onComplete: () => bt.destroy() })
          }
        }

        // Master Ninja Trial: each win bumps progress; 10 wins clears the trial.
        if (this.fromNinja) {
          G.ninjasBeaten = (G.ninjasBeaten || 0) + 1
          ninjaProgressed = true
          if (G.ninjasBeaten >= 10) ninjaCleared = true
        }

      } else if (result === 'lose') {
        G.happy = Math.max(0, G.happy - 20); G.hp = Math.floor(G.maxHp * 0.3)
        this.cameras.main.flash(600, 255, 0, 0)
        this.setLog('Defeated...', 'Recovered with ' + G.hp + ' HP. Returned home.')
        // A loss in the ninja trial resets the streak.
        if (this.fromNinja) G.ninjasBeaten = 0
      } else {
        this.setLog('Escaped safely!')
      }

      // Where to go next:
      //   Boss win  → straight to HOME so player sees badge + Codex
      //   Ninja win → continue the trial unless cleared, then HOME
      //   Wild win/lose from world → back to WorldScene
      //   Anything else → HOME
      const delay = (this.isBoss && result === 'win') ? 3500 : 2000
      this.time.delayedCall(delay, () => {
        if (result === 'win' && this.isBoss) {
          this.scene.start('HomeScene')
        } else if (this.fromNinja) {
          if (result === 'win' && !ninjaCleared) {
            this.scene.start('BattleScene', { isBoss: false, fromWorld: false, fromNinja: true })
          } else {
            this.scene.start('HomeScene')
          }
        } else if (this.fromWorld) {
          this.scene.start('WorldScene', { result })
        } else {
          this.scene.start('HomeScene')
        }
      })
    }
  }
}

// ─── React wrapper ────────────────────────────────────────────────────────────
export default function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef      = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    Object.assign(G, {
      species: 0, stage: 0, name: '???', hp: 20, maxHp: 20,
      atk: 5, def: 3, spd: 4, hunger: 80, happy: 80,
      xp: 0, level: 1, wins: 0, lastFed: 0,
      day: 1, inventory: [], maxInv: 100, chests: {},
      badges: [], bossesBeaten: 0, ninjasBeaten: 0, worldX: undefined,
    })

    import('phaser').then((PhaserModule) => {
      const Phaser = PhaserModule.default

      gameRef.current = new Phaser.Game({
        type:            Phaser.AUTO,
        width:           W,
        height:          H,
        backgroundColor: '#0d0d1a',
        parent:          containerRef.current!,
        pixelArt:        true,
        roundPixels:     true,
        scene: [
          createPickScene(Phaser),
          createEggScene(Phaser),
          createHomeScene(Phaser),
          createWorldScene(Phaser),
          createBattleScene(Phaser),
          createInventoryScene(Phaser),
          createChestScene(Phaser),
          createCodexScene(Phaser),
        ],
        scale: {
          mode:       Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
      })

      // Keep upscaled canvas crisp on big displays
      const applyCrisp = () => {
        const canvas = containerRef.current?.querySelector('canvas') as HTMLCanvasElement | null
        if (canvas) canvas.style.imageRendering = 'pixelated'
      }
      applyCrisp()
      setTimeout(applyCrisp, 100)
    })

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
      theme.stop()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', maxWidth: 960, aspectRatio: '480/320', imageRendering: 'pixelated' }}
    />
  )
}
