// Props appearing many times (trees, grass, rocks in the outdoor levels) render as one InstancedMesh.
import { type BufferGeometry, type Color, Euler, InstancedMesh, type Material, Matrix4, Quaternion, Vector3 } from 'three'

export interface InstanceTransform {
  pos: readonly [number, number, number]
  yaw: number
  /** Uniform, or per axis. */
  scale: number | readonly [number, number, number]
  /** Lean off plumb about X and Z (radians), applied with the yaw. */
  tilt?: readonly [number, number]
  /** Multiplied into the material colour for this instance. */
  color?: Color
}

const m = new Matrix4()
const euler = new Euler()
const quat = new Quaternion()
const pos = new Vector3()
const scale = new Vector3()

export function makeInstanced(geometry: BufferGeometry, material: Material, transforms: readonly InstanceTransform[]): InstancedMesh {
  const mesh = new InstancedMesh(geometry, material, transforms.length)
  transforms.forEach((t, i) => {
    quat.setFromEuler(euler.set(t.tilt?.[0] ?? 0, t.yaw, t.tilt?.[1] ?? 0))
    if (typeof t.scale === 'number') scale.setScalar(t.scale)
    else scale.set(t.scale[0], t.scale[1], t.scale[2])
    mesh.setMatrixAt(i, m.compose(pos.set(t.pos[0], t.pos[1], t.pos[2]), quat, scale))
    if (t.color) mesh.setColorAt(i, t.color)
  })
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  mesh.computeBoundingSphere()
  return mesh
}
