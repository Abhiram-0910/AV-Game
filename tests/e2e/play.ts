// Player-shaped helpers shared by the level specs. They drive the game only through the keyboard and raw mouse
// coordinates, and read the debug handle (window.__bk) to know where things are, the way a player looks at the
// screen. Nothing here solves ballistics: a shot is the cursor on the target's pixels, raised until the arc locks.
import { expect, type Page } from '@playwright/test'
import { BALANCE } from '../../src/data/balance'
import type { LevelId } from '../../src/data/levels'
import { SAVE_VERSION } from '../../src/core/save'

interface Bk {
  game: { getState(): { phase: string; arrows: number; attempt: number; objectives: { done: boolean; progress: number }[] } }
  worldStore: { getState(): { prompt: string | null; dialogue: string | null } }
  world: {
    player: { x: number; z: number; yaw: number }
    hittable: readonly { visible: boolean }[]
    arrowPickups: readonly { x: number; z: number }[]
    enemies: readonly { x: number; z: number; health: number; state: string; kind: string }[]
    npcs: readonly { id: string; x: number; z: number; yaw: number }[]
    tick: number
    arrows: readonly unknown[]
    aimDir: readonly [number, number, number]
    draw: { drawing: boolean; ticks: number }
    astraCharge: { drawing: boolean; ticks: number }
  }
  perf: { triangles: number; calls: number; skinned: number }
  camera: { matrixWorldInverse: { elements: number[] }; projectionMatrix: { elements: number[] } }
}

declare global {
  interface Window {
    __bk: Bk
  }
}

export interface Point {
  x: number
  y: number
  z: number
}

const SETTLE_MS = 80
const ORDER: readonly LevelId[] = ['l1', 'l2', 'l3', 'l4', 'l5']
const CARDS = ['vishwamitra', 'yajna', 'tataka', 'astra']

/** Start on `level` with every earlier level already completed. The level specs drive absolute cursor coordinates, which
 * only mean something to an unlocked cursor, so they play in 'aim' mode; mouse-look.spec.ts covers the default 'look'. */
export async function seedSave(page: Page, level: LevelId, cameraMode: 'look' | 'aim' = 'aim') {
  const i = ORDER.indexOf(level)
  const save = { version: SAVE_VERSION, level, completed: ORDER.slice(0, i), codex: CARDS.slice(0, i), quiz: {}, settings: { qualityTier: 'auto', volume: 0.8, subtitles: true, cameraMode }, benchmarkTier: null }
  await page.addInitScript(([key, json]) => window.localStorage.setItem(key as string, json as string), ['bala-kanda.save', JSON.stringify(save)])
}

export async function player(page: Page) {
  return page.evaluate(() => {
    const p = window.__bk.world.player
    return { x: p.x, z: p.z, yaw: p.yaw }
  })
}

export function headingError(p: { x: number; z: number; yaw: number }, target: { x: number; z: number }): number {
  const want = Math.atan2(target.x - p.x, target.z - p.z)
  return Math.atan2(Math.sin(want - p.yaw), Math.cos(want - p.yaw))
}

/** Tap A/D for roughly the time the turn needs; the sim runs near real time under SwiftShader. */
export async function face(page: Page, target: { x: number; z: number }) {
  let lastSign = 0
  for (let i = 0; i < 30; i += 1) {
    const d = headingError(await player(page), target)
    if (Math.abs(d) < 0.2) return
    // A key held for any part of a slow SwiftShader frame turns that whole frame (up to ~0.6 rad at 5 fps), so taps can
    // overshoot back and forth forever: the L3 bot spun in place until Tataka killed it. Once a turn has crossed the
    // heading, within 0.5 rad is as close as the frame rate allows; the mouse does the fine aim.
    if (lastSign !== 0 && Math.sign(d) !== lastSign && Math.abs(d) < 0.5) return
    lastSign = Math.sign(d)
    const key = d > 0 ? 'a' : 'd'
    await page.keyboard.down(key)
    await page.waitForTimeout(Math.max(30, Math.min(400, (Math.abs(d) / BALANCE.player.TURN_SPEED_RAD) * 1000 * 0.6)))
    await page.keyboard.up(key)
    await page.waitForTimeout(SETTLE_MS)
  }
}

/** Face the target, then walk toward it, re-facing if the heading drifts, until `arrived`. */
export async function steerTo(page: Page, target: { x: number; z: number }, arrived: () => Promise<boolean>, maxSteps = 300): Promise<boolean> {
  let last: { x: number; z: number } | null = null
  let longestStep = 0
  for (let i = 0; i < maxSteps; i += 1) {
    if (await arrived()) break
    const p = await player(page)
    if (last) longestStep = Math.max(longestStep, Math.hypot(p.x - last.x, p.z - last.z))
    last = p
    if (Math.abs(headingError(p, target)) > 0.6) {
      await page.keyboard.up('w')
      await face(page, target)
    }
    await page.keyboard.down('w')
    await page.waitForTimeout(SETTLE_MS)
    // A traced SwiftShader poll can carry the bot ~1.8 m with W held, wider than an arrival circle, so whether it lands
    // inside came down to timing (L1's approach, 2026-09-14). Near the target, walk in taps: W is up while polling.
    if (Math.hypot(target.x - p.x, target.z - p.z) < longestStep * 2 + 1) await page.keyboard.up('w')
  }
  await page.keyboard.up('w')
  return arrived()
}

export async function skipSpeech(page: Page, speaker: string) {
  const dialogue = page.getByTestId('dialogue')
  await expect(dialogue).toBeVisible()
  if (speaker) await expect(page.getByTestId('dialogue-speaker')).toHaveText(speaker)
  await page.keyboard.press('Escape')
  await expect(dialogue).toBeHidden()
}

/** Picks the first option each question; wrong answers still advance (the gate teaches, never blocks). */
export async function answerQuiz(page: Page) {
  await expect(page.getByTestId('quiz')).toBeVisible()
  for (let i = 0; i < 3; i += 1) {
    await page.getByTestId('quiz-option-0').click()
    await page.getByTestId('quiz-next').click()
  }
}

/** Polls game state instead of a fixed wait: under SwiftShader ticks per wall-clock ms vary with load. */
export async function pollUntil(page: Page, check: () => Promise<boolean>, maxMs = 20_000) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    if (await check()) return
    await page.waitForTimeout(50)
  }
}

/** Whether the level is still being played; a shot must stop as soon as it is not (won, failed, or reloading). */
export async function inPlay(page: Page): Promise<boolean> {
  return page.evaluate(() => window.__bk.game.getState().phase === 'play')
}

export async function hittableCount(page: Page): Promise<number> {
  return page.evaluate(() => window.__bk.world.hittable.length)
}

export async function waitFrames(page: Page, n = 3) {
  await page.evaluate(
    (count) =>
      new Promise<void>((resolve) => {
        let left = count
        const tick = () => (--left <= 0 ? resolve() : requestAnimationFrame(tick))
        requestAnimationFrame(tick)
      }),
    n,
  )
}

/** Where a world point is on screen right now, in the pixels page.mouse uses. */
export async function projectToScreen(page: Page, p: Point): Promise<{ x: number; y: number; behind: boolean }> {
  return page.evaluate((q) => {
    const c = window.__bk.camera
    const mul = (m: number[], v: number[]) => [0, 1, 2, 3].map((r) => m[r] * v[0] + m[4 + r] * v[1] + m[8 + r] * v[2] + m[12 + r] * v[3])
    const e = mul(c.projectionMatrix.elements, mul(c.matrixWorldInverse.elements, [q.x, q.y, q.z, 1]))
    return { x: ((e[0] / e[3] + 1) / 2) * window.innerWidth, y: ((1 - e[1] / e[3]) / 2) * window.innerHeight, behind: e[3] <= 0 }
  }, p)
}

/** Hold the button until the bow is at full draw. */
export async function drawFull(page: Page) {
  await page.mouse.down()
  await pollUntil(page, () => page.evaluate((n) => window.__bk.world.draw.ticks >= n, BALANCE.arrow.DRAW_TICKS))
}

/** Let go, then wait until the arrow has left the bow and landed. */
export async function release(page: Page) {
  const quiver = await page.evaluate(() => window.__bk.game.getState().arrows)
  await page.mouse.up()
  await pollUntil(page, () => page.evaluate((n) => window.__bk.game.getState().arrows < n, quiver), 5_000)
  await pollUntil(page, () => page.evaluate(() => window.__bk.world.arrows.length === 0))
}

/** Watch the arc settle after moving the mouse, as a player does: the bow's aim eases toward the cursor over a few ticks,
 * the cursor ray is a frame old, and the lock reaches the crosshair a render later. Reading the lock 3 frames after
 * each step skipped straight over the ~15 px lock band of L4's 44 m target (measured in the build). */
async function settleAim(page: Page) {
  const aim = () => page.evaluate(() => [...window.__bk.world.aimDir])
  let last = await aim()
  for (let i = 0; i < 20; i += 1) {
    await waitFrames(page, 2)
    const now = await aim()
    const moved = Math.max(...now.map((v, k) => Math.abs(v - last[k])))
    last = now
    if (moved < 1e-4) break
  }
  await waitFrames(page, 2)
}

/** With the bow drawn: cursor on the point's pixels, raised `step` px at a time until the arc turns green (the crosshair's
 * lock), then a little further into the green if it holds. The point is projected afresh every step, so a moving target
 * is tracked. Returns the cursor and its raise above the point, or null when the arc never locked. */
export async function raiseUntilLocked(page: Page, point: () => Promise<Point>, maxRaise = 240, step = 3) {
  const crosshair = page.getByTestId('crosshair')
  const aim = async (raise: number) => {
    const s = await projectToScreen(page, await point())
    const cursor = { x: s.x, y: s.y - raise, raise }
    await page.mouse.move(cursor.x, cursor.y)
    await settleAim(page)
    // A short read: if the level ended mid-shot the crosshair is gone, and an auto-waiting read would hang the spec.
    return (await crosshair.getAttribute('data-target-locked', { timeout: 2_000 }).catch(() => null)) === 'true' ? cursor : null
  }
  for (let raise = 0; raise <= maxRaise; raise += step) {
    if (!(await inPlay(page))) return null
    const first = await aim(raise)
    if (first) return (await aim(raise + 2 * step)) ?? (await aim(raise))
  }
  return null
}

/** One shot the way a player takes it: draw, raise the cursor until the arc locks, release. Returns whether it locked. */
export async function shoot(page: Page, point: () => Promise<Point>): Promise<boolean> {
  if (!(await inPlay(page))) return false
  const s = await projectToScreen(page, await point())
  await page.mouse.move(s.x, s.y)
  await drawFull(page)
  // Point-blank or already on it: the arc is green with the cursor on the target, so let go at once, as a player would.
  // Only sweep when it is not; a bot that settles every shot loses a melee race a 60 fps player wins.
  await waitFrames(page, 2)
  if ((await page.getByTestId('crosshair').getAttribute('data-target-locked', { timeout: 2_000 }).catch(() => null)) === 'true') {
    await release(page)
    return true
  }
  const cursor = await raiseUntilLocked(page, point)
  await release(page)
  return cursor !== null
}

/** Turns to the target and shoots until it leaves world.hittable. */
export async function shootUntilHit(page: Page, point: () => Promise<Point>, attempts = 6) {
  const before = await hittableCount(page)
  await face(page, await point())
  for (let i = 0; i < attempts; i += 1) {
    const locked = await shoot(page, point)
    if ((await hittableCount(page)) < before) return
    console.log(`shot ${i + 1} at ${JSON.stringify(await point())} missed (arc locked: ${locked})`)
  }
  throw new Error(`target at ${JSON.stringify(await point())} was never hit`)
}
