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

function getAudioContext(): AudioContext | null {
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

/** The astra charging at the bow: a filtered saw climbing in pitch, brightness and volume over the charge. */
function playRise(c: AudioContext, key: SoundKey, vol: number, seconds: number): ActiveSoundHandle {
  const id = nextHandleId++
  const now = c.currentTime
  const osc = c.createOscillator()
  const filter = c.createBiquadFilter()
  const gain = c.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(70, now)
  osc.frequency.exponentialRampToValueAtTime(520, now + seconds)
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(260, now)
  filter.frequency.exponentialRampToValueAtTime(3200, now + seconds)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(vol, now + seconds)
  osc.connect(filter)
  filter.connect(gain)
  gain.connect(masterGain ?? c.destination)
  osc.start(now)
  osc.stop(now + seconds + 0.4)
  return { id, key, stop: () => stopWithFade(gain, [osc, filter, gain], c) }
}

/** The strike: a bright crack over a low rumble that rolls off. */
function playThunder(c: AudioContext, key: SoundKey, vol: number): ActiveSoundHandle {
  playNoise(c, key, 0.3, vol, 2200, 'highpass')
  return playNoise(c, key, 2, vol, 150, 'lowpass')
}

function playCombat(key: CombatSoundKey, c: AudioContext, vol: number): ActiveSoundHandle {
  if (key === 'astra_charge') return playRise(c, key, vol, 1.5)
  if (key === 'thunder') return playThunder(c, key, vol)
  if (key === 'gale') return playNoise(c, key, 2, vol, 650, 'bandpass')
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

function playUi(key: UiSoundKey, c: AudioContext, vol: number): ActiveSoundHandle {
  if (key === 'button_click') return playTone(c, key, 1100, 750, 0.02, vol, 'sine')
  if (key === 'quiz_correct') return playMelody(c, key, [523.25, 659.25, 783.99], 0.1, vol)
  if (key === 'quiz_incorrect') return playTone(c, key, 260, 180, 0.22, vol, 'sawtooth')
  if (key === 'level_win') return playMelody(c, key, [261.63, 329.63, 392.0, 523.25], 0.12, vol)
  return playMelody(c, key, [293.66, 261.63, 220.0], 0.18, vol)
}

/** Wind: lowpass cutoff (Hz), how far it sways (fraction of the cutoff), the gust swell (fraction of the level), their
 * rates (Hz), and the fade-in. The old loops were one noise buffer through a single bandpass (Q 1) or lowpass, so a
 * third of their energy sat above 1 kHz and read as static (2026-09-14). */
const WIND = { forestCutoff: 520, nightCutoff: 340, sway: 0.35, swayHz: 0.05, gust: 0.55, gustHz: 0.11, fadeInSec: 3 }

/** A slow oscillator added onto an AudioParam. */
function lfo(c: AudioContext, hz: number, depth: number, param: AudioParam): AudioNode[] {
  const osc = c.createOscillator()
  const amount = c.createGain()
  osc.frequency.setValueAtTime(hz, c.currentTime)
  amount.gain.setValueAtTime(depth, c.currentTime)
  osc.connect(amount).connect(param)
  osc.start()
  return [osc, amount]
}

/** Outdoor air: looped noise through two lowpasses in series (24 dB/octave, so nothing reaches the band where hiss
 * lives), its cutoff swaying and its level swelling on slow oscillators so it moves like wind, not one steady rush. */
function playAmbient(key: AmbientSoundKey, c: AudioContext, vol: number): ActiveSoundHandle {
  const id = nextHandleId++
  const now = c.currentTime
  const cutoff = key === 'ambient_night' ? WIND.nightCutoff : WIND.forestCutoff
  const src = c.createBufferSource()
  src.buffer = createNoiseBuffer(c, 4)
  src.loop = true
  const low = [c.createBiquadFilter(), c.createBiquadFilter()]
  for (const f of low) {
    f.type = 'lowpass'
    f.frequency.setValueAtTime(cutoff, now)
  }
  const gain = c.createGain()
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.linearRampToValueAtTime(vol, now + WIND.fadeInSec)
  const mods = [...lfo(c, WIND.swayHz, cutoff * WIND.sway, low[0].frequency), ...lfo(c, WIND.gustHz, vol * WIND.gust, gain.gain)]
  src.connect(low[0]).connect(low[1]).connect(gain).connect(masterGain ?? c.destination)
  src.start(now)
  return { id, key, stop: () => stopWithFade(gain, [src, ...low, ...mods, gain], c) }
}

export function playProceduralSound(key: SoundKey, opts: PlayOptions = {}): ActiveSoundHandle | null {
  const c = getAudioContext()
  if (!c) return null
  const baseVol = DEFAULT_SOUND_VOLUMES[key] ?? 0.5
  const vol = baseVol * (opts.volume ?? 1)

  try {
    if (key === 'bow_draw' || key === 'bow_release' || key === 'arrow_hit_target' || key === 'arrow_hit_flesh') {
      return playArchery(key, c, vol)
    }
    if (key === 'footstep_walk' || key === 'footstep_run') {
      return playLocomotion(key, c, vol)
    }
    if (key === 'astra_cast' || key === 'astra_charge' || key === 'thunder' || key === 'gale' || key === 'whoosh' || key === 'sword_slash' || key === 'enemy_hit' || key === 'enemy_death' || key === 'boss_groan') {
      return playCombat(key, c, vol)
    }
    if (key === 'button_click' || key === 'quiz_correct' || key === 'quiz_incorrect' || key === 'level_win' || key === 'level_fail') {
      return playUi(key, c, vol)
    }
    return playAmbient(key, c, vol)
  } catch {
    return null
  }
}
