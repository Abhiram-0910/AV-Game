// The bow as a player uses it, driven by raw mouse coordinates only; no pitch is solved anywhere in this file. Covers
// the playtest failures between the mouse and the arrow: a near-vertical launch (pitch came from the cursor's offset
// from the screen centre, 27° at the top edge), the reticle stuck on Rama's back, and the hit itself.
import { expect, test } from '@playwright/test'
import { BALANCE } from '../../src/data/balance'
import { DIALOGUE } from '../../src/data/dialogue'
import { LEVELS } from '../../src/data/levels'
import { drawFull, face, hittableCount, raiseUntilLocked, release, seedSave, skipSpeech, waitFrames } from './play'

const L4 = LEVELS[3]
const AIM = BALANCE.archeryAim

test.setTimeout(600_000)
test.beforeEach(({ page }) => seedSave(page, 'l4'))

test('the bow aims where the mouse points: flat launches, a hit from raw mouse coordinates, a reticle only on a lock', async ({ page }) => {
  await page.goto('/?debug')
  await page.getByTestId('title-continue').click({ timeout: 60_000 })
  await expect(page.getByTestId('dialogue-text')).toContainText(DIALOGUE['l4.intro'].lines[0].slice(0, 20), { timeout: 180_000 })
  await skipSpeech(page, '')
  const reticle = page.getByTestId('crosshair-reticle')
  const { width, height } = page.viewportSize()!

  // Walking with the bow drawn nowhere: nothing sits on Rama's back.
  await page.keyboard.down('w')
  await page.waitForTimeout(600)
  await page.keyboard.up('w')
  await expect(reticle).toHaveCount(0)

  const t = L4.targets.find((k) => k.kind === 'static')!
  const centre = { x: t.pos[0], y: 0.36, z: t.pos[2] }
  await face(page, centre)
  await page.waitForTimeout(4_000) // the level-open camera move has landed

  // The centre and every screen edge launch inside the aim limits.
  const edges: [string, number, number][] = [
    ['centre', width / 2, height / 2],
    ['top', width / 2, 1],
    ['bottom', width / 2, height - 1],
    ['left', 1, height / 2],
    ['right', width - 1, height / 2],
  ]
  for (const [name, x, y] of edges) {
    await page.mouse.move(x, y)
    await drawFull(page)
    await waitFrames(page)
    const pitch = await page.evaluate(() => Math.asin(window.__bk.world.aimDir[1]))
    console.log(`mouse ${name} (${x}, ${y}): launch pitch ${pitch.toFixed(3)} rad`)
    expect(pitch, name).toBeLessThanOrEqual(AIM.AIM_MAX_UP + 1e-3)
    expect(pitch, name).toBeGreaterThanOrEqual(-AIM.AIM_MAX_DOWN - 1e-3)
    await release(page)
  }
  expect(await hittableCount(page)).toBe(5)

  // Drawn at bare ground: the gauge, but no reticle.
  await page.mouse.move(width / 2, height * 0.8)
  await drawFull(page)
  await waitFrames(page)
  await expect(page.getByTestId('crosshair')).toHaveAttribute('data-drawing', 'true')
  await expect(reticle).toHaveCount(0)

  // The shot: cursor on the target's pixels, raised until the arc locks, released.
  const cursor = await raiseUntilLocked(page, async () => centre)
  expect(cursor, 'the arc never locked on the static target').not.toBeNull()
  const box = (await reticle.boundingBox())!
  expect(Math.hypot(box.x + box.width / 2 - cursor!.x, box.y + box.height / 2 - cursor!.y)).toBeLessThan(8)
  expect(Math.hypot(cursor!.x - width / 2, cursor!.y - height / 2)).toBeGreaterThan(60)
  await page.screenshot({ path: 'docs/screenshots/archery-mouse-lock.png' })
  await release(page)
  expect(await hittableCount(page)).toBe(4)
  expect(await page.evaluate(() => window.__bk.game.getState().objectives[2].progress)).toBe(1)
})
