// Headless QA harness for the Phaser game.
// Run with: node scripts/qa-game.mjs
// Drives the deployed (or local) game in Chromium, takes screenshots of every
// scene, and dumps console errors to qa-screenshots/console.log.
//
// Set GAME_URL=http://localhost:3000/game to run against the local dev server.
// Defaults to https://respawnriot.io/game.

import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'qa-screenshots')
mkdirSync(OUT, { recursive: true })

const TARGET = process.env.GAME_URL || 'https://respawnriot.io/game'
const HEADLESS = process.env.HEADLESS !== 'false'  // default headless, set HEADLESS=false to watch

console.log(`QA target: ${TARGET}`)
console.log(`Headless:  ${HEADLESS}`)

const consoleLog = []
const browser = await chromium.launch({ headless: HEADLESS })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()

page.on('console', (msg) => {
  consoleLog.push(`[${msg.type()}] ${msg.text()}`)
})
page.on('pageerror', (err) => {
  consoleLog.push(`[pageerror] ${err.message}`)
})

// ─── Cross-route smoke test ───────────────────────────────────────────────
// Catches regressions from other agents shipping concurrent changes to the
// website. Any non-2xx response is logged and counted as a failure.
const SITE_BASE = new URL(TARGET).origin
const SMOKE_ROUTES = ['/', '/game', '/anime', '/pop-punk', '/gaming', '/orlando', '/quests']
console.log(`\n== Cross-route smoke test (${SITE_BASE}) ==`)
const smokeFailures = []
for (const route of SMOKE_ROUTES) {
  try {
    const res = await page.request.get(SITE_BASE + route, { timeout: 15000 })
    const ok = res.status() >= 200 && res.status() < 400
    console.log(`  ${ok ? '✓' : '✗'} ${route.padEnd(12)} ${res.status()}`)
    if (!ok) smokeFailures.push(`${route} → ${res.status()}`)
  } catch (e) {
    console.log(`  ✗ ${route.padEnd(12)} ERROR ${e.message}`)
    smokeFailures.push(`${route} → ${e.message}`)
  }
}
if (smokeFailures.length > 0) {
  console.log(`\n!! Smoke failures: ${smokeFailures.length}`)
  consoleLog.push('--- SMOKE FAILURES ---')
  consoleLog.push(...smokeFailures)
}

await page.goto(TARGET, { waitUntil: 'networkidle', timeout: 30000 })
// Wait for Phaser canvas
await page.waitForSelector('canvas', { timeout: 15000 })
await page.waitForTimeout(1500)  // let scene fully render

// Helper: click on a game-internal coordinate (480x320 logical).
async function clickGame(gx, gy) {
  const canvas = await page.locator('canvas').first()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('canvas has no bounding box')
  const px = box.x + (gx / 480) * box.width
  const py = box.y + (gy / 320) * box.height
  await page.mouse.click(px, py)
}

// Force keyboard focus to the page so that keydown events reach Phaser. After
// overlay scenes (Backpack, Codex) close, the canvas can lose focus and
// subsequent keyboard.down/up sequences silently no-op. Calling this fixes it.
async function focusCanvas() {
  await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (c) { c.tabIndex = 0; c.focus() }
    document.body.focus?.()
  })
}

// Walk in one direction for a fixed time. Refocuses canvas before sending keys.
async function walk(direction, durationMs) {
  await focusCanvas()
  const key = direction === 'left' ? 'ArrowLeft' : 'ArrowRight'
  await page.keyboard.down(key)
  await page.waitForTimeout(durationMs)
  await page.keyboard.up(key)
  await page.waitForTimeout(150)
}

async function press(key) {
  await focusCanvas()
  await page.keyboard.press(key)
}

// Spam ATTACK in BattleScene. Coordinates are the action panel buttons; if
// we're not in a battle the clicks land on empty sky and do nothing.
async function spamAttack(times = 6) {
  for (let i = 0; i < times; i++) {
    await clickGame(404, 125)  // ATTACK
    await page.waitForTimeout(2200)
  }
}

async function shot(name) {
  const path = join(OUT, name)
  // Capture just the canvas — full-page screenshots in headless Chromium can
  // miss WebGL pixels. Element screenshots use a different code path that
  // works reliably.
  const canvas = await page.locator('canvas').first()
  try {
    await canvas.screenshot({ path })
  } catch {
    await page.screenshot({ path, fullPage: false })
  }
  console.log(`  → ${name}`)
}

async function step(label, fn) {
  console.log(`\n== ${label} ==`)
  try { await fn() } catch (e) { console.log(`  FAILED: ${e.message}`) }
}

// ───────────────────────────────────────────────────────────────────────────
await step('01 Pick scene loaded', async () => {
  await shot('01-pick.png')
})

await step('02 Click DINO', async () => {
  // Picker card x positions: [80, 240, 400], y = H/2 + 18 = 178
  await clickGame(80, 178)
  await page.waitForTimeout(800)
  await shot('02-egg-initial.png')
})

await step('03 Hatch egg (10 clicks)', async () => {
  for (let i = 0; i < 10; i++) {
    await clickGame(240, 160)  // center of egg
    await page.waitForTimeout(120)
  }
  await page.waitForTimeout(2500)  // wait for hatch animation + scene transition
  await shot('03-hub.png')
})

// Movement budget: at speed 1.6 px/frame at 60 fps = ~96 px/sec.
// Zones: Fruit 50, Bag 150, Fidget 240, Bed 335, Door 435. Player starts at cX=100.

await step('04 Walk LEFT to Fruit Tree, eat', async () => {
  await walk('left', 900)   // 100 -> ~14 (clamp 20). Distance to fruit (50) = 30 ✓
  await shot('04a-near-tree.png')
  await press('Space')
  await page.waitForTimeout(900)
  await shot('04b-after-eat.png')
})

await step('05 Walk RIGHT to Punching Bag, train x3', async () => {
  await walk('right', 1500)  // 20 -> ~164. Distance to bag (150) = 14 ✓
  await shot('05a-at-bag.png')
  for (let i = 0; i < 3; i++) {
    await press('Space')
    await page.waitForTimeout(700)
  }
  await shot('05b-after-train.png')
})

await step('06 Walk RIGHT to Fidget Rings, play', async () => {
  await walk('right', 900)   // 164 -> 250. Distance to fidget (240) = 10 ✓
  await shot('06a-at-fidget.png')
  await press('Space')
  await page.waitForTimeout(900)
  await shot('06b-after-fidget.png')
})

await step('07 Walk RIGHT to Bed, sleep', async () => {
  await walk('right', 1100)  // 250 -> ~355. Distance to bed (335) = 20 ✓
  await shot('07a-at-bed.png')
  await press('Space')
  await page.waitForTimeout(2000)  // sleep fade out + in
  await shot('07b-after-sleep.png')
})

await step('08 Open Codex (C)', async () => {
  await press('c')
  await page.waitForTimeout(800)
  await shot('08-codex.png')
  await press('Escape')
  await page.waitForTimeout(500)
})

await step('09 Open Bag (B)', async () => {
  await press('b')
  await page.waitForTimeout(800)
  await shot('09-bag.png')
  await press('Escape')
  await page.waitForTimeout(500)
})

await step('10 Walk to Doorway, enter overworld', async () => {
  await walk('right', 1100)  // 355 -> ~460 (clamp). Distance to door (435) = 25 ✓
  await shot('10a-at-door.png')
  await press('Space')
  await page.waitForTimeout(1500)
  await shot('10b-overworld.png')
})

await step('11 Walk RIGHT in overworld; capture mid-walk', async () => {
  await walk('right', 3500)  // pass first item zone, maybe trigger encounter
  await shot('11-overworld-mid.png')
})

await step('12 Resolve any battle that started', async () => {
  await spamAttack(6)
  await shot('12-after-battle.png')
})

await step('13 Walk RIGHT to chest #1, open it', async () => {
  await walk('right', 1500)
  await press('Space')
  await page.waitForTimeout(900)
  await shot('13-chest.png')
  await press('Escape')
  await page.waitForTimeout(500)
})

await step('14 Long walk right to boss zone', async () => {
  await walk('right', 6000)
  await spamAttack(4)  // in case more wild encounters trigger
  await walk('right', 2500)
  await shot('14-boss-area.png')
  await press('Space')  // trigger boss
  await page.waitForTimeout(1500)
  await shot('15-boss-fight.png')
})

// Dump console
writeFileSync(join(OUT, 'console.log'), consoleLog.join('\n'))

await browser.close()
console.log('\nDone. Screenshots in qa-screenshots/.')
console.log(`Console messages saved to qa-screenshots/console.log (${consoleLog.length} entries).`)
