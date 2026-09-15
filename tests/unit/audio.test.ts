import { describe, expect, it, vi } from 'vitest'
import { gameStore } from '@core/game-state'
import { screenStore } from '@ui/screen-store'
import {
  AMBIENT_SOUND_KEYS,
  DEFAULT_SOUND_VOLUMES,
  initAudioDispatcher,
  playAudio,
  playProceduralSound,
  soundManager,
  stopAudio,
  stopLoop,
  type SoundKey,
} from '@systems/audio'

describe('audio sound keys and defaults', () => {
  const REQUIRED_KEYS: SoundKey[] = [
    'bow_draw',
    'bow_release',
    'arrow_hit_target',
    'arrow_hit_flesh',
    'footstep_walk',
    'footstep_run',
    'astra_cast',
    'enemy_hit',
    'enemy_death',
    'boss_groan',
    'button_click',
    'quiz_correct',
    'quiz_incorrect',
    'level_win',
    'level_fail',
    'ambient_forest',
    'ambient_night',
  ]

  it('defines valid volume mappings for all required semantic sound keys', () => {
    for (const key of REQUIRED_KEYS) {
      expect(DEFAULT_SOUND_VOLUMES[key]).toBeGreaterThan(0)
      expect(DEFAULT_SOUND_VOLUMES[key]).toBeLessThanOrEqual(1)
    }
  })

  it('contains all ambient loops in AMBIENT_SOUND_KEYS', () => {
    expect(AMBIENT_SOUND_KEYS).toContain('ambient_forest')
    expect(AMBIENT_SOUND_KEYS).toContain('ambient_night')
  })
})

describe('procedural synth safety', () => {
  it('handles playback headlessly without throwing when AudioContext is missing or mock', () => {
    for (const key of AMBIENT_SOUND_KEYS) {
      expect(() => playAudio(key)).not.toThrow()
    }
    expect(() => playProceduralSound('bow_draw')).not.toThrow()
    expect(() => playProceduralSound('button_click')).not.toThrow()
  })

  it('supports stopAudio and stopLoop safely', () => {
    const id = playAudio('ambient_forest', { loop: true })
    expect(() => stopAudio(id)).not.toThrow()
    expect(() => stopLoop('ambient_forest')).not.toThrow()
    expect(() => soundManager.stopAllLoops()).not.toThrow()
  })
})

describe('AudioDispatcher event subscription and volume sync', () => {
  it('synchronizes master volume from store changes', () => {
    const cleanup = initAudioDispatcher()
    const setVolSpy = vi.spyOn(soundManager, 'setVolume')

    gameStore.getState().setSettings({ volume: 0.45 })
    expect(setVolSpy).toHaveBeenCalledWith(0.45)

    cleanup()
    setVolSpy.mockRestore()
  })

  it('transitions ambient loops and stings on level machine state changes', () => {
    const cleanup = initAudioDispatcher()
    const playSpy = vi.spyOn(soundManager, 'play')

    screenStore.getState().setScreen('game')
    gameStore.getState().startLevel('l2')
    gameStore.getState().dispatch('LOADED')
    gameStore.getState().dispatch('INTRO_DONE')
    expect(gameStore.getState().phase).toBe('play')

    expect(playSpy).toHaveBeenCalledWith('ambient_forest', { loop: true })

    // Level win sting
    gameStore.getState().dispatch('OBJECTIVES_MET')
    expect(gameStore.getState().phase).toBe('win')
    expect(playSpy).toHaveBeenCalledWith('level_win')

    cleanup()
    playSpy.mockRestore()
  })
})
