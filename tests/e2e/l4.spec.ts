// Drives the real build through Level 4 the way the playtester met it: a loss, a retry, then the whole trial with the
// mouse. The loss is deliberate (one target hit, then the quiver emptied into the ground) because that is exactly when
// the old in-place retry left the hit target gone for good and the level unfinishable. Then Vishwamitra's lesson, the
// sword on the straw man (F, with the HUD's prompt up, as a player sees it), the firing line (a marker in the world, and an edge arrow while it is behind the player), four arrow targets, the astra.
// Every shot is raw mouse coordinates (tests/e2e/play.ts); no pitch is solved.
import { expect, test, type Page } from '@playwright/test'
import { BALANCE } from '../../src/data/balance'
import { CODEX } from '../../src/data/codex'
import { DIALOGUE, UI } from '../../src/data/dialogue'
import { LEVELS, type TargetDef } from '../../src/data/levels'
import { SCENERY } from '../../src/data/scenery'
import {
  answerQuiz, drawFull, face, hittableCount, player, pollUntil, projectToScreen, raiseUntilLocked, release, seedSave,
  shoot, shootUntilHit, skipSpeech, steerTo, waitFrames, type Point,
} from './play'

const L4 = LEVELS[3]
const NPCS = SCENERY.l4!.npcs

test.setTimeout(1_500_000)
test.beforeEach(({ page }) => seedSave(page, 'l4'))

const target = <K extends TargetDef['kind']>(kind: K) => L4.targets.find((t) => t.kind === kind) as Extract<TargetDef, { kind: K }>
/** Middle of a target (target.glb stands 0.727 m tall), scaled. */
const centreOf = (t: TargetDef): Point => ({ x: t.pos[0], y: 0.36 * ('scale' in t ? t.scale : 1), z: t.pos[2] })
const hitText = (done: number) => UI['objective.hitTargets'].replace('{done}', String(done)).replace('{total}', '5')
const STRIKES = L4.objectives.find((o) => o.kind === 'strike')!
const strikeText = (done: number) => UI['objective.strike'].replace('{done}', String(done)).replace('{total}', String('count' in STRIKES ? STRIKES.count : 0))

/** The sword lesson: walk up to the straw man, face it, and strike once the "Press F" prompt is up, until the objective
 * moves on. Each blow waits for the count to rise, as the slash has a cooldown. */
async function strikeTheStrawMan(page: Page) {
  const objective = page.getByTestId('hud-objective')
  await expect(objective).toContainText(strikeText(0))
  const dummy = { x: L4.strikeDummy![0], z: L4.strikeDummy![2] }
  const near = async () => {
    const p = await player(page)
    return Math.hypot(dummy.x - p.x, dummy.z - p.z) <= BALANCE.melee.RANGE - 0.6
  }
  expect(await steerTo(page, dummy, near)).toBe(true)
  await face(page, dummy)
  await expect(page.getByTestId('hud-prompt')).toHaveText(UI['hud.strike'])
  const count = 'count' in STRIKES ? STRIKES.count : 0
  for (let done = 1; done <= count; done += 1) {
    // A slash has a cooldown (melee.SLASH_TICKS) and the count rises at its first tick: wait it out, or the key is ignored.
    await pollUntil(page, () => page.evaluate(() => {
      const w = window.__bk.world as unknown as { tick: number; swordSlashUntilTick: number }
      return w.tick >= w.swordSlashUntilTick
    }))
    await page.keyboard.press('f')
    await expect(objective).toContainText(done < count ? strikeText(done) : UI['objective.reach'], { timeout: 30_000 })
    if (done === 1) await page.screenshot({ path: 'docs/screenshots/l4-strike.png' })
  }
}

async function loseTheLevel(page: Page) {
  await shootUntilHit(page, async () => centreOf(target('static')))
  const { width, height } = page.viewportSize()!
  while (await page.evaluate(() => window.__bk.game.getState().phase === 'play')) {
    await page.mouse.move(width / 2, height - 2) // into the ground a few metres ahead
    await drawFull(page)
    await release(page)
  }
}

/** 'lateral' slides on world.tick. Find the elevation on the moving target, then lead it like a player: hold that raise
 * over its next turning point, where it dwells, and let go one flight time before it arrives. */
async function shootLateral(page: Page, t: Extract<TargetDef, { kind: 'lateral' }>) {
  const before = await hittableCount(page)
  const at = (tick: number): Point => ({ x: t.pos[0] + Math.sin((tick / t.periodTicks) * Math.PI * 2) * t.amplitude, y: 0.36, z: t.pos[2] })
  const now = () => page.evaluate(() => window.__bk.world.tick)
  await face(page, centreOf(t))
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const start = await projectToScreen(page, at(await now()))
    await page.mouse.move(start.x, start.y)
    await drawFull(page)
    const lock = await raiseUntilLocked(page, async () => at(await now()))
    const p = await player(page)
    const flight = Math.round((Math.hypot(t.pos[0] - p.x, t.pos[2] - p.z) / BALANCE.arrow.SPEED) * BALANCE.loop.HZ)
    const half = t.periodTicks / 2
    const quarter = t.periodTicks / 4
    const arrive = quarter + Math.ceil(((await now()) + 40 + flight - quarter) / half) * half
    const turn = await projectToScreen(page, at(arrive))
    await page.mouse.move(turn.x, turn.y - (lock?.raise ?? 16))
    await pollUntil(page, () => page.evaluate((n) => window.__bk.world.tick >= n, arrive - flight), 30_000)
    await release(page)
    if ((await hittableCount(page)) < before) return
    console.log(`lateral attempt ${attempt + 1} missed (lock raise ${lock?.raise ?? 'none'})`)
  }
  throw new Error('the lateral target was never hit')
}

/** The astra is a hitscan along the cursor: cursor on the target, hold the cast key for the full charge, let go. */
async function castAstraAt(page: Page, p: Point) {
  const before = await hittableCount(page)
  const s = await projectToScreen(page, p)
  await page.mouse.move(s.x, s.y)
  await waitFrames(page)
  await page.keyboard.down('q')
  await pollUntil(page, () => page.evaluate((n) => window.__bk.world.astraCharge.ticks >= n, BALANCE.astra.CHARGE_TICKS))
  await page.keyboard.up('q')
  await pollUntil(page, async () => (await hittableCount(page)) < before, 5_000)
  expect(await hittableCount(page)).toBeLessThan(before)
}

async function retryRestoresTheRange(page: Page) {
  await expect(page.getByTestId('result-title')).toHaveText(UI['result.fail'])
  expect(await hittableCount(page)).toBe(4) // the one hit target is down
  await page.getByTestId('result-continue').click()
  // A new attempt: every target back and standing, a full quiver, no intro narration replayed.
  const objective = page.getByTestId('hud-objective')
  await expect(objective).toContainText(UI['objective.talk'].replace('{npc}', UI['name.vishwamitra']), { timeout: 180_000 })
  await expect(page.getByTestId('dialogue')).toBeHidden()
  await pollUntil(page, async () => (await hittableCount(page)) === 5, 60_000)
  expect(await hittableCount(page)).toBe(5)
  await waitFrames(page)
  expect(await page.evaluate(() => window.__bk.world.hittable.every((o) => o.visible))).toBe(true)
  expect(await page.evaluate(() => window.__bk.game.getState())).toMatchObject({ attempt: 1, arrows: BALANCE.player.START_ARROWS })
}

test('Level 4: a loss, a retry that restores all five targets, then the trial with the mouse', async ({ page }) => {
  await page.goto('/?debug')
  await expect(page.getByTestId('title')).toBeVisible({ timeout: 60_000 })
  await page.getByTestId('title-continue').click()
  await expect(page.getByTestId('loading-title')).toHaveText(DIALOGUE['l4.title'].lines[0])
  await expect(page.getByTestId('dialogue-text')).toContainText(DIALOGUE['l4.intro'].lines[0].slice(0, 20), { timeout: 120_000 })
  await skipSpeech(page, '')

  await loseTheLevel(page)
  await retryRestoresTheRange(page)
  const objective = page.getByTestId('hud-objective')

  const vish = NPCS.find((n) => n.npc === 'vishwamitra')!
  const prompt = page.getByTestId('hud-prompt')
  expect(await steerTo(page, { x: vish.pos[0], z: vish.pos[2] }, () => prompt.isVisible())).toBe(true)
  await page.keyboard.press('e')
  await skipSpeech(page, UI['name.vishwamitra'])
  await strikeTheStrawMan(page)
  await expect(objective).toContainText(UI['objective.reach'])

  // The firing line is behind the player: an edge arrow points at it, then the marker is on screen once he turns.
  const indicator = page.getByTestId('waypoint-indicator')
  const firingLine = { x: L4.waypoints.firingLine[0], z: L4.waypoints.firingLine[2] }
  await expect(indicator).toHaveAttribute('data-state', 'offscreen')
  await page.screenshot({ path: 'docs/screenshots/l4-waypoint-offscreen.png' })
  await face(page, firingLine)
  await expect(indicator).toHaveAttribute('data-state', 'onscreen')
  await page.screenshot({ path: 'docs/screenshots/l4-waypoint.png' })
  expect(await steerTo(page, firingLine, () => objective.textContent().then((t) => !t?.includes(UI['objective.reach'])))).toBe(true)
  await expect(objective).toContainText(hitText(0))
  await expect(indicator).toHaveAttribute('data-state', 'none')

  for (const kind of ['static', 'longRange', 'occluded'] as const) await shootUntilHit(page, async () => centreOf(target(kind)))
  await page.screenshot({ path: 'docs/screenshots/l4-firing-line.png' })
  await shootLateral(page, target('lateral'))
  await expect(objective).toContainText(hitText(4))

  // The astraOnly target: a plain arrow that lands on it bounces off; only the astra brings it down.
  const astra = centreOf(target('astraOnly'))
  const before = await hittableCount(page)
  await face(page, astra)
  expect(await shoot(page, async () => astra)).toBe(true)
  expect(await hittableCount(page)).toBe(before)
  // castAstra counts the chargeAstra objective in the same tick as the hit, so the level completes at once.
  await castAstraAt(page, astra)

  await expect(page.getByTestId('result-title')).toHaveText(UI['result.win'])
  const card = CODEX.find((c) => c.id === L4.codexCard)!
  await expect(page.getByTestId('codex-unlock')).toContainText(card.title)
  await page.getByTestId('result-continue').click()
  await answerQuiz(page)
  await expect(page.getByTestId('dialogue-text')).toContainText(DIALOGUE['l4.outro'].lines[0].slice(0, 20))
  await skipSpeech(page, '')
  await expect(page.getByTestId('loading-title')).toHaveText(DIALOGUE['l5.title'].lines[0])
})
