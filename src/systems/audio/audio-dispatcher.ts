// Event-driven AudioDispatcher subscribing to game events, transitions, and input.
import type { LevelId } from '@data/levels'
import { gameStore } from '@core/game-state'
import { platform } from '@platform/index'
import { screenStore } from '@ui/screen-store'
import { type PlayOptions, type SoundKey } from './sound-keys'
import { type ActiveSoundHandle, playProceduralSound, setSynthMasterVolume } from './synth'

const activeSounds = new Map<number, ActiveSoundHandle>()
const activeLoops = new Map<SoundKey, number>()

function ambientForLevel(level: LevelId): SoundKey {
  if (level === 'l1') return 'ambient_court'
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

function handlePhaseChange(phase: string, lastPhase: string, level: LevelId): void {
  if (phase === lastPhase) return
  if (phase === 'win') soundManager.play('level_win')
  if (phase === 'fail') soundManager.play('level_fail')

  if (phase === 'play') {
    soundManager.stopLoop('title_theme')
    soundManager.play(ambientForLevel(level), { loop: true })
  } else if (phase === 'title' || phase === 'complete') {
    soundManager.stopAllLoops()
    if (phase === 'title') soundManager.play('title_theme', { loop: true })
  }
}

export function initAudioDispatcher(): () => void {
  let lastPhase = gameStore.getState().phase
  let lastLevel = gameStore.getState().level
  let lastVolume = gameStore.getState().settings.volume

  soundManager.setVolume(lastVolume)
  if (screenStore.getState().screen === 'title') {
    soundManager.play('title_theme', { loop: true })
  } else if (lastPhase === 'play') {
    soundManager.play(ambientForLevel(lastLevel), { loop: true })
  }

  const unsubGame = gameStore.subscribe((s) => {
    if (s.settings.volume !== lastVolume) {
      lastVolume = s.settings.volume
      soundManager.setVolume(lastVolume)
    }
    if (s.phase !== lastPhase || s.level !== lastLevel) {
      if (s.phase === lastPhase && s.level !== lastLevel && s.phase === 'play') {
        soundManager.stopLoop(ambientForLevel(lastLevel))
        soundManager.play(ambientForLevel(s.level), { loop: true })
      } else {
        handlePhaseChange(s.phase, lastPhase, s.level)
      }
      lastPhase = s.phase
      lastLevel = s.level
    }
  })

  const unsubScreen = screenStore.subscribe((s) => {
    if (s.screen === 'title') {
      soundManager.stopAllLoops()
      soundManager.play('title_theme', { loop: true })
    } else if (s.screen === 'game' && gameStore.getState().phase === 'play') {
      soundManager.stopLoop('title_theme')
      soundManager.play(ambientForLevel(gameStore.getState().level), { loop: true })
    }
  })

  return () => {
    unsubGame()
    unsubScreen()
    soundManager.stopAllLoops()
  }
}
