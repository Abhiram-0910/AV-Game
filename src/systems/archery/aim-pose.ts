// Procedural bow draw. There is no bow clip: after mixer.update() the bones in
// BALANCE.archery.AIM_BONES are rotated in world space so the left arm points down the aim
// vector and the right hand pulls toward the cheek. Weights come from balance.ts.
import { type Bone, Matrix4, type Object3D, Quaternion, Vector3 } from 'three'
import { BALANCE } from '@data/balance'
import { SKELETON } from '@data/scenery'

const AIM = BALANCE.archery
const CHEEK = BALANCE.archeryAim.CHEEK_OFFSET

const a = new Vector3()
const b = new Vector3()
const current = new Vector3()
const wanted = new Vector3()
const parentWorld = new Quaternion()
const parentInv = new Quaternion()
const delta = new Quaternion()
const target = new Quaternion()
const cheek = new Vector3()
const up = new Vector3(0, 1, 0)
const bowX = new Vector3()
const bowY = new Vector3()
const bowZ = new Vector3()
const basis = new Matrix4()

export interface AimBones {
  upperarm_l: Bone
  lowerarm_l: Bone
  hand_l: Bone
  upperarm_r: Bone
  lowerarm_r: Bone
  hand_r: Bone
  spine_03: Bone
  head: Bone
}

export function collectAimBones(bones: Map<string, Bone>): AimBones {
  const get = (name: string) => {
    const bone = bones.get(name)
    if (!bone) throw new Error(`aim bone ${name} missing`)
    return bone
  }
  return {
    upperarm_l: get('upperarm_l'),
    lowerarm_l: get('lowerarm_l'),
    hand_l: get(SKELETON.LEFT_HAND),
    upperarm_r: get('upperarm_r'),
    lowerarm_r: get('lowerarm_r'),
    hand_r: get(SKELETON.RIGHT_HAND),
    spine_03: get(SKELETON.SPINE_TOP),
    head: get(SKELETON.HEAD_BONE),
  }
}

/** Rotate `bone` in world space so the direction bone→tip becomes `dir`, blended by weight. */
function pointBoneAt(bone: Bone, tip: Bone, dir: Vector3, weight: number): void {
  bone.getWorldPosition(a)
  tip.getWorldPosition(b)
  current.subVectors(b, a).normalize()
  delta.setFromUnitVectors(current, dir)
  bone.parent!.getWorldQuaternion(parentWorld)
  parentInv.copy(parentWorld).invert()
  // world' = delta · world  ⇒  local' = P⁻¹ · delta · P · local
  target.copy(parentInv).multiply(delta).multiply(parentWorld).multiply(bone.quaternion)
  bone.quaternion.slerp(target, weight)
  bone.updateMatrixWorld(true)
}

function clampPitch(dir: Vector3): Vector3 {
  const pitch = Math.asin(Math.max(-1, Math.min(1, dir.y)))
  const clamped = Math.max(-AIM.MAX_PITCH_RAD, Math.min(AIM.MAX_PITCH_RAD, pitch))
  if (clamped === pitch) return dir
  const horizontal = Math.hypot(dir.x, dir.z) || 1
  const scale = Math.cos(clamped) / horizontal
  return dir.set(dir.x * scale, Math.sin(clamped), dir.z * scale)
}

/**
 * The bow follows the hand's twist, which the arm solve does not control. Roll the holder so
 * the bow's long axis (+Y) stands up and its belly (+X) faces down the aim vector.
 */
function rollBow(holder: Object3D, aim: Vector3, blend: number): void {
  bowX.copy(aim)
  bowZ.crossVectors(bowX, up).normalize()
  bowY.crossVectors(bowZ, bowX).normalize()
  basis.makeBasis(bowX, bowY, bowZ)
  target.setFromRotationMatrix(basis)
  holder.parent!.getWorldQuaternion(parentWorld)
  parentInv.copy(parentWorld).invert()
  delta.copy(parentInv).multiply(target)
  holder.quaternion.slerp(delta, blend)
}

/**
 * @param aimDir world-space unit aim vector
 * @param draw 0..1 how far the string is pulled
 * @param blend 0..1 overall pose weight (ramps in/out over AIM_BLEND_*_SEC)
 * @param bowHolder the group the bow prop hangs from, rolled upright while aiming
 */
export function applyAimPose(bones: AimBones, aimDir: Vector3, draw: number, blend: number, bowHolder?: Object3D): void {
  if (blend <= 0) return
  const w = AIM.AIM_WEIGHTS
  wanted.copy(clampPitch(aimDir))
  // Torso: lean the aim direction into the spine so the shoulders square up.
  bones.spine_03.getWorldPosition(a)
  bones.head.getWorldPosition(b)
  current.subVectors(b, a).normalize()
  target.setFromUnitVectors(current, up.clone().lerp(wanted, w.spine_03 * blend).normalize())
  bones.spine_03.parent!.getWorldQuaternion(parentWorld)
  parentInv.copy(parentWorld).invert()
  delta.copy(parentInv).multiply(target).multiply(parentWorld).multiply(bones.spine_03.quaternion)
  bones.spine_03.quaternion.slerp(delta, blend)
  bones.spine_03.updateMatrixWorld(true)
  // Bow arm straight down the aim vector.
  pointBoneAt(bones.upperarm_l, bones.hand_l, wanted, w.upperarm_l * blend)
  pointBoneAt(bones.lowerarm_l, bones.hand_l, wanted, w.lowerarm_l * blend)
  // Draw hand: from the rest pose toward the cheek, scaled by draw.
  bones.head.getWorldPosition(cheek)
  cheek.addScaledVector(up, CHEEK[1]).addScaledVector(wanted, -CHEEK[2])
  a.crossVectors(wanted, up).normalize()
  cheek.addScaledVector(a, CHEEK[0])
  bones.upperarm_r.getWorldPosition(a)
  b.subVectors(cheek, a).normalize()
  pointBoneAt(bones.upperarm_r, bones.hand_r, b, w.upperarm_r * blend * draw)
  bones.lowerarm_r.getWorldPosition(a)
  b.subVectors(cheek, a).normalize()
  pointBoneAt(bones.lowerarm_r, bones.hand_r, b, w.lowerarm_r * blend * draw)
  if (bowHolder) rollBow(bowHolder, wanted, blend)
}
