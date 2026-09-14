// The mouse-to-launch mapping a player actually uses, and the arrow drawn along its flight. The old mapping (screen
// offset × 0.5 rad) launched at 27° from the top edge and the pool drew every arrow upright; both are asserted here.
import { readFileSync } from 'node:fs'
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Object3D, PerspectiveCamera, Raycaster, Vector2, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '@data/balance'
import { LEVELS } from '@data/levels'
import { aimFromRay, muzzleOrigin } from '@systems/archery/ballistics'
import { computeTrajectory } from '@systems/archery/trajectory'
import { orientArrow, wrapArrowModel } from '@render/arrow-model'

const AIM = BALANCE.archeryAim
const LIMITS = { maxDist: AIM.AIM_MAX_DIST, minDist: AIM.AIM_MIN_DIST, maxDown: AIM.AIM_MAX_DOWN, maxUp: AIM.AIM_MAX_UP }
const W = 1280
const H = 720
type V2 = [number, number]

/** The follow camera's settled pose (FollowCamera.tsx) behind a player at `from` facing `to`, turned `off` radians
 * away from it (tank controls rarely leave a player dead on; the e2e face() stops within 0.2). */
function followCamera(from: V2, to: V2, off = 0): PerspectiveCamera {
  const C = BALANCE.camera
  const yaw = Math.atan2(to[0] - from[0], to[1] - from[1]) + off
  const cam = new PerspectiveCamera(C.FOV, W / H, C.NEAR, C.FAR)
  cam.position.set(from[0] - Math.sin(yaw) * C.DISTANCE, C.HEIGHT, from[1] - Math.cos(yaw) * C.DISTANCE)
  cam.lookAt(from[0], C.LOOK_HEIGHT, from[1])
  cam.updateMatrixWorld()
  return cam
}

const raycaster = new Raycaster()
function aimAt(cam: PerspectiveCamera, from: V2, ndc: V2) {
  raycaster.setFromCamera(new Vector2(ndc[0], ndc[1]), cam)
  const { origin: o, direction: d } = raycaster.ray
  return aimFromRay({ origin: [o.x, o.y, o.z], dir: [d.x, d.y, d.z] }, from[0], 0, from[1], LIMITS)
}

describe('cursor aim', () => {
  const l4 = LEVELS[3]
  const from: V2 = [l4.waypoints.firingLine[0], l4.waypoints.firingLine[2]]
  const to: V2 = [l4.targets[0].pos[0], l4.targets[0].pos[2]]

  it('never lobs, and lands in view on the cursor side and ahead, from any screen edge or the centre', () => {
    const cam = followCamera(from, to)
    const heading = Math.atan2(to[0] - from[0], to[1] - from[1])
    for (const ndc of [[0, 0], [0, 1], [0, -1], [-1, 0], [1, 0], [-1, 1], [1, -1]] as V2[]) {
      const dir = aimAt(cam, from, ndc)
      const pitch = Math.asin(dir[1])
      expect(pitch, `pitch at ${ndc}`).toBeLessThanOrEqual(AIM.AIM_MAX_UP + 1e-9)
      expect(pitch, `pitch at ${ndc}`).toBeGreaterThanOrEqual(-AIM.AIM_MAX_DOWN - 1e-9)
      const landing = computeTrajectory(muzzleOrigin(from[0], 0, from[1], dir), dir, 1, [], []).terminalPoint!
      const ahead = (landing[0] - from[0]) * Math.sin(heading) + (landing[2] - from[1]) * Math.cos(heading)
      expect(ahead, `landing at ${ndc}`).toBeGreaterThan(2)
      // Where the arrow comes down is on screen, on the side the cursor is (a near landing at the left edge is ~60°
      // off Rama's heading with the camera 5.5 m behind him, and that is right).
      const seen = new Vector3(landing[0], landing[1], landing[2]).project(cam)
      expect(Math.abs(seen.x), `landing on screen at ${ndc}`).toBeLessThanOrEqual(1.05)
      if (ndc[0] !== 0) expect(Math.sign(seen.x), `landing side at ${ndc}`).toBe(Math.sign(ndc[0]))
    }
  })

  it('hits every real target with the cursor on it plus at most a target-height raise, facing it or up to 0.5 rad off', () => {
    const l2 = LEVELS[1]
    const shots: { from: V2; to: V2; scale: number }[] = [
      { from: [l2.waypoints.range[0], l2.waypoints.range[2]], to: [l2.targets[0].pos[0], l2.targets[0].pos[2]], scale: 1 },
      { from, to, scale: 1 },
      { from, to: [l4.targets[3].pos[0], l4.targets[3].pos[2]], scale: 0.6 },
      { from, to: [l4.targets[2].pos[0], l4.targets[2].pos[2]], scale: 1 },
    ]
    // 0.5 rad: tank-control turns under a slow frame rate stop that far off (tests/e2e/play.ts face()), and a player may too.
    for (const [s, off] of shots.flatMap((shot) => [0, 0.18, -0.18, 0.5, -0.5].map((o) => [shot, o] as const))) {
      const cam = followCamera(s.from, s.to, off)
      const height = 0.727 * s.scale // target.glb
      const target = new Mesh(new BoxGeometry(0.526 * s.scale, height, 0.42 * s.scale), new MeshBasicMaterial())
      target.position.set(s.to[0], height / 2, s.to[1])
      target.updateMatrixWorld()
      const centre = new Vector3(s.to[0], height / 2, s.to[1]).project(cam)
      const top = new Vector3(s.to[0], height, s.to[1]).project(cam)
      const pxHeight = ((top.y - centre.y) * H) // centre to top is half the height; ×2/2 cancels
      let locked = false
      for (let raise = 0; raise <= Math.ceil(pxHeight * 2) && !locked; raise += 1) {
        const dir = aimAt(cam, s.from, [centre.x, centre.y + (raise * 2) / H])
        locked = computeTrajectory(muzzleOrigin(s.from[0], 0, s.from[1], dir), dir, 1, [target], []).isTarget
      }
      expect(locked, `target at ${s.to}, facing ${off} rad off`).toBe(true)
    }
  })
})

describe('arrow model', () => {
  it('flies head first along its velocity, not standing upright', () => {
    // Rebuild arrow.glb's node chain from the committed file: the transform and the mesh extents that decide which way it points.
    const glb = readFileSync('public/assets/high/props/arrow.glb')
    const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString())
    const node = json.nodes.find((n: { mesh?: number }) => n.mesh !== undefined)
    const bounds = json.meshes[node.mesh].primitives.map((p: { attributes: { POSITION: number } }) => json.accessors[p.attributes.POSITION])
    const zSpan = (b: { min: number[]; max: number[] }) => b.max[2] - b.min[2]
    const shaft = bounds.reduce((a: { min: number[]; max: number[] }, b: { min: number[]; max: number[] }) => (zSpan(b) > zSpan(a) ? b : a))
    expect(zSpan(shaft)).toBeGreaterThan(5 * (shaft.max[0] - shaft.min[0])) // long along local Z
    const width = (b: { min: number[]; max: number[] }) => b.max[0] - b.min[0]
    const back = bounds.filter((b: { min: number[] }) => b.min[2] > 0)
    const front = bounds.filter((b: { max: number[] }) => b.max[2] < 0)
    expect(Math.max(...front.map(width))).toBeGreaterThan(Math.max(...back.map(width))) // the broad head is at −Z

    const mesh = new Object3D()
    mesh.quaternion.fromArray(node.rotation)
    mesh.scale.fromArray(node.scale)
    const scene = new Group()
    scene.add(mesh)
    const arrow = wrapArrowModel(scene)
    for (const v of [[0, 0, 42], [30, 6, -29], [-10, -20, 5], [0, 40, 1]]) {
      orientArrow(arrow, v[0], v[1], v[2])
      arrow.updateMatrixWorld(true)
      const head = new Vector3(0, 0, -1).transformDirection(mesh.matrixWorld)
      expect(head.dot(new Vector3(v[0], v[1], v[2]).normalize()), `velocity ${v}`).toBeGreaterThan(0.999)
    }
  })
})
