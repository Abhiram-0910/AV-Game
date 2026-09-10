import { describe, expect, it } from 'vitest'
import { BALANCE } from '@data/balance'
import { nearestPickupIndex } from '@systems/interaction/interact'

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
