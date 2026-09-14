// Drives the real build through Level 5: guard the yajna against every rakshasa wave, then defeat Subahu and Maricha
// (the single Manava astra charge, held back for him alone; arrows and fire pass over him).
// "Stand between them and the fire" (l5.intro): a rakshasa turns on Rama when he is nearer to it than the fire and within
// yajna.ENGAGE_RADIUS (systems/ai/enemy-ai.ts). So the bot does what a player does: steps onto the line between the fire
// and the rakshasa closest to it, and cuts down whatever comes into sword reach (F).
// Sword only, no bow: under SwiftShader one aimed arrow cost the bot ~340 ticks while an engaged rakshasa hits every ~50,
// and one slash kills a rakshasa (melee.DAMAGE 35 > HEALTH 30). Keys are held across polls, as a player holds them:
// releasing and re-pressing every step cost ~165 ticks per short walk (probe, 2026-09-14), since every Playwright call
// waits on a SwiftShader frame.
import { expect, test, type Page } from '@playwright/test'
import { BALANCE } from '../../src/data/balance'
import { DIALOGUE, UI } from '../../src/data/dialogue'
import { LEVELS } from '../../src/data/levels'
import { headingError, seedSave, skipSpeech, waitFrames } from './play'

const L5 = LEVELS[4]
const ALTAR = { x: L5.waypoints.altar[0], z: L5.waypoints.altar[2] }
/** Where the guard stands on the fire-to-rakshasa line: outside the altar steps (2.9 m wide), inside ENGAGE_RADIUS of
 * a rakshasa halted at the fire. */
const GUARD_RADIUS = 2.6
/** Slash when an enemy is this close: under melee.RANGE, so it is still in reach after a poll of approach. */
const SLASH_DIST = BALANCE.melee.RANGE - 0.3
/** The sword's cone is ±60°; inside this heading error a slash lands. Manava's cone is also ±60°. */
const CONE_TOL = 0.9
/** Heading error tolerated while walking; tighter would oscillate, one poll turns Rama ~0.75 rad under SwiftShader. */
const WALK_TOL = 0.5
/** Cast Manava only well inside its range, so Maricha is still in the cone when the charge lets go. */
const ASTRA_DIST = BALANCE.astra.manavastra.CONE_RANGE - 1.5

// The fight loop alone may run HARD_STOP_MS (12 min).
test.setTimeout(1_200_000)
test.beforeEach(({ page }) => seedSave(page, 'l5'))

interface Sighted {
  x: number
  z: number
  kind: string
}

interface Fight {
  tick: number
  phase: string
  charges: number
  charge: number
  p: { x: number; z: number; yaw: number }
  enemies: Sighted[]
}

async function fight(page: Page): Promise<Fight> {
  return page.evaluate(() => {
    const { game, world } = window.__bk
    const g = game.getState() as ReturnType<typeof game.getState> & { astraCharges: number }
    const p = world.player
    return {
      tick: world.tick,
      phase: g.phase,
      charges: g.astraCharges,
      charge: world.astraCharge.ticks,
      p: { x: p.x, z: p.z, yaw: p.yaw },
      enemies: world.enemies.filter((e) => e.state !== 'dead').map((e) => ({ x: e.x, z: e.z, kind: e.kind })),
    }
  })
}

const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z)

/** Keys held right now. `hold` presses and releases only what changed since the last poll. */
function keyboard(page: Page) {
  const held = new Set<string>()
  return async (want: readonly string[]) => {
    for (const k of [...held]) {
      if (!want.includes(k)) {
        await page.keyboard.up(k)
        held.delete(k)
      }
    }
    for (const k of want) {
      if (!held.has(k)) {
        await page.keyboard.down(k)
        held.add(k)
      }
    }
  }
}

/** A turn key toward `target` when the heading is off by more than `tol`. */
function turnKey(f: Fight, target: { x: number; z: number }, tol: number): string[] {
  const err = headingError(f.p, target)
  return Math.abs(err) > tol ? [err > 0 ? 'a' : 'd'] : []
}

interface Plan {
  keys: string[]
  slash: boolean
  label: string
}

/** One poll of decisions, the way a player makes them. */
function decide(f: Fight): Plan {
  const maricha = f.enemies.find((e) => e.kind === 'maricha')
  // Hold Q facing Maricha once he is close; letting go casts, so let go only charged and with him in the cone.
  if (maricha && f.charges > 0 && dist(maricha, f.p) < ASTRA_DIST) {
    const aimed = Math.abs(headingError(f.p, maricha)) <= CONE_TOL / 2
    const release = aimed && f.charge >= BALANCE.astra.CHARGE_TICKS
    return { keys: [...turnKey(f, maricha, CONE_TOL / 2), ...(release ? [] : ['q'])], slash: false, label: release ? 'cast' : 'charge' }
  }
  // Maricha only answers to the astra: the sword is for everyone else.
  const foes = f.enemies.filter((e) => e.kind !== 'maricha')
  const close = foes.filter((e) => dist(e, f.p) <= SLASH_DIST).sort((a, b) => dist(a, f.p) - dist(b, f.p))[0]
  if (close) {
    const keys = turnKey(f, close, CONE_TOL)
    return { keys, slash: keys.length === 0, label: `slash ${close.kind}` }
  }
  const threat = [...foes, ...(maricha ? [maricha] : [])].sort((a, b) => dist(a, ALTAR) - dist(b, ALTAR))[0]
  if (!threat) return { keys: [], slash: false, label: 'idle' }
  const d = Math.max(dist(threat, ALTAR), 1e-3)
  const post = { x: ALTAR.x + ((threat.x - ALTAR.x) / d) * GUARD_RADIUS, z: ALTAR.z + ((threat.z - ALTAR.z) / d) * GUARD_RADIUS }
  if (dist(post, f.p) > 1.0) {
    const walk = Math.abs(headingError(f.p, post)) < 1.2 ? ['w'] : []
    return { keys: [...turnKey(f, post, WALK_TOL), ...walk], slash: false, label: 'walk' }
  }
  return { keys: turnKey(f, threat, CONE_TOL), slash: false, label: 'hold' }
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
  // L5 unlocks both astras and selects Agneyastra first (game-state.ts unlockAstra); only Manava flings Maricha.
  await page.keyboard.press('Digit2')
  await page.screenshot({ path: 'docs/screenshots/l5-guard-position.png' })

  const hold = keyboard(page)
  const resultTitle = page.getByTestId('result-title')
  const start = Date.now()
  const HARD_STOP_MS = 720_000
  while (Date.now() - start < HARD_STOP_MS) {
    const f = await fight(page)
    if (f.phase !== 'play') break
    const plan = decide(f)
    await hold(plan.keys)
    if (plan.slash) await page.keyboard.press('f')
    if (plan.label === 'idle') await waitFrames(page, 1)
  }
  await hold([])

  await page.screenshot({ path: 'docs/screenshots/l5-fight-end.png' })
  await expect(resultTitle).toHaveText(UI['result.win'], { timeout: 5_000 })
  await page.getByTestId('result-continue').click()
  await expect(page.getByTestId('ending-title')).toHaveText(UI['result.complete'])
  await expect(page.getByTestId('ending-codex-count')).toContainText(`/${5}`)
  await page.screenshot({ path: 'docs/screenshots/l5-ending.png' })
})
