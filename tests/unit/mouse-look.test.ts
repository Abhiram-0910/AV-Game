import { describe, expect, it } from 'vitest'
import { BALANCE } from '@data/balance'
import { type LookState, routeLook } from '@systems/camera/mouse-look'

const LOOK = BALANCE.mouseLook
const rad = LOOK.RAD_PER_PX_MOUSE
const idle = (): LookState => ({ pitch: 0, cursor: { x: 0.3, y: 0.5 }, aiming: false })

describe('mouse look routing', () => {
  it('free look: right turns right (negative yaw, as D does), up tilts the camera up, the cursor stays put', () => {
    const r = routeLook(100, -40, false, rad, idle(), 1280, 720)
    expect(r.yawDelta).toBeCloseTo(-100 * rad)
    expect(r.pitch).toBeCloseTo(40 * rad)
    expect(r.cursor).toEqual({ x: 0.3, y: 0.5 })
  })

  it('clamps the camera tilt both ways', () => {
    expect(routeLook(0, -1e5, false, rad, idle(), 1280, 720).pitch).toBe(LOOK.PITCH_UP_MAX)
    expect(routeLook(0, 1e5, false, rad, idle(), 1280, 720).pitch).toBe(-LOOK.PITCH_DOWN_MAX)
  })

  it('aiming: movement steers the cursor as far as the real one would move, and never turns Rama', () => {
    const r = routeLook(64, -36, true, rad, { ...idle(), aiming: true }, 1280, 720)
    expect(r.yawDelta).toBe(0)
    expect(r.cursor.x).toBeCloseTo(0.3 + 0.1)
    expect(r.cursor.y).toBeCloseTo(0.5 + 0.1)
  })

  it('a new aim recentres the cursor sideways and keeps its height; the cursor stays on screen', () => {
    const r = routeLook(0, 0, true, rad, idle(), 1280, 720)
    expect(r.cursor).toEqual({ x: 0, y: 0.5 })
    expect(routeLook(1e5, -1e5, true, rad, r, 1280, 720).cursor).toEqual({ x: 1, y: 1 })
  })
})
