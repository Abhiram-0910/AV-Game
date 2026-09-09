// Fixed-timestep accumulator. Pure TS — pass 2 calls advance() from useFrame and uses
// the returned alpha to interpolate render transforms between the last two ticks.
import { BALANCE } from '@data/balance'

export interface FixedLoopOptions {
  hz: number
  maxSubSteps: number
  eps: number
}

export interface FixedLoop {
  /** Number of simulation ticks run so far. */
  readonly tick: number
  /** Fixed step length in seconds. */
  readonly dt: number
  /** Feed a frame's wall-clock delta. Runs 0..maxSubSteps ticks. Returns alpha in [0, 1). */
  advance(frameSeconds: number, step: (tick: number) => void): number
  reset(): void
}

const DEFAULTS: FixedLoopOptions = {
  hz: BALANCE.loop.HZ,
  maxSubSteps: BALANCE.loop.MAX_SUBSTEPS,
  eps: BALANCE.loop.ACCUMULATOR_EPS,
}

export function createFixedLoop(opts: Partial<FixedLoopOptions> = {}): FixedLoop {
  const { hz, maxSubSteps, eps } = { ...DEFAULTS, ...opts }
  const dt = 1 / hz
  let acc = 0
  let tick = 0

  return {
    get tick() {
      return tick
    },
    dt,
    advance(frameSeconds, step) {
      // Clamp so a paused tab or a debugger break never triggers a catch-up spiral.
      acc += Math.min(Math.max(frameSeconds, 0), dt * maxSubSteps)
      let steps = 0
      while (acc + eps >= dt && steps < maxSubSteps) {
        step(tick)
        tick += 1
        acc -= dt
        steps += 1
      }
      if (acc < 0) acc = 0
      return Math.min(acc / dt, 1 - Number.EPSILON)
    },
    reset() {
      acc = 0
      tick = 0
    },
  }
}
