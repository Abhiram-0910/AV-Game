import { describe, expect, it } from 'vitest'
import { ASTRA_LOOK as FX } from '@data/scenery'
import { BALANCE } from '@data/balance'
import { stepStorm, strikeView } from '@systems/astra/sequence'

const dt = 1 / 60
function run(level: number, seconds: number, charging: boolean, castAt: number | null, start = 0) {
  let s = level
  for (let t = start; t < start + seconds; t += dt) s = stepStorm(s, dt, charging, castAt === null ? null : t - castAt)
  return s
}

describe('astra sequence', () => {
  it('the storm gathers in GATHER_SEC while charging, so it is full before the charge completes', () => {
    expect(run(0, FX.GATHER_SEC * 0.5, true, null)).toBeCloseTo(0.5, 1)
    expect(FX.GATHER_SEC).toBeLessThan(BALANCE.astra.CHARGE_TICKS / BALANCE.loop.HZ)
    expect(run(0, FX.GATHER_SEC + 0.05, true, null)).toBe(1)
  })

  it('a charge let go early eases back quickly; a strike holds, then clears to daylight', () => {
    expect(run(1, FX.CANCEL_SEC + 0.05, false, null)).toBe(0)
    expect(run(1, FX.HOLD_SEC - 0.05, false, 0)).toBe(1)
    const cleared = run(1, FX.HOLD_SEC + FX.CLEAR_SEC + 0.05, false, 0)
    expect(cleared).toBe(0)
    expect(run(1, FX.HOLD_SEC + FX.CLEAR_SEC / 2, false, 0)).toBeGreaterThan(0.3)
  })

  it('the whole sequence, charge to daylight, takes about five seconds', () => {
    const total = BALANCE.astra.CHARGE_TICKS / BALANCE.loop.HZ + FX.HOLD_SEC + FX.CLEAR_SEC
    expect(total).toBeGreaterThan(3.5)
    expect(total).toBeLessThan(5.5)
  })

  it('strike stages run in order and end; the flash and shake start at full and decay', () => {
    expect(strikeView(null)).toEqual({ bolt: null, shock: null, dust: null, gale: null, flash: 0, shake: 0 })
    const start = strikeView(0)
    expect(start.bolt).toBe(0)
    expect(start.flash).toBe(1)
    expect(start.shake).toBeCloseTo(FX.SHAKE_M)
    const later = strikeView(FX.BOLT_SEC + 0.01)
    expect(later.bolt).toBeNull()
    expect(later.shock).not.toBeNull()
    expect(strikeView(FX.DUST_SEC + 0.01).dust).toBeNull()
  })
})
