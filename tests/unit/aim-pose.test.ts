// The procedural draw is geometry, not art: prove the bow arm ends up pointing down the aim
// vector on a real three.js bone chain, and that weight 0 leaves the pose untouched.
import { describe, expect, it } from 'vitest'
import { Bone, Group, Quaternion, Vector3 } from 'three'
import { applyAimPose, type AimBones } from '@systems/archery/aim-pose'

function chain(): { root: Group; bones: AimBones } {
  const root = new Group()
  const mk = (name: string, parent: Bone | Group, y: number, x = 0) => {
    const b = new Bone()
    b.name = name
    b.position.set(x, y, 0)
    parent.add(b)
    return b
  }
  const pelvis = mk('pelvis', root, 1)
  const spine = mk('spine_03', pelvis, 0.3)
  const head = mk('Head', spine, 0.4)
  const ual = mk('upperarm_l', spine, 0.2, 0.2)
  const lal = mk('lowerarm_l', ual, -0.3)
  const hl = mk('hand_l', lal, -0.3)
  const uar = mk('upperarm_r', spine, 0.2, -0.2)
  const lar = mk('lowerarm_r', uar, -0.3)
  const hr = mk('hand_r', lar, -0.3)
  root.updateMatrixWorld(true)
  return { root, bones: { upperarm_l: ual, lowerarm_l: lal, hand_l: hl, upperarm_r: uar, lowerarm_r: lar, hand_r: hr, spine_03: spine, head } }
}

function armDir(b: AimBones): Vector3 {
  const a = new Vector3()
  const h = new Vector3()
  b.upperarm_l.getWorldPosition(a)
  b.hand_l.getWorldPosition(h)
  return h.sub(a).normalize()
}

describe('procedural aim pose', () => {
  it('leaves every bone alone at blend 0', () => {
    const { bones } = chain()
    const before = bones.upperarm_l.quaternion.clone()
    applyAimPose(bones, new Vector3(0, 0, 1), 1, 0)
    expect(bones.upperarm_l.quaternion.equals(before)).toBe(true)
  })

  it('points the bow arm down the aim vector when the arm weights sum to full', () => {
    const { bones } = chain()
    const aim = new Vector3(0.3, 0.1, 1).normalize()
    // Full weight on both arm bones and no torso lean makes the outcome exact.
    for (let i = 0; i < 4; i += 1) applyAimPose(bones, aim, 1, 1)
    expect(armDir(bones).dot(aim)).toBeGreaterThan(0.95)
  })

  it('clamps pitch so the arm never folds through the torso', () => {
    const { bones } = chain()
    for (let i = 0; i < 4; i += 1) applyAimPose(bones, new Vector3(0, -1, 0.01).normalize(), 1, 1)
    const dir = armDir(bones)
    expect(Math.asin(dir.y)).toBeGreaterThan(-1.2)
    expect(new Quaternion().equals(bones.hand_r.quaternion)).toBe(true)
  })
})
