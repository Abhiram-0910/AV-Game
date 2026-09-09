// Downward raycast against the walkable meshes. Falls back to y = 0 when nothing is hit.
import { type Object3D, Raycaster, Vector3 } from 'three'
import { BALANCE } from '@data/balance'

const ORIGIN_HEIGHT = BALANCE.locomotion.GROUND_RAY_ABOVE
const MAX_DEPTH = BALANCE.locomotion.GROUND_RAY_DEPTH
const origin = new Vector3()
const down = new Vector3(0, -1, 0)

export function createGroundProbe(meshes: () => readonly Object3D[]) {
  const ray = new Raycaster()
  ray.far = ORIGIN_HEIGHT + MAX_DEPTH
  return (x: number, z: number, lastY: number): number => {
    const targets = meshes()
    if (targets.length === 0) return 0
    origin.set(x, lastY + ORIGIN_HEIGHT, z)
    ray.set(origin, down)
    const hit = ray.intersectObjects(targets as Object3D[], true)[0]
    return hit ? hit.point.y : 0
  }
}
