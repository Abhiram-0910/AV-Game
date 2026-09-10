// Drives the real build through Level 4: Vishwamitra's astra lesson at spawn, the firing
// line, and all five distinct target kinds — static, lateral, longRange, occluded with real
// arrows, then astraOnly with a charged astra (an instant hitscan, not a projectile — see
// systems/astra/step.ts). Also exercises the "arrows-out fails only after the last live arrow
// resolves" rule implicitly: every shot here is deliberate and well-aimed, never starving the
// quiver mid-flight.
import { expect, test, type Page } from '@playwright/test'
import { BALANCE } from '../../src/data/balance'
import { CODEX } from '../../src/data/codex'
import { DIALOGUE, UI } from '../../src/data/dialogue'
import { LEVELS, type TargetDef } from '../../src/data/levels'
import { SCENERY } from '../../src/data/scenery'
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

const L4 = LEVELS[3]
const NPCS = SCENERY.l4!.npcs
const SETTLE_MS = 80
const AIM = BALANCE.archeryAim

test.setTimeout(900_000)

test.beforeEach(async ({ page }) => {
  const save = { version: SAVE_VERSION, level: 'l4', completed: ['l1', 'l2', 'l3'], codex: ['vishwamitra', 'yajna', 'tataka'], quiz: {}, settings: { qualityTier: 'auto', volume: 0.8, subtitles: true }, benchmarkTier: null }
  await page.addInitScript(([key, json]) => window.localStorage.setItem(key as string, json as string), ['bala-kanda.save', JSON.stringify(save)])
})

async function player(page: Page) {
  return page.evaluate(() => {
    const p = window.__bk.world.player
    return { x: p.x, z: p.z, yaw: p.yaw }
  })
}

async function hittableCount(page: Page): Promise<number> {
  return page.evaluate(() => window.__bk.world.hittable.length)
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

/** Fixed pos → a constant resolver. 'lateral' targets replicate Target.tsx's own oscillation
 * formula (deterministic from world.tick) — but the arrow's flight/draw time is a real
 * fraction of the 4s period, and how many game ticks that wall-clock wait covers isn't exact
 * under SwiftShader's variable frame rate, so precisely leading the shot isn't reliable. Waits
 * for a turning point instead (velocity near zero, the sine wave's peak/trough) — position
 * barely changes there even if the timing sync is imprecise by a few ticks. */
function targetResolver(page: Page, t: TargetDef, y: number): () => Promise<{ x: number; z: number; y: number }> {
  if (t.kind !== 'lateral') return async () => ({ x: t.pos[0], z: t.pos[2], y })
  return async () => {
    for (let i = 0; i < 200; i += 1) {
      const tick = await page.evaluate(() => window.__bk.world.tick)
      const phase = (tick / t.periodTicks) * Math.PI * 2
      if (Math.abs(Math.cos(phase)) < 0.1) return { x: t.pos[0] + Math.sin(phase) * t.amplitude, z: t.pos[2], y }
      await page.waitForTimeout(80)
    }
    return { x: t.pos[0], z: t.pos[2], y }
  }
}

/** Polls actual game state instead of a fixed wait — under SwiftShader the ratio of real
 * ticks-per-wall-clock-ms varies with system load, so a fixed-ms wait for "the draw is full"
 * or "the arrow has landed" is unreliable. Up to 20s per poll, well inside the test timeout. */
async function pollUntil(page: Page, check: () => Promise<boolean>, maxMs = 20_000) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    if (await check()) return
    await page.waitForTimeout(50)
  }
}

async function aimAndFireAt(page: Page, target: { x: number; z: number; y: number }, pitchTrim: number, yawTrim = 0) {
  const p = await player(page)
  const r = Math.hypot(target.x - p.x, target.z - p.z)
  const pitch = solvePitch(BALANCE.arrow.SPEED, BALANCE.arrow.GRAVITY, r, target.y - AIM.MUZZLE_HEIGHT)
  if (pitch === null) return
  // yawTrim nudges the aim point sideways (in metres, perpendicular-ish via a small z offset
  // won't work at long range — offset x directly) to hedge a moving target's residual drift.
  await aimMouse(page, p, target.x + yawTrim, target.z, pitch + pitchTrim)
  await page.mouse.down()
  await pollUntil(page, () => page.evaluate((n) => window.__bk.world.draw.ticks >= n, BALANCE.arrow.DRAW_TICKS))
  await page.mouse.up()
  await pollUntil(page, () => page.evaluate(() => window.__bk.world.arrows.length === 0))
}

const TRIMS: readonly [pitch: number, yaw: number][] = [
  [0, 0],
  [0.03, 0],
  [-0.03, 0],
  [0.06, 0],
  [-0.06, 0],
  [0, 1],
  [0, -1],
  [0.03, 1],
  [0.03, -1],
  [-0.03, 1],
  [-0.03, -1],
  [0.06, 1],
  [0.06, -1],
]

async function shootTarget(page: Page, resolve: () => Promise<{ x: number; z: number; y: number }>) {
  const before = await hittableCount(page)
  await face(page, await resolve())
  for (const [pitchTrim, yawTrim] of TRIMS) {
    await aimAndFireAt(page, await resolve(), pitchTrim, yawTrim)
    if ((await hittableCount(page)) < before) return
  }
  const last = await resolve()
  throw new Error(`target near ${last.x},${last.z} was never hit`)
}

/** The astra is an instant hitscan (no ballistic arc) — aim is straight-line trig, and firing
 * means holding the cast key for the full charge before releasing. */
async function castAstraAt(page: Page, target: { x: number; z: number; y: number }) {
  const before = await hittableCount(page)
  const p = await player(page)
  const pitch = Math.atan2(target.y - AIM.MUZZLE_HEIGHT, Math.hypot(target.x - p.x, target.z - p.z))
  await face(page, target)
  await aimMouse(page, await player(page), target.x, target.z, pitch)
  await page.keyboard.down('q')
  await pollUntil(page, () => page.evaluate((n) => window.__bk.world.astraCharge.ticks >= n, BALANCE.astra.CHARGE_TICKS))
  await page.keyboard.up('q')
  // The hitscan resolves on the very next fixed tick — a short settle, not a timing-sensitive wait.
  await page.waitForTimeout(300)
  expect(await hittableCount(page)).toBeLessThan(before)
}

test('Level 4 plays end to end: the astra lesson and all five targets', async ({ page }) => {
  await page.goto('/?debug')
  await expect(page.getByTestId('title')).toBeVisible({ timeout: 60_000 })
  await page.getByTestId('title-continue').click()
  await expect(page.getByTestId('loading')).toBeVisible()
  await expect(page.getByTestId('loading-title')).toHaveText(DIALOGUE['l4.title'].lines[0])

  const intro = page.getByTestId('dialogue-text')
  await expect(intro).toContainText(DIALOGUE['l4.intro'].lines[0].slice(0, 20), { timeout: 120_000 })
  await skipSpeech(page, '')
  const objective = page.getByTestId('hud-objective')

  // Vishwamitra's astra lesson, right at spawn.
  const vish = NPCS.find((n) => n.npc === 'vishwamitra')!
  const prompt = page.getByTestId('hud-prompt')
  await steerTo(page, { x: vish.pos[0], z: vish.pos[2] }, () => prompt.isVisible())
  await page.keyboard.press('e')
  await skipSpeech(page, UI['name.vishwamitra'])
  await expect(objective).toContainText(UI['objective.reach'])

  // The firing line — behind spawn, since the player starts facing away from the range.
  const firingLine = L4.waypoints.firingLine
  await steerTo(page, { x: firingLine[0], z: firingLine[2] }, () => objective.textContent().then((t) => !t?.includes(UI['objective.reach'])))
  await expect(objective).toContainText(UI['objective.hitTargets'].replace('{done}', '0').replace('{total}', '5'))
  await page.screenshot({ path: 'docs/screenshots/l4-firing-line.png' })

  // Four real arrows at the four non-astra target kinds. 'lateral' goes last — it's the only
  // one needing more than one or two attempts (the target moves during the arrow's flight),
  // so shooting the reliable ones first leaves it the most of the 12-arrow quiver to work with.
  const arrowOrder: TargetDef['kind'][] = ['static', 'longRange', 'occluded', 'lateral']
  for (const kind of arrowOrder) {
    const t = L4.targets.find((x) => x.kind === kind)!
    const y = t.kind === 'occluded' ? 0.37 * (t as { scale: number }).scale : 0.37
    await shootTarget(page, targetResolver(page, t, y))
  }
  await expect(objective).toContainText(UI['objective.hitTargets'].replace('{done}', '4').replace('{total}', '5'))

  // The astraOnly target: one plain arrow must bounce off (no progress — don't burn the whole
  // retry budget proving a negative), only the astra actually works.
  const astraTarget = L4.targets.find((t) => t.kind === 'astraOnly')! as { pos: readonly [number, number, number]; scale: number }
  const before = await hittableCount(page)
  await face(page, { x: astraTarget.pos[0], z: astraTarget.pos[2] })
  await aimAndFireAt(page, { x: astraTarget.pos[0], y: 1.0, z: astraTarget.pos[2] }, 0)
  expect(await hittableCount(page)).toBe(before) // the arrow did nothing — still hittable

  await castAstraAt(page, { x: astraTarget.pos[0], y: 0.9 * astraTarget.scale, z: astraTarget.pos[2] })
  await expect(objective).toContainText(UI['objective.chargeAstra'])

  await expect(page.getByTestId('result-title')).toHaveText(UI['result.win'])
  const card = CODEX.find((c) => c.id === L4.codexCard)!
  await expect(page.getByTestId('codex-unlock')).toContainText(card.title)
  await page.getByTestId('result-continue').click()
  await answerQuiz(page)
  await expect(page.getByTestId('dialogue-text')).toContainText(DIALOGUE['l4.outro'].lines[0].slice(0, 20))
  await skipSpeech(page, '')
  await expect(page.getByTestId('loading')).toBeVisible()
  await expect(page.getByTestId('loading-title')).toHaveText(DIALOGUE['l5.title'].lines[0])
})
