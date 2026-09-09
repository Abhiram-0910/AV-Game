// Props appearing many times (trees, grass, rocks in later levels) render as one InstancedMesh.
import { type BufferGeometry, InstancedMesh, type Material, Matrix4 } from 'three'

export interface InstanceTransform {
  pos: readonly [number, number, number]
  yaw: number
  scale: number
}

export function makeInstanced(geometry: BufferGeometry, material: Material, transforms: readonly InstanceTransform[]): InstancedMesh {
  const mesh = new InstancedMesh(geometry, material, transforms.length)
  const m = new Matrix4()
  transforms.forEach((t, i) => {
    m.makeRotationY(t.yaw)
    m.scale({ x: t.scale, y: t.scale, z: t.scale } as never)
    m.setPosition(t.pos[0], t.pos[1], t.pos[2])
    mesh.setMatrixAt(i, m)
  })
  mesh.instanceMatrix.needsUpdate = true
  return mesh
}
