// Drives the real build through Level 1: load, walk, talk four times, win, codex unlock,
// outro, hand-off to Level 2's loading screen. Reads the perf overlay and refuses to pass
// over the frame budgets. Steering reads the debug handle; it never writes game state.
import { expect, test, type Page } from '@playwright/test'
import { BALANCE } from '../../src/data/balance'
import { CODEX } from '../../src/data/codex'
import { DIALOGUE, UI } from '../../src/data/dialogue'
import { LEVELS } from '../../src/data/levels'
import { SCENERY } from '../../src/data/scenery'
import { answerQuiz, face, headingError, player, pollUntil, skipSpeech, steerTo } from './play'

const L1 = LEVELS[0]
const SCENE = SCENERY.l1!
const TRIANGLE_BUDGET = 120_000
const DRAW_CALL_BUDGET = 80

// SwiftShader on WSL runs the whole level at ~5–10 fps; a real GPU finishes in well under a minute. The spec now walks up
// to each speaker's face in short steps and waits for both to turn, and one run with identical helpers took 5.4 min
// while the next ran past 8, so it gets the same 900 s as L2 and L3.
test.setTimeout(900_000)

async function talkTo(page: Page, npc: (typeof SCENE.npcs)[number]['npc'], dialogueKey: keyof typeof DIALOGUE) {
  const spot = SCENE.npcs.find((n) => n.npc === npc)!
  const prompt = page.getByTestId('hud-prompt')
  expect(await steerTo(page, { x: spot.pos[0], z: spot.pos[2] }, () => prompt.isVisible())).toBe(true)
  await page.keyboard.press('e')
  await skipSpeech(page, UI[`name.${npc}`])
  // The objective advances, or the level is won and the HUD is gone.
  await expect
    .poll(async () => ((await page.getByTestId('result').isVisible()) ? '' : ((await page.getByTestId('hud-objective').textContent()) ?? '')))
    .not.toContain(UI[`name.${npc}`])
  return dialogueKey
}

test('Level 1 plays end to end on real assets', async ({ page }) => {
  await page.goto('/?debug')
  await expect(page.getByTestId('title')).toBeVisible({ timeout: 60_000 })
  await page.getByTestId('title-start').click()
  await expect(page.getByTestId('loading')).toBeVisible()
  await expect(page.getByTestId('loading-title')).toHaveText(DIALOGUE['l1.title'].lines[0])

  // Intro narration, then play.
  const intro = page.getByTestId('dialogue-text')
  await expect(intro).toContainText(DIALOGUE['l1.intro'].lines[0].slice(0, 24), { timeout: 120_000 })
  await skipSpeech(page, '')
  const objective = page.getByTestId('hud-objective')
  await expect(objective).toContainText(UI['objective.reach'])

  // Pause and resume: Escape opens the menu without touching the level phase machine, and the
  // player's position must not have moved while frozen.
  const before = await player(page)
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('pause')).toBeVisible()
  await page.getByTestId('pause-resume').click()
  await expect(page.getByTestId('pause')).toBeHidden()
  expect(await player(page)).toEqual(before)

  // The throne is marked from the entrance: the ring and beam are on screen.
  await expect(page.getByTestId('waypoint-indicator')).toHaveAttribute('data-state', 'onscreen')
  await page.screenshot({ path: 'docs/screenshots/l1-waypoint.png' })

  // Walk straight at Vishwamitra, not the throne. The throne waypoint lies behind him; the prompt must still show in
  // front of him, and E must work there (the playtester only got it after walking past and behind him).
  const vish = SCENE.npcs.find((n) => n.npc === 'vishwamitra')!
  const prompt = page.getByTestId('hud-prompt')
  // Come at him from the front, as a player does: a spot 3.5 m ahead of him along his facing, then in short steps, so
  // SwiftShader's slow polls cannot carry the bot through his prompt zone and around him onto the throne.
  const front = { x: vish.pos[0] + Math.sin(vish.yaw) * 3.5, z: vish.pos[2] + Math.cos(vish.yaw) * 3.5 }
  expect(await steerTo(page, front, async () => { const q = await player(page); return Math.hypot(q.x - front.x, q.z - front.z) < 0.8 })).toBe(true)
  for (let step = 0; step < 40 && !(await prompt.isVisible()); step += 1) {
    await face(page, { x: vish.pos[0], z: vish.pos[2] })
    await page.keyboard.down('w')
    await page.waitForTimeout(120)
    await page.keyboard.up('w')
    await page.waitForTimeout(250)
  }
  await expect(prompt).toBeVisible()
  expect(await page.evaluate(() => window.__bk.game.getState().objectives[0].done), 'the throne is still ahead').toBe(false)
  const there = await player(page)
  expect(Math.hypot(there.x - L1.waypoints.throne[0], there.z - L1.waypoints.throne[2])).toBeGreaterThan(BALANCE.interaction.REACH_RADIUS)
  await page.keyboard.press('e')
  await expect(page.getByTestId('dialogue')).toBeVisible()
  // Hero and NPC turn to face each other while they talk.
  const facing = () =>
    page.evaluate(() => {
      const p = window.__bk.world.player
      const n = window.__bk.world.npcs.find((k) => k.id === 'vishwamitra')!
      return { p: { x: p.x, z: p.z, yaw: p.yaw }, n: { x: n.x, z: n.z, yaw: n.yaw } }
    })
  await pollUntil(page, async () => {
    const f = await facing()
    return Math.abs(headingError(f.p, f.n)) < 0.2 && Math.abs(headingError(f.n, f.p)) < 0.2
  }, 10_000)
  const f = await facing()
  expect(Math.abs(headingError(f.p, f.n)), 'Rama faces Vishwamitra').toBeLessThan(0.2)
  expect(Math.abs(headingError(f.n, f.p)), 'Vishwamitra faces Rama').toBeLessThan(0.2)
  expect(await page.evaluate(() => window.__bk.game.getState().objectives[0].done), 'arriving at him counts as the throne').toBe(true)
  await page.screenshot({ path: 'docs/screenshots/l1-talk-facing.png' })
  await skipSpeech(page, UI['name.vishwamitra'])
  await expect(objective).toContainText(UI['name.dasharatha'])
  await page.screenshot({ path: 'docs/screenshots/l1-court.png' })

  // Budgets, read from the overlay with the court in view.
  const num = async (id: string) => Number(await page.getByTestId(id).textContent())
  const stats = {
    triangles: await num('perf-triangles'),
    calls: await num('perf-calls'),
    skinned: await num('perf-skinned'),
    peak: await num('perf-skinned-peak'),
    renderer: await page.getByTestId('perf-renderer').textContent(),
  }
  console.log(JSON.stringify(stats))
  expect(stats.skinned).toBe(L1.persistentSkinned.length)
  expect(stats.peak).toBeLessThanOrEqual(BALANCE.spawn.MAX_SKINNED)
  expect(stats.triangles).toBeGreaterThan(50_000)
  expect(stats.triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  expect(stats.calls).toBeLessThanOrEqual(DRAW_CALL_BUDGET)

  // The remaining three conversations, in the authored order.
  for (const o of L1.objectives.slice(2)) {
    if (o.kind === 'talk') await talkTo(page, o.npc as (typeof SCENE.npcs)[number]['npc'], o.dialogueKey as keyof typeof DIALOGUE)
  }

  // Win, codex unlock, outro, Level 2 loading.
  await expect(page.getByTestId('result-title')).toHaveText(UI['result.win'])
  const card = CODEX.find((c) => c.id === L1.codexCard)!
  await expect(page.getByTestId('codex-unlock')).toContainText(UI['codex.unlocked'])
  await expect(page.getByTestId('codex-unlock')).toContainText(card.title)
  await page.getByTestId('result-continue').click()
  await answerQuiz(page)
  await expect(page.getByTestId('dialogue-text')).toContainText(DIALOGUE['l1.outro'].lines[0].slice(0, 20))
  await skipSpeech(page, '')
  // Most of L2's characters/clips are already cached from L1, so its loading screen can be
  // brief — check the title text directly instead of two sequential assertions, which leaves
  // a gap a very fast load could slip through entirely.
  await expect(page.getByTestId('loading-title')).toHaveText(DIALOGUE['l2.title'].lines[0], { timeout: 15_000 })
})
