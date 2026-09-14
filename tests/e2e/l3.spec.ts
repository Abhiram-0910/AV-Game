// Drives the real build through Level 3: the forest edge, Vishwamitra's case for duty and Rama's resolve (the
// hesitation beat), the clearing, Tataka's appearance, and the fight itself: real arrows aimed with raw mouse
// coordinates (tests/e2e/play.ts) against the live enemy AI. Seeds a save with L1 and L2 completed.
import { expect, test, type Page } from '@playwright/test'
import { CODEX } from '../../src/data/codex'
import { DIALOGUE, UI } from '../../src/data/dialogue'
import { LEVELS } from '../../src/data/levels'
import { SCENERY } from '../../src/data/scenery'
import { answerQuiz, face, headingError, inPlay, player, seedSave, shoot, skipSpeech, steerTo } from './play'

const L3 = LEVELS[2]
const NPCS = SCENERY.l3!.npcs
/** Tataka is the female mesh at 1.6x: about 2.9 m tall. */
const TATAKA_CENTRE_Y = 1.4

test.setTimeout(900_000)
test.beforeEach(({ page }) => seedSave(page, 'l3'))

async function enemy(page: Page) {
  return page.evaluate(() => {
    const e = window.__bk.world.enemies[0]
    return e ? { x: e.x, z: e.z, health: e.health, state: e.state } : null
  })
}

/** Tataka moves and fights back: face her, then aim at where she is at every step of the draw. */
async function fightTataka(page: Page) {
  for (let i = 0; i < 40; i += 1) {
    const e = await enemy(page)
    if (!e || e.state === 'dead' || !(await inPlay(page))) return
    // The cursor aims across the view; only turn when she is well off to the side.
    if (Math.abs(headingError(await player(page), e)) > 0.5) await face(page, e)
    const locked = await shoot(page, async () => {
      const now = (await enemy(page)) ?? e
      return { x: now.x, y: TATAKA_CENTRE_Y, z: now.z }
    })
    console.log(`shot ${i}: state=${e.state} health=${e.health} pos=${e.x.toFixed(1)},${e.z.toFixed(1)} locked=${locked}`)
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
  expect(await steerTo(page, { x: forestEdge[0], z: forestEdge[2] }, () => objective.textContent().then((t) => !t?.includes(UI['objective.reach'])))).toBe(true)
  const prompt = page.getByTestId('hud-prompt')
  expect(await steerTo(page, { x: vishwamitra.pos[0], z: vishwamitra.pos[2] }, () => prompt.isVisible())).toBe(true)
  await page.keyboard.press('e')
  const dialogue = page.getByTestId('dialogue')
  await expect(dialogue).toBeVisible()
  await expect(page.getByTestId('dialogue-speaker')).toHaveText(UI['name.vishwamitra'])
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('dialogue-speaker')).toHaveText(UI['name.rama'])
  await skipSpeech(page, UI['name.rama'])
  await expect(objective).toContainText(UI['objective.reach'])
  await expect(page.getByTestId('waypoint-indicator')).not.toHaveAttribute('data-state', 'none')

  // The clearing: Tataka appears (auto-chained).
  const clearing = L3.waypoints.clearing
  expect(await steerTo(page, { x: clearing[0], z: clearing[2] }, () => objective.textContent().then((t) => !t?.includes(UI['objective.reach'])))).toBe(true)
  await skipSpeech(page, UI['name.tataka'])
  await expect(page.getByTestId('hud-boss')).toBeVisible()
  await expect(objective).toContainText(UI['name.tataka'])
  await page.screenshot({ path: 'docs/screenshots/l3-clearing.png' })

  await fightTataka(page)
  await expect(page.getByTestId('hud-boss')).toBeHidden()

  await expect(page.getByTestId('result-title')).toHaveText(UI['result.win'])
  const card = CODEX.find((c) => c.id === L3.codexCard)!
  await expect(page.getByTestId('codex-unlock')).toContainText(card.title)
  await page.getByTestId('result-continue').click()
  await answerQuiz(page)
  await expect(page.getByTestId('dialogue-text')).toContainText(DIALOGUE['l3.outro'].lines[0].slice(0, 20))
  await skipSpeech(page, '')
  await expect(page.getByTestId('loading-title')).toHaveText(DIALOGUE['l4.title'].lines[0])
})
