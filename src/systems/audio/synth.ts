// Procedural Web Audio API sound synthesizer with graceful fallbacks.
import {
  type AmbientSoundKey,
  type ArcherySoundKey,
  type CombatSoundKey,
  type LocomotionSoundKey,
  type PlayOptions,
  type SoundKey,
  type UiSoundKey,
  DEFAULT_SOUND_VOLUMES,
} from './sound-keys'

export interface ActiveSoundHandle {
  id: number
  key: SoundKey
  stop: () => void
}

let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
let currentMasterVolume = 0.8
let nextHandleId = 1

function attachUnlockListeners(c: AudioContext): void {
  const unlock = () => {
    if (c.state === 'suspended') void c.resume().catch(() => {})
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
  }
  window.addEventListener('pointerdown', unlock, { once: true })
  window.addEventListener('keydown', unlock, { once: true })
}

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return null
  if (!ctx) {
    try {
      ctx = new AudioCtx()
      masterGain = ctx.createGain()
      masterGain.gain.setValueAtTime(currentMasterVolume, ctx.currentTime)
      masterGain.connect(ctx.destination)
      attachUnlockListeners(ctx)
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  return ctx
}

export function setSynthMasterVolume(vol: number): void {
  currentMasterVolume = Math.max(0, Math.min(1, vol))
  if (masterGain && ctx) {
    masterGain.gain.setValueAtTime(currentMasterVolume, ctx.currentTime)
  }
}

function createNoiseBuffer(c: AudioContext, seconds: number): AudioBuffer {
  const samples = Math.max(1, Math.floor(c.sampleRate * seconds))
  const buf = c.createBuffer(1, samples, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < samples; i += 1) data[i] = Math.random() * 2 - 1
  return buf
}

function stopWithFade(gain: GainNode, nodes: { stop?: () => void; disconnect: () => void }[], c: AudioContext): void {
  const now = c.currentTime
  gain.gain.cancelScheduledValues(now)
  gain.gain.setValueAtTime(gain.gain.value, now)
  gain.gain.linearRampToValueAtTime(0.0001, now + 0.05)
  setTimeout(() => {
    for (const n of nodes) {
      try {
        n.stop?.()
        n.disconnect()
      } catch {
        // Ignored
      }
    }
  }, 60)
}

function playTone(
  c: AudioContext,
  key: SoundKey,
  freqStart: number,
  freqEnd: number,
  duration: number,
  vol: number,
  type: OscillatorType = 'sine',
  loop = false,
): ActiveSoundHandle {
  const id = nextHandleId++
  const osc = c.createOscillator()
  const gain = c.createGain()
  const now = c.currentTime

  osc.type = type
  osc.frequency.setValueAtTime(freqStart, now)
  if (freqEnd !== freqStart) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), now + duration)

  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.linearRampToValueAtTime(vol, now + 0.01)
  if (!loop) gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  osc.connect(gain)
  gain.connect(masterGain ?? c.destination)
  osc.start(now)
  if (!loop) osc.stop(now + duration + 0.05)

  return { id, key, stop: () => stopWithFade(gain, [osc, gain], c) }
}

function playNoise(
  c: AudioContext,
  key: SoundKey,
  duration: number,
  vol: number,
  filterFreq: number,
  filterType: BiquadFilterType = 'bandpass',
  loop = false,
): ActiveSoundHandle {
  const id = nextHandleId++
  const src = c.createBufferSource()
  src.buffer = createNoiseBuffer(c, Math.min(duration, 2))
  src.loop = loop

  const filter = c.createBiquadFilter()
  filter.type = filterType
  filter.frequency.setValueAtTime(filterFreq, c.currentTime)

  const gain = c.createGain()
  const now = c.currentTime
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.linearRampToValueAtTime(vol, now + 0.01)
  if (!loop) gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  src.connect(filter)
  filter.connect(gain)
  gain.connect(masterGain ?? c.destination)
  src.start(now)
  if (!loop) src.stop(now + duration + 0.05)

  return { id, key, stop: () => stopWithFade(gain, [src, filter, gain], c) }
}

function playArchery(key: ArcherySoundKey, c: AudioContext, vol: number): ActiveSoundHandle {
  if (key === 'bow_draw') return playTone(c, key, 120, 240, 0.45, vol, 'triangle')
  if (key === 'bow_release') return playTone(c, key, 420, 110, 0.12, vol, 'triangle')
  if (key === 'arrow_hit_target') return playTone(c, key, 190, 50, 0.09, vol, 'sine')
  return playNoise(c, key, 0.08, vol, 360, 'lowpass')
}

function playLocomotion(key: LocomotionSoundKey, c: AudioContext, vol: number): ActiveSoundHandle {
  const freq = key === 'footstep_run' ? 420 : 280
  const dur = key === 'footstep_run' ? 0.06 : 0.045
  return playNoise(c, key, dur, vol, freq, 'bandpass')
}

function playCombat(key: CombatSoundKey, c: AudioContext, vol: number): ActiveSoundHandle {
  if (key === 'astra_cast') return playTone(c, key, 587, 1175, 0.38, vol, 'sine')
  if (key === 'whoosh') return playNoise(c, key, 0.35, vol, 450, 'bandpass')
  if (key === 'sword_slash') return playNoise(c, key, 0.14, vol, 850, 'bandpass')
  if (key === 'enemy_hit') return playTone(c, key, 150, 45, 0.12, vol, 'sawtooth')
  if (key === 'enemy_death') return playNoise(c, key, 0.5, vol, 250, 'lowpass')
  return playTone(c, key, 75, 38, 0.6, vol, 'sawtooth')
}

function playMelody(c: AudioContext, key: SoundKey, freqs: readonly number[], stepDur: number, vol: number): ActiveSoundHandle {
  const id = nextHandleId++
  const now = c.currentTime
  const nodes: { stop?: () => void; disconnect: () => void }[] = []
  const master = masterGain ?? c.destination
  const totalGain = c.createGain()
  totalGain.gain.setValueAtTime(vol, now)
  totalGain.connect(master)

  freqs.forEach((f, i) => {
    const osc = c.createOscillator()
    const g = c.createGain()
    const start = now + i * stepDur
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(f, start)
    g.gain.setValueAtTime(0.0001, start)
    g.gain.linearRampToValueAtTime(1, start + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, start + stepDur * 1.8)
    osc.connect(g)
    g.connect(totalGain)
    osc.start(start)
    osc.stop(start + stepDur * 1.9)
    nodes.push(osc, g)
  })

  return { id, key, stop: () => stopWithFade(totalGain, nodes, c) }
}

function playUi(key: UiSoundKey, c: AudioContext, vol: number, loop: boolean): ActiveSoundHandle {
  if (key === 'button_click') return playTone(c, key, 1100, 750, 0.02, vol, 'sine')
  if (key === 'quiz_correct') return playMelody(c, key, [523.25, 659.25, 783.99], 0.1, vol)
  if (key === 'quiz_incorrect') return playTone(c, key, 260, 180, 0.22, vol, 'sawtooth')
  if (key === 'level_win') return playMelody(c, key, [261.63, 329.63, 392.0, 523.25], 0.12, vol)
  if (key === 'level_fail') return playMelody(c, key, [293.66, 261.63, 220.0], 0.18, vol)
  return playTone(c, key, 146.83, 146.83, 2, vol, 'triangle', loop)
}

function playAmbient(key: AmbientSoundKey, c: AudioContext, vol: number): ActiveSoundHandle {
  if (key === 'ambient_court') return playTone(c, key, 110, 110, 2, vol, 'sine', true)
  if (key === 'ambient_forest') return playNoise(c, key, 2, vol, 450, 'bandpass', true)
  return playNoise(c, key, 2, vol, 220, 'lowpass', true)
}

export function playProceduralSound(key: SoundKey, opts: PlayOptions = {}): ActiveSoundHandle | null {
  const c = getAudioContext()
  if (!c) return null
  const baseVol = DEFAULT_SOUND_VOLUMES[key] ?? 0.5
  const vol = baseVol * (opts.volume ?? 1)
  const loop = opts.loop ?? false

  try {
    if (key === 'bow_draw' || key === 'bow_release' || key === 'arrow_hit_target' || key === 'arrow_hit_flesh') {
      return playArchery(key, c, vol)
    }
    if (key === 'footstep_walk' || key === 'footstep_run') {
      return playLocomotion(key, c, vol)
    }
    if (key === 'astra_cast' || key === 'whoosh' || key === 'sword_slash' || key === 'enemy_hit' || key === 'enemy_death' || key === 'boss_groan') {
      return playCombat(key, c, vol)
    }
    if (key === 'button_click' || key === 'quiz_correct' || key === 'quiz_incorrect' || key === 'level_win' || key === 'level_fail' || key === 'title_theme') {
      return playUi(key, c, vol, loop)
    }
    return playAmbient(key, c, vol)
  } catch {
    return null
  }
}
