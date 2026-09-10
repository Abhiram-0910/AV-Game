// One bundle for both shells, runtime-detected — same pattern as the quality-tier split. Audio,
// input, and fullscreen are all plain Web APIs Electron's renderer supports natively; only save
// needs a different backing store (a userData file instead of localStorage), so only it swaps.
import type { Platform } from './platform'
import { electronSave } from './electron/save-electron'
import { webAudio } from './web/audio-web'
import { webFullscreen } from './web/fullscreen-web'
import { createWebInput } from './web/input-web'
import { webSave } from './web/save-web'

const isElectron = typeof window !== 'undefined' && !!window.electronAPI

export const platform: Platform = {
  save: isElectron ? electronSave : webSave,
  audio: webAudio,
  input: createWebInput(),
  fullscreen: webFullscreen,
}

export type { Platform } from './platform'
