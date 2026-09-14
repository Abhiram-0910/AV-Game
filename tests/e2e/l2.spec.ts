// Drives the real build through Level 2: walk to the riverbank, mantras, walk to the range, the bow lesson, then three
// real arrows at the three static targets, aimed with raw mouse coordinates the way a player aims (tests/e2e/play.ts).
// Seeds a save with L1 completed so the run starts on L2 directly.
import { expect, test, type Page } from '@playwright/test'
import { CODEX } from '../../src/data/codex'
import { DIALOGUE, UI } from '../../src/data/dialogue'
import { LEVELS } from '../../src/data/levels'
import { answerQuiz, seedSave, shootUntilHit, skipSpeech, steerTo } from './play'

const L2 = LEVELS[1]

// L2's world is bigger than L1's court and adds three aimed shots; SwiftShader runs it at ~5-10 fps.
test.setTimeout(900_000)
test.beforeEach(({ page }) => seedSave(page, 'l2'))

async function talkTo(page: Page, at: { x: number; z: number }) {
  const prompt = page.getByTestId('hud-prompt')
  expect(await steerTo(page, at, () => prompt.isVisible())).toBe(true)
  await page.keyboard.press('e')
  await skipSpeech(page, UI['name.vishwamitra'])
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
  // The spawn faces +Z and the riverbank is 18 m behind it: the edge arrow points the player round.
  await expect(page.getByTestId('waypoint-indicator')).toHaveAttribute('data-state', 'offscreen')

  const riverbank = L2.waypoints.riverbank
  await talkTo(page, { x: riverbank[0], z: riverbank[2] })

  // Vishwamitra has already relocated to the range (a position change on the same built character). Bow lesson.
  const range = L2.waypoints.range
  await talkTo(page, { x: range[0] - 1.5, z: range[2] })
  await expect(objective).toContainText(UI['objective.hitTargets'].replace('{done}', '0').replace('{total}', '3'))
  await page.screenshot({ path: 'docs/screenshots/l2-range.png' })

  for (const t of L2.targets) await shootUntilHit(page, async () => ({ x: t.pos[0], y: 0.36, z: t.pos[2] }))

  await expect(page.getByTestId('result-title')).toHaveText(UI['result.win'])
  const card = CODEX.find((c) => c.id === L2.codexCard)!
  await expect(page.getByTestId('codex-unlock')).toContainText(card.title)
  await page.getByTestId('result-continue').click()
  await answerQuiz(page)
  await expect(page.getByTestId('dialogue-text')).toContainText(DIALOGUE['l2.outro'].lines[0].slice(0, 20))
  await skipSpeech(page, '')
  await expect(page.getByTestId('loading-title')).toHaveText(DIALOGUE['l3.title'].lines[0])
})
