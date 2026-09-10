// Procedural garments: a dhoti (tapered wrap skirt) skinned to the pelvis and both thighs,
// and an angavastram sash skinned to a clavicle and spine_03. Solid tint, no textures — there
// is no artist. Built as extra SkinnedMesh "parts" merged into the character by
// character-factory.ts, exactly like the source body/eyes/eyebrows primitives.
import { BoxGeometry, BufferAttribute, type BufferGeometry, Color, CylinderGeometry, type Matrix4, MeshBasicMaterial, type Object3D, Quaternion, type Skeleton, SkinnedMesh, Vector3 } from 'three'
import { BALANCE } from '@data/balance'
import { CHARACTER_SPECS, type CharacterId } from '@data/characters'
import { SKELETON } from '@data/scenery'

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

function garmentMesh(name: string, geometry: BufferGeometry, color: string): SkinnedMesh {
  const mesh = new SkinnedMesh(geometry, new MeshBasicMaterial({ color: new Color(color) }))
  mesh.name = name
  return mesh
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

function buildSash(skeleton: Skeleton, skinIndexCtor: SkinIndexCtor, clavicleWorld: Vector3, spineTopWorld: Vector3, color: string): SkinnedMesh {
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
  const mid = clavicleWorld.clone().addScaledVector(delta, 0.5).addScaledVector(outward, g.SASH_SURFACE_OFFSET)
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
 * Extra skinned parts for a character: always a dhoti, a sash when the spec calls for one.
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
  if (spec.sash) {
    const clavicle = requireBone(skeleton, SKELETON.CLAVICLE_L).getWorldPosition(new Vector3())
    const spineTop = requireBone(skeleton, SKELETON.SPINE_TOP).getWorldPosition(new Vector3())
    parts.push(buildSash(skeleton, skinIndexCtor, clavicle, spineTop, spec.sashColor))
  }
  const invBind = bindMatrix.clone().invert()
  parts.forEach((p) => p.geometry.applyMatrix4(invBind))
  return parts
}
