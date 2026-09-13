// Levels 2–4 outdoors from scenery.ts WILDS, high tier only: an instanced forest, rocks, shrubs and grass
// scattered clear of every walk and line of fire, and per level the Sarayu with its reeds, ground mist, or
// Level 4's built range (range-dressing.ts). One draw call per kind of mesh, never
// per tree. entities/WildsDressing.tsx mounts and animates it.
import {
  type BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  PlaneGeometry,
  type Texture,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { type LevelScenery, SCENERY, WILDS, type Wilds } from '@data/scenery'
import { disposeTree } from './dispose'
import { type InstanceTransform, makeInstanced } from './instancing'
import { tierMaterial } from './materials'
import { seeded } from './procedural-textures'
import { buildRange } from './range-dressing'
import { grassTexture, mistTexture, rippleTexture } from './wild-textures'

export type WildsLevel = 'l2' | 'l3' | 'l4'
type XZ = readonly [number, number]
type Rand = () => number
type Bounds = LevelScenery['bounds']
type Part = { geometry: BufferGeometry; material: Material }

export interface WildsBuild {
  group: Group
  /** The Sarayu's surface, scrolled per frame. */
  water: MeshStandardMaterial | null
  /** Ground mist, drifted per frame and burned off when the curse lifts. */
  mist: MeshBasicMaterial | null
  /** Level 4's fire pit: where its light hangs. */
  fire: readonly [number, number, number] | null
  dispose(): void
}

const REEDS = { height: [0.9, 1.7] as const, colors: ['#5f7f3a', '#6f8c44', '#4f6e30'] }

const between = (rand: Rand, [a, b]: readonly [number, number]) => a + rand() * (b - a)
const pick = <T>(rand: Rand, list: readonly T[]): T => list[Math.floor(rand() * list.length)]

/** Inside a scenery.ts WILDS keep-clear capsule. Exported for the content test. */
export function inCapsule([x0, z0, x1, z1, r]: Wilds['clear'][number], x: number, z: number): boolean {
  const dx = x1 - x0
  const dz = z1 - z0
  const len2 = dx * dx + dz * dz
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / len2)) : 0
  return Math.hypot(x - x0 - t * dx, z - z0 - t * dz) < r
}

function inWater(w: Wilds, x: number, z: number, margin: number): boolean {
  const r = w.water
  return !!r && x > r.minX - margin && x < r.maxX + margin && z > r.minZ - margin && z < r.maxZ + margin
}

/** Up to `count` points in the area, outside every clear capsule and the water (plus margin), `gap` apart.
 * ponytail: O(n²) gap test, fine for tens of trees; a grid hash if counts reach thousands. */
function scatter(w: Wilds, rand: Rand, count: number, gap: number, waterMargin: number): XZ[] {
  const out: XZ[] = []
  const { minX, maxX, minZ, maxZ } = w.area
  for (let i = 0; i < count * 40 && out.length < count; i += 1) {
    const x = minX + rand() * (maxX - minX)
    const z = minZ + rand() * (maxZ - minZ)
    if (w.clear.some((c) => inCapsule(c, x, z)) || inWater(w, x, z, waterMargin)) continue
    if (gap > 0 && out.some(([ox, oz]) => Math.hypot(ox - x, oz - z) < gap)) continue
    out.push([x, z])
  }
  return out
}

/** The first mesh under root passing `test`, its geometry baked to world space (rock.glb ships at scale 100,
 * turned upright by its node) and its material on the high tier's path. */
function prototype(root: Object3D, test: (m: Mesh) => boolean): Part {
  root.updateMatrixWorld(true)
  const found: Mesh[] = []
  root.traverse((o) => {
    if ((o as Mesh).isMesh && test(o as Mesh)) found.push(o as Mesh)
  })
  if (!found[0]) throw new Error(`wilds: no matching mesh under ${root.name}`)
  return { geometry: found[0].geometry.clone().applyMatrix4(found[0].matrixWorld), material: tierMaterial(found[0].material as Material, 'high') }
}

const named = (prefix: string) => (m: Mesh) => (m.material as Material).name.startsWith(prefix)

function instanced(geometry: BufferGeometry, material: Material, list: readonly InstanceTransform[], cast: boolean): Mesh {
  const mesh = makeInstanced(geometry, material, list)
  mesh.castShadow = cast
  mesh.receiveShadow = true
  return mesh
}

/** Multiply a geometry's UVs (then offset them): tiles a texture without touching the shared map's repeat. */
function scaleUv(g: BufferGeometry, su: number, sv: number, ou = 0, ov = 0): BufferGeometry {
  const uv = g.getAttribute('uv')
  for (let i = 0; i < uv.count; i += 1) uv.setXY(i, uv.getX(i) * su + ou, uv.getY(i) * sv + ov)
  return g
}

function treeParts(w: Wilds, tree: Object3D, leaves: Part) {
  const bark = prototype(tree, named('Bark'))
  if (w.trees.bare) return [{ ...bark, tinted: true }]
  bark.geometry.dispose()
  const trunk = scaleUv(new CylinderGeometry(0.2, 0.34, 5.6, 7, 1, true).translate(0, 2.8, 0), 2, 4)
  return [{ geometry: trunk, material: bark.material, tinted: false }, { ...leaves, tinted: true }]
}

/** Trees inside the bounds grown by shadowReach cast shadows; the far ring would only add shadow draws. */
function forest(w: Wilds, rand: Rand, tree: Object3D, leaves: Part, b: Bounds): Mesh[] {
  const { trees: t, shadowReach: r } = w
  const near: InstanceTransform[] = []
  const far: InstanceTransform[] = []
  for (const [x, z] of scatter(w, rand, t.count, t.minGap, 2.5)) {
    const lean = () => (rand() - 0.5) * 2 * t.lean
    const inside = x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r
    ;(inside ? near : far).push({ pos: [x, 0, z], yaw: rand() * Math.PI * 2, scale: between(rand, t.scale), tilt: [lean(), lean()], color: new Color(pick(rand, t.tints)) })
  }
  const meshes: Mesh[] = []
  for (const { geometry, material, tinted } of treeParts(w, tree, leaves))
    for (const [list, cast] of [[near, true], [far, false]] as const)
      if (list.length) meshes.push(instanced(geometry, material, tinted ? list : list.map((i) => ({ ...i, color: undefined })), cast))
  return meshes
}

function rocks(w: Wilds, rand: Rand, rock: Object3D): Mesh {
  const { geometry, material } = prototype(rock, () => true)
  const list = scatter(w, rand, w.rocks.count, 1.5, 1).map(([x, z]): InstanceTransform => {
    const s = between(rand, w.rocks.scale)
    return { pos: [x, -0.05 * s, z], yaw: rand() * Math.PI * 2, scale: [s, s * between(rand, [0.55, 1]), s], tilt: [(rand() - 0.5) * 0.3, (rand() - 0.5) * 0.3], color: new Color(pick(rand, w.rocks.colors)) }
  })
  return instanced(geometry, material, list, false)
}

/** Bushes of four crossed, outward-tipped cards of tree.glb's leaf texture, so undergrowth matches the canopy.
 * No shadows: hundreds of small casters for little gain. */
function shrubs(w: Wilds, rand: Rand, leaves: Material): Mesh {
  const cards = [0, 1, 2, 3].map((k) => new PlaneGeometry(1.4, 1.4).rotateX(k % 2 ? 0.45 : -0.45).translate(0, 0.55, 0).rotateY((k * Math.PI) / 4))
  const geometry = mergeGeometries(cards)!
  cards.forEach((c) => c.dispose())
  const list = scatter(w, rand, w.shrubs.count, 0, 1).map(([x, z]): InstanceTransform => {
    const s = between(rand, w.shrubs.scale)
    return { pos: [x, 0, z], yaw: rand() * Math.PI * 2, scale: [s * between(rand, [0.9, 1.3]), s * between(rand, [0.7, 1]), s], color: new Color(pick(rand, w.shrubs.colors)) }
  })
  return instanced(geometry, leaves, list, false)
}

/** Three crossed alpha-cut quads per tuft, normals turned up so a tuft lights like the ground under it. Reeds
 * line the Sarayu's bank from the same mesh. */
function grass(w: Wilds, rand: Rand, owned: Texture[]): Mesh {
  const quads = [0, 1, 2].map((k) => new PlaneGeometry(1, 1).translate(0, 0.5, 0).rotateY((k * Math.PI) / 3))
  const geometry = mergeGeometries(quads)!
  quads.forEach((q) => q.dispose())
  const normal = geometry.getAttribute('normal')
  for (let i = 0; i < normal.count; i += 1) normal.setXYZ(i, 0, 1, 0)
  const map = grassTexture()
  owned.push(map)
  const material = new MeshStandardMaterial({ map, alphaTest: 0.5, side: DoubleSide, roughness: 1 })
  const tuft = (x: number, z: number, height: readonly [number, number], colors: readonly string[]): InstanceTransform => {
    const h = between(rand, height)
    return { pos: [x, 0, z], yaw: rand() * Math.PI, scale: [h * 1.2, h, h * 1.2], color: new Color(pick(rand, colors)) }
  }
  const list = scatter(w, rand, w.grass.count, 0, 0).map(([x, z]) => tuft(x, z, w.grass.height, w.grass.colors))
  for (let i = 0; w.water && i < w.water.reeds; i += 1) {
    const x = w.water.maxX - 0.4 + rand() * (w.water.bankWidth + 0.8)
    const z = w.area.minZ + rand() * (w.area.maxZ - w.area.minZ)
    if (!w.clear.some((c) => inCapsule(c, x, z))) list.push(tuft(x, z, REEDS.height, REEDS.colors))
  }
  return instanced(geometry, material, list, false)
}

function river(r: NonNullable<Wilds['water']>, owned: Texture[]): { meshes: Mesh[]; material: MeshStandardMaterial } {
  const width = r.maxX - r.minX
  const length = r.maxZ - r.minZ
  const map = rippleTexture()
  map.repeat.set(length / 14, width / 7)
  owned.push(map)
  const material = new MeshStandardMaterial({ color: r.color, map, roughness: 0.1, metalness: 0.2, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -6 })
  // A quarter turn so u, and the ripple streaks, run downstream along Z.
  const surface = new Mesh(new PlaneGeometry(length, width).rotateX(-Math.PI / 2).rotateY(Math.PI / 2), material)
  surface.position.set((r.minX + r.maxX) / 2, 0.03, (r.minZ + r.maxZ) / 2)
  const sand = new MeshStandardMaterial({ color: r.bank, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 })
  const bank = new Mesh(new PlaneGeometry(r.bankWidth + 1, length).rotateX(-Math.PI / 2), sand)
  bank.position.set(r.maxX + r.bankWidth / 2 - 0.5, 0.02, (r.minZ + r.maxZ) / 2)
  surface.receiveShadow = bank.receiveShadow = true
  return { meshes: [surface, bank], material }
}

/** Stacked horizontal sheets over the play area; each tiles the texture differently so the layers never line up. */
function mist(m: NonNullable<Wilds['mist']>, b: Bounds, owned: Texture[]): { mesh: Mesh; material: MeshBasicMaterial } {
  const sheets = m.heights.map((h, i) => {
    const k = 5 + i * 1.7
    return scaleUv(new PlaneGeometry(m.size, m.size).rotateX(-Math.PI / 2).translate(0, h, 0), k, k, i * 0.37, i * 0.61)
  })
  const map = mistTexture()
  owned.push(map)
  const material = new MeshBasicMaterial({ map, color: m.color, transparent: true, opacity: m.opacity, depthWrite: false })
  const mesh = new Mesh(mergeGeometries(sheets)!, material)
  sheets.forEach((s) => s.dispose())
  mesh.position.set((b.minX + b.maxX) / 2, 0, (b.minZ + b.maxZ) / 2)
  return { mesh, material }
}

export function buildWilds(level: WildsLevel, tree: Object3D, rock: Object3D): WildsBuild {
  const w = WILDS[level]!
  const { bounds } = SCENERY[level]!
  // The generator's first draws from a small seed are tiny; a large odd seed spreads them.
  const rand = seeded(w.seed * 7919 + 1)
  const owned: Texture[] = []
  const group = new Group()
  group.name = `${level}-wilds`
  const leaves = prototype(tree, named('Leaves'))
  leaves.material.side = DoubleSide
  group.add(...forest(w, rand, tree, leaves, bounds), rocks(w, rand, rock), shrubs(w, rand, leaves.material), grass(w, rand, owned))
  if (w.trees.bare) leaves.geometry.dispose()
  const water = w.water ? river(w.water, owned) : null
  if (water) group.add(...water.meshes)
  const fog = w.mist ? mist(w.mist, bounds, owned) : null
  if (fog) group.add(fog.mesh)
  const range = level === 'l4' ? buildRange() : null
  if (range) {
    group.add(range.group)
    owned.push(...range.textures)
  }
  return {
    group,
    water: water?.material ?? null,
    mist: fog?.material ?? null,
    fire: range?.fire ?? null,
    dispose: () => {
      // tree.glb's and rock.glb's textures belong to the cached prototypes; the scene evicts those.
      disposeTree(group, { textures: false })
      owned.forEach((t) => t.dispose())
    },
  }
}
