// Drives the real build through Level 3: the forest edge, Vishwamitra's case for duty and
// Rama's resolve (the hesitation beat), the clearing, Tataka's appearance, and the fight
// itself — real aimed arrows against the live enemy AI (systems/ai/enemy-ai.ts), not a script.
//
// Seeds a save with L1 and L2 already completed so the run starts on L3 directly.
import { expect, test, type Page } from '@playwright/test'
import { BALANCE } from '../../src/data/balance'
import { CODEX } from '../../src/data/codex'
import { DIALOGUE, UI } from '../../src/data/dialogue'
import { LEVELS } from '../../src/data/levels'
import { SCENERY } from '../../src/data/scenery'
import { SAVE_VERSION } from '../../src/core/save'

declare global {
  interface Window {
    __bk: {
      world: {
        player: { x: number; z: number; yaw: number }
        hittable: readonly unknown[]
        enemies: readonly { x: number; z: number; health: number; state: string }[]
        tick: number
        arrows: readonly unknown[]
        draw: { drawing: boolean; ticks: number }
        astraCharge: { drawing: boolean; ticks: number }
      }
    }
  }
}

const L3 = LEVELS[2]
const NPCS = SCENERY.l3!.npcs
const SETTLE_MS = 80
const AIM = BALANCE.archeryAim
const SAVE_KEY = 'bala-kanda.save'

// A full boss fight on top of L2's walk-and-shoot; SwiftShader runs the whole thing at
// ~5-10fps (see CLAUDE.md). Generous headroom over L2's observed 5.5m.
test.setTimeout(900_000)

test.beforeEach(async ({ page }) => {
  const save = { version: SAVE_VERSION, level: 'l3', completed: ['l1', 'l2'], codex: ['vishwamitra', 'yajna'], quiz: {}, settings: { qualityTier: 'auto', volume: 0.8, subtitles: true }, benchmarkTier: null }
  await page.addInitScript(([key, json]) => window.localStorage.setItem(key as string, json as string), [SAVE_KEY, JSON.stringify(save)])
})

async function player(page: Page) {
  return page.evaluate(() => {
    const p = window.__bk.world.player
    return { x: p.x, z: p.z, yaw: p.yaw }
  })
}

async function enemy(page: Page) {
  return page.evaluate(() => {
    const e = window.__bk.world.enemies[0]
    return e ? { x: e.x, z: e.z, health: e.health, state: e.state } : null
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

async function steerTo(page: Page, target: { x: number; z: number }, arrived: () => Promise<boolean>) {
  for (let i = 0; i < 300; i += 1) {
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
  expect(await arrived()).toBe(true)
}

async function skipSpeech(page: Page, speaker: string) {
  const dialogue = page.getByTestId('dialogue')
  await expect(dialogue).toBeVisible()
  if (speaker) await expect(page.getByTestId('dialogue-speaker')).toHaveText(speaker)
  await page.keyboard.press('Escape')
  await expect(dialogue).toBeHidden()
}

/** Picks the first option each question and confirms through the feedback until the gate
 * closes — wrong answers still advance, the gate teaches rather than blocks (quiz.ts). */
async function answerQuiz(page: Page) {
  await expect(page.getByTestId('quiz')).toBeVisible()
  for (let i = 0; i < 3; i += 1) {
    await page.getByTestId('quiz-option-0').click()
    await page.getByTestId('quiz-next').click()
  }
}

/** Low-angle solution to the projectile range equation: launch pitch to hit (R, dy) at speed v. */
function solvePitch(v: number, g: number, r: number, dy: number): number | null {
  if (r <= 0) return null
  const a = (2 * v * v) / (g * r)
  const disc = a * a - 4 * ((2 * v * v * dy) / (g * r * r) + 1)
  if (disc < 0) return null
  return Math.atan((a - Math.sqrt(disc)) / 2)
}

async function aimAndFireAt(page: Page, target: { x: number; z: number; y: number }, pitchTrim: number) {
  const p = await player(page)
  const dx = target.x - p.x
  const dz = target.z - p.z
  const r = Math.hypot(dx, dz)
  const desiredYaw = Math.atan2(dx, dz)
  const pitch = solvePitch(BALANCE.arrow.SPEED, BALANCE.arrow.GRAVITY, r, target.y - AIM.MUZZLE_HEIGHT)
  if (pitch === null) return // too close for the low-angle solution; skip this attempt, retry next tick
  const yawError = Math.atan2(Math.sin(desiredYaw - p.yaw), Math.cos(desiredYaw - p.yaw))
  const mx = Math.max(-1, Math.min(1, yawError / AIM.MOUSE_YAW_RAD))
  const my = Math.max(-1, Math.min(1, (pitch + pitchTrim) / AIM.MOUSE_PITCH_RAD))
  const size = page.viewportSize()!
  await page.mouse.move(((mx + 1) / 2) * size.width, ((1 - my) / 2) * size.height)
  await page.mouse.down()
  await page.waitForTimeout((BALANCE.arrow.DRAW_TICKS / 60) * 1000 + 150)
  await page.mouse.up()
  await page.waitForTimeout(Math.max(500, (r / (BALANCE.arrow.SPEED * Math.cos(pitch))) * 1000 + 500))
}

/** Tataka moves and fights back — re-read her live position right before firing (she keeps
 * closing distance while `face()` turns the player) and face her again after any drift. */
async function fightTataka(page: Page) {
  for (let i = 0; i < 40; i += 1) {
    let e = await enemy(page)
    if (!e || e.state === 'dead') return
    await face(page, e)
    e = await enemy(page)
    if (!e || e.state === 'dead') return
    console.log(`shot ${i}: state=${e.state} health=${e.health} pos=${e.x.toFixed(1)},${e.z.toFixed(1)}`)
    await aimAndFireAt(page, { x: e.x, z: e.z, y: 1.5 }, 0)
  }
  throw new Error(`Tataka was never defeated: ${JSON.stringify(await enemy(page))}`)
}

test('Level 3 plays end to end: the hesitation, the clearing, Tataka defeated', async ({ page }) => {
  await page.goto('/?debug')
  await expect(page.getByTestId('title')).toBeVisible({ timeout: 60_000 })
  await page.getByTestId('title-continue').click()
  await expect(page.getByTestId('loading')).toBeVisible()
  await expect(page.getByTestId('loading-title')).toHaveText(DIALOGUE['l3.title'].lines[0])

  const intro = page.getByTestId('dialogue-text')
  await expect(intro).toContainText(DIALOGUE['l3.intro'].lines[0].slice(0, 20), { timeout: 120_000 })
  await skipSpeech(page, '')
  const objective = page.getByTestId('hud-objective')
  await expect(objective).toContainText(UI['objective.reach'])

  // Forest edge: Vishwamitra's case for duty, then Rama's resolve (auto-chained, no 'e' needed).
  const forestEdge = L3.waypoints.forestEdge
  const vishwamitra = NPCS.find((n) => n.npc === 'vishwamitra')!
  await steerTo(page, { x: forestEdge[0], z: forestEdge[2] }, () => objective.textContent().then((t) => !t?.includes(UI['objective.reach'])))
  const prompt = page.getByTestId('hud-prompt')
  await steerTo(page, { x: vishwamitra.pos[0], z: vishwamitra.pos[2] }, () => prompt.isVisible())
  await page.keyboard.press('e')
  // Dismissing Vishwamitra's case for duty chains straight into Rama's resolve (the
  // hesitation beat) with no gap where the panel is hidden — same testid, new speaker.
  const dialogue = page.getByTestId('dialogue')
  await expect(dialogue).toBeVisible()
  await expect(page.getByTestId('dialogue-speaker')).toHaveText(UI['name.vishwamitra'])
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('dialogue-speaker')).toHaveText(UI['name.rama'])
  await skipSpeech(page, UI['name.rama'])
  await expect(objective).toContainText(UI['objective.reach'])

  // The clearing: Tataka appears (auto-chained).
  const clearing = L3.waypoints.clearing
  await steerTo(page, { x: clearing[0], z: clearing[2] }, () => objective.textContent().then((t) => !t?.includes(UI['objective.reach'])))
  await skipSpeech(page, UI['name.tataka'])
  await expect(page.getByTestId('hud-boss')).toBeVisible()
  await expect(objective).toContainText(UI['name.tataka'])
  await page.screenshot({ path: 'docs/screenshots/l3-clearing.png' })

  // The fight. Real arrows against the live AI, computed the way ballistics.ts flies them.
  await fightTataka(page)
  await expect(page.getByTestId('hud-boss')).toBeHidden()

  await expect(page.getByTestId('result-title')).toHaveText(UI['result.win'])
  const card = CODEX.find((c) => c.id === L3.codexCard)!
  await expect(page.getByTestId('codex-unlock')).toContainText(card.title)
  await page.getByTestId('result-continue').click()
  await answerQuiz(page)
  await expect(page.getByTestId('dialogue-text')).toContainText(DIALOGUE['l3.outro'].lines[0].slice(0, 20))
  await skipSpeech(page, '')
  await expect(page.getByTestId('loading')).toBeVisible()
  await expect(page.getByTestId('loading-title')).toHaveText(DIALOGUE['l4.title'].lines[0])
})
