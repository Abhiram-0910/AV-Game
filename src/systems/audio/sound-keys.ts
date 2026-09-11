// Semantic sound keys and playback options for the audio system.
export type ArcherySoundKey = 'bow_draw' | 'bow_release' | 'arrow_hit_target' | 'arrow_hit_flesh'
export type LocomotionSoundKey = 'footstep_walk' | 'footstep_run'
export type CombatSoundKey = 'astra_cast' | 'whoosh' | 'sword_slash' | 'enemy_hit' | 'enemy_death' | 'boss_groan'
export type UiSoundKey = 'button_click' | 'quiz_correct' | 'quiz_incorrect' | 'level_win' | 'level_fail' | 'title_theme'
export type AmbientSoundKey = 'ambient_court' | 'ambient_forest' | 'ambient_night'

export type SoundKey = ArcherySoundKey | LocomotionSoundKey | CombatSoundKey | UiSoundKey | AmbientSoundKey

export interface PlayOptions {
  /** Relative volume modifier (0..1, defaults to 1.0 or DEFAULT_SOUND_VOLUMES). */
  volume?: number
  /** Whether the sound loops continuously until explicitly stopped. */
  loop?: boolean
}

export const DEFAULT_SOUND_VOLUMES: Record<SoundKey, number> = {
  bow_draw: 0.4,
  bow_release: 0.6,
  arrow_hit_target: 0.7,
  arrow_hit_flesh: 0.75,
  footstep_walk: 0.25,
  footstep_run: 0.35,
  astra_cast: 0.8,
  whoosh: 0.75,
  sword_slash: 0.6,
  enemy_hit: 0.7,
  enemy_death: 0.75,
  boss_groan: 0.85,
  button_click: 0.5,
  quiz_correct: 0.7,
  quiz_incorrect: 0.65,
  level_win: 0.85,
  level_fail: 0.8,
  title_theme: 0.5,
  ambient_court: 0.3,
  ambient_forest: 0.3,
  ambient_night: 0.35,
}

export const AMBIENT_SOUND_KEYS: readonly SoundKey[] = [
  'title_theme',
  'ambient_court',
  'ambient_forest',
  'ambient_night',
]
