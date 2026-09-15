// Event-driven AudioDispatcher subscribing to game events, transitions, and input.
import type { LevelId } from '@data/levels'
import { gameStore } from '@core/game-state'
import { platform } from '@platform/index'
import { screenStore } from '@ui/screen-store'
import { type PlayOptions, type SoundKey } from './sound-keys'
import { type ActiveSoundHandle, playProceduralSound, setSynthMasterVolume } from './synth'

const activeSounds = new Map<number, ActiveSoundHandle>()
const activeLoops = new Map<SoundKey, number>()

/** Wind outdoors; the court and the title are silent. */
function ambientForLevel(level: LevelId): SoundKey | null {
  if (level === 'l1') return null
  if (level === 'l5') return 'ambient_night'
  return 'ambient_forest'
}

export const soundManager = {
  play(key: SoundKey, opts: PlayOptions = {}): number {
    if (opts.loop && activeLoops.has(key)) {
      return activeLoops.get(key)!
    }
    const handle = playProceduralSound(key, opts)
    if (!handle) return 0
    activeSounds.set(handle.id, handle)
    if (opts.loop) activeLoops.set(key, handle.id)
    return handle.id
  },
  stop(id: number): void {
    const handle = activeSounds.get(id)
    if (!handle) return
    handle.stop()
    activeSounds.delete(id)
    if (activeLoops.get(handle.key) === id) activeLoops.delete(handle.key)
  },
  stopLoop(key: SoundKey): void {
    const id = activeLoops.get(key)
    if (id !== undefined) soundManager.stop(id)
  },
  setVolume(vol: number): void {
    setSynthMasterVolume(vol)
    platform.audio.setMasterVolume(vol)
  },
  stopAllLoops(): void {
    for (const id of Array.from(activeLoops.values())) soundManager.stop(id)
    activeLoops.clear()
  },
}

export function playAudio(key: SoundKey, opts: PlayOptions = {}): number {
  return soundManager.play(key, opts)
}

export function stopAudio(id: number): void {
  soundManager.stop(id)
}

export function stopLoop(key: SoundKey): void {
  soundManager.stopLoop(key)
}

/** The level's wind, and nothing else: L4's wind must not carry on under L5's. */
function playAmbience(level: LevelId): void {
  const key = ambientForLevel(level)
  for (const k of [...activeLoops.keys()]) if (k !== key) soundManager.stopLoop(k)
  if (key) soundManager.play(key, { loop: true })
}

function handlePhaseChange(phase: string, lastPhase: string, level: LevelId): void {
  if (phase === lastPhase) return
  if (phase === 'win') soundManager.play('level_win')
  if (phase === 'fail') soundManager.play('level_fail')

  if (phase === 'play') playAmbience(level)
  else if (phase === 'title' || phase === 'complete') soundManager.stopAllLoops()
}

export function initAudioDispatcher(): () => void {
  let lastPhase = gameStore.getState().phase
  let lastLevel = gameStore.getState().level
  let lastVolume = gameStore.getState().settings.volume

  soundManager.setVolume(lastVolume)
  if (screenStore.getState().screen !== 'title' && lastPhase === 'play') playAmbience(lastLevel)

  const unsubGame = gameStore.subscribe((s) => {
    if (s.settings.volume !== lastVolume) {
      lastVolume = s.settings.volume
      soundManager.setVolume(lastVolume)
    }
    if (s.phase !== lastPhase || s.level !== lastLevel) {
      if (s.phase === lastPhase && s.level !== lastLevel && s.phase === 'play') {
        playAmbience(s.level)
      } else {
        handlePhaseChange(s.phase, lastPhase, s.level)
      }
      lastPhase = s.phase
      lastLevel = s.level
    }
  })

  const unsubScreen = screenStore.subscribe((s) => {
    if (s.screen === 'title') soundManager.stopAllLoops()
    else if (s.screen === 'game' && gameStore.getState().phase === 'play') playAmbience(gameStore.getState().level)
  })

  return () => {
    unsubGame()
    unsubScreen()
    soundManager.stopAllLoops()
  }
}
