import { describe, expect, it } from 'vitest'
import { BALANCE } from '@data/balance'
import { LEVELS } from '@data/levels'
import { activeWaypoint, applyObjectiveEvent, freshProgress } from '@core/objectives'
import { nearestPickupIndex, type NpcPoint, talkTarget } from '@systems/interaction/interact'
import { turnToward } from '@systems/locomotion/kinematic'

describe('nearestPickupIndex', () => {
  it('returns the nearest pile in range, not the first', () => {
    const piles = [
      { x: 0, z: 5 },
      { x: 0, z: 1 },
    ]
    expect(nearestPickupIndex(piles, 0, 0)).toBe(1)
  })

  it('returns -1 when nothing is within PICKUP_RADIUS', () => {
    const piles = [{ x: 0, z: BALANCE.interaction.PICKUP_RADIUS + 1 }]
    expect(nearestPickupIndex(piles, 0, 0)).toBe(-1)
  })
})

const npc = (id: NpcPoint['id'], x: number, z: number): NpcPoint => ({ id, x, z, yaw: 0, homeYaw: 0, seated: false })

describe('talkTarget', () => {
  const l1 = LEVELS[0]
  const fresh = freshProgress(l1.objectives)
  const vish = npc('vishwamitra', 2.4, 3.6)
  const R = BALANCE.interaction.TALK_RADIUS

  it('is a circle around the NPC: every side at 0.95 R, none at 1.05 R, whichever way anyone faces', () => {
    for (let k = 0; k < 8; k += 1) {
      const a = (k * Math.PI) / 4
      const at = (r: number) => talkTarget(l1.objectives, fresh, [vish], vish.x + Math.sin(a) * r, vish.z + Math.cos(a) * r)
      expect(at(R * 0.95)?.npc, `${k * 45} deg inside`).toBe(vish)
      expect(at(R * 1.05), `${k * 45} deg outside`).toBeNull()
    }
  })

  it('offers the next speaker while only a reach stands before the talk (L1: the throne lies behind Vishwamitra)', () => {
    // 2 m in front of him and 3.2 m short of the throne: the strict order showed no prompt here (reproduced in the build).
    expect(talkTarget(l1.objectives, fresh, [vish], 0.99, 5.01)).toMatchObject({ npc: vish, index: 1, dialogueKey: 'l1.vishwamitra.request' })
  })

  it('never skips a pending talk: Dasharatha is not offered before Vishwamitra has spoken', () => {
    const dash = npc('dasharatha', 0, 0.55)
    expect(talkTarget(l1.objectives, fresh, [vish, dash], 0, 1.5)).toBeNull()
    const reached = applyObjectiveEvent(l1.objectives, fresh, { kind: 'reach', waypoint: 'throne' })
    const spoken = applyObjectiveEvent(l1.objectives, reached, { kind: 'talk', dialogueKey: 'l1.vishwamitra.request' })
    expect(talkTarget(l1.objectives, spoken, [vish, dash], 0, 1.5)?.npc).toBe(dash)
  })
})

describe('turnToward (hero and NPC face each other in a talk)', () => {
  it('turns at most maxStep a tick, lands exactly, and goes the short way round', () => {
    expect(turnToward(0, 1, 0.05)).toBeCloseTo(0.05)
    expect(turnToward(0.98, 1, 0.05)).toBeCloseTo(1)
    expect(turnToward(-3.1, 3.1, 0.05)).toBeCloseTo(-3.15)
    let yaw = 0
    for (let i = 0; i < 200; i += 1) yaw = turnToward(yaw, 2.5, 0.05)
    expect(yaw).toBeCloseTo(2.5, 9)
  })
})

describe('activeWaypoint (the waypoint marker)', () => {
  it('marks the waypoint of every reach objective and the straw man of a strike, and nothing for any other kind', () => {
    let reaches = 0
    for (const def of LEVELS) {
      def.objectives.forEach((o, i) => {
        const progress = def.objectives.map((_, k) => ({ done: k < i, progress: 0 }))
        const spot = activeWaypoint(def, progress)
        if (o.kind === 'strike') return expect(spot, `${def.id} objective ${i}`).toEqual(def.strikeDummy)
        if (o.kind !== 'reach') return expect(spot, `${def.id} objective ${i}`).toBeNull()
        reaches += 1
        expect(spot, `${def.id} objective ${i}`).toEqual(def.waypoints[o.waypoint])
      })
    }
    expect(reaches).toBe(6)
  })
})
