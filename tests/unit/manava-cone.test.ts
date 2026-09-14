import { describe, expect, it } from 'vitest'
import { BALANCE } from '@data/balance'
import { inManavaCone } from '@systems/astra/step'

const { CONE_RANGE, CONE_ANGLE_DEG } = BALANCE.astra.manavastra
const HALF = (CONE_ANGLE_DEG * Math.PI) / 360
/** A point `r` metres from Rama at `angle` off his facing (yaw 0 faces +Z). */
const at = (r: number, angle: number) => [r * Math.sin(angle), r * Math.cos(angle)] as const

describe("Manavastra's cone (the cast and the aim fan share it)", () => {
  it('holds Maricha just inside the half-angle and range, not just outside', () => {
    expect(inManavaCone(0, 0, 0, ...at(5, HALF - 0.02))).toBe(true)
    expect(inManavaCone(0, 0, 0, ...at(5, -(HALF - 0.02)))).toBe(true)
    expect(inManavaCone(0, 0, 0, ...at(5, HALF + 0.02))).toBe(false)
    expect(inManavaCone(0, 0, 0, ...at(CONE_RANGE - 0.05, 0))).toBe(true)
    expect(inManavaCone(0, 0, 0, ...at(CONE_RANGE + 0.05, 0))).toBe(false)
  })

  it('turns with Rama and ignores a rakshasa standing on him', () => {
    const behind = at(4, Math.PI)
    expect(inManavaCone(0, 0, 0, ...behind)).toBe(false)
    expect(inManavaCone(0, 0, Math.PI, ...behind)).toBe(true)
    expect(inManavaCone(2, 3, 1, 2, 3)).toBe(false)
  })
})
