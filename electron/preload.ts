// contextIsolation is on and nodeIntegration is off (main.ts) — this bridge is the only way
// the renderer (plain web code, src/platform/electron/save-electron.ts) ever reaches Node or
// Electron APIs. `loadSave` is a synchronous round-trip deliberately: it only ever runs once,
// at boot, and platform.save.load() is a synchronous interface (see src/platform/platform.ts).
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  loadSave: (): string | null => ipcRenderer.sendSync('save:load'),
  storeSave: (json: string): void => ipcRenderer.send('save:store', json),
  clearSave: (): void => ipcRenderer.send('save:clear'),
})
