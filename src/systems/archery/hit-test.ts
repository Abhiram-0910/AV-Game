import { Box3, type Intersection, Line3, type Object3D, Raycaster, Vector3 } from 'three'
import { BALANCE } from '@data/balance'
import type { ArrowState } from './ballistics'

const from = new Vector3()
const to = new Vector3()
const dir = new Vector3()
const box = new Box3()
const center = new Vector3()
const seg = new Line3()
const closest = new Vector3()
const biased = new Vector3()

export function findProximityHit(
  fromPt: Vector3,
  toPt: Vector3,
  targets: readonly Object3D[],
): Intersection | null {
  if (targets.length === 0) return null
  seg.set(fromPt, toPt)
  let bestRoot: Object3D | null = null
  let bestDist: number = BALANCE.archery.AIM_ASSIST_RADIUS
  const bestPoint = new Vector3()

  for (const root of targets) {
    box.setFromObject(root)
    if (box.isEmpty()) {
      root.getWorldPosition(center)
    } else {
      box.getCenter(center)
    }
    seg.closestPointToPoint(center, true, closest)
    const dist = closest.distanceTo(center)
    if (dist < bestDist) {
      bestDist = dist
      bestRoot = root
      biased.copy(closest).lerp(center, BALANCE.archery.AIM_ASSIST_BIAS)
      bestPoint.copy(biased)
    }
  }

  if (!bestRoot) return null
  return {
    distance: fromPt.distanceTo(bestPoint),
    point: bestPoint.clone(),
    object: bestRoot,
  } as Intersection
}

export function createHitTester() {
  const ray = new Raycaster()
  return (prev: ArrowState, next: ArrowState, targets: readonly Object3D[]): Intersection | null => {
    if (targets.length === 0) return null
    from.set(prev.x, prev.y, prev.z)
    to.set(next.x, next.y, next.z)
    dir.subVectors(to, from)
    const length = dir.length()
    if (length < 1e-6) return null
    ray.set(from, dir.normalize())
    ray.far = length
    const directHit = ray.intersectObjects(targets as Object3D[], true)[0] ?? null
    if (directHit) return directHit
    return findProximityHit(from, to, targets)
  }
}

/** The raycast recurses into children; find which registered root the hit mesh belongs to. */
export function resolveHitRoot(hit: Object3D, roots: readonly Object3D[]): Object3D | undefined {
  for (let o: Object3D | null = hit; o; o = o.parent) {
    if (roots.includes(o)) return o
  }
  return undefined
}
