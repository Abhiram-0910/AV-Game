// Procedural garments: a dhoti (tapered wrap skirt) skinned to the pelvis and both thighs,
// an angavastram sash skinned to a clavicle and spine_03, and for royalty a fitted upper garment
// and gold regalia (crown, shoulder collar) fitted to the body by render/garment-fit.ts. Solid
// colours, no textures — there is no artist. Built as extra SkinnedMesh "parts" merged into the character by
// character-factory.ts, exactly like the source body/eyes/eyebrows primitives.
import { BoxGeometry, BufferAttribute, type BufferGeometry, Color, ConeGeometry, CylinderGeometry, type Material, type Matrix4, MeshBasicMaterial, MeshStandardMaterial, type Object3D, Quaternion, type Skeleton, SkinnedMesh, SphereGeometry, Vector3 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { BALANCE } from '@data/balance'
import { CHARACTER_SPECS, type CharacterId, type Regalia } from '@data/characters'
import { SKELETON } from '@data/scenery'
import { bodySamples, drape, fitGeometry, ringShell } from './garment-fit'

type WeightPair = readonly [index: number, weight: number]
/** Must match the body mesh's own skinIndex array type exactly, or the merge step refuses it. */
export type SkinIndexCtor = Uint8ArrayConstructor | Uint16ArrayConstructor

function requireBone(skeleton: Skeleton, name: string) {
  const bone = skeleton.bones.find((b) => b.name === name)
  if (!bone) throw new Error(`garments: skeleton has no ${name} bone`)
  return bone
}

function xzDist(a: Vector3, b: Vector3): number {
  return Math.hypot(a.x - b.x, a.z - b.z)
}

/** Writes exactly 4 (index, weight) slots per vertex from a per-vertex weigh function. */
function setSkin(geometry: BufferGeometry, skinIndexCtor: SkinIndexCtor, weigh: (v: Vector3) => readonly WeightPair[]): void {
  const pos = geometry.attributes.position
  const skinIndex = new skinIndexCtor(pos.count * 4)
  const skinWeight = new Float32Array(pos.count * 4)
  const v = new Vector3()
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i)
    const pairs = weigh(v)
    for (let k = 0; k < 4; k += 1) {
      skinIndex[i * 4 + k] = pairs[k]?.[0] ?? 0
      skinWeight[i * 4 + k] = pairs[k]?.[1] ?? 0
    }
  }
  geometry.setAttribute('skinIndex', new BufferAttribute(skinIndex, 4))
  geometry.setAttribute('skinWeight', new BufferAttribute(skinWeight, 4))
}

function garmentMesh(name: string, geometry: BufferGeometry, color: string | Material): SkinnedMesh {
  const mesh = new SkinnedMesh(geometry, typeof color === 'string' ? new MeshBasicMaterial({ color: new Color(color) }) : color)
  mesh.name = name
  return mesh
}

const TORSO = [SKELETON.PELVIS, 'spine_01', 'spine_02', SKELETON.SPINE_TOP]
// No upper arms: a collar vertex skinned to an arm follows it into the lap (SIT_TALK) as a long spike.
const SHOULDERS = [SKELETON.SPINE_TOP, SKELETON.NECK, SKELETON.CLAVICLE_L, 'clavicle_r']

/** Fitted upper garment from under the dhoti's waistline to just below the collarbone; sleeveless. */
function buildUpper(rig: Object3D, skeleton: Skeleton, skinIndexCtor: SkinIndexCtor, pelvis: Vector3, clavicle: Vector3, color: string): SkinnedMesh {
  const g = BALANCE.garments
  const fit = ringShell(bodySamples(rig, skeleton, TORSO), pelvis.y - g.UPPER_TUCK, clavicle.y - g.UPPER_NECKLINE, g.UPPER_RINGS, g.UPPER_SECTORS, g.UPPER_GAP)
  const geometry = fitGeometry(fit, (n, p) => n.x * (p.x - pelvis.x) + n.z * (p.z - pelvis.z) > 0, skinIndexCtor)
  return garmentMesh('upper', geometry, color)
}

/** Gold band fitted round the skull (clearing the hair), points on its rim — seven tall ones and a
 * conical kirita for the king, three at the brow for a prince. Rigid on Head. Front is +Z (sector 4). */
function buildCrown(rig: Object3D, skeleton: Skeleton, skinIndexCtor: SkinIndexCtor, kind: Regalia): BufferGeometry {
  const g = BALANCE.garments
  const head = bodySamples(rig, skeleton, [SKELETON.HEAD_BONE])
  const top = head.reduce((a, s) => Math.max(a, s.p.y), -Infinity)
  const fit = ringShell(head, top - g.CROWN_BAND[0], top - g.CROWN_BAND[1], 2, 16, g.CROWN_GAP)
  const rim = fit.points.slice(16)
  const c = rim.reduce((a, p) => a.add(p), new Vector3()).divideScalar(16)
  const parts: BufferGeometry[] = [fitGeometry(fit, (n, p) => n.x * (p.x - c.x) + n.z * (p.z - c.z) > 0)]
  rim.forEach((p, k) => {
    const h = kind === 'king' ? (k % 2 ? 0.045 : 0.075) : [3, 5].includes(k) ? 0.04 : k === 4 ? 0.065 : 0
    if (h > 0) parts.push(new ConeGeometry(g.CROWN_POINT_RADIUS, h, 4).translate(p.x, p.y + h / 2, p.z))
  })
  if (kind === 'king') {
    const r = rim.reduce((a, p) => a + Math.hypot(p.x - c.x, p.z - c.z), 0) / 16
    parts.push(new CylinderGeometry(0.03, r * 0.9, g.KIRITA_HEIGHT, 16, 1, true).translate(c.x, c.y + g.KIRITA_HEIGHT / 2, c.z))
    parts.push(new SphereGeometry(0.03, 8, 6).translate(c.x, c.y + g.KIRITA_HEIGHT + 0.02, c.z))
  }
  const crown = mergeGeometries(parts)
  parts.forEach((p) => p.dispose())
  const idxHead = skeleton.bones.indexOf(requireBone(skeleton, SKELETON.HEAD_BONE))
  setSkin(crown, skinIndexCtor, () => [[idxHead, 1]])
  return crown
}

/** Broad gold collar draped over the shoulders from the base of the neck, following the skin under it. */
function buildCollar(rig: Object3D, skeleton: Skeleton, skinIndexCtor: SkinIndexCtor): BufferGeometry {
  const g = BALANCE.garments
  const neck = requireBone(skeleton, SKELETON.NECK).getWorldPosition(new Vector3())
  // Only what lies under the collar: without the cut the neck's own column is the "highest" point.
  const under = bodySamples(rig, skeleton, SHOULDERS).filter((s) => s.p.y < neck.y + g.COLLAR_NECK_CLEAR)
  const fit = drape(under, neck, g.COLLAR_INNER, g.COLLAR_OUTER, 4, 20, g.COLLAR_GAP, g.COLLAR_REACH)
  return fitGeometry(fit, (n) => n.y > 0, skinIndexCtor)
}

function buildRegalia(rig: Object3D, skeleton: Skeleton, skinIndexCtor: SkinIndexCtor, kind: Regalia): SkinnedMesh {
  const crown = buildCrown(rig, skeleton, skinIndexCtor, kind)
  const collar = buildCollar(rig, skeleton, skinIndexCtor)
  const geometry = mergeGeometries([crown, collar])
  crown.dispose()
  collar.dispose()
  const { REGALIA_GOLD, REGALIA_PBR } = BALANCE.garments
  return garmentMesh('regalia', geometry, new MeshStandardMaterial({ color: REGALIA_GOLD, ...REGALIA_PBR }))
}

function buildDhoti(skeleton: Skeleton, skinIndexCtor: SkinIndexCtor, pelvisWorld: Vector3, thighLWorld: Vector3, thighRWorld: Vector3, color: string, length: number): SkinnedMesh {
  const g = BALANCE.garments
  const idxPelvis = skeleton.bones.indexOf(requireBone(skeleton, SKELETON.PELVIS))
  const idxThighL = skeleton.bones.indexOf(requireBone(skeleton, SKELETON.THIGH_L))
  const idxThighR = skeleton.bones.indexOf(requireBone(skeleton, SKELETON.THIGH_R))
  const topY = pelvisWorld.y
  const botY = topY - length
  const geometry = new CylinderGeometry(g.DHOTI_WAIST_RADIUS, g.DHOTI_WAIST_RADIUS * g.DHOTI_HEM_FLARE, length, g.DHOTI_RADIAL_SEGMENTS, 1, true)
  geometry.translate(pelvisWorld.x, (topY + botY) / 2, pelvisWorld.z)
  setSkin(geometry, skinIndexCtor, (v) => {
    const thighBlend = Math.min(1, Math.max(0, (topY - v.y) / length)) ** 2
    const toLeft = xzDist(v, thighLWorld) < xzDist(v, thighRWorld)
    const pairs: WeightPair[] = [[idxPelvis, 1 - thighBlend]]
    if (thighBlend > 0) pairs.push([toLeft ? idxThighL : idxThighR, thighBlend])
    return pairs
  })
  return garmentMesh('dhoti', geometry, color)
}

function buildSash(skeleton: Skeleton, skinIndexCtor: SkinIndexCtor, clavicleWorld: Vector3, spineTopWorld: Vector3, color: string, overUpper: boolean): SkinnedMesh {
  const g = BALANCE.garments
  const idxClavicle = skeleton.bones.indexOf(requireBone(skeleton, SKELETON.CLAVICLE_L))
  const idxSpine = skeleton.bones.indexOf(requireBone(skeleton, SKELETON.SPINE_TOP))
  const delta = new Vector3().subVectors(spineTopWorld, clavicleWorld)
  const length = delta.length()
  const dir = delta.clone().normalize()
  const geometry = new BoxGeometry(g.SASH_WIDTH, length, g.SASH_THICKNESS)
  geometry.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir))
  // Pushed outward along the shoulder-to-spine line's horizontal normal so it drapes on the
  // chest surface instead of sitting on the spine's centerline, embedded inside the torso.
  const outward = new Vector3().crossVectors(dir, new Vector3(0, 1, 0)).normalize()
  if (outward.dot(new Vector3(clavicleWorld.x, 0, clavicleWorld.z)) < 0) outward.negate()
  const mid = clavicleWorld.clone().addScaledVector(delta, 0.5).addScaledVector(outward, g.SASH_SURFACE_OFFSET + (overUpper ? g.SASH_OVER_UPPER : 0))
  geometry.translate(mid.x, mid.y, mid.z)
  setSkin(geometry, skinIndexCtor, (v) => {
    const t = Math.min(1, Math.max(0, new Vector3().subVectors(v, clavicleWorld).dot(dir) / length))
    return [[idxClavicle, 1 - t], [idxSpine, t]]
  })
  return garmentMesh('sash', geometry, color)
}

/**
 * Torso wrap from the waist to the collarbone, skinned pelvis→spine_03 by height like the
 * dhoti blends pelvis→thigh. The female base mesh's baked-in top is otherwise fully exposed
 * above the dhoti (see TODO.md, pass 3 phase B) — every female character gets this, same as
 * every character gets a dhoti. Reaches the clavicle height (not just spine_03's own, lower
 * height) because the bra it's covering sits above the sternum; still skinned to spine_03 —
 * a torso garment has no business rigged to an arm bone.
 */
function buildCholi(skeleton: Skeleton, skinIndexCtor: SkinIndexCtor, pelvisWorld: Vector3, collarWorld: Vector3, color: string): SkinnedMesh {
  const g = BALANCE.garments
  const idxPelvis = skeleton.bones.indexOf(requireBone(skeleton, SKELETON.PELVIS))
  const idxSpine = skeleton.bones.indexOf(requireBone(skeleton, SKELETON.SPINE_TOP))
  const botY = pelvisWorld.y
  const topY = collarWorld.y
  const height = topY - botY
  const geometry = new CylinderGeometry(g.CHOLI_RADIUS, g.CHOLI_RADIUS, height, g.CHOLI_RADIAL_SEGMENTS, 1, true)
  geometry.translate(pelvisWorld.x, (topY + botY) / 2, pelvisWorld.z)
  setSkin(geometry, skinIndexCtor, (v) => {
    const t = Math.min(1, Math.max(0, (v.y - botY) / height))
    return [[idxPelvis, 1 - t], [idxSpine, t]]
  })
  return garmentMesh('choli', geometry, color)
}

/**
 * Extra skinned parts for a character: always a dhoti; a choli when female; an upper garment, a sash
 * and regalia when the spec calls for them.
 * `rig` must already be in its bind pose with world matrices updated (fresh clone, before any
 * clip has played) and `bindMatrix` is the body mesh's bindMatrix — geometry is authored in
 * world space at bind time, then pulled into that same local space so it merges cleanly.
 */
export function buildGarments(id: CharacterId, rig: Object3D, skeleton: Skeleton, bindMatrix: Matrix4, skinIndexCtor: SkinIndexCtor): SkinnedMesh[] {
  const spec = CHARACTER_SPECS[id]
  rig.updateMatrixWorld(true)
  const pelvis = requireBone(skeleton, SKELETON.PELVIS).getWorldPosition(new Vector3())
  const thighL = requireBone(skeleton, SKELETON.THIGH_L).getWorldPosition(new Vector3())
  const thighR = requireBone(skeleton, SKELETON.THIGH_R).getWorldPosition(new Vector3())
  const parts = [buildDhoti(skeleton, skinIndexCtor, pelvis, thighL, thighR, spec.garmentColor, spec.garmentLength)]
  if (spec.mesh === 'female') {
    const clavicle = requireBone(skeleton, SKELETON.CLAVICLE_L).getWorldPosition(new Vector3())
    parts.push(buildCholi(skeleton, skinIndexCtor, pelvis, clavicle, spec.garmentColor))
  }
  if (spec.upper) {
    const clavicle = requireBone(skeleton, SKELETON.CLAVICLE_L).getWorldPosition(new Vector3())
    parts.push(buildUpper(rig, skeleton, skinIndexCtor, pelvis, clavicle, spec.upper))
  }
  if (spec.sash) {
    const clavicle = requireBone(skeleton, SKELETON.CLAVICLE_L).getWorldPosition(new Vector3())
    const spineTop = requireBone(skeleton, SKELETON.SPINE_TOP).getWorldPosition(new Vector3())
    parts.push(buildSash(skeleton, skinIndexCtor, clavicle, spineTop, spec.sashColor, spec.upper !== null))
  }
  if (spec.regalia) parts.push(buildRegalia(rig, skeleton, skinIndexCtor, spec.regalia))
  const invBind = bindMatrix.clone().invert()
  parts.forEach((p) => p.geometry.applyMatrix4(invBind))
  return parts
}
