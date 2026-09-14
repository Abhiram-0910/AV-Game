// A low ring of hills beyond the forest, so the horizon is not one flat fog line (L2, L4; high tier with the rest of
// the wilds). It follows the camera like a sky, so its far side never passes the camera's 120 m far plane, and it is
// unlit and unfogged with the aerial haze painted into its vertex colours: at ~90 m the linear fog alone had already
// washed it to the horizon colour.
import { BufferGeometry, Color, Float32BufferAttribute, Mesh, MeshBasicMaterial } from 'three'
import type { Wilds } from '@data/scenery'
import { seeded } from './procedural-textures'

type Hills = NonNullable<Wilds['hills']>

/** Rings from the foot out: [radius offset in metres, fraction of the ridge height]. */
const PROFILE = [[0, -0.05], [7, 0.55], [15, 1], [24, 0.7]] as const

export function hillRing(h: Hills, horizon: string, seed: number): Mesh {
  const rand = seeded(seed * 104729 + 7)
  const phase = [rand(), rand(), rand()].map((p) => p * Math.PI * 2)
  const ridge = (a: number) => {
    const n = 0.5 + 0.28 * Math.sin(3 * a + phase[0]) + 0.14 * Math.sin(7 * a + phase[1]) + 0.08 * Math.sin(17 * a + phase[2])
    return h.height[0] + (h.height[1] - h.height[0]) * n
  }
  const sky = new Color(horizon)
  const pos: number[] = []
  const col: number[] = []
  for (let s = 0; s <= h.segments; s += 1) {
    const a = (s / h.segments) * Math.PI * 2
    const top = ridge(a)
    PROFILE.forEach(([dr, f], row) => {
      const r = h.radius + dr
      pos.push(Math.cos(a) * r, top * f, Math.sin(a) * r)
      const c = new Color(h.color).lerp(sky, h.haze[0] + (h.haze[1] - h.haze[0]) * (row / (PROFILE.length - 1)))
      col.push(c.r, c.g, c.b)
    })
  }
  const index: number[] = []
  const rows = PROFILE.length
  for (let s = 0; s < h.segments; s += 1)
    for (let row = 0; row < rows - 1; row += 1) {
      const [a, b, c, d] = [s * rows + row, s * rows + row + 1, (s + 1) * rows + row, (s + 1) * rows + row + 1]
      index.push(a, c, b, b, c, d)
    }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(pos, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(col, 3))
  geometry.setIndex(index)
  const mesh = new Mesh(geometry, new MeshBasicMaterial({ vertexColors: true, fog: false }))
  mesh.name = 'hill-ring'
  mesh.frustumCulled = false
  mesh.onBeforeRender = (_renderer, _scene, camera) => {
    mesh.position.set(camera.position.x, 0, camera.position.z)
    mesh.updateMatrixWorld()
  }
  return mesh
}
