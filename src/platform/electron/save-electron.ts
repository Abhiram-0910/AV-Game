// The renderer never touches the filesystem directly (contextIsolation is on) — every call
// goes through the bridge electron/preload.ts exposes, round-tripping to electron/main.ts's
// ipcMain handlers, backed by a JSON file under app.getPath('userData').
import { deserializeSave, serializeSave, type Save } from '@core/save'
import type { SaveAdapter } from '../platform'

declare global {
  interface Window {
    electronAPI?: {
      loadSave(): string | null
      storeSave(json: string): void
      clearSave(): void
    }
  }
}

export const electronSave: SaveAdapter = {
  load: () => deserializeSave(window.electronAPI?.loadSave() ?? null),
  store: (save: Save) => window.electronAPI?.storeSave(serializeSave(save)),
  clear: () => window.electronAPI?.clearSave(),
}
