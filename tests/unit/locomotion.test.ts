import { describe, expect, it } from 'vitest'
import { BALANCE } from '@data/balance'
import { IDLE_INPUT, spawnState, stepLocomotion, type WorldQuery } from '@systems/locomotion/kinematic'

const dt = 1 / 60
const flat: WorldQuery = { bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 }, obstacles: [], groundY: () => 0 }

function run(steps: number, input = IDLE_INPUT, world = flat, start = spawnState([0, 0, 0], 0)) {
  let s = start
  for (let i = 0; i < steps; i += 1) s = stepLocomotion(s, input, dt, world)
  return s
}

describe('kinematic locomotion', () => {
  it('walks along its facing at WALK_SPEED after accelerating, jogs with run', () => {
    const walk = run(120, { forward: 1, turn: 0, run: false })
    expect(walk.speed).toBeCloseTo(BALANCE.player.WALK_SPEED)
    expect(walk.z).toBeGreaterThan(1.5)
    expect(walk.x).toBeCloseTo(0)
    const jog = run(120, { forward: 1, turn: 0, run: true })
    expect(jog.speed).toBeCloseTo(BALANCE.player.JOG_SPEED)
  })

  it('adds mouse-look yaw on top of the keys, once per tick it is given', () => {
    const looked = stepLocomotion(spawnState([0, 0, 0], 0), { forward: 0, turn: 0, run: false, yaw: 0.4 }, dt, flat)
    expect(looked.yaw).toBeCloseTo(0.4)
    const both = stepLocomotion(looked, { forward: 0, turn: 1, run: false, yaw: -0.1 }, dt, flat)
    expect(both.yaw).toBeCloseTo(0.3 + BALANCE.player.TURN_SPEED_RAD * dt)
  })

  it('turns with A/D at TURN_SPEED_RAD and moves backward slower', () => {
    const turned = run(60, { forward: 0, turn: 1, run: false })
    expect(turned.yaw).toBeCloseTo(BALANCE.player.TURN_SPEED_RAD)
    const back = run(120, { forward: -1, turn: 0, run: false })
    expect(back.speed).toBeCloseTo(-BALANCE.player.WALK_SPEED * BALANCE.locomotion.BACK_SPEED_FACTOR)
  })

  it('stays inside the bounds and outside NPC circles', () => {
    const boxed = run(600, { forward: 1, turn: 0, run: true })
    expect(boxed.z).toBeLessThanOrEqual(10 - BALANCE.locomotion.CAPSULE_RADIUS + 1e-9)
    const blocked = run(600, { forward: 1, turn: 0, run: true }, { ...flat, obstacles: [{ x: 0, z: 3, radius: 0.5 }] })
    expect(Math.hypot(blocked.x, blocked.z - 3)).toBeGreaterThanOrEqual(0.5 + BALANCE.locomotion.CAPSULE_RADIUS - 1e-9)
  })

  it('snaps to ground within GROUND_SNAP_MAX and ignores cliffs; keeps prev for interpolation', () => {
    const step = run(1, IDLE_INPUT, { ...flat, groundY: () => 0.3 })
    expect(step.y).toBeCloseTo(0.3)
    expect(step.prevY).toBe(0)
    const cliff = run(1, IDLE_INPUT, { ...flat, groundY: () => -5 })
    expect(cliff.y).toBe(0)
  })
})
