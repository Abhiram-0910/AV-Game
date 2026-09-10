// Drives the real build through Level 2: walk to the riverbank, mantras, walk to the range,
// the bow lesson, then fire three real arrows at the three static targets — aimed with the
// mouse the way a player would, computed with the same projectile formula as ballistics.ts.
// Steering and the shot solver only read the debug handle, never write game state.
//
// Seeds a save with L1 already completed so the run starts on L2 directly, rather than
// replaying l1.spec.ts's several minutes of walking under SwiftShader first.
import { expect, test, type Page } from '@playwright/test'
import { BALANCE } from '../../src/data/balance'
import { CODEX } from '../../src/data/codex'
import { DIALOGUE, UI } from '../../src/data/dialogue'
import { LEVELS } from '../../src/data/levels'
import { SAVE_VERSION } from '../../src/core/save'

declare global {
  interface Window {
    __bk: { world: { player: { x: number; z: number; yaw: number }; hittable: readonly unknown[]
        arrowPickups: readonly { x: number; z: number }[]; enemies: readonly { x: number; z: number; health: number; state: string; kind: string }[]; tick: number; arrows: readonly unknown[]; draw: { drawing: boolean; ticks: number }; astraCharge: { drawing: boolean; ticks: number } } }
  }
}

const L2 = LEVELS[1]
const SETTLE_MS = 80
const AIM = BALANCE.archeryAim
const SAVE_KEY = 'bala-kanda.save'

// L2's world is bigger than L1's court and adds three aimed shots; under SwiftShader
// (~5-10fps, see CLAUDE.md) the first full run finished in 8.2m against a 480s budget —
// it wasn't stuck, just slower than the timeout. Twice that headroom.
test.setTimeout(900_000)

test.beforeEach(async ({ page }) => {
  const save = { version: SAVE_VERSION, level: 'l2', completed: ['l1'], codex: ['vishwamitra'], quiz: {}, settings: { qualityTier: 'auto', volume: 0.8, subtitles: true }, benchmarkTier: null }
  await page.addInitScript(([key, json]) => window.localStorage.setItem(key as string, json as string), [SAVE_KEY, JSON.stringify(save)])
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

async function talkTo(page: Page, at: { x: number; z: number }) {
  const prompt = page.getByTestId('hud-prompt')
  await steerTo(page, at, () => prompt.isVisible())
  await page.keyboard.press('e')
  await skipSpeech(page, UI['name.vishwamitra'])
}

/** Low-angle solution to the projectile range equation: launch pitch to hit (R, dy) at speed v. */
function solvePitch(v: number, g: number, r: number, dy: number): number | null {
  if (r <= 0) return null
  const a = (2 * v * v) / (g * r)
  const disc = a * a - 4 * ((2 * v * v * dy) / (g * r * r) + 1)
  if (disc < 0) return null
  return Math.atan((a - Math.sqrt(disc)) / 2)
}

async function hittableCount(page: Page): Promise<number> {
  return page.evaluate(() => window.__bk.world.hittable.length)
}

async function aimAndFire(page: Page, target: { x: number; z: number; y: number }, pitchTrim: number) {
  const p = await player(page)
  const dx = target.x - p.x
  const dz = target.z - p.z
  const r = Math.hypot(dx, dz)
  const desiredYaw = Math.atan2(dx, dz)
  const pitch = solvePitch(BALANCE.arrow.SPEED, BALANCE.arrow.GRAVITY, r, target.y - AIM.MUZZLE_HEIGHT)
  if (pitch === null) throw new Error(`target at range ${r}m is unreachable at full draw`)
  const yawError = Math.atan2(Math.sin(desiredYaw - p.yaw), Math.cos(desiredYaw - p.yaw))
  const mx = Math.max(-1, Math.min(1, yawError / AIM.MOUSE_YAW_RAD))
  const my = Math.max(-1, Math.min(1, (pitch + pitchTrim) / AIM.MOUSE_PITCH_RAD))
  const size = page.viewportSize()!
  await page.mouse.move(((mx + 1) / 2) * size.width, ((1 - my) / 2) * size.height)
  await page.mouse.down()
  await page.waitForTimeout((BALANCE.arrow.DRAW_TICKS / 60) * 1000 + 150)
  await page.mouse.up()
  // Flight time plus generous margin for SwiftShader's substep-capped fixed loop.
  await page.waitForTimeout(Math.max(600, (r / (BALANCE.arrow.SPEED * Math.cos(pitch))) * 1000 + 800))
}

/** Fires until the target is struck (world.hittable shrinks), nudging pitch if it misses.
 * Mouse aim only covers +-MOUSE_YAW_RAD from the body's facing (see archeryAim in balance.ts),
 * same as a real player would need to — turn the body toward the target first, mouse only
 * fine-tunes from there. */
async function shootTarget(page: Page, target: { x: number; y: number; z: number }) {
  await face(page, target)
  const before = await hittableCount(page)
  for (const trim of [0, 0.03, -0.03, 0.06, -0.06]) {
    await aimAndFire(page, target, trim)
    if ((await hittableCount(page)) < before) return
  }
  throw new Error(`target at ${target.x},${target.z} was never hit`)
}

test('Level 2 plays end to end: mantras, the bow lesson, three real shots', async ({ page }) => {
  await page.goto('/?debug')
  await expect(page.getByTestId('title')).toBeVisible({ timeout: 60_000 })
  await page.getByTestId('title-continue').click()
  await expect(page.getByTestId('loading')).toBeVisible()
  await expect(page.getByTestId('loading-title')).toHaveText(DIALOGUE['l2.title'].lines[0])

  const intro = page.getByTestId('dialogue-text')
  await expect(intro).toContainText(DIALOGUE['l2.intro'].lines[0].slice(0, 20), { timeout: 120_000 })
  await skipSpeech(page, '')
  const objective = page.getByTestId('hud-objective')
  await expect(objective).toContainText(UI['objective.reach'])

  // Walk to the riverbank, get the mantras.
  const riverbank = L2.waypoints.riverbank
  await talkTo(page, { x: riverbank[0], z: riverbank[2] })

  // Walk to the range; Vishwamitra has already relocated there (a position change on the
  // same built character, see NpcCharacter.tsx). Bow lesson.
  const range = L2.waypoints.range
  await talkTo(page, { x: range[0] - 1.5, z: range[2] })
  await expect(objective).toContainText(UI['objective.hitTargets'].replace('{done}', '0').replace('{total}', '3'))
  await page.screenshot({ path: 'docs/screenshots/l2-range.png' })

  // Three real shots, computed the way ballistics.ts would fly them.
  for (const t of L2.targets) {
    if (t.kind !== 'static') continue
    await shootTarget(page, { x: t.pos[0], y: 0.37, z: t.pos[2] })
  }

  await expect(page.getByTestId('result-title')).toHaveText(UI['result.win'])
  const card = CODEX.find((c) => c.id === L2.codexCard)!
  await expect(page.getByTestId('codex-unlock')).toContainText(card.title)
  await page.getByTestId('result-continue').click()
  await answerQuiz(page)
  await expect(page.getByTestId('dialogue-text')).toContainText(DIALOGUE['l2.outro'].lines[0].slice(0, 20))
  await skipSpeech(page, '')
  await expect(page.getByTestId('loading')).toBeVisible()
  await expect(page.getByTestId('loading-title')).toHaveText(DIALOGUE['l3.title'].lines[0])
})
