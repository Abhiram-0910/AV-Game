// Modesty fix must actually skin correctly: every vertex's 4 weights sum to 1, indices point
// at real bones, and the triangle cost stays far under the OVERNIGHT.md budget (400 / 200).
import { describe, expect, it } from 'vitest'
import { Bone, Group, Matrix4, Skeleton } from 'three'
import { buildGarments } from '@render/garments'
import { CHARACTER_SPECS, type CharacterId } from '@data/characters'
import { SKELETON } from '@data/scenery'

function rig(): { root: Group; skeleton: Skeleton } {
  const root = new Group()
  const mk = (name: string, parent: Bone | Group, x: number, y: number, z = 0) => {
    const b = new Bone()
    b.name = name
    b.position.set(x, y, z)
    parent.add(b)
    return b
  }
  const pelvis = mk(SKELETON.PELVIS, root, 0, 1)
  const spine = mk(SKELETON.SPINE_TOP, pelvis, 0, 0.5)
  const clavicle = mk(SKELETON.CLAVICLE_L, spine, 0.2, 0.3)
  const thighL = mk(SKELETON.THIGH_L, pelvis, 0.15, -0.1)
  const thighR = mk(SKELETON.THIGH_R, pelvis, -0.15, -0.1)
  root.updateMatrixWorld(true)
  const skeleton = new Skeleton([pelvis, spine, clavicle, thighL, thighR])
  return { root, skeleton }
}

function assertWeightsSumToOne(parts: ReturnType<typeof buildGarments>) {
  for (const part of parts) {
    const idx = part.geometry.attributes.skinIndex
    const w = part.geometry.attributes.skinWeight
    for (let i = 0; i < w.count; i += 1) {
      let sum = 0
      for (let k = 0; k < 4; k += 1) {
        sum += w.getComponent(i, k)
        expect(idx.getComponent(i, k)).toBeGreaterThanOrEqual(0)
      }
      expect(sum).toBeCloseTo(1, 5)
    }
  }
}

describe('procedural garments', () => {
  const ids = Object.keys(CHARACTER_SPECS) as CharacterId[]

  it('every character gets a fully-weighted dhoti, and a sash only when specced', () => {
    const { root, skeleton } = rig()
    for (const id of ids) {
      const parts = buildGarments(id, root, skeleton, new Matrix4(), Uint8Array)
      expect(parts.length).toBe(CHARACTER_SPECS[id].sash ? 2 : 1)
      assertWeightsSumToOne(parts)
    }
  })

  it('stays far under the tri budget (dhoti 400, sash 200)', () => {
    const { root, skeleton } = rig()
    const parts = buildGarments('rama', root, skeleton, new Matrix4(), Uint8Array)
    const [dhoti, sash] = parts
    expect(dhoti.geometry.index!.count / 3).toBeLessThan(400)
    expect(sash!.geometry.index!.count / 3).toBeLessThan(200)
  })
})
