// When the pointer is locked for mouse look, and what the HUD says about it. The lock is wanted only while the player is
// actually playing in look mode; anything that needs the cursor (a talk, the pause menu, the quiz and result screens,
// which unmount the HUD) releases it. A lock the browser drops on its own (its Escape, a tab switch) pauses the game.
import { useEffect, useRef, useState } from 'react'
import type { CameraMode } from '@core/save'
import { gameStore } from '@core/game-state'
import { worldStore } from '@systems/world'
import { platform } from '@platform/index'
import { useGame, useWorld } from './use-game'

export type MouseModeView = 'look' | 'aim-auto' | 'aim' | 'engage' | 'blocked'

/** Session-wide, not per level: a lab machine's policy does not change between levels, and the note shows once.
 * `intentional` marks a release this code asked for, so its unlock event does not read as the browser dropping the lock. */
const session = { blocked: false, noted: false, lossPauseAt: -Infinity, intentional: false }
const NOTE_MS = 6000
/** An Escape arriving this soon after a lock-loss pause is the same key press (Firefox delivers both): ignore it. */
const ESCAPE_AFTER_LOSS_MS = 250

export function pausedByLockLoss(now: number): boolean {
  return now - session.lossPauseAt < ESCAPE_AFTER_LOSS_MS
}

function releaseLock(): void {
  if (!platform.input.lock.locked()) return
  session.intentional = true
  platform.input.lock.release()
}

/** Switch mode from a click or key press (the gesture a lock request needs). */
export function toggleMouseMode(): void {
  const next: CameraMode = gameStore.getState().settings.cameraMode === 'look' ? 'aim' : 'look'
  gameStore.getState().setSettings({ cameraMode: next })
  if (next === 'look') platform.input.lock.request()
  else releaseLock()
}

function useLockEvents(wanted: { current: boolean }) {
  const [locked, setLocked] = useState(platform.input.lock.locked())
  const [blocked, setBlocked] = useState(session.blocked)
  const [note, setNote] = useState(false)
  useEffect(() => {
    const { lock } = platform.input
    return lock.onChange((e) => {
      if (e === 'locked') {
        session.intentional = false
        setLocked(true)
      }
      if (e === 'unlocked') {
        setLocked(false)
        if (wanted.current && !session.intentional) {
          session.lossPauseAt = performance.now()
          worldStore.getState().setPaused(true)
        }
        session.intentional = false
      }
      if (e === 'denied' && !lock.everLocked()) {
        session.blocked = true
        setBlocked(true)
        if (!session.noted) {
          session.noted = true
          setNote(true)
          setTimeout(() => setNote(false), NOTE_MS)
        }
      }
    })
  }, [wanted])
  return { locked, blocked, note }
}

export function useMouseLook(): { view: MouseModeView; note: boolean; showOverlay: boolean } {
  const mode = useGame((s) => s.settings.cameraMode)
  const phase = useGame((s) => s.phase)
  const talking = useWorld((s) => s.dialogue !== null)
  const paused = useWorld((s) => s.paused)
  const aiming = useWorld((s) => s.isDrawing || s.astraCharging)
  const wanted = useRef(false)
  const { locked, blocked, note } = useLockEvents(wanted)
  const playing = phase === 'play' && !talking && !paused
  const want = mode === 'look' && playing && !blocked

  useEffect(() => {
    wanted.current = want
    if (!want) releaseLock()
  }, [want, locked])
  // Leaving play unmounts the HUD: give the cursor back to the quiz and result screens.
  useEffect(
    () => () => {
      wanted.current = false
      releaseLock()
    },
    [],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyM' && !e.repeat && phase === 'play' && !talking && !paused) toggleMouseMode()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, talking, paused])

  const view: MouseModeView = mode === 'aim' ? 'aim' : blocked ? 'blocked' : locked ? (aiming ? 'aim-auto' : 'look') : 'engage'
  return { view, note, showOverlay: view === 'engage' && playing }
}
