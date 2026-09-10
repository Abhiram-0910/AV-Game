// Drives the real build through Level 1: load, walk, talk four times, win, codex unlock,
// outro, hand-off to Level 2's loading screen. Reads the perf overlay and refuses to pass
// over the frame budgets. Steering reads the debug handle; it never writes game state.
import { expect, test, type Page } from '@playwright/test'
import { BALANCE } from '../../src/data/balance'
import { CODEX } from '../../src/data/codex'
import { DIALOGUE, UI } from '../../src/data/dialogue'
import { LEVELS } from '../../src/data/levels'
import { SCENERY } from '../../src/data/scenery'

declare global {
  interface Window {
    __bk: { world: { player: { x: number; z: number; yaw: number }; hittable: readonly unknown[]; enemies: readonly { x: number; z: number; health: number; state: string }[] } }
  }
}

const L1 = LEVELS[0]
const SCENE = SCENERY.l1!
const TRIANGLE_BUDGET = 120_000
const DRAW_CALL_BUDGET = 80
const SETTLE_MS = 80

// SwiftShader on WSL runs the whole level at ~5–10 fps; a real GPU finishes in well under a minute.
test.setTimeout(480_000)

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

/** Tap A/D for roughly the time the turn needs; the sim runs near real time under SwiftShader. */
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

/** Face the target, then walk toward it, re-facing if the heading drifts, until `arrived`. */
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

async function talkTo(page: Page, npc: (typeof SCENE.npcs)[number]['npc'], dialogueKey: keyof typeof DIALOGUE) {
  const spot = SCENE.npcs.find((n) => n.npc === npc)!
  const prompt = page.getByTestId('hud-prompt')
  await steerTo(page, { x: spot.pos[0], z: spot.pos[2] }, () => prompt.isVisible())
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
  await expect(page.getByTestId('loading')).toBeVisible()
  await expect(page.getByTestId('loading-title')).toHaveText(DIALOGUE['l1.title'].lines[0])

  // Intro narration, then play.
  const intro = page.getByTestId('dialogue-text')
  await expect(intro).toContainText(DIALOGUE['l1.intro'].lines[0].slice(0, 24), { timeout: 120_000 })
  await skipSpeech(page, '')
  const objective = page.getByTestId('hud-objective')
  await expect(objective).toContainText(UI['objective.reach'])

  // Walk to the throne.
  const throne = L1.waypoints.throne
  await steerTo(page, { x: throne[0], z: throne[2] }, () => objective.textContent().then((t) => !t?.includes(UI['objective.reach'])))
  await expect(objective).toContainText(UI['name.vishwamitra'])
  await page.screenshot({ path: 'docs/screenshots/l1-court.png' })

  // Budgets, read from the overlay while the whole court is on screen.
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

  // The four conversations, in the authored order.
  for (const o of L1.objectives) {
    if (o.kind === 'talk') await talkTo(page, o.npc as (typeof SCENE.npcs)[number]['npc'], o.dialogueKey as keyof typeof DIALOGUE)
  }

  // Win, codex unlock, outro, Level 2 loading.
  await expect(page.getByTestId('result-title')).toHaveText(UI['result.win'])
  const card = CODEX.find((c) => c.id === L1.codexCard)!
  await expect(page.getByTestId('codex-unlock')).toContainText(UI['codex.unlocked'])
  await expect(page.getByTestId('codex-unlock')).toContainText(card.title)
  await page.getByTestId('result-continue').click()
  await expect(page.getByTestId('dialogue-text')).toContainText(DIALOGUE['l1.outro'].lines[0].slice(0, 20))
  await skipSpeech(page, '')
  await expect(page.getByTestId('loading')).toBeVisible()
  await expect(page.getByTestId('loading-title')).toHaveText(DIALOGUE['l2.title'].lines[0])
})
