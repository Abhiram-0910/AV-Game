// Raycast along the segment an arrow travelled this tick against the hittable meshes.
import { type Intersection, type Object3D, Raycaster, Vector3 } from 'three'
import type { ArrowState } from './ballistics'

const from = new Vector3()
const to = new Vector3()
const dir = new Vector3()

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
    return ray.intersectObjects(targets as Object3D[], true)[0] ?? null
  }
}
