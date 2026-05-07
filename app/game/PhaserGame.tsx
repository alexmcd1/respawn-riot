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
  xpNeeded: [30, 100, 250, 500, 9999999],
  level: 1, wins: 0, lastFed: 0,
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

// 16-bar heroic adventure melody in C major (I-V-vi-IV) — 64 beats total.
const MELODY: [string, number][] = [
  ['C5',1],['E5',1],['G5',1],['E5',1],          // bar 1  C
  ['D5',1],['G5',1],['B5',1],['G5',1],          // bar 2  G
  ['A4',1],['C5',1],['E5',1],['C5',1],          // bar 3  Am
  ['F5',1],['A5',1],['C6',1],['A5',1],          // bar 4  F
  ['G5',0.5],['E5',0.5],['C5',1],['E5',1],['G5',1], // bar 5
  ['A5',1],['G5',1],['D5',1],['G5',1],          // bar 6
  ['C6',1],['B5',1],['A5',1],['G5',1],          // bar 7
  ['F5',0.5],['G5',0.5],['A5',1],['G5',1],['C5',1], // bar 8
  ['G4',1],['C5',1],['E5',1],['G5',1],          // bar 9
  ['B4',1],['D5',1],['G5',1],['B5',1],          // bar 10
  ['A4',1],['C5',1],['E5',1],['A5',1],          // bar 11
  ['F4',1],['A4',1],['C5',1],['F5',1],          // bar 12
  ['E5',0.5],['F5',0.5],['G5',1],['A5',1],['B5',1], // bar 13
  ['C6',2],['B5',1],['A5',1],                   // bar 14
  ['G5',1],['F5',1],['E5',1],['D5',1],          // bar 15
  ['C5',2],['G4',1],['C5',1],                   // bar 16
]

const BASS: [string, number][] = [
  ['C3',4],['G2',4],['A2',4],['F2',4],
  ['C3',4],['G2',4],['A2',4],['F2',4],
  ['C3',4],['G2',4],['A2',4],['F2',4],
  ['C3',4],['F2',4],['G2',4],['C3',4],
]

class Theme {
  ctx?: any
  master?: any
  isMuted = false
  bpm = 132
  melodyAt = 0; bassAt = 0
  melodyTime = 0; bassTime = 0
  schedTimer: any = null
  beatLen() { return 60 / this.bpm }

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
      this.melodyAt = 0; this.bassAt = 0
      this.tick()
    } catch (e) {}
  }

  tick = () => {
    if (!this.ctx || !this.master) return
    const cutoff = this.ctx.currentTime + 1.5
    while (this.melodyTime < cutoff) {
      const [n, b] = MELODY[this.melodyAt]
      const dur = b * this.beatLen()
      const f = NOTE[n] || 0
      if (f > 0) this.note('square', f, this.melodyTime, dur, 0.18)
      this.melodyTime += dur
      this.melodyAt = (this.melodyAt + 1) % MELODY.length
    }
    while (this.bassTime < cutoff) {
      const [n, b] = BASS[this.bassAt]
      const dur = b * this.beatLen()
      const f = NOTE[n] || 0
      if (f > 0) this.note('triangle', f, this.bassTime, dur, 0.22)
      this.bassTime += dur
      this.bassAt = (this.bassAt + 1) % BASS.length
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

  stop() {
    if (this.schedTimer) clearTimeout(this.schedTimer)
    try { this.ctx?.close() } catch (e) {}
    this.ctx = undefined; this.master = undefined
  }
}

const theme = new Theme()

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

  } else {
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

  } else {
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

  } else {
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
  }
}

// ─── Species registry + dispatcher ────────────────────────────────────────────
const SPECIES = [
  {
    label: 'DINO',
    desc: 'Fierce hunter',
    stageNames:  ['Egg', 'Hatchling', 'Saurling', 'Raptus', 'Tyranex'],
    stageColors: [0xd4c5f9, 0x77dd66, 0x44aa55, 0x4488cc, 0xcc4422],
    stagePulse:  [0xeeeeff, 0xaaff99, 0x88dd77, 0x77bbdd, 0xff8844],
    draw: drawDino,
  },
  {
    label: 'WATER DRAGON',
    desc: 'Mystic serpent',
    stageNames:  ['Egg', 'Tadrake', 'Aquilis', 'Hydrabane', 'Leviarus'],
    stageColors: [0xc5e8f9, 0x66ccdd, 0x4499bb, 0x2266aa, 0x66ccff],
    stagePulse:  [0xddf5ff, 0xaaeeff, 0x88ddee, 0x77aaff, 0xddffff],
    draw: drawWater,
  },
  {
    label: 'LION TURTLE',
    desc: 'Ancient guardian',
    stageNames:  ['Egg', 'Cubshell', 'Maneshield', 'Roarshell', 'Lion Turtle'],
    stageColors: [0xf0e0c4, 0xc8a878, 0xb8884a, 0x886a3a, 0x6a8a4a],
    stagePulse:  [0xfff0d0, 0xddc090, 0xddb070, 0xc09858, 0xaacc77],
    draw: drawLion,
  },
]

function sp() { return SPECIES[G.species] }
function drawCreature(g: any, stage: number, x: number, y: number) { sp().draw(g, stage, x, y) }

// ─── PickScene — choose your companion ────────────────────────────────────────
function createPickScene(Phaser: any) {
  return class PickScene extends Phaser.Scene {
    constructor() { super('PickScene') }

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

        // Sprite preview (stage 1 of this species)
        const g = this.add.graphics()
        s.draw(g, 1, cx, cardY - 38)

        // Subtle floating animation per card
        this.tweens.add({ targets: g, y: -4, duration: 1500 + idx * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

        // Name
        this.add.text(cx, cardY + 32, s.label, { fontSize: '11px', color: '#eeeeff', fontStyle: 'bold', letterSpacing: 1 }).setOrigin(0.5)
        this.add.text(cx, cardY + 48, s.desc, { fontSize: '8px', color: '#99aacc' }).setOrigin(0.5)

        // Final-form preview text
        this.add.text(cx, cardY + 68, '→ ' + s.stageNames[4], { fontSize: '8px', color: '#ffdd66', fontStyle: 'italic' }).setOrigin(0.5)

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

// ─── HomeScene ────────────────────────────────────────────────────────────────
function createHomeScene(Phaser: any) {
  return class HomeScene extends Phaser.Scene {
    private t = 0
    private bars: Record<string, any> = {}
    private cGfx: any
    private cX = 0; private cY = 0
    private aTxt: any
    private nTxt: any; private sTxt: any; private lTxt: any
    private atkTxt: any; private defTxt: any; private spdTxt: any; private winTxt: any

    constructor() { super('HomeScene') }

    create() {
      this.t = 0
      this.add.rectangle(W / 2, H / 2, W, H, 0x0d1a2e)
      for (let i = 0; i < 10; i++) {
        const p = this.add.circle(
          Phaser.Math.Between(0, W - 120), Phaser.Math.Between(H * 0.3, H * 0.9),
          Phaser.Math.Between(1, 3), sp().stageColors[G.stage], 0.22
        )
        this.tweens.add({ targets: p, y: p.y - Phaser.Math.Between(30, 70), alpha: 0, duration: Phaser.Math.Between(2000, 4000), repeat: -1, repeatDelay: Phaser.Math.Between(0, 2000) })
      }
      this.add.rectangle(W / 2, H - 20, W, 40, 0x0a1828)
      this.add.rectangle(W / 2, H - 40, W, 3, 0x112233)

      const px = W - 112
      this.add.rectangle(px + 46, H / 2, 114, H, 0x080f1a).setStrokeStyle(1, 0x1a3a5a)
      this.nTxt = this.add.text(px + 46, 15, G.name, { fontSize: '12px', color: '#eeeeff', fontStyle: 'bold' }).setOrigin(0.5)
      this.sTxt = this.add.text(px + 46, 29, 'Stage ' + G.stage, { fontSize: '8px', color: '#7788aa', letterSpacing: 1 }).setOrigin(0.5)
      this.lTxt = this.add.text(px + 46, 41, 'Lv.' + G.level, { fontSize: '8px', color: '#aaaacc' }).setOrigin(0.5)
      this.add.rectangle(px + 46, 51, 90, 1, 0x1a3050)

      this.mkBar(px, 61, 'HP', 0x44ff88)
      this.mkBar(px, 79, 'HUNGER', 0xff9944)
      this.mkBar(px, 97, 'HAPPY', 0xff44bb)
      this.mkBar(px, 115, 'XP', 0x44aaff)
      this.add.rectangle(px + 46, 131, 90, 1, 0x1a3050)

      this.atkTxt = this.add.text(px + 2, 137, 'ATK: ' + G.atk, { fontSize: '8px', color: '#ff7755' })
      this.defTxt = this.add.text(px + 2, 149, 'DEF: ' + G.def, { fontSize: '8px', color: '#55aaff' })
      this.spdTxt = this.add.text(px + 2, 161, 'SPD: ' + G.spd, { fontSize: '8px', color: '#55ff99' })
      this.winTxt = this.add.text(px + 2, 173, 'WINS: ' + G.wins, { fontSize: '8px', color: '#ffdd55' })
      this.add.rectangle(px + 46, 186, 90, 1, 0x1a3050)

      this.mkBtn(px + 46, 200, 'Feed',    0x0d3322, 0x44ff88, () => this.feed())
      this.mkBtn(px + 46, 220, 'Rest',    0x33220d, 0xffaa55, () => this.rest())
      this.mkBtn(px + 46, 240, 'Train',   0x0d1a33, 0x44aaff, () => this.train())
      this.mkBtn(px + 46, 260, 'Explore', 0x1a0d33, 0xaa44ff, () => this.scene.start('WorldScene'))
      this.mkBtn(px + 46, 280, 'Info',    0x1a1a0a, 0xffdd44, () => this.showInfo())

      // Music toggle
      const mb = this.add.rectangle(px + 46, H - 8, 96, 12, 0x0a1020, 0.9).setInteractive({ useHandCursor: true }).setStrokeStyle(1, 0x445566)
      const mt = this.add.text(px + 46, H - 8, theme.isMuted ? '♪ MUSIC: OFF' : '♪ MUSIC: ON', { fontSize: '7px', color: theme.isMuted ? '#778899' : '#aaccee', letterSpacing: 1 }).setOrigin(0.5)
      mb.on('pointerdown', () => {
        theme.toggleMute()
        mt.setText(theme.isMuted ? '♪ MUSIC: OFF' : '♪ MUSIC: ON')
        mt.setColor(theme.isMuted ? '#778899' : '#aaccee')
      })

      this.cX = (W - 114) / 2; this.cY = H / 2 - 10
      this.cGfx = this.add.graphics()
      this.drawC()

      this.aTxt = this.add.text(this.cX, H - 65, '', { fontSize: '10px', color: '#ffdd55' }).setOrigin(0.5).setAlpha(0)

      if (G.stage < 4 && G.xp >= G.xpNeeded[G.stage]) this.time.delayedCall(300, () => this.evolve())
    }

    mkBar(x: number, y: number, label: string, color: number) {
      this.add.text(x + 2, y, label, { fontSize: '7px', color: '#5566aa', letterSpacing: 1 })
      this.add.rectangle(x + 47, y + 9, 82, 6, 0x0a1528).setOrigin(0.5)
      const f = this.add.rectangle(x + 6, y + 9, 0, 4, color).setOrigin(0, 0.5)
      this.bars[label] = { f, mw: 80 }
      this.updBar(label)
    }

    updBar(k: string) {
      const b = this.bars[k]; if (!b) return
      let p = 0
      if (k === 'HP')     p = G.hp / G.maxHp
      if (k === 'HUNGER') p = G.hunger / 100
      if (k === 'HAPPY')  p = G.happy / 100
      if (k === 'XP')     p = G.stage < 4 ? G.xp / G.xpNeeded[G.stage] : 1
      b.f.width = Math.max(0, p) * b.mw
    }

    updAll() {
      ;['HP', 'HUNGER', 'HAPPY', 'XP'].forEach(k => this.updBar(k))
      this.nTxt.setText(G.name)
      this.sTxt.setText('Stage ' + G.stage)
      this.lTxt.setText('Lv.' + G.level)
      this.atkTxt.setText('ATK: ' + G.atk)
      this.defTxt.setText('DEF: ' + G.def)
      this.spdTxt.setText('SPD: ' + G.spd)
      this.winTxt.setText('WINS: ' + G.wins)
    }

    mkBtn(x: number, y: number, label: string, bg: number, col: number, cb: () => void) {
      const b = this.add.rectangle(x, y, 96, 19, bg).setInteractive({ useHandCursor: true }).setStrokeStyle(1, col)
      this.add.text(x, y, label, { fontSize: '9px', color: '#' + col.toString(16).padStart(6, '0') }).setOrigin(0.5)
      b.on('pointerover', () => b.setAlpha(1.4))
      b.on('pointerout',  () => b.setAlpha(1))
      b.on('pointerdown', cb)
    }

    drawC() { drawCreature(this.cGfx, G.stage, this.cX, this.cY) }

    feed() {
      if (G.hunger >= 100) { this.msg('Already full!'); return }
      G.hunger = Math.min(100, G.hunger + 20); G.hp = Math.min(G.maxHp, G.hp + 2); G.xp += 2
      this.msg('+20 Hunger  +2 HP')
      this.updAll()
      this.tweens.add({ targets: this.cGfx, y: -8, duration: 200, yoyo: true, ease: 'Back.easeOut' })
      this.chkEvo()
    }

    train() {
      if (G.hunger <= 10) { this.msg('Too hungry to train!'); return }
      G.hunger = Math.max(0, G.hunger - 10); G.xp += 10; G.happy = Math.min(100, G.happy + 5)
      let line = '+10 XP  -10 Hunger'
      // 25% chance: training also strengthens the body, raising maxHP
      if (Math.random() < 0.25) {
        G.maxHp += 1; G.hp = Math.min(G.maxHp, G.hp + 1)
        line = '+10 XP  +1 MAX HP!'
      }
      this.msg(line)
      this.updAll()
      this.tweens.add({ targets: this.cGfx, y: -28, duration: 280, yoyo: true, ease: 'Quad.easeOut' })
      this.chkEvo()
    }

    rest() {
      if (G.hp >= G.maxHp) { this.msg('Already at full HP!'); return }
      if (G.hunger < 25)   { this.msg('Too hungry to rest!'); return }
      G.hunger = Math.max(0, G.hunger - 25)
      G.hp = G.maxHp
      G.happy = Math.min(100, G.happy + 5)
      this.msg('Fully rested  HP restored')
      this.updAll()
      this.tweens.add({ targets: this.cGfx, alpha: 0.4, duration: 320, yoyo: true, repeat: 1 })
    }

    showInfo() {
      const info = `${G.name}  |  Stage ${G.stage}  |  Lv.${G.level}\nHP:${G.hp}/${G.maxHp}   ATK:${G.atk}   DEF:${G.def}   SPD:${G.spd}\nWins: ${G.wins}   XP: ${G.xp}/${G.xpNeeded[G.stage]}`
      const bg = this.add.rectangle(this.cX, this.cY, 240, 80, 0x0a1020, 0.95).setStrokeStyle(1, 0x4466aa)
      const t  = this.add.text(this.cX, this.cY, info, { fontSize: '9px', color: '#ccdeff', align: 'center' }).setOrigin(0.5)
      this.time.delayedCall(2500, () => { bg.destroy(); t.destroy() })
    }

    chkEvo() { if (G.stage < 4 && G.xp >= G.xpNeeded[G.stage]) this.time.delayedCall(400, () => this.evolve()) }

    evolve() {
      if (G.stage >= 4) return
      G.stage++; G.name = sp().stageNames[G.stage]; G.xp = 0
      G.maxHp += 15; G.hp = G.maxHp; G.atk += 4; G.def += 3; G.spd += 2; G.level++
      this.cameras.main.flash(700, 255, 200, 100)
      this.cameras.main.shake(400, 0.015)
      const et = this.add.text(this.cX, this.cY - 55, 'EVOLVED!\n' + G.name, { fontSize: '13px', color: '#ffdd44', align: 'center', fontStyle: 'bold' }).setOrigin(0.5)
      this.tweens.add({ targets: et, y: et.y - 36, alpha: 0, duration: 2000, onComplete: () => et.destroy() })
      this.drawC(); this.updAll()
    }

    msg(txt: string) {
      this.aTxt.setText(txt).setAlpha(1)
      this.aTxt.y = H - 65
      this.tweens.add({ targets: this.aTxt, y: H - 85, alpha: 0, duration: 1400, onComplete: () => { this.aTxt.setAlpha(0); this.aTxt.y = H - 65 } })
    }

    update(time: number, dt: number) {
      this.t += dt * 0.002
      this.cGfx.y = Math.sin(this.t * 2) * 5
      if (time - G.lastFed > 7000) { G.hunger = Math.max(0, G.hunger - 0.5); G.lastFed = time; this.updBar('HUNGER') }
    }
  }
}

// ─── WorldScene ───────────────────────────────────────────────────────────────
function createWorldScene(Phaser: any) {
  return class WorldScene extends Phaser.Scene {
    private TS = 24; private COLS = 20; private ROWS = 15
    private map: number[][] = []
    private pC = 10; private pR = 8
    private camX = 0; private camY = 0
    private mvDelay = 0; private eCd = 0
    private mG: any; private pG: any
    private hpT: any
    private cursors: any; private wasd: any; private escK: any

    constructor() { super('WorldScene') }

    create(data: any) {
      this.map = this.mkMap()
      this.pC = 10; this.pR = 8; this.camX = 0; this.camY = 0
      this.mvDelay = 0; this.eCd = 0

      this.mG = this.add.graphics()
      this.pG = this.add.graphics()
      this.redraw()

      // Top bar
      this.add.rectangle(W / 2, 14, W, 28, 0x080810, 0.93).setDepth(5)
      this.add.text(10, 6, 'OVERWORLD', { fontSize: '8px', color: '#7788aa', letterSpacing: 3 }).setDepth(6)
      this.hpT = this.add.text(W / 2, 7, 'HP:' + G.hp + '/' + G.maxHp, { fontSize: '9px', color: '#44ff88' }).setOrigin(0.5, 0).setDepth(6)
      this.add.text(W / 2, 18, G.name, { fontSize: '8px', color: '#9999cc' }).setOrigin(0.5, 0).setDepth(6)

      // HOME button (clickable, replaces small ESC hint)
      const homeBg = this.add.rectangle(W - 38, 14, 64, 18, 0x1a3344, 0.95).setInteractive({ useHandCursor: true }).setStrokeStyle(1, 0x55aaff).setDepth(6)
      this.add.text(W - 38, 14, '← HOME', { fontSize: '9px', color: '#aaccff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(7)
      homeBg.on('pointerover', () => homeBg.setStrokeStyle(2, 0x88ccff))
      homeBg.on('pointerout',  () => homeBg.setStrokeStyle(1, 0x55aaff))
      homeBg.on('pointerdown', () => this.scene.start('HomeScene'))

      // Bottom bar
      this.add.rectangle(W / 2, H - 14, W, 28, 0x080810, 0.9).setDepth(5)
      this.add.text(8, H - 22, 'WASD/Arrows to move   ESC or HOME to return', { fontSize: '7px', color: '#556677' }).setDepth(6)
      this.add.text(W - 8, H - 22, 'Grass=Wild  Forest=Hard  Red=Boss', { fontSize: '7px', color: '#774455' }).setOrigin(1, 0).setDepth(6)

      this.cursors = this.input.keyboard.createCursorKeys()
      this.wasd    = this.input.keyboard.addKeys('W,A,S,D')
      this.escK    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)

      this.input.on('pointerdown', (ptr: any) => {
        if (ptr.y < 28 || ptr.y > H - 28) return
        const wC = Math.floor((ptr.x + this.camX) / this.TS)
        const wR = Math.floor((ptr.y - 28 + this.camY) / this.TS)
        this.moveToward(wC, wR)
      })

      if (data?.result) {
        const color = data.result === 'win' ? '#44ff88' : '#ff4444'
        const label = data.result === 'win' ? 'Victory!' : 'Defeated!'
        const rt = this.add.text(W / 2, H / 2, label, { fontSize: '15px', color, fontStyle: 'bold' }).setOrigin(0.5).setDepth(8)
        this.tweens.add({ targets: rt, y: rt.y - 40, alpha: 0, duration: 2000, onComplete: () => rt.destroy() })
      }
    }

    mkMap() {
      const m: number[][] = []
      for (let r = 0; r < this.ROWS; r++) { m[r] = []; for (let c = 0; c < this.COLS; c++) m[r][c] = 0 }
      for (let c = 0; c < this.COLS; c++) { m[7][c] = 1; m[8][c] = 1 }
      for (let r = 0; r < this.ROWS; r++) { m[r][9] = 1; m[r][10] = 1 }
      for (let r = 1; r < 5; r++)  for (let c = 1;  c < 5;  c++) m[r][c] = 2
      for (let r = 1; r < 7; r++)  for (let c = 15; c < 19; c++) m[r][c] = 3
      for (let r = 10; r < 14; r++) for (let c = 2;  c < 7;  c++) m[r][c] = 4
      for (let r = 9;  r < 13; r++) for (let c = 16; c < 19; c++) m[r][c] = 5
      for (let c = 0; c < this.COLS; c++) { m[0][c] = 4; m[this.ROWS - 1][c] = 4 }
      for (let r = 0; r < this.ROWS; r++) { m[r][0] = 4; m[r][this.COLS - 1] = 4 }
      return m
    }

    tc(t: number) { return [0x1f5028, 0x9c7a1c, 0x1d3e72, 0x0d3322, 0x4a3a2a, 0x2a0022][t] || 0x1f5028 }

    redraw() { this.drawMap(); this.drawPlayer() }

    drawMap() {
      const g = this.mG; g.clear()
      for (let r = 0; r < this.ROWS; r++) for (let c = 0; c < this.COLS; c++) {
        const t = this.map[r][c]
        const wx = c * this.TS - this.camX
        const wy = r * this.TS - this.camY + 28
        const seed = (r * 31 + c * 17) % 11

        // Base
        g.fillStyle(this.tc(t)); g.fillRect(wx, wy, this.TS - 1, this.TS - 1)

        if (t === 0) {
          // Grass — base shade variation, tufts, occasional flowers
          g.fillStyle(0x2a6b34, 0.45 + (seed % 3) * 0.08); g.fillRect(wx, wy, this.TS - 1, this.TS - 1)
          // tufts
          g.fillStyle(0x44aa44, 0.55)
          g.fillTriangle(wx + 4, wy + 9, wx + 5, wy + 4, wx + 6, wy + 9)
          g.fillTriangle(wx + 11, wy + 13, wx + 12, wy + 9, wx + 13, wy + 13)
          g.fillStyle(0x66cc55, 0.45)
          g.fillRect(wx + 16, wy + 6, 1, 4); g.fillRect(wx + 18, wy + 7, 1, 3)
          // sparse flowers
          if (seed === 0) {
            g.fillStyle(0xff6688); g.fillCircle(wx + 14, wy + 14, 1.6)
            g.fillStyle(0xffdd44); g.fillCircle(wx + 14, wy + 14, 0.7)
          } else if (seed === 3) {
            g.fillStyle(0xeebb44); g.fillCircle(wx + 6, wy + 16, 1.6)
            g.fillStyle(0xffeebb); g.fillCircle(wx + 6, wy + 16, 0.7)
          } else if (seed === 7) {
            g.fillStyle(0x88aaff); g.fillCircle(wx + 17, wy + 17, 1.4)
          }
        } else if (t === 1) {
          // Path/dirt — speckled, slightly darker edges
          g.fillStyle(0x5a3e10, 0.55); g.fillRect(wx + 3, wy + 4, 2, 2)
          g.fillStyle(0x5a3e10, 0.55); g.fillRect(wx + 16, wy + 9, 2, 2)
          g.fillStyle(0x5a3e10, 0.55); g.fillRect(wx + 8, wy + 17, 2, 2)
          g.fillStyle(0xb89544, 0.4); g.fillRect(wx + 12, wy + 6, 1, 1)
          g.fillStyle(0xb89544, 0.4); g.fillRect(wx + 5, wy + 12, 1, 1)
          g.fillStyle(0x6a4818, 0.3); g.fillRect(wx, wy, this.TS - 1, 2) // top edge
          g.fillStyle(0x6a4818, 0.3); g.fillRect(wx, wy + this.TS - 3, this.TS - 1, 2)
        } else if (t === 2) {
          // Water — wave bands + sparkle
          g.fillStyle(0x2a5a9a, 0.45); g.fillRect(wx + 1, wy + 3, this.TS - 3, 3)
          g.fillStyle(0x4477bb, 0.5);  g.fillRect(wx + 2, wy + 10, this.TS - 5, 2)
          g.fillStyle(0x6699cc, 0.5);  g.fillRect(wx + 4, wy + 17, this.TS - 8, 2)
          if (seed % 4 === 0) { g.fillStyle(0xddeeff, 0.7); g.fillCircle(wx + 6, wy + 8, 1) }
          if (seed % 3 === 1) { g.fillStyle(0xddeeff, 0.5); g.fillCircle(wx + 16, wy + 14, 0.8) }
        } else if (t === 3) {
          // Forest — tree with trunk and layered canopy
          // Ground hint
          g.fillStyle(0x1a4422, 0.6); g.fillRect(wx, wy + this.TS - 6, this.TS - 1, 5)
          // trunk
          g.fillStyle(0x3a200a); g.fillRect(wx + 10, wy + 13, 4, 9)
          g.fillStyle(0x553a18, 0.6); g.fillRect(wx + 11, wy + 13, 1, 9)
          // canopy
          g.fillStyle(0x0a2218, 0.95); g.fillCircle(wx + 8, wy + 8, 8)
          g.fillStyle(0x0a2218, 0.95); g.fillCircle(wx + 16, wy + 10, 6)
          g.fillStyle(0x1a4422, 0.85); g.fillCircle(wx + 9, wy + 6, 5)
          g.fillStyle(0x2a5532, 0.7); g.fillCircle(wx + 11, wy + 5, 3)
          g.fillStyle(0x4a6638, 0.5); g.fillCircle(wx + 10, wy + 4, 1.5)
        } else if (t === 4) {
          // Rock/mountain — shaded with peak highlight + cracks
          g.fillStyle(0x6a5a4a, 0.85); g.fillTriangle(wx + 3, wy + this.TS - 2, wx + 11, wy + 3, wx + 20, wy + this.TS - 2)
          g.fillStyle(0x8a7a6a, 0.5); g.fillTriangle(wx + 6, wy + this.TS - 4, wx + 11, wy + 5, wx + 13, wy + this.TS - 4)
          g.fillStyle(0xaaaaaa, 0.4); g.fillTriangle(wx + 9, wy + 8, wx + 11, wy + 4, wx + 12, wy + 8)
          // cracks
          g.lineStyle(1, 0x2a201a, 0.6)
          g.beginPath(); g.moveTo(wx + 8, wy + 14); g.lineTo(wx + 12, wy + 18); g.strokePath()
        } else if (t === 5) {
          // Boss zone — ominous, glowing cracks
          g.fillStyle(0xaa0033, 0.45); g.fillRect(wx, wy, this.TS - 1, this.TS - 1)
          g.fillStyle(0xff0044, 0.18); g.fillRect(wx + 2, wy + 2, this.TS - 5, this.TS - 5)
          g.lineStyle(1, 0xff3366, 0.65)
          g.beginPath(); g.moveTo(wx + 3, wy + 6); g.lineTo(wx + 9, wy + 12); g.lineTo(wx + 14, wy + 18); g.strokePath()
          g.beginPath(); g.moveTo(wx + 17, wy + 4); g.lineTo(wx + 12, wy + 11); g.strokePath()
          g.fillStyle(0xffaa44, 0.45); g.fillCircle(wx + 9, wy + 12, 1.6)
          if (seed % 2 === 0) { g.fillStyle(0xffdd66, 0.4); g.fillCircle(wx + 16, wy + 16, 1) }
        }
      }
    }

    drawPlayer() {
      const g = this.pG; g.clear()
      const wx = this.pC * this.TS - this.camX + this.TS / 2
      const wy = this.pR * this.TS - this.camY + 28 + this.TS / 2
      g.fillStyle(0x000000, 0.25); g.fillEllipse(wx, wy + 10, 22, 6)
      // Mini dino sprite (matches current stage color)
      g.fillStyle(sp().stageColors[G.stage]); g.fillCircle(wx, wy - 1, 9)
      // Snout hint
      g.fillStyle(sp().stageColors[G.stage]); g.fillEllipse(wx + 5, wy + 1, 8, 5)
      g.fillStyle(0x1a1a3a); g.fillCircle(wx - 2, wy - 3, 2); g.fillCircle(wx + 3, wy - 3, 2)
      g.fillStyle(0xffffff); g.fillCircle(wx - 1, wy - 4, 0.7); g.fillCircle(wx + 4, wy - 4, 0.7)
      // Highlight ring
      g.lineStyle(2, 0xffffff, 0.45); g.strokeCircle(wx, wy - 1, 12)
    }

    moveToward(tc: number, tr: number) {
      const dc = Math.sign(tc - this.pC), dr = Math.sign(tr - this.pR)
      if (Math.abs(tc - this.pC) >= Math.abs(tr - this.pR)) this.tryMove(this.pC + dc, this.pR)
      else this.tryMove(this.pC, this.pR + dr)
    }

    tryMove(nc: number, nr: number) {
      if (nc < 0 || nc >= this.COLS || nr < 0 || nr >= this.ROWS) return
      const t = this.map[nr][nc]
      if (t === 2 || t === 4) return
      this.pC = nc; this.pR = nr
      this.camX = Phaser.Math.Clamp(this.pC * this.TS - W / 2 + this.TS / 2, 0, this.COLS * this.TS - W)
      this.camY = Phaser.Math.Clamp(this.pR * this.TS - H / 2 + this.TS / 2, 0, this.ROWS * this.TS - H + 28)
      this.redraw()
      this.chkEnc(t)
    }

    chkEnc(t: number) {
      if (this.eCd-- > 0) return
      let ch = 0, boss = false
      if (t === 0) ch = 20
      else if (t === 3) ch = 40
      else if (t === 5) { ch = 75; boss = true }
      if (Phaser.Math.Between(1, 100) <= ch) {
        this.eCd = 3
        this.cameras.main.flash(280, 255, 255, 255)
        this.time.delayedCall(280, () => this.scene.start('BattleScene', { isBoss: boss, fromWorld: true }))
      }
    }

    update(_: number, dt: number) {
      this.mvDelay -= dt
      if (Phaser.Input.Keyboard.JustDown(this.escK)) { this.scene.start('HomeScene'); return }
      if (this.mvDelay > 0) return
      let mv = false
      if      (this.cursors.left.isDown  || this.wasd.A.isDown) { this.tryMove(this.pC - 1, this.pR); mv = true }
      else if (this.cursors.right.isDown || this.wasd.D.isDown) { this.tryMove(this.pC + 1, this.pR); mv = true }
      else if (this.cursors.up.isDown    || this.wasd.W.isDown) { this.tryMove(this.pC, this.pR - 1); mv = true }
      else if (this.cursors.down.isDown  || this.wasd.S.isDown) { this.tryMove(this.pC, this.pR + 1); mv = true }
      if (mv) this.mvDelay = 150
      this.hpT.setText('HP:' + G.hp + '/' + G.maxHp)
    }
  }
}

// ─── BattleScene ──────────────────────────────────────────────────────────────
function createBattleScene(Phaser: any) {
  return class BattleScene extends Phaser.Scene {
    private isBoss = false; private fromWorld = false
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

      this.eX = W * 0.72; this.eY = H * 0.38
      this.eGfx = this.add.graphics()
      drawCreature(this.eGfx, this.enemy.stage, this.eX, this.eY)
      this.eGfx.setScale(-1, 1); this.eGfx.x = this.eX * 2

      this.add.text(this.eX, H * 0.14, this.enemy.name, { fontSize: '11px', color: '#ffaaaa', fontStyle: 'bold' }).setOrigin(0.5)
      this.add.text(this.eX, H * 0.21, this.isBoss ? 'BOSS' : 'Lv.' + this.enemy.level, { fontSize: '8px', color: this.isBoss ? '#ff4488' : '#aaaaaa' }).setOrigin(0.5)
      this.add.rectangle(this.eX, H * 0.285, 102, 10, 0x2a0000)
      this.eHpF = this.add.rectangle(this.eX - 51, H * 0.285, 100, 8, 0xff4444).setOrigin(0, 0.5)
      this.eHpT = this.add.text(this.eX, H * 0.285, '' + this.enemy.hp + '/' + this.enemy.maxHp, { fontSize: '7px', color: '#fff' }).setOrigin(0.5)

      this.pX = W * 0.28; this.pY = H * 0.52
      this.pGfx = this.add.graphics()
      drawCreature(this.pGfx, G.stage, this.pX, this.pY)

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
      const s = this.isBoss ? Math.min(4, G.stage + 1) : Math.max(1, G.stage - 1 + Phaser.Math.Between(0, 2))
      const wn = ['Sharptooth', 'Crestrunner', 'Spinejaw', 'Clawfoot', 'Frillback', 'Marshcreeper']
      const bn = ['VORAX', 'TITANEX', 'NECROSAUR', 'SHADOWFANG']
      const name = this.isBoss ? bn[Phaser.Math.Between(0, bn.length - 1)] : wn[Phaser.Math.Between(0, wn.length - 1)]
      const hp = Math.floor((14 + s * 12) * (this.isBoss ? 2.2 : 1))
      return { name, stage: s, hp, maxHp: hp, atk: (3 + s * 3) * (this.isBoss ? 1.6 : 1), def: 2 + s * 2, spd: 3 + s, level: G.level + (this.isBoss ? 2 : Phaser.Math.Between(-1, 1)) }
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
      return Math.max(1, Math.floor((sp ? atk * 1.5 : atk) - def * 0.4) * (0.85 + Math.random() * 0.3))
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
      this.tweens.add({ targets: this.pGfx, x: 40, duration: 180, ease: 'Power2', yoyo: true })
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
      if (result === 'win') {
        const xp = this.isBoss ? 55 : Phaser.Math.Between(8, 20)
        G.xp += xp; G.wins++; G.happy = Math.min(100, G.happy + 10)
        G.hp = Math.min(G.maxHp, G.hp + Math.floor(G.maxHp * 0.1))
        this.cameras.main.flash(600, 255, 210, 50)
        this.setLog('Victory! +' + xp + ' XP', this.isBoss ? 'Boss defeated!' : '')
        if (G.stage < 4 && G.xp >= G.xpNeeded[G.stage]) {
          G.stage++; G.name = sp().stageNames[G.stage]; G.xp = 0
          G.maxHp += 15; G.hp = G.maxHp; G.atk += 4; G.def += 3; G.spd += 2; G.level++
          this.time.delayedCall(500, () => this.setLog('EVOLVED into ' + G.name + '!', 'Stats increased!'))
        }
      } else if (result === 'lose') {
        G.happy = Math.max(0, G.happy - 20); G.hp = Math.floor(G.maxHp * 0.3)
        this.cameras.main.flash(600, 255, 0, 0)
        this.setLog('Defeated...', 'Recovered with ' + G.hp + ' HP. Returned home.')
      } else {
        this.setLog('Escaped safely!')
      }
      this.time.delayedCall(2000, () =>
        this.fromWorld ? this.scene.start('WorldScene', { result }) : this.scene.start('HomeScene')
      )
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
        ],
        scale: {
          mode:       Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
      })

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
