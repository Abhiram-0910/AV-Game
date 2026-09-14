// Mouse look as a player gets it by default: the click-to-look overlay engages pointer lock, the mouse turns Rama, a
// draw hands the mouse to the aim and a shot lands, Escape and a dropped lock pause and give the cursor back, Resume and
// [M] take it again. A second test blocks pointer lock the way a lab policy does. Headless Chromium grants a real lock,
// but CDP cannot inject input under it cleanly: each injected move or button press arrives with a large warp movement
// (measured 2026-09-14: a mouse.down threw the virtual cursor to the top edge). So while locked, movement is dispatched as
// mousemove events carrying movementX/Y, and the bow as mousedown/mouseup, to the page's own listeners.
import { expect, type Page, test } from '@playwright/test'
import { BALANCE } from '../../src/data/balance'
import { DIALOGUE } from '../../src/data/dialogue'
import { LEVELS } from '../../src/data/levels'
import { face, hittableCount, pollUntil, projectToScreen, seedSave, shoot, skipSpeech, waitFrames, type Point } from './play'

const L4 = LEVELS[3]
const LOOK = BALANCE.mouseLook
const t = L4.targets.find((k) => k.kind === 'static')!
const STATIC: Point = { x: t.pos[0], y: 0.36, z: t.pos[2] }

test.setTimeout(600_000)

async function openL4(page: Page) {
  await page.goto('/?debug')
  await page.getByTestId('title-continue').click({ timeout: 60_000 })
  await expect(page.getByTestId('dialogue-text')).toContainText(DIALOGUE['l4.intro'].lines[0].slice(0, 20), { timeout: 180_000 })
  await skipSpeech(page, '')
}

/** Locked mouse movement, in CSS px. */
async function moveLocked(page: Page, dx: number, dy: number) {
  await page.evaluate(([x, y]) => document.body.dispatchEvent(new MouseEvent('mousemove', { movementX: x, movementY: y, bubbles: true })), [dx, dy])
  await waitFrames(page, 3)
}

/** The left button while locked. Down: held until full draw. Up: until the arrow has left and landed. */
async function buttonLocked(page: Page, type: 'mousedown' | 'mouseup') {
  const quiver = await page.evaluate(() => window.__bk.game.getState().arrows)
  await page.evaluate((t) => document.body.dispatchEvent(new MouseEvent(t, { button: 0, bubbles: true })), type)
  if (type === 'mousedown') {
    await pollUntil(page, () => page.evaluate((n) => window.__bk.world.draw.ticks >= n, BALANCE.arrow.DRAW_TICKS))
    return
  }
  await pollUntil(page, () => page.evaluate((n) => window.__bk.game.getState().arrows < n, quiver), 5_000)
  await pollUntil(page, () => page.evaluate(() => window.__bk.world.arrows.length === 0))
}

const isLocked = (page: Page) => page.evaluate(() => document.pointerLockElement !== null)
const yaw = (page: Page) => page.evaluate(() => window.__bk.world.player.yaw)
const mode = (page: Page) => page.getByTestId('mouse-mode')

async function expectLocked(page: Page, locked: boolean) {
  await pollUntil(page, async () => (await isLocked(page)) === locked, 5_000)
  expect(await isLocked(page)).toBe(locked)
}

/** With the bow drawn under lock: move the virtual cursor onto the target's pixels, then raise it until the arc locks. */
async function aimLocked(page: Page, point: Point): Promise<boolean> {
  const crosshair = page.getByTestId('crosshair')
  for (let raise = 0; raise <= 240; raise += 3) {
    const s = await projectToScreen(page, point)
    const box = (await crosshair.boundingBox())!
    await moveLocked(page, s.x - (box.x + box.width / 2), s.y - raise - (box.y + box.height / 2))
    await waitFrames(page, 4)
    if ((await crosshair.getAttribute('data-target-locked')) === 'true') return true
  }
  return false
}

test('mouse look: engage, turn, aim and hit under lock, lose the lock to Escape and the browser, get it back', async ({ page }) => {
  await seedSave(page, 'l4', 'look')
  await openL4(page)
  await expect(mode(page)).toHaveAttribute('data-mode', 'engage')
  await expect(page.getByTestId('mouse-engage')).toBeVisible()
  await page.waitForTimeout(4_000) // the level-open camera move has landed
  await page.screenshot({ path: 'docs/screenshots/mouse-look-engage.png' })

  // The overlay click engages the lock and does not draw the bow.
  await page.getByTestId('mouse-engage').click()
  await expectLocked(page, true)
  await expect(mode(page)).toHaveAttribute('data-mode', 'look')
  expect(await page.evaluate(() => window.__bk.world.draw.drawing)).toBe(false)

  // Right turns Rama right by the measured amount; the arrow keys still turn him.
  const before = await yaw(page)
  await moveLocked(page, 120, 0)
  await pollUntil(page, async () => Math.abs((await yaw(page)) - before) > 0.2, 5_000)
  expect((await yaw(page)) - before).toBeCloseTo(-120 * LOOK.RAD_PER_PX_MOUSE, 1)
  const beforeKey = await yaw(page)
  await page.keyboard.down('ArrowLeft')
  await page.waitForTimeout(300)
  await page.keyboard.up('ArrowLeft')
  expect(await yaw(page)).toBeGreaterThan(beforeKey + 0.1)
  await page.screenshot({ path: 'docs/screenshots/mouse-look-look.png' })

  // A draw hands the mouse to the aim: movement steers the cursor, not Rama. Raise onto the static target and hit it.
  await face(page, STATIC)
  await buttonLocked(page, 'mousedown')
  await expect(mode(page)).toHaveAttribute('data-mode', 'aim-auto')
  // A draw eases the camera tilt back to the follow pose; from there AIM_CURSOR_START_Y launches flat at whatever Rama faces.
  const tilt = () => page.evaluate(() => (window.__bk.world as unknown as { cameraPitch: number }).cameraPitch)
  console.log(`camera tilt at the draw: ${(await tilt()).toFixed(3)} rad`)
  await pollUntil(page, async () => Math.abs(await tilt()) < 0.005, 10_000)
  await waitFrames(page, 8)

  const startPitch = await page.evaluate(() => Math.asin(window.__bk.world.aimDir[1]))
  console.log(`first locked draw: launch pitch ${startPitch.toFixed(3)} rad`)
  expect(Math.abs(startPitch)).toBeLessThan(0.05)
  const drawnYaw = await yaw(page)
  expect(await aimLocked(page, STATIC), 'the arc never locked under pointer lock').toBe(true)
  expect(Math.abs((await yaw(page)) - drawnYaw)).toBeLessThan(1e-6)
  await page.screenshot({ path: 'docs/screenshots/mouse-look-aim.png' })
  await buttonLocked(page, 'mouseup')
  expect(await hittableCount(page)).toBe(4)
  await expect(mode(page)).toHaveAttribute('data-mode', 'look')

  // Escape pauses and gives the cursor back; Resume takes it again.
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('pause')).toBeVisible()
  await expectLocked(page, false)
  await page.getByTestId('pause-resume').click()
  await expectLocked(page, true)
  await expect(page.getByTestId('pause')).toBeHidden()

  // A lock the browser drops on its own (a tab switch) pauses too.
  await page.evaluate(() => document.exitPointerLock())
  await expect(page.getByTestId('pause')).toBeVisible()
  await page.getByTestId('pause-resume').click()
  await expectLocked(page, true)

  // [M]: aim mode releases the lock and the free cursor no longer turns Rama; [M] again locks.
  await page.keyboard.press('m')
  await expectLocked(page, false)
  await expect(mode(page)).toHaveAttribute('data-mode', 'aim')
  const aimYaw = await yaw(page)
  await page.mouse.move(100, 100)
  await page.mouse.move(900, 300)
  await waitFrames(page, 5)
  expect(await yaw(page)).toBeCloseTo(aimYaw, 5)
  await page.keyboard.press('m')
  await expectLocked(page, true)
  await expect(mode(page)).toHaveAttribute('data-mode', 'look')
})

test('a computer that blocks pointer lock says so once and plays with the cursor', async ({ page }) => {
  await seedSave(page, 'l4', 'look')
  await page.addInitScript(() => {
    Element.prototype.requestPointerLock = function () {
      setTimeout(() => document.dispatchEvent(new Event('pointerlockerror')))
      return Promise.reject(new DOMException('blocked by policy', 'NotSupportedError'))
    } as typeof Element.prototype.requestPointerLock
  })
  await openL4(page)
  await page.getByTestId('mouse-engage').click()
  await expect(mode(page)).toHaveAttribute('data-mode', 'blocked')
  await expect(page.getByTestId('mouse-blocked-note')).toBeVisible()
  await expect(page.getByTestId('mouse-engage')).toBeHidden()
  await page.screenshot({ path: 'docs/screenshots/mouse-look-blocked.png' })
  await expect(page.getByTestId('mouse-blocked-note')).toBeHidden({ timeout: 10_000 })

  // Trying again does not repeat the note, and the cursor aims exactly as before.
  await page.keyboard.press('m')
  await page.keyboard.press('m')
  await waitFrames(page, 5)
  await expect(page.getByTestId('mouse-blocked-note')).toBeHidden()
  await page.waitForTimeout(3_000)
  await face(page, STATIC)
  await expect.poll(() => shoot(page, async () => STATIC), { timeout: 240_000 }).toBe(true)
  await pollUntil(page, async () => (await hittableCount(page)) === 4)
  expect(await hittableCount(page)).toBe(4)
})
