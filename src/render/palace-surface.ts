// palace.glb arrives as one untextured material over a decimated shell whose column capitals and chairs collapsed
// into crumpled shells. This cuts those (render/court-architecture.ts builds the columns again), then repaints what
// is left by zone: painted walls, coffered ceiling, a gilded ceiling over the throne bay, and sandstone ledges.
// The merged palace is already in world space (render/merge.ts), so cuts and UVs work in world metres.
import { type BufferGeometry, BufferGeometry as ThreeBufferGeometry, DoubleSide, Float32BufferAttribute, type Group, type Material, type Mesh, MeshBasicMaterial, type Texture } from 'three'
import { COURT } from '@data/scenery'
import type { ResolvedTier } from './manifest'
import { authoredMaterial } from './materials'
import { ceilingTexture, gildedTextures, sandstoneTextures, wallTexture } from './palace-textures'

type V3 = readonly [number, number, number]
export interface Box {
  readonly min: V3
  readonly max: V3
}
export interface CarveOptions {
  cuts: readonly Box[]
  gilded: Box
  /** Up- or down-facing triangles with every vertex below this are floor, and never cut (the ground probe). */
  floorGuardY: number
  wallFloorY: number
  wallTileM: number
  wallTileH: number
  tileM: number
}

/** Material index per zone, in group order. `floor` is palace.glb's own floor under the court floor: never drawn (an
 * invisible material), kept for the ground raycast, which three runs on invisible group materials too. */
export const ZONES = ['wall', 'ceiling', 'gilded', 'stone', 'floor'] as const

const inBox = (b: Box, p: ArrayLike<number>, o: number) =>
  p[o] >= b.min[0] && p[o] <= b.max[0] && p[o + 1] >= b.min[1] && p[o + 1] <= b.max[1] && p[o + 2] >= b.min[2] && p[o + 2] <= b.max[2]

/** From positions, not the smoothed vertex normals; flipped to agree with those, since the shell is double-sided. */
function faceNormal(p: number[], vn: number[] | null): [number, number, number] {
  const [ax, ay, az, bx, by, bz] = [p[3] - p[0], p[4] - p[1], p[5] - p[2], p[6] - p[0], p[7] - p[1], p[8] - p[2]]
  let n: [number, number, number] = [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx]
  const len = Math.hypot(...n) || 1
  n = [n[0] / len, n[1] / len, n[2] / len]
  if (vn && n[0] * (vn[0] + vn[3] + vn[6]) + n[1] * (vn[1] + vn[4] + vn[7]) + n[2] * (vn[2] + vn[5] + vn[8]) < 0) n = [-n[0], -n[1], -n[2]]
  return n
}

const isFloor = (p: number[], n: readonly number[], o: CarveOptions) => Math.abs(n[1]) > 0.9 && p[1] < o.floorGuardY && p[4] < o.floorGuardY && p[7] < o.floorGuardY

/** Cut only when all three vertices lie in one box: a wide face crossing a box edge (the platform beside the right
 * side columns, the beam soffit) stays. */
function isCut(p: number[], n: readonly number[], o: CarveOptions): boolean {
  return !isFloor(p, n, o) && o.cuts.some((b) => inBox(b, p, 0) && inBox(b, p, 3) && inBox(b, p, 6))
}

function zoneOf(p: number[], n: readonly number[], o: CarveOptions): number {
  if (isFloor(p, n, o)) return 4
  if (n[1] < -0.5) return inBox(o.gilded, [(p[0] + p[3] + p[6]) / 3, (p[1] + p[4] + p[7]) / 3, (p[2] + p[5] + p[8]) / 3], 0) ? 2 : 1
  return n[1] > 0.5 ? 3 : 0
}

/** Box-projected UVs in metres on the face's dominant axis. Walls run v from the floor to the soffit. */
function uvs(p: number[], n: readonly number[], zone: number, o: CarveOptions): number[] {
  const [ax, ay, az] = n.map(Math.abs)
  const out: number[] = []
  for (let v = 0; v < 9; v += 3) {
    const [x, y, z] = [p[v], p[v + 1], p[v + 2]]
    if (ay >= ax && ay >= az) out.push(x / o.tileM, z / o.tileM)
    else if (zone === 0) out.push((ax > az ? z : x) / o.wallTileM, (y - o.wallFloorY) / o.wallTileH)
    else out.push((ax > az ? z : x) / o.tileM, y / o.tileM)
  }
  return out
}

/** Cut, classify and UV the shell; one geometry with a group per zone (material index = ZONES index). */
export function carve(source: BufferGeometry, o: CarveOptions): BufferGeometry {
  const flat = source.index ? source.toNonIndexed() : source
  const pos = flat.getAttribute('position').array
  const nrm = flat.getAttribute('normal')?.array ?? null
  const zones = ZONES.map(() => ({ p: [] as number[], n: [] as number[], uv: [] as number[] }))
  for (let i = 0; i < pos.length; i += 9) {
    const p = Array.from(pos.slice(i, i + 9))
    const vn = nrm ? Array.from(nrm.slice(i, i + 9)) : null
    const n = faceNormal(p, vn)
    if (isCut(p, n, o)) continue
    const zone = zoneOf(p, n, o)
    zones[zone].p.push(...p)
    zones[zone].n.push(...(vn ?? [...n, ...n, ...n]))
    zones[zone].uv.push(...uvs(p, n, zone, o))
  }
  if (flat !== source) flat.dispose()
  const out = new ThreeBufferGeometry()
  let start = 0
  zones.forEach((z, i) => {
    const count = z.p.length / 3
    if (count) out.addGroup(start, count, i)
    start += count
  })
  out.setAttribute('position', new Float32BufferAttribute(zones.flatMap((z) => z.p), 3))
  out.setAttribute('normal', new Float32BufferAttribute(zones.flatMap((z) => z.n), 3))
  out.setAttribute('uv', new Float32BufferAttribute(zones.flatMap((z) => z.uv), 2))
  out.computeBoundingSphere()
  return out
}

function courtCuts(): Box[] {
  const { halfX, halfZ, y } = COURT.columnCut
  return [...COURT.columns.map(([x, z]): Box => ({ min: [x - halfX, y[0], z - halfZ], max: [x + halfX, y[1], z + halfZ] })), ...COURT.chairCuts]
}

/** Replace the merged palace mesh's geometry and material in place. The returned dispose frees the textures;
 * StaticProp's disposeTree frees the new geometry and materials. */
export function dressPalace(root: Group, tier: ResolvedTier): { dispose(): void } {
  const mesh = root.children.find((c) => (c as Mesh).isMesh) as Mesh
  const geometry = carve(mesh.geometry, { cuts: courtCuts(), ...COURT.surface })
  mesh.geometry.dispose()
  ;(mesh.material as Material).dispose()
  const high = tier === 'high'
  const textures: Texture[] = []
  const own = <T extends Texture>(t: T): T => (textures.push(t), t)
  const gilded = gildedTextures()
  const stone = sandstoneTextures()
  textures.push(gilded.map, gilded.metalness, stone.map, stone.normal)
  mesh.geometry = geometry
  mesh.material = [
    authoredMaterial(tier, { map: own(wallTexture()), roughness: 0.85, side: DoubleSide }),
    authoredMaterial(tier, { map: own(ceilingTexture()), roughness: 0.8, side: DoubleSide }),
    authoredMaterial(tier, { map: gilded.map, metalnessMap: high ? gilded.metalness : null, metalness: high ? 1 : 0, roughness: 0.4, side: DoubleSide }),
    authoredMaterial(tier, { map: stone.map, normalMap: high ? stone.normal : null, roughness: 0.75, side: DoubleSide }),
    // Under the court's own floor: drawing it only added a full layer of overdraw on the integrated GPU.
    new MeshBasicMaterial({ visible: false, side: DoubleSide }),
  ]
  return { dispose: () => textures.forEach((t) => t.dispose()) }
}
