// Drives the real build through Level 5: guard the yajna against every rakshasa wave, then
// defeat Subahu (arrows) and Maricha (the single Manava astra charge, held back for exactly
// this — arrows bounce off him, see systems/archery/step.ts). The player parks just in front
// of the altar so an approaching rakshasa's own REACH check pulls its attack onto the player
// instead of the fire — "stand between them and the fire" (l5.intro) — and snipes whatever is
// nearest, recovering spent arrows from the ground when the quiver runs dry.
import { expect, test, type Page } from '@playwright/test'
import { BALANCE } from '../../src/data/balance'
import { DIALOGUE, UI } from '../../src/data/dialogue'
import { LEVELS } from '../../src/data/levels'
import { SAVE_VERSION } from '../../src/core/save'

declare global {
  interface Window {
    __bk: {
      world: {
        player: { x: number; z: number; yaw: number }
        hittable: readonly unknown[]
        arrowPickups: readonly { x: number; z: number }[]
        enemies: readonly { x: number; z: number; health: number; state: string; kind: string }[]
        tick: number
        arrows: readonly unknown[]
        draw: { drawing: boolean; ticks: number }
        astraCharge: { drawing: boolean; ticks: number }
      }
    }
  }
}

const L5 = LEVELS[4]
const AIM = BALANCE.archeryAim
const SETTLE_MS = 80

test.setTimeout(900_000)

test.beforeEach(async ({ page }) => {
  const save = {
    version: SAVE_VERSION,
    level: 'l5',
    completed: ['l1', 'l2', 'l3', 'l4'],
    codex: ['vishwamitra', 'yajna', 'tataka', 'astra'],
    quiz: {},
    settings: { qualityTier: 'auto', volume: 0.8, subtitles: true },
    benchmarkTier: null,
  }
  await page.addInitScript(([key, json]) => window.localStorage.setItem(key as string, json as string), ['bala-kanda.save', JSON.stringify(save)])
})

async function player(page: Page) {
  return page.evaluate(() => {
    const p = window.__bk.world.player
    return { x: p.x, z: p.z, yaw: p.yaw }
  })
}

function headingError(p: { x: number; z: number; yaw: number }, target: { x: number; z: number }): number {
  const want = Math.atan2(target.x - p.x, target.z - p.z)
  return Math.atan2(Math.sin(want - p.yaw), Math.cos(want - p.yaw))
}

async function face(page: Page, target: { x: number; z: number }) {
  for (let i = 0; i < 30; i += 1) {
    const d = headingError(await player(page), target)
    if (Math.abs(d) < 0.2) return
    const key = d > 0 ? 'a' : 'd'
    await page.keyboard.down(key)
    await page.waitForTimeout(Math.max(30, Math.min(400, (Math.abs(d) / BALANCE.player.TURN_SPEED_RAD) * 1000 * 0.6)))
    await page.keyboard.up(key)
    await page.waitForTimeout(SETTLE_MS)
  }
}

async function steerTo(page: Page, target: { x: number; z: number }, arrived: () => Promise<boolean>, maxSteps = 150) {
  for (let i = 0; i < maxSteps; i += 1) {
    if (await arrived()) break
    const p = await player(page)
    if (Math.abs(headingError(p, target)) > 0.4) {
      await page.keyboard.up('w')
      await face(page, target)
    }
    await page.keyboard.down('w')
    await page.waitForTimeout(SETTLE_MS)
  }
  await page.keyboard.up('w')
}

async function skipSpeech(page: Page, speaker: string) {
  const dialogue = page.getByTestId('dialogue')
  await expect(dialogue).toBeVisible()
  if (speaker) await expect(page.getByTestId('dialogue-speaker')).toHaveText(speaker)
  await page.keyboard.press('Escape')
  await expect(dialogue).toBeHidden()
}

async function pollUntil(page: Page, check: () => Promise<boolean>, maxMs = 20_000) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    if (await check()) return
    await page.waitForTimeout(50)
  }
}

function solvePitch(v: number, g: number, r: number, dy: number): number | null {
  if (r <= 0) return null
  const a = (2 * v * v) / (g * r)
  const disc = a * a - 4 * ((2 * v * v * dy) / (g * r * r) + 1)
  if (disc < 0) return null
  return Math.atan((a - Math.sqrt(disc)) / 2)
}

function aimMouse(page: Page, p: { x: number; z: number; yaw: number }, targetX: number, targetZ: number, pitch: number) {
  const dx = targetX - p.x
  const dz = targetZ - p.z
  const desiredYaw = Math.atan2(dx, dz)
  const yawError = Math.atan2(Math.sin(desiredYaw - p.yaw), Math.cos(desiredYaw - p.yaw))
  const mx = Math.max(-1, Math.min(1, yawError / AIM.MOUSE_YAW_RAD))
  const my = Math.max(-1, Math.min(1, pitch / AIM.MOUSE_PITCH_RAD))
  const size = page.viewportSize()!
  return page.mouse.move(((mx + 1) / 2) * size.width, ((1 - my) / 2) * size.height)
}

async function fireAt(page: Page, target: { x: number; z: number; y: number }) {
  const p = await player(page)
  const r = Math.hypot(target.x - p.x, target.z - p.z)
  const pitch = solvePitch(BALANCE.arrow.SPEED, BALANCE.arrow.GRAVITY, r, target.y - AIM.MUZZLE_HEIGHT)
  if (pitch === null) return
  await aimMouse(page, p, target.x, target.z, pitch)
  await page.mouse.down()
  await pollUntil(page, () => page.evaluate((n) => window.__bk.world.draw.ticks >= n, BALANCE.arrow.DRAW_TICKS), 4000)
  await page.mouse.up()
  await pollUntil(page, () => page.evaluate(() => window.__bk.world.arrows.length === 0), 4000)
}

/** The single Manava astra charge — held back for Maricha alone; a rakshasa or Subahu never
 * gets it (arrows do that job). */
async function castAstraAt(page: Page, target: { x: number; z: number; y: number }) {
  const p = await player(page)
  const pitch = Math.atan2(target.y - AIM.MUZZLE_HEIGHT, Math.hypot(target.x - p.x, target.z - p.z))
  await aimMouse(page, await player(page), target.x, target.z, pitch)
  await page.keyboard.down('q')
  await pollUntil(page, () => page.evaluate((n) => window.__bk.world.astraCharge.ticks >= n, BALANCE.astra.CHARGE_TICKS), 4000)
  await page.keyboard.up('q')
  await page.waitForTimeout(300)
}

interface Sighted {
  x: number
  z: number
  kind: string
}

async function nearestEnemy(page: Page): Promise<Sighted | null> {
  const enemies = await page.evaluate(() => window.__bk.world.enemies.filter((e) => e.state !== 'dead').map((e) => ({ x: e.x, z: e.z, kind: e.kind })))
  const p = await player(page)
  let best: Sighted | null = null
  let bestD = Infinity
  for (const e of enemies) {
    const d = Math.hypot(e.x - p.x, e.z - p.z)
    if (d < bestD) {
      bestD = d
      best = e
    }
  }
  return best
}

async function nearestPile(page: Page): Promise<{ x: number; z: number } | null> {
  const piles = await page.evaluate(() => window.__bk.world.arrowPickups)
  const p = await player(page)
  let best: { x: number; z: number } | null = null
  let bestD = Infinity
  for (const pile of piles) {
    const d = Math.hypot(pile.x - p.x, pile.z - p.z)
    if (d < bestD) {
      bestD = d
      best = pile
    }
  }
  return best
}

// Right at the altar itself — a rakshasa stops advancing once within its own REACH of the
// fire (levels.ts's altar waypoint), so only a guard standing on top of it, not several metres
// back, is ever close enough for an approaching rakshasa's own REACH check to redirect onto
// the player instead of the fire (pass 3 phase G playtesting: a guard position even 1-3m back
// never took a single hit across several full-length runs — the fire took every one instead).
const GUARD_POS = { x: L5.waypoints.altar[0], z: L5.waypoints.altar[2] + 0.5 }

async function recoverArrows(page: Page, prompt: ReturnType<Page['getByTestId']>) {
  const pile = await nearestPile(page)
  if (!pile) {
    await page.waitForTimeout(400)
    return
  }
  await steerTo(page, pile, () => prompt.isVisible().catch(() => false), 60)
  if (await prompt.isVisible().catch(() => false)) await page.keyboard.press('e')
  await steerTo(page, GUARD_POS, async () => {
    const p = await player(page)
    return Math.hypot(p.x - GUARD_POS.x, p.z - GUARD_POS.z) < 1
  })
}

test('Level 5 plays end to end: every rakshasa wave, then Subahu and Maricha', async ({ page }) => {
  await page.goto('/?debug')
  await expect(page.getByTestId('title')).toBeVisible({ timeout: 60_000 })
  await page.getByTestId('title-continue').click()
  await expect(page.getByTestId('loading')).toBeVisible()
  await expect(page.getByTestId('loading-title')).toHaveText(DIALOGUE['l5.title'].lines[0])

  const intro = page.getByTestId('dialogue-text')
  await expect(intro).toContainText(DIALOGUE['l5.intro'].lines[0].slice(0, 20), { timeout: 120_000 })
  await skipSpeech(page, '')

  await steerTo(page, GUARD_POS, async () => {
    const p = await player(page)
    return Math.hypot(p.x - GUARD_POS.x, p.z - GUARD_POS.z) < 0.6
  })
  await face(page, { x: 0, z: -1 })
  await page.screenshot({ path: 'docs/screenshots/l5-guard-position.png' })

  const arrowsStat = page.getByTestId('hud-arrows')
  const prompt = page.getByTestId('hud-prompt')
  const resultTitle = page.getByTestId('result-title')

  const start = Date.now()
  const HARD_STOP_MS = 720_000
  while (Date.now() - start < HARD_STOP_MS) {
    if (await resultTitle.isVisible().catch(() => false)) break

    const arrowsLeft = Number((await arrowsStat.textContent()) ?? '0')
    if (arrowsLeft === 0) {
      await recoverArrows(page, prompt)
      continue
    }

    const target = await nearestEnemy(page)
    if (!target) {
      await page.waitForTimeout(300)
      continue
    }
    if (target.kind === 'maricha') {
      await castAstraAt(page, { x: target.x, y: 0.9, z: target.z })
    } else {
      await face(page, target)
      await fireAt(page, { x: target.x, y: 0.9, z: target.z })
    }
  }

  await page.screenshot({ path: 'docs/screenshots/l5-fight-end.png' })
  await expect(resultTitle).toHaveText(UI['result.win'], { timeout: 5_000 })
  await page.getByTestId('result-continue').click()
  await expect(page.getByTestId('ending-title')).toHaveText(UI['result.complete'])
  await expect(page.getByTestId('ending-codex-count')).toContainText(`/${5}`)
  await page.screenshot({ path: 'docs/screenshots/l5-ending.png' })
})
