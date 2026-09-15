// Level 4's straw man for the sword lesson (levels.ts strikeDummy): bound straw over a wooden post and crossbar, with a
// saffron waist cloth, in RANGE's palette so it belongs with the bales. One merged mesh per material; its origin is the
// foot of the post, which entities/StrikeDummy.tsx rocks it about.
import { type BufferGeometry, CylinderGeometry, Group, type Material, Mesh, SphereGeometry, type Texture } from 'three'
import { RANGE } from '@data/scenery'
import { authoredMaterial } from './materials'
import type { ResolvedTier } from './manifest'
import { mergeByMaterial } from './merge'
import { fibreTexture } from './wild-textures'

const P = RANGE.palette

export function buildStrawDummy(tier: ResolvedTier): { group: Group; textures: Texture[] } {
  const fibres = fibreTexture(P.straw, P.strawDark, P.strawLight, true, [0.2, 0.8])
  const straw = authoredMaterial(tier, { map: fibres, roughness: 0.95 })
  const wood = authoredMaterial(tier, { color: P.wood, roughness: 0.85 })
  const cloth = authoredMaterial(tier, { color: P.saffron, roughness: 0.8 })
  const raw = new Group()
  const put = (geometry: BufferGeometry, material: Material, y: number, turn = 0) => {
    const mesh = new Mesh(geometry, material)
    mesh.position.y = y
    mesh.rotation.z = turn
    raw.add(mesh)
  }
  put(new CylinderGeometry(0.045, 0.06, 1.9, 8), wood, 0.95) // post
  put(new CylinderGeometry(0.2, 0.15, 0.72, 12), straw, 1.06) // body
  put(new CylinderGeometry(0.07, 0.06, 1.05, 8), straw, 1.3, Math.PI / 2) // arms bound on the crossbar
  put(new SphereGeometry(0.15, 12, 8).scale(1, 1.15, 1), straw, 1.6) // head
  put(new CylinderGeometry(0.215, 0.19, 0.14, 12), cloth, 0.82) // waist cloth
  const group = mergeByMaterial(raw)
  group.name = 'straw-dummy'
  group.traverse((o) => {
    const mesh = o as Mesh
    if (mesh.isMesh) mesh.castShadow = mesh.receiveShadow = true
  })
  return { group, textures: [fibres] }
}
