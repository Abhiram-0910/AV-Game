import { describe, expect, it } from 'vitest'
import { BALANCE } from '@data/balance'
import { grounded, launchArrow, shouldFailArrowsOut, stepArrow } from '@systems/archery/ballistics'
import { NO_DRAW, drawFraction, stepDraw } from '@systems/archery/draw'

const dt = 1 / 60

describe('draw', () => {
  it('charges to full over DRAW_TICKS and refuses a release under MIN_DRAW', () => {
    let s = NO_DRAW
    for (let i = 0; i < 3; i += 1) s = stepDraw(s, true).state
    expect(drawFraction(s)).toBeLessThan(BALANCE.arrow.MIN_DRAW)
    expect(stepDraw(s, false).released).toBeNull()
    s = NO_DRAW
    for (let i = 0; i < BALANCE.arrow.DRAW_TICKS * 2; i += 1) s = stepDraw(s, true).state
    expect(drawFraction(s)).toBe(1)
    expect(stepDraw(s, false).released).toBe(1)
  })
})

describe('ballistics', () => {
  it('flies a parabola: rises then drops under GRAVITY, dies at LIFETIME or on the ground', () => {
    let a = launchArrow([0, 1.4, 0], [0, 0.5, Math.sqrt(0.75)], 1)
    const first = stepArrow(a, dt)
    expect(first.vy).toBeLessThan(a.vy)
    expect(first.z).toBeGreaterThan(0)
    let peak = a.y
    for (let i = 0; i < BALANCE.arrow.LIFETIME_TICKS; i += 1) {
      a = stepArrow(a, dt)
      peak = Math.max(peak, a.y)
      if (grounded(a)) break
    }
    expect(peak).toBeGreaterThan(1.4)
    expect(grounded(a) || !a.alive).toBe(true)
  })
})

describe('arrows-out rule (L4 fail)', () => {
  it('never fails while an arrow is still in flight, even with an empty quiver', () => {
    expect(shouldFailArrowsOut(0, 1, 3)).toBe(false)
  })
  it('fails only when the quiver is empty, the air is clear, and targets remain', () => {
    expect(shouldFailArrowsOut(0, 0, 1)).toBe(true)
    expect(shouldFailArrowsOut(0, 0, 0)).toBe(false)
    expect(shouldFailArrowsOut(1, 0, 3)).toBe(false)
  })
})
