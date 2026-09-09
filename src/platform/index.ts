// The web platform. Electron swaps save (userData file) and fullscreen in pass 3.
import type { Platform } from './platform'
import { webAudio } from './web/audio-web'
import { webFullscreen } from './web/fullscreen-web'
import { createWebInput } from './web/input-web'
import { webSave } from './web/save-web'

export const platform: Platform = {
  save: webSave,
  audio: webAudio,
  input: createWebInput(),
  fullscreen: webFullscreen,
}

export type { Platform } from './platform'
