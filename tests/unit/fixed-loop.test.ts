import { describe, expect, it } from 'vitest'
import { BALANCE } from '@data/balance'
import { createFixedLoop } from '@systems/loop/fixed-loop'

// A tiny deterministic sim: inputs keyed by tick, integrated once per tick.
interface Sim {
  x: number
  v: number
}
const INPUTS: Record<number, number> = { 0: 1, 120: -2, 300: 0.5, 450: 0 }

function runAt(fps: number, seconds: number): { sim: Sim; ticks: number } {
  const loop = createFixedLoop()
  const sim: Sim = { x: 0, v: 0 }
  const frames = Math.round(fps * seconds)
  for (let f = 0; f < frames; f += 1) {
    loop.advance(1 / fps, (tick) => {
      if (tick in INPUTS) sim.v = INPUTS[tick]
      sim.x += sim.v * loop.dt
    })
  }
  return { sim, ticks: loop.tick }
}

describe('fixed loop', () => {
  it('produces identical end state at 30fps and 144fps', () => {
    const slow = runAt(30, 10)
    const fast = runAt(144, 10)
    expect(slow.ticks).toBe(10 * BALANCE.loop.HZ)
    expect(fast.ticks).toBe(slow.ticks)
    expect(fast.sim).toEqual(slow.sim)
  })

  it('returns an interpolation alpha in [0, 1)', () => {
    const loop = createFixedLoop()
    for (let i = 0; i < 50; i += 1) {
      const alpha = loop.advance(0.0137, () => {})
      expect(alpha).toBeGreaterThanOrEqual(0)
      expect(alpha).toBeLessThan(1)
    }
  })

  it('clamps catch-up to MAX_SUBSTEPS after a long stall', () => {
    const loop = createFixedLoop()
    let steps = 0
    loop.advance(5, () => (steps += 1))
    expect(steps).toBe(BALANCE.loop.MAX_SUBSTEPS)
    // and does not carry the stall forward
    steps = 0
    loop.advance(loop.dt, () => (steps += 1))
    expect(steps).toBe(1)
  })
})
