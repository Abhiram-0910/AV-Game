// Where the astra will land, readable before release. Agneyastra (while charging): a ground reticle at the strike point
// with a faint column of light from the clouds, a preview of the bolt, green when it will land on a target. Manavastra
// (whenever it can be cast): the cone itself on the ground around Rama, green with a ring at each rakshasa's feet when
// one stands inside. Both read world state that systems/astra/step.ts computes with the cast's own functions.
import {
  AdditiveBlending,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { BALANCE } from '@data/balance'
import { ASTRA_LOOK as FX } from '@data/scenery'

const RANGE = BALANCE.astra.manavastra.CONE_RANGE
const HALF = (BALANCE.astra.manavastra.CONE_ANGLE_DEG * Math.PI) / 360
/** Flat CircleGeometry/RingGeometry theta that lies along +Z (Rama's facing at yaw 0) after rotateX(−π/2). */
const THETA_START = -Math.PI / 2 - HALF
const MAX_RINGS = 12
const m4 = new Matrix4()

interface Mats {
  reticle: MeshBasicMaterial
  column: MeshBasicMaterial
  fan: MeshBasicMaterial
  edge: MeshBasicMaterial
  ring: MeshBasicMaterial
}

export interface AstraAimMarks {
  group: Group
  mats: Mats
  reticle: Mesh
  column: Mesh
  fan: Mesh
  edge: Mesh
  rings: InstancedMesh
  dispose(): void
}

export interface AimInput {
  agneya: { point: readonly [number, number, number]; target: boolean } | null
  manava: { x: number; y: number; z: number; yaw: number; charging: boolean; enemies: readonly { x: number; z: number }[] } | null
  time: number
}

const material = (opacity: number) =>
  new MeshBasicMaterial({ transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false, side: DoubleSide, forceSinglePass: true, opacity })

function reticleGeometry() {
  const bar = (angle: number) => new PlaneGeometry(0.12, 0.6).translate(0, 1.4, 0).rotateZ(angle)
  return mergeGeometries([new RingGeometry(0.95, 1.12, 56), new RingGeometry(0.2, 0.3, 24), bar(0), bar(Math.PI / 2), bar(Math.PI), bar(-Math.PI / 2)]).rotateX(-Math.PI / 2)
}

/** The cone's outline: the far arc and both sides. */
function edgeGeometry() {
  const side = (theta: number) => new PlaneGeometry(0.14, RANGE).translate(0, RANGE / 2, 0).rotateZ(theta - Math.PI / 2)
  return mergeGeometries([new RingGeometry(RANGE - 0.18, RANGE, 40, 1, THETA_START, 2 * HALF), side(THETA_START), side(THETA_START + 2 * HALF)]).rotateX(-Math.PI / 2)
}

export function createAstraAim(): AstraAimMarks {
  const mats: Mats = { reticle: material(0.9), column: material(0.16), fan: material(FX.FAN_IDLE_OPACITY), edge: material(0.5), ring: material(0.9) }
  const marks: AstraAimMarks = {
    group: new Group(),
    mats,
    reticle: new Mesh(reticleGeometry(), mats.reticle),
    column: new Mesh(new CylinderGeometry(0.1, 0.9, 1, 16, 1, true).translate(0, 0.5, 0), mats.column),
    fan: new Mesh(new CircleGeometry(RANGE, 40, THETA_START, 2 * HALF).rotateX(-Math.PI / 2), mats.fan),
    edge: new Mesh(edgeGeometry(), mats.edge),
    rings: new InstancedMesh(new RingGeometry(0.75, 0.95, 32).rotateX(-Math.PI / 2), mats.ring, MAX_RINGS),
    dispose: () => {},
  }
  const meshes = [marks.reticle, marks.column, marks.fan, marks.edge, marks.rings]
  for (const m of meshes) {
    m.visible = false
    m.frustumCulled = false
  }
  marks.group.name = 'astra-aim'
  marks.group.add(...meshes)
  marks.dispose = () => {
    for (const m of meshes) m.geometry.dispose()
    marks.rings.dispose()
    for (const mat of Object.values(mats)) mat.dispose()
  }
  return marks
}

export function updateAstraAim(a: AstraAimMarks, input: AimInput): void {
  updateReticle(a, input.agneya, input.time)
  updateFan(a, input.manava)
}

function updateReticle(a: AstraAimMarks, aim: AimInput['agneya'], time: number): void {
  a.reticle.visible = a.column.visible = aim !== null
  if (!aim) return
  const color = aim.target ? FX.RETICLE_TARGET_COLOR : FX.RETICLE_COLOR
  a.mats.reticle.color.set(color)
  a.mats.column.color.set(color)
  a.reticle.position.set(aim.point[0], 0.07, aim.point[2])
  a.reticle.rotation.y = time * 0.9
  a.reticle.scale.setScalar(aim.target ? 1.6 : 1.1 + 0.08 * Math.sin(time * 6))
  a.column.position.set(aim.point[0], 0, aim.point[2])
  a.column.scale.set(1, FX.BOLT_HEIGHT, 1)
}

function updateFan(a: AstraAimMarks, m: AimInput['manava']): void {
  a.fan.visible = a.edge.visible = m !== null
  a.rings.visible = m !== null && m.enemies.length > 0
  if (!m) return
  const color = m.enemies.length > 0 ? FX.FAN_HIT_COLOR : FX.FAN_COLOR
  a.mats.fan.color.set(color)
  a.mats.edge.color.set(color)
  a.mats.fan.opacity = m.charging ? FX.FAN_CHARGE_OPACITY : FX.FAN_IDLE_OPACITY
  a.mats.edge.opacity = m.charging ? 0.95 : 0.45
  a.fan.position.set(m.x, m.y + 0.05, m.z)
  a.edge.position.set(m.x, m.y + 0.06, m.z)
  a.fan.rotation.y = a.edge.rotation.y = m.yaw
  const n = Math.min(MAX_RINGS, m.enemies.length)
  for (let i = 0; i < n; i += 1) a.rings.setMatrixAt(i, m4.makeTranslation(m.enemies[i].x, m.y + 0.07, m.enemies[i].z))
  a.rings.count = n
  a.rings.instanceMatrix.needsUpdate = true
}
