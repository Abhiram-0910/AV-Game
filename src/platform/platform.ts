// One interface, two implementations: web now, Electron in pass 3.
import type { Save } from '@core/save'

export interface SaveAdapter {
  load(): Save
  store(save: Save): void
  clear(): void
}

export interface AudioAdapter {
  /** Returns a handle id; the sound unlocks on the first user gesture. */
  play(url: string, opts?: { loop?: boolean; volume?: number }): number
  stop(id: number): void
  setMasterVolume(v: number): void
}

export interface MouseState {
  /** −1..1 from the viewport centre, +x right, +y up. */
  x: number
  y: number
  down: boolean
}

export interface InputAdapter {
  isDown(code: string): boolean
  /** True once per press, cleared by endTick(). */
  pressed(code: string): boolean
  mouse(): MouseState
  endTick(): void
  dispose(): void
}

export interface FullscreenAdapter {
  toggle(): Promise<void>
  isFullscreen(): boolean
}

export interface Platform {
  save: SaveAdapter
  audio: AudioAdapter
  input: InputAdapter
  fullscreen: FullscreenAdapter
}
