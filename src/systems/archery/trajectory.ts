// Real-time parabolic trajectory sampling and collision detection for archery preview.
import { type Object3D, Raycaster, Vector3 } from 'three'
import { BALANCE } from '@data/balance'
import { grounded, launchArrow, stepArrow } from './ballistics'
import { findProximityHit, resolveHitRoot } from './hit-test'

export interface TrajectorySample {
  points: [number, number, number][]
  terminalPoint: [number, number, number] | null
  terminalNormal: [number, number, number] | null
  isTarget: boolean
  isGround: boolean
  targetObject: Object3D | null
}

interface SegmentHit {
  point: [number, number, number]
  normal: [number, number, number]
  isTarget: boolean
  isGround: boolean
  object: Object3D | null
}

const fromVec = new Vector3()
const toVec = new Vector3()
const segDir = new Vector3()
const tempVec = new Vector3()
const ray = new Raycaster()
const hitNormal = new Vector3()

function testSegmentAgainst(
  targets: readonly Object3D[],
): { hitPoint: [number, number, number]; normal: [number, number, number]; object: Object3D } | null {
  if (targets.length === 0) return null
  const hits = ray.intersectObjects(targets as Object3D[], true)
  if (hits.length === 0) return null
  const hit = hits[0]
  if (hit.face) {
    hitNormal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld).normalize()
  } else {
    hitNormal.set(0, 1, 0)
  }
  return {
    hitPoint: [hit.point.x, hit.point.y, hit.point.z],
    normal: [hitNormal.x, hitNormal.y, hitNormal.z],
    object: hit.object,
  }
}

function groundPlaneHit(
  prev: { x: number; y: number; z: number },
  next: { x: number; y: number; z: number },
): [number, number, number] {
  const dy = prev.y - next.y
  const t = dy > 1e-6 ? Math.max(0, Math.min(1, prev.y / dy)) : 0
  return [prev.x + t * (next.x - prev.x), 0, prev.z + t * (next.z - prev.z)]
}

function resolveGroundOrAssist(
  assistHit: ReturnType<typeof findProximityHit>,
  groundHit: ReturnType<typeof testSegmentAgainst>,
): SegmentHit | null {
  if (!assistHit && !groundHit) return null
  if (assistHit && groundHit) {
    const dGround = fromVec.distanceTo(tempVec.set(groundHit.hitPoint[0], groundHit.hitPoint[1], groundHit.hitPoint[2]))
    if (assistHit.distance <= dGround) {
      return {
        point: [assistHit.point.x, assistHit.point.y, assistHit.point.z],
        normal: [0, 1, 0],
        isTarget: true,
        isGround: false,
        object: assistHit.object,
      }
    }
  }
  if (groundHit) {
    return { point: groundHit.hitPoint, normal: groundHit.normal, isTarget: false, isGround: true, object: null }
  }
  return {
    point: [assistHit!.point.x, assistHit!.point.y, assistHit!.point.z],
    normal: [0, 1, 0],
    isTarget: true,
    isGround: false,
    object: assistHit!.object,
  }
}

function testSegmentCollision(
  current: { x: number; y: number; z: number },
  next: { x: number; y: number; z: number },
  hittable: readonly Object3D[],
  ground: readonly Object3D[],
): SegmentHit | null {
  fromVec.set(current.x, current.y, current.z)
  toVec.set(next.x, next.y, next.z)
  segDir.subVectors(toVec, fromVec)
  const len = segDir.length()
  if (len < 1e-6) return null

  ray.set(fromVec, segDir.normalize())
  ray.far = len

  const targetHit = testSegmentAgainst(hittable)
  if (targetHit) {
    const root = resolveHitRoot(targetHit.object, hittable)
    return {
      point: targetHit.hitPoint,
      normal: targetHit.normal,
      isTarget: !!root,
      isGround: false,
      object: root ?? targetHit.object,
    }
  }

  const assistHit = findProximityHit(fromVec, toVec, hittable)
  const groundHit = testSegmentAgainst(ground)
  const resolved = resolveGroundOrAssist(assistHit, groundHit)
  if (resolved) return resolved

  if (next.y <= 0 && current.y > 0) {
    return { point: groundPlaneHit(current, next), normal: [0, 1, 0], isTarget: false, isGround: true, object: null }
  }

  return null
}

export function computeTrajectory(
  origin: readonly [number, number, number],
  dir: readonly [number, number, number],
  fraction: number,
  hittable: readonly Object3D[],
  ground: readonly Object3D[],
  dt = 1 / BALANCE.loop.HZ,
  maxSteps = BALANCE.archery.TRAJECTORY_MAX_STEPS,
): TrajectorySample {
  const points: [number, number, number][] = [[origin[0], origin[1], origin[2]]]
  let current = launchArrow(origin, dir, fraction)

  for (let i = 0; i < maxSteps; i += 1) {
    const next = stepArrow(current, dt)
    const hit = testSegmentCollision(current, next, hittable, ground)
    if (hit) {
      points.push(hit.point)
      return {
        points,
        terminalPoint: hit.point,
        terminalNormal: hit.normal,
        isTarget: hit.isTarget,
        isGround: hit.isGround,
        targetObject: hit.object,
      }
    }

    points.push([next.x, next.y, next.z])
    current = next
    if (grounded(current) || !current.alive) break
  }

  const last = points[points.length - 1]
  return { points, terminalPoint: last, terminalNormal: [0, 1, 0], isTarget: false, isGround: false, targetObject: null }
}
