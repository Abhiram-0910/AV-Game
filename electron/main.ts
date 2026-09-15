// Electron shell: loads the built web app into a single BrowserWindow. Save persistence and a
// GPU-renderer log are the only things this touches that the web build doesn't need — the
// window renders the exact same React/R3F bundle over Chromium + ANGLE as the browser build.
import { app, BrowserWindow, ipcMain } from 'electron'
import { createReadStream, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = fileURLToPath(new URL('.', import.meta.url))
const devServerUrl = process.env.VITE_DEV_SERVER_URL
const distDir = join(dirname, '..', 'dist')
const saveFile = join(app.getPath('userData'), 'save.json')

// Ubuntu 24.04 defaults to Wayland, where Electron's native WebGL init frequently yields a
// black canvas (ARCHITECTURE.md) — x11, via XWayland, renders correctly. Must run before
// app.ready. Never set MESA_GL_VERSION_OVERRIDE: it papers over the same failure instead of
// fixing it, and silently changes what GL version the app thinks it has.
if (process.platform === 'linux') app.commandLine.appendSwitch('ozone-platform', 'x11')
// Optimus laptops: Chromium otherwise renders WebGL on the iGPU and ignores powerPreference (measured 2026-09-14,
// Intel UHD + RTX 4050: the dGPU only with this switch).
app.commandLine.appendSwitch('force_high_performance_gpu')
app.commandLine.appendSwitch('ignore-gpu-blocklist')
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('enable-webgl')
if (process.env.HEADLESS === 'true') app.commandLine.appendSwitch('headless')

const MIME: Readonly<Record<string, string>> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ktx2': 'image/ktx2',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
}

/** A tiny static file server for the packaged build. `file://` breaks the app's root-relative
 * asset paths (loaders point at `/vendor/draco/`, `/vendor/basis/` — see CLAUDE.md), so
 * production loads over http:// exactly like the web build does. Dev instead points straight
 * at Vite's own dev server via VITE_DEV_SERVER_URL (see the electron:dev script). */
function serveDist(): Promise<string> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const reqPath = join(distDir, decodeURIComponent((req.url ?? '/').split('?')[0]))
      // isFile(), not a trailing '/': on Windows join() ends a directory in '\', and streaming a directory failed the
      // first load of the packaged app. The prefix check keeps '..' from reading outside dist.
      const inDist = reqPath.startsWith(distDir + sep) && existsSync(reqPath) && statSync(reqPath).isFile()
      const file = inDist ? reqPath : join(distDir, 'index.html')
      res.setHeader('Content-Type', MIME[extname(file)] ?? 'application/octet-stream')
      createReadStream(file).pipe(res)
    })
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      resolve(`http://127.0.0.1:${port}/`)
    })
  })
}

function readSave(): string | null {
  return existsSync(saveFile) ? readFileSync(saveFile, 'utf8') : null
}

ipcMain.on('save:load', (event) => {
  event.returnValue = readSave()
})
ipcMain.on('save:store', (_event, json: string) => writeFileSync(saveFile, json, 'utf8'))
ipcMain.on('save:clear', () => {
  if (existsSync(saveFile)) writeFileSync(saveFile, '', 'utf8')
})

/** Logs whichever GPU Chromium actually selected. SwiftShader/llvmpipe means software
 * rendering slipped through — on a lab PC that's the difference between 60fps and unplayable,
 * and it wouldn't otherwise surface until someone notices the game is slow. */
async function logGpuInfo(): Promise<void> {
  const info = JSON.stringify(await app.getGPUInfo('complete'))
  console.log(`[gpu] ${info.slice(0, 500)}`)
  if (/swiftshader|llvmpipe/i.test(info)) {
    console.warn('[gpu] WARNING: software rendering selected (SwiftShader/llvmpipe) — expect far below 60fps')
  }
}

async function createWindow(): Promise<void> {
  const win = new BrowserWindow({
    width: 1366,
    height: 768,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(dirname, 'preload.js'),
    },
  })
  await win.loadURL(devServerUrl ?? (await serveDist()))
}

app.whenReady().then(async () => {
  await logGpuInfo()
  await createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
