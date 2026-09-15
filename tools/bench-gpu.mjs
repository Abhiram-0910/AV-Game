// Real-GPU frame cost. WSL's Chromium only has SwiftShader, so this runs under WINDOWS node and drives Windows
// Chrome, which reaches the WSL preview on localhost:4173 (`npm run build && npm run preview` first):
//   "/mnt/c/Program Files/nodejs/node.exe" '\\wsl.localhost\Ubuntu\home\abhi\NewProjects\bala-kanda\tools\bench-gpu.mjs' \
//     --gpu dgpu --tier high --density 1,2,4 --levels l2,l3 [--shots tag] [--spoof] [--query ao=0]
// --gpu igpu leaves Chrome on the laptop's Intel UHD (its default); dgpu adds --force_high_performance_gpu.
// --spoof hides the renderer name so the one-time tier benchmark runs even on the UHD (calibration).
// --astra samples the astra's staged sequence instead of the views: on each level in --levels (L5 has both astras from
// the start), a fresh page per astra holds Q through the charge, releases, and samples the whole sequence; the tris and
// calls columns are the peak during it. With --shots, a second fresh page per astra photographs the sequence (gather,
// full charge, eight back-to-back frames from the release, clearing, daylight); screenshots never run during a sample.
// --port picks the preview's port (default 4173).
// Metric: the interval between delivered animation frames (rAF timestamps), which Chrome paces to GPU completion and the
// display (144 Hz here, so 6.9 ms is the floor). gl.finish() timing was tried first and is useless on ANGLE/D3D11: it
// read 4–6 ms on the Intel UHD while that GPU delivered 13 fps. "Holds 60 fps" = p95 interval ≤ 17.5 ms.
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const { chromium } = createRequire(import.meta.url)('playwright-core')
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1] : fallback
}
const GPU = arg('gpu', 'dgpu')
const TIER = arg('tier', 'high')
const DENSITIES = arg('density', '1').split(',').map(Number)
const LEVELS = arg('levels', 'l1,l2,l3,l4,l5').split(',')
const SHOTS = arg('shots', null)
const SPOOF = process.argv.includes('--spoof')
const ASTRA = process.argv.includes('--astra')
// Extra URL params, e.g. --query ao=0
const QUERY = arg('query', '')
const PORT = arg('port', '4173')
const SAMPLE_MS = Number(arg('sample', 5000))
const ORDER = ['l1', 'l2', 'l3', 'l4', 'l5']
// This laptop's panel: 1920×1080 at Windows DPI 120.
const VIEWPORT = { width: 1536, height: 864 }
const DPR = 1.25

// Player placements (x, z, yaw; yaw 0 faces +Z). null keeps the spawn.
const VIEWS = {
  l1: { spawn: null, throne: [0, 5, Math.PI] },
  l2: { spawn: null, bank: [0, -18, Math.PI], east: [10, -30, Math.PI / 2], river: [-10, -10, -Math.PI / 2] },
  l3: { spawn: null, clearing: [0, -16, 0], wood: [0, 5, Math.PI / 2] },
  l4: { spawn: null, line: [0, -4.9, Math.PI], trees: [0, -40, Math.PI / 2] },
  l5: { spawn: null, altar: [0, 4, Math.PI] },
}

function probe({ spoof }) {
  if (spoof) {
    const getParameter = WebGL2RenderingContext.prototype.getParameter
    WebGL2RenderingContext.prototype.getParameter = function (p) {
      return p === 0x9246 ? 'bench-gpu calibration' : getParameter.call(this, p)
    }
  }
  const bench = { on: false, intervals: [], last: 0, maxTris: 0, maxCalls: 0 }
  window.__bench = bench
  const tick = (t) => {
    if (bench.on && bench.last) bench.intervals.push(t - bench.last)
    if (bench.on && window.__bk) {
      bench.maxTris = Math.max(bench.maxTris, window.__bk.perf.triangles)
      bench.maxCalls = Math.max(bench.maxCalls, window.__bk.perf.calls)
    }
    bench.last = t
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]

async function measure(page, during = () => page.waitForTimeout(SAMPLE_MS)) {
  await page.evaluate(() => {
    Object.assign(window.__bench, { intervals: [], last: 0, maxTris: 0, maxCalls: 0, on: true })
  })
  await during()
  return page.evaluate(() => {
    window.__bench.on = false
    const s = [...window.__bench.intervals].sort((a, b) => a - b)
    return { n: s.length, s, perf: { ...window.__bk.perf }, maxTris: window.__bench.maxTris, maxCalls: window.__bench.maxCalls }
  })
}

const ASTRA_KEYS = { agneyastra: 'Digit1', manavastra: 'Digit2' }
const ASTRA_SAMPLE_MS = 6000

/** Charge (1.5 s) and release one astra from the spawn, sampling from the first held frame to daylight. */
async function runAstra(browser, level, density, kind) {
  const { context, page } = await openLevel(browser, level, density)
  await page.waitForTimeout(4000)
  await page.keyboard.press(ASTRA_KEYS[kind])
  await page.waitForTimeout(500)
  const start = Date.now()
  const { n, s, perf, maxTris, maxCalls } = await measure(page, async () => {
    await page.keyboard.down('q')
    await page.waitForTimeout(1700)
    await page.keyboard.up('q')
    await page.waitForTimeout(ASTRA_SAMPLE_MS - 1700)
  })
  const seconds = (Date.now() - start) / 1000
  await context.close()
  if (SHOTS) await captureAstra(browser, level, density, kind)
  return { level, density, view: `astra:${kind}`, frames: n, fps: (n / seconds).toFixed(0), p50: pct(s, 0.5), p95: pct(s, 0.95), p99: pct(s, 0.99), tris: maxTris, calls: maxCalls, tier: `${perf.tier}/${perf.tierReason}`, renderer: perf.renderer }
}

async function captureAstra(browser, level, density, kind) {
  const { context, page } = await openLevel(browser, level, density)
  const shot = (name) => page.screenshot({ path: fileURLToPath(new URL(`../docs/screenshots/gpu-${SHOTS}-${level}-${kind}-${name}.png`, import.meta.url)) })
  await page.waitForTimeout(4000)
  await page.keyboard.press(ASTRA_KEYS[kind])
  await page.waitForTimeout(500)
  await page.keyboard.down('q')
  await page.waitForTimeout(600)
  await shot('1-gather')
  await page.waitForTimeout(1000)
  await shot('2-charged')
  await page.keyboard.up('q')
  for (let i = 0; i < 8; i += 1) await shot(`3-strike-${i}`)
  await page.waitForTimeout(1200)
  await shot('4-clearing')
  await page.waitForTimeout(2500)
  await shot('5-daylight')
  await context.close()
}

async function openLevel(browser, level, density) {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DPR })
  const page = await context.newPage()
  const completed = ORDER.slice(0, ORDER.indexOf(level))
  const save = { version: 2, level, completed, codex: [], quiz: {}, settings: { qualityTier: TIER, volume: 0, subtitles: true, cameraMode: 'aim' }, benchmarkTier: null }
  await page.addInitScript((json) => localStorage.setItem('bala-kanda.save', json), JSON.stringify(save))
  await page.addInitScript(probe, { spoof: SPOOF })
  await page.goto(`http://localhost:${PORT}/?debug&density=${density}${QUERY ? `&${QUERY}` : ''}`)
  await page.getByTestId(completed.length ? 'title-continue' : 'title-start').click({ timeout: 60_000 })
  await page.addStyleTag({ content: '.perf{display:none!important}' })
  await page.getByTestId('dialogue').waitFor({ timeout: 180_000 })
  await page.keyboard.press('Escape')
  return { context, page }
}

async function runLevel(browser, level, density) {
  const { context, page } = await openLevel(browser, level, density)
  const rows = []
  for (const [name, at] of Object.entries(VIEWS[level])) {
    if (at) {
      await page.evaluate(([x, z, yaw]) => {
        const p = window.__bk.world.player
        p.x = p.prevX = x
        p.z = p.prevZ = z
        p.yaw = p.prevYaw = yaw
      }, at)
    }
    await page.waitForTimeout(3000) // camera settles, late shaders compile
    const { n, s, perf } = await measure(page)
    rows.push({ level, density, view: name, frames: n, fps: (n / (SAMPLE_MS / 1000)).toFixed(0), p50: pct(s, 0.5), p95: pct(s, 0.95), p99: pct(s, 0.99), tris: perf.triangles, calls: perf.calls, tier: `${perf.tier}/${perf.tierReason}${perf.benchMs ? ` ${perf.benchMs.toFixed(2)}ms` : ''}`, renderer: perf.renderer })
    if (SHOTS) await page.screenshot({ path: fileURLToPath(new URL(`../docs/screenshots/gpu-${SHOTS}-${level}-${name}.png`, import.meta.url)) })
  }
  await context.close()
  return rows
}

const args = ['--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling', `--window-size=${VIEWPORT.width + 40},${VIEWPORT.height + 140}`]
if (GPU === 'dgpu') args.push('--force_high_performance_gpu')
// --uncapped: no vsync or frame-rate limit, so the interval is the frame's real cost instead of the 144 Hz floor.
if (process.argv.includes('--uncapped')) args.push('--disable-gpu-vsync', '--disable-frame-rate-limit')
const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: false, args })
const all = []
for (const density of DENSITIES) {
  for (const level of LEVELS) {
    if (!ASTRA) all.push(...(await runLevel(browser, level, density)))
    else for (const kind of Object.keys(ASTRA_KEYS)) all.push(await runAstra(browser, level, density, kind))
  }
}
await browser.close()
console.log(`gpu=${GPU} tier=${TIER} viewport=${VIEWPORT.width}x${VIEWPORT.height}@${DPR} renderer=${all[0]?.renderer}`)
console.log('| level | density | view | fps | p50 ms | p95 ms | p99 ms | tris | calls | tier |')
console.log('|---|---|---|---|---|---|---|---|---|---|')
for (const r of all) console.log(`| ${r.level} | ${r.density} | ${r.view} | ${r.fps} | ${r.p50.toFixed(1)} | ${r.p95.toFixed(1)} | ${r.p99.toFixed(1)} | ${r.tris} | ${r.calls} | ${r.tier} |`)
