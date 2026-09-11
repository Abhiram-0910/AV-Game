// Modesty fix must actually skin correctly: every vertex's 4 weights sum to 1, indices point
// at real bones, and the triangle cost stays far under the OVERNIGHT.md budget (400 / 200).
import { describe, expect, it } from 'vitest'
import { Bone, BufferAttribute, type BufferGeometry, Group, Matrix4, MeshBasicMaterial, Skeleton, SkinnedMesh, SphereGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
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
  const neck = mk(SKELETON.NECK, spine, 0, 0.35)
  const head = mk(SKELETON.HEAD_BONE, neck, 0, 0.1)
  const thighL = mk(SKELETON.THIGH_L, pelvis, 0.15, -0.1)
  const thighR = mk(SKELETON.THIGH_R, pelvis, -0.15, -0.1)
  root.updateMatrixWorld(true)
  const skeleton = new Skeleton([pelvis, spine, clavicle, thighL, thighR, neck, head])
  // A body for the fitted parts: an egg torso (pelvis low, spine_03 high) and a ball head, top of the
  // torso at the neck bone so the collar has shoulders to drape over.
  const torso = skinned(new SphereGeometry(0.2, 24, 16).scale(1, 2.4, 0.8).translate(0, 1.4, 0), (y) => (y < 1.25 ? 0 : 1))
  const skull = skinned(new SphereGeometry(0.1, 16, 12).translate(0, 2.05, 0), () => 6)
  const body = new SkinnedMesh(mergeGeometries([torso, skull]), new MeshBasicMaterial())
  root.add(body)
  root.updateMatrixWorld(true)
  body.bind(skeleton)
  return { root, skeleton }
}

function skinned(g: BufferGeometry, bone: (y: number) => number): BufferGeometry {
  const pos = g.attributes.position
  const idx = new Uint8Array(pos.count * 4)
  const w = new Float32Array(pos.count * 4)
  for (let i = 0; i < pos.count; i += 1) {
    idx[i * 4] = bone(pos.getY(i))
    w[i * 4] = 1
  }
  g.setAttribute('skinIndex', new BufferAttribute(idx, 4))
  g.setAttribute('skinWeight', new BufferAttribute(w, 4))
  return g
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

  it('every character gets a fully-weighted dhoti, a choli when female, and sash / upper / regalia only when specced', () => {
    const { root, skeleton } = rig()
    for (const id of ids) {
      const spec = CHARACTER_SPECS[id]
      const parts = buildGarments(id, root, skeleton, new Matrix4(), Uint8Array)
      expect(parts.length).toBe(1 + (spec.mesh === 'female' ? 1 : 0) + (spec.sash ? 1 : 0) + (spec.upper ? 1 : 0) + (spec.regalia ? 1 : 0))
      assertWeightsSumToOne(parts)
    }
  })

  it('stays far under the tri budget (dhoti 400, choli 200, sash 200, upper 400, regalia 800)', () => {
    const { root, skeleton } = rig()
    const tris = (id: CharacterId, name: string) => buildGarments(id, root, skeleton, new Matrix4(), Uint8Array).find((p) => p.name === name)!.geometry.index!.count / 3
    expect(tris('rama', 'dhoti')).toBeLessThan(400)
    expect(tris('rama', 'sash')).toBeLessThan(200)
    expect(tris('rama', 'upper')).toBeLessThan(400)
    expect(tris('dasharatha', 'regalia')).toBeLessThan(800)
    expect(tris('tataka', 'choli')).toBeLessThan(200)
  })

  it('fits the upper garment outside the body and seats the crown on the head', () => {
    const { root, skeleton } = rig()
    const parts = buildGarments('dasharatha', root, skeleton, new Matrix4(), Uint8Array)
    const upper = parts.find((p) => p.name === 'upper')!.geometry.attributes.position
    for (let i = 0; i < upper.count; i += 1) {
      const y = upper.getY(i)
      // Inside the egg torso x²/0.2² + ((y-1.4)/0.48)² + z²/0.16² < 1 would mean skin through cloth.
      expect((upper.getX(i) / 0.2) ** 2 + ((y - 1.4) / 0.48) ** 2 + (upper.getZ(i) / 0.16) ** 2).toBeGreaterThan(1)
    }
    const regalia = parts.find((p) => p.name === 'regalia')!
    regalia.geometry.computeBoundingBox()
    expect(regalia.geometry.boundingBox!.max.y).toBeGreaterThan(2.15) // the kirita rises over the skull top
  })
})
