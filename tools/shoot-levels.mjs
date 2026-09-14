// Visual-pass screenshots: every level at spawn, plus L1 from the throne-approach spot the
// original l1-court.png was taken at. Needs `npm run build && npm run preview` on 4173.
//   [PORT=4182] node tools/shoot-levels.mjs <tag> [high|low] [l1 l2 ...]
// Writes docs/screenshots/vis-<tag>-<level>[-low].png. Tier is forced through the save, so
// SwiftShader's auto-detected "low" does not hide the high path.
import { chromium } from '@playwright/test'

const [tag = 'x', tier = 'high', ...only] = process.argv.slice(2)
const ORDER = ['l1', 'l2', 'l3', 'l4', 'l5']
const levels = only.length ? only : ORDER
const suffix = tier === 'low' ? '-low' : ''
const SETTLE_MS = Number(process.env.SETTLE_MS ?? 2500)
const PORT = process.env.PORT ?? 4173

async function shoot(browser, level, extra) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const completed = ORDER.slice(0, ORDER.indexOf(level))
  const save = { version: 2, level, completed, codex: [], quiz: {}, settings: { qualityTier: tier, volume: 0, subtitles: true, cameraMode: 'aim' }, benchmarkTier: null }
  await page.addInitScript((json) => localStorage.setItem('bala-kanda.save', json), JSON.stringify(save))
  await page.goto(`http://127.0.0.1:${PORT}/?debug`)
  await page.getByTestId(completed.length ? 'title-continue' : 'title-start').click({ timeout: 60_000 })
  await page.addStyleTag({ content: '.perf{display:none!important}' })
  if (process.env.INTRO) {
    await page.getByTestId('dialogue').waitFor({ timeout: 180_000 })
    await page.waitForTimeout(Number(process.env.INTRO))
    await page.screenshot({ path: `docs/screenshots/vis-${tag}-${level}-intro${suffix}.png` })
  }
  await page.getByTestId('dialogue').waitFor({ timeout: 180_000 })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(SETTLE_MS)
  await page.screenshot({ path: `docs/screenshots/vis-${tag}-${level}${suffix}.png` })
  if (extra) {
    await page.evaluate(extra)
    await page.waitForTimeout(SETTLE_MS)
    await page.screenshot({ path: `docs/screenshots/vis-${tag}-${level}-throne${suffix}.png` })
  }
  const perf = await page.evaluate(() => window.__bk.perf)
  console.log(`${level} ${tier}: ${perf.triangles} tris, ${perf.calls} calls, ${perf.skinned} skinned`)
  await page.close()
}

// Same framing as the original l1-court.png: just short of the throne, facing it.
function toThrone() {
  const p = window.__bk.world.player
  p.x = p.prevX = 0
  p.z = p.prevZ = 5
  p.yaw = p.prevYaw = Math.PI
}

const browser = await chromium.launch()
for (const level of levels) {
  await shoot(browser, level, level === 'l1' ? toThrone : null)
}
await browser.close()
