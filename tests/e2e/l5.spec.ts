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
import { face, player, pollUntil, projectToScreen, seedSave, shoot, skipSpeech, steerTo, waitFrames, type Point } from './play'

const L5 = LEVELS[4]
/** A rakshasa is the male mesh at 1.1x: about 2 m tall. */
const ENEMY_CENTRE_Y = 1.0

// The fight loop alone may run HARD_STOP_MS (12 min); the aim now waits for the arc to settle before each release.
test.setTimeout(1_200_000)
test.beforeEach(({ page }) => seedSave(page, 'l5'))

/** One arrow at the nearest live enemy, aimed with raw mouse coordinates and tracking it through the draw. */
async function fireAt(page: Page, target: Sighted) {
  await face(page, target)
  await shoot(page, async () => {
    const now = (await nearestEnemy(page)) ?? target
    return { x: now.x, y: ENEMY_CENTRE_Y, z: now.z }
  })
}

/** The single Manava astra charge, held back for Maricha alone. Manava is a cone ahead of Rama, so facing him is the aim. */
async function castAstraAt(page: Page, target: Point) {
  await face(page, target)
  const s = await projectToScreen(page, target)
  await page.mouse.move(s.x, s.y)
  await waitFrames(page)
  // L5 unlocks both astras and selects Agneyastra first (game-state.ts unlockAstra); only Manava flings Maricha.
  await page.keyboard.press('Digit2')
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
      await fireAt(page, target)
    }
  }

  await page.screenshot({ path: 'docs/screenshots/l5-fight-end.png' })
  await expect(resultTitle).toHaveText(UI['result.win'], { timeout: 5_000 })
  await page.getByTestId('result-continue').click()
  await expect(page.getByTestId('ending-title')).toHaveText(UI['result.complete'])
  await expect(page.getByTestId('ending-codex-count')).toContainText(`/${5}`)
  await page.screenshot({ path: 'docs/screenshots/l5-ending.png' })
})
