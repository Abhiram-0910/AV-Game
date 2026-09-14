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
  /** −1..1 from the viewport centre, +x right, +y up. Under pointer lock the real cursor is frozen and FollowCamera
   * writes the virtual aim cursor here instead. */
  x: number
  y: number
  down: boolean
}

export type LockEvent = 'locked' | 'unlocked' | 'denied'

export interface PointerLock {
  /** Must run inside a user gesture (click or keydown). The outcome arrives through onChange. */
  request(): void
  release(): void
  locked(): boolean
  /** Whether a lock has succeeded this session: a later denial is a cooldown (Chrome, right after Escape), not a policy. */
  everLocked(): boolean
  onChange(cb: (e: LockEvent) => void): () => void
  /** Movement (CSS px, +y down) since the last call while locked. */
  takeDelta(): [number, number]
}

export interface InputAdapter {
  isDown(code: string): boolean
  /** True once per press, cleared by endTick(). */
  pressed(code: string): boolean
  mouse(): MouseState
  lock: PointerLock
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
