// One mixer per character. Clips are looked up through CLIPS only; no clip string lives here.
import { type AnimationAction, type AnimationClip, AnimationMixer, LoopOnce, LoopRepeat, type Object3D } from 'three'
import { BALANCE } from '@data/balance'
import { CLIPS, type ClipKey } from '@data/clips'

export interface PlayOptions {
  loop?: boolean
  /** Crossfade seconds. */
  fade?: number
  /** Playback rate; 1 = authored speed. */
  speed?: number
}

export interface AnimationController {
  readonly mixer: AnimationMixer
  readonly current: ClipKey | null
  play(key: ClipKey, opts?: PlayOptions): void
  update(dt: number): void
  dispose(): void
}

export function createAnimationController(root: Object3D, clips: readonly AnimationClip[]): AnimationController {
  const mixer = new AnimationMixer(root)
  const byName = new Map(clips.map((c) => [c.name, c]))
  const actions = new Map<ClipKey, AnimationAction>()
  let current: ClipKey | null = null

  function action(key: ClipKey): AnimationAction {
    const cached = actions.get(key)
    if (cached) return cached
    const clip = byName.get(CLIPS[key])
    if (!clip) throw new Error(`clip ${key} (${CLIPS[key]}) missing from the loaded library`)
    const a = mixer.clipAction(clip)
    actions.set(key, a)
    return a
  }

  return {
    mixer,
    get current() {
      return current
    },
    play(key, opts = {}) {
      if (current === key) return
      const next = action(key)
      next.reset()
      next.setLoop(opts.loop === false ? LoopOnce : LoopRepeat, Infinity)
      next.clampWhenFinished = opts.loop === false
      next.timeScale = opts.speed ?? 1
      next.enabled = true
      const fade = opts.fade ?? BALANCE.animation.CROSSFADE_SEC
      const prev = current ? action(current) : null
      if (prev) {
        next.setEffectiveWeight(1)
        next.play()
        prev.crossFadeTo(next, fade, false)
      } else {
        next.fadeIn(fade).play()
      }
      current = key
    },
    update(dt) {
      mixer.update(dt)
    },
    dispose() {
      mixer.stopAllAction()
      mixer.uncacheRoot(root)
    },
  }
}
