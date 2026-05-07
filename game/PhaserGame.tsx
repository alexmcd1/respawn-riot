'use client'
import { useEffect, useRef } from 'react'

// ─── Shared game state ────────────────────────────────────────────────────────
const G: any = {
  stage: 0,
  name: '???',
  hp: 20, maxHp: 20,
  atk: 5, def: 3, spd: 4,
  hunger: 80, happy: 80,
  xp: 0,
  xpNeeded: [30, 100, 250, 500, 9999999],
  level: 1, wins: 0, lastFed: 0,
  stageNames: ['Egg', 'Lumling', 'Lumora', 'Lumorex', 'Lumaxis'],
  stageColors: [0xd4c5f9, 0x88d8ff, 0x44aaff, 0x4466cc, 0xaa44ff],
  stagePulse:  [0xeeeeff, 0xaaddff, 0x66bbff, 0x6688ff, 0xcc66ff],
}

const W = 480, H = 320

// ─── Creature drawing ─────────────────────────────────────────────────────────
function drawCreature(g: any, stage: number, x: number, y: number) {
  const c = G.stageColors[stage]
  const p = G.stagePulse[stage]
  g.clear()

  if (stage === 0) {
    g.fillStyle(0x000000, 0.18); g.fillEllipse(x, y + 22, 30, 8)
    g.fillStyle(0xeeeeff);       g.fillEllipse(x, y, 30, 38)
    g.fillStyle(0xffffff, 0.55); g.fillEllipse(x - 6, y - 8, 10, 14)
    g.fillStyle(c, 0.5)
    g.fillCircle(x + 4, y + 4, 4); g.fillCircle(x - 6, y + 8, 3); g.fillCircle(x + 2, y - 4, 2)

  } else if (stage === 1) {
    g.fillStyle(0x000000, 0.15); g.fillEllipse(x, y + 20, 28, 7)
    g.fillStyle(c)
    g.fillCircle(x, y + 4, 16); g.fillCircle(x - 10, y - 6, 7); g.fillCircle(x + 10, y - 6, 7)
    g.fillStyle(p); g.fillCircle(x - 10, y - 6, 4); g.fillCircle(x + 10, y - 6, 4)
    g.fillStyle(0x1a1a3a); g.fillCircle(x - 6, y + 2, 5); g.fillCircle(x + 6, y + 2, 5)
    g.fillStyle(0xffffff); g.fillCircle(x - 4, y, 2); g.fillCircle(x + 8, y, 2)
    g.fillStyle(0xff88bb, 0.4); g.fillCircle(x - 10, y + 6, 4); g.fillCircle(x + 10, y + 6, 4)
    g.fillStyle(0x1a1a3a); g.fillRoundedRect(x - 4, y + 9, 8, 3, 2)

  } else if (stage === 2) {
    g.fillStyle(0x000000, 0.15); g.fillEllipse(x, y + 26, 34, 8)
    g.fillStyle(c)
    g.fillTriangle(x + 14, y + 10, x + 8, y + 18, x + 22, y + 20)
    g.fillRoundedRect(x - 14, y - 10, 28, 32, 10)
    g.fillCircle(x, y - 8, 14)
    g.fillTriangle(x - 14, y - 12, x - 8, y - 22, x - 2, y - 12)
    g.fillTriangle(x + 14, y - 12, x + 8, y - 22, x + 2, y - 12)
    g.fillStyle(p)
    g.fillTriangle(x - 12, y - 12, x - 8, y - 20, x - 3, y - 12)
    g.fillTriangle(x + 12, y - 12, x + 8, y - 20, x + 3, y - 12)
    g.fillStyle(0x1a1a3a); g.fillCircle(x - 5, y - 10, 5); g.fillCircle(x + 5, y - 10, 5)
    g.fillStyle(0xffffff); g.fillCircle(x - 3, y - 12, 2); g.fillCircle(x + 7, y - 12, 2)
    g.fillStyle(p, 0.5); g.fillEllipse(x, y + 6, 16, 18)
    g.fillStyle(c)
    g.fillRoundedRect(x - 10, y + 18, 7, 10, 3); g.fillRoundedRect(x + 3, y + 18, 7, 10, 3)

  } else if (stage === 3) {
    g.fillStyle(0x000000, 0.15); g.fillEllipse(x, y + 32, 44, 10)
    g.fillStyle(c, 0.55)
    g.fillTriangle(x - 16, y, x - 32, y - 16, x - 12, y + 8)
    g.fillTriangle(x + 16, y, x + 32, y - 16, x + 12, y + 8)
    g.fillStyle(c)
    g.fillRoundedRect(x - 16, y - 14, 32, 40, 12); g.fillCircle(x, y - 12, 16)
    g.fillStyle(p); g.fillTriangle(x - 6, y - 24, x, y - 30, x + 6, y - 24)
    g.fillStyle(0x1a1a3a); g.fillEllipse(x - 7, y - 14, 10, 8); g.fillEllipse(x + 7, y - 14, 10, 8)
    g.fillStyle(p); g.fillEllipse(x - 7, y - 14, 6, 5); g.fillEllipse(x + 7, y - 14, 6, 5)
    g.fillStyle(0xffffff); g.fillCircle(x - 5, y - 16, 2); g.fillCircle(x + 9, y - 16, 2)
    g.fillStyle(p, 0.4); g.fillRoundedRect(x - 8, y - 2, 16, 22, 6)
    g.fillStyle(c)
    g.fillRoundedRect(x - 14, y + 22, 9, 12, 4); g.fillRoundedRect(x + 5, y + 22, 9, 12, 4)
    g.fillStyle(0x222244); g.fillEllipse(x - 10, y + 34, 14, 6); g.fillEllipse(x + 10, y + 34, 14, 6)

  } else {
    g.fillStyle(c, 0.12); g.fillCircle(x, y, 54)
    g.fillStyle(c, 0.08); g.fillCircle(x, y, 66)
    g.fillStyle(c, 0.65)
    g.fillTriangle(x - 18, y - 10, x - 48, y - 38, x - 10, y + 16)
    g.fillTriangle(x + 18, y - 10, x + 48, y - 38, x + 10, y + 16)
    g.fillStyle(p, 0.45)
    g.fillTriangle(x - 18, y - 10, x - 38, y - 30, x - 12, y + 10)
    g.fillTriangle(x + 18, y - 10, x + 38, y - 30, x + 12, y + 10)
    g.fillStyle(c)
    g.fillRoundedRect(x - 18, y - 18, 36, 50, 14); g.fillCircle(x, y - 16, 20)
    g.fillStyle(0xffdd44)
    for (let i = -2; i <= 2; i++) g.fillTriangle(x + i * 8 - 4, y - 32, x + i * 8, y - 44, x + i * 8 + 4, y - 32)
    g.fillStyle(p); g.fillEllipse(x - 8, y - 18, 12, 10); g.fillEllipse(x + 8, y - 18, 12, 10)
    g.fillStyle(0xffffff); g.fillEllipse(x - 8, y - 18, 8, 7); g.fillEllipse(x + 8, y - 18, 8, 7)
    g.fillStyle(0x220044); g.fillCircle(x - 8, y - 18, 3); g.fillCircle(x + 8, y - 18, 3)
    g.fillStyle(p, 0.3); g.fillEllipse(x, y + 6, 22, 28)
    g.fillStyle(c)
    g.fillRoundedRect(x - 16, y + 28, 11, 14, 5); g.fillRoundedRect(x + 5, y + 28, 11, 14, 5)
    g.fillStyle(p); g.fillTriangle(x - 4, y + 42, x + 4, y + 42, x, y + 56)
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
          G.stage = 1; G.name = G.stageNames[1]
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
          Phaser.Math.Between(1, 3), G.stageColors[G.stage], 0.22
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

      this.mkBtn(px + 46, 206, 'Feed',    0x0d3322, 0x44ff88, () => this.feed())
      this.mkBtn(px + 46, 231, 'Train',   0x0d1a33, 0x44aaff, () => this.train())
      this.mkBtn(px + 46, 256, 'Explore', 0x1a0d33, 0xaa44ff, () => this.scene.start('WorldScene'))
      this.mkBtn(px + 46, 282, 'Info',    0x1a1a0a, 0xffdd44, () => this.showInfo())

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
      this.msg('+10 XP  -10 Hunger')
      this.updAll()
      this.tweens.add({ targets: this.cGfx, y: -28, duration: 280, yoyo: true, ease: 'Quad.easeOut' })
      this.chkEvo()
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
      G.stage++; G.name = G.stageNames[G.stage]; G.xp = 0
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

      this.add.rectangle(W / 2, 14, W, 28, 0x080810, 0.93)
      this.add.text(10, 6, 'OVERWORLD', { fontSize: '8px', color: '#7788aa', letterSpacing: 3 })
      this.hpT = this.add.text(W / 2, 7, 'HP:' + G.hp + '/' + G.maxHp, { fontSize: '9px', color: '#44ff88' }).setOrigin(0.5, 0)
      this.add.text(W - 8, 6, 'ESC=HOME  WASD/ARROWS', { fontSize: '7px', color: '#445566' }).setOrigin(1, 0)
      this.add.text(W / 2, 18, G.name, { fontSize: '8px', color: '#9999cc' }).setOrigin(0.5, 0)

      this.add.rectangle(W / 2, H - 14, W, 28, 0x080810, 0.9)
      this.add.text(8, H - 22, 'Grass=Encounters   Forest=Hard   Red Zone=Boss', { fontSize: '7px', color: '#556677' })

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
        const rt = this.add.text(W / 2, H / 2, label, { fontSize: '15px', color, fontStyle: 'bold' }).setOrigin(0.5)
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

    tc(t: number) { return [0x1a4422, 0x8B6914, 0x1a3a6a, 0x0d3322, 0x4a3a2a, 0x2a0022][t] || 0x1a4422 }

    redraw() { this.drawMap(); this.drawPlayer() }

    drawMap() {
      const g = this.mG; g.clear()
      for (let r = 0; r < this.ROWS; r++) for (let c = 0; c < this.COLS; c++) {
        const t = this.map[r][c]
        const wx = c * this.TS - this.camX
        const wy = r * this.TS - this.camY + 28
        g.fillStyle(this.tc(t)); g.fillRect(wx, wy, this.TS - 1, this.TS - 1)
        if (t === 0) { g.fillStyle(0x2a6633, 0.35); if ((r+c)%3===0) g.fillRect(wx+4,wy+4,2,5); if ((r+c)%5===0) g.fillRect(wx+11,wy+9,2,4) }
        else if (t === 2) { g.fillStyle(0x2a5a9a, 0.4); g.fillRect(wx+2, wy+(c%2)*5, this.TS-4, 3) }
        else if (t === 3) { g.fillStyle(0x0a2218, 0.65); g.fillCircle(wx+8,wy+7,7); g.fillCircle(wx+17,wy+9,5) }
        else if (t === 4) { g.fillStyle(0x6a5a4a, 0.5); g.fillTriangle(wx+4,wy+this.TS-2,wx+10,wy+4,wx+17,wy+this.TS-2) }
        else if (t === 5) { g.fillStyle(0xaa0033, 0.35); g.fillRect(wx,wy,this.TS-1,this.TS-1); g.fillStyle(0xff0044,0.15); g.fillRect(wx+2,wy+2,this.TS-5,this.TS-5) }
      }
    }

    drawPlayer() {
      const g = this.pG; g.clear()
      const wx = this.pC * this.TS - this.camX + this.TS / 2
      const wy = this.pR * this.TS - this.camY + 28 + this.TS / 2
      g.fillStyle(0x000000, 0.2); g.fillEllipse(wx, wy + 10, 20, 6)
      g.fillStyle(G.stageColors[G.stage]); g.fillCircle(wx, wy - 2, 10)
      g.fillStyle(0x1a1a3a); g.fillCircle(wx-3,wy-4,2.5); g.fillCircle(wx+3,wy-4,2.5)
      g.fillStyle(0xffffff); g.fillCircle(wx-2,wy-5,1); g.fillCircle(wx+4,wy-5,1)
      g.lineStyle(2, 0xffffff, 0.4); g.strokeCircle(wx, wy - 2, 12)
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
      const wn = ['Shadeling', 'Frostclaw', 'Emberwing', 'Stormfin', 'Crystaling', 'Nightshade']
      const bn = ['VORAX', 'TITAN X', 'NEXUS PRIME', 'SHADOW LORD']
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
          G.stage++; G.name = G.stageNames[G.stage]; G.xp = 0
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

    // Reset global state each mount so the game starts fresh
    Object.assign(G, {
      stage: 0, name: '???', hp: 20, maxHp: 20,
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
        scene: [
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
    })

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', maxWidth: 960, aspectRatio: '480/320' }}
    />
  )
}
