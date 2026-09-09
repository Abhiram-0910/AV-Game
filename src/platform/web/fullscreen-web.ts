import type { FullscreenAdapter } from '../platform'

export const webFullscreen: FullscreenAdapter = {
  async toggle() {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen()
  },
  isFullscreen: () => document.fullscreenElement !== null,
}
