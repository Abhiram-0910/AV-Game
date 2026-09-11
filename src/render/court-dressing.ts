// Ayodhya's court from primitives and canvas textures: patterned marble floor, crimson carpet,
// two-step dais, gold throne under a Surya disc, braziers, banners, gold column bands. Built as
// plain meshes, then merged by material — about eight draw calls for the whole hall.
import {
  type BufferGeometry,
  BoxGeometry,
  BufferGeometry as ThreeBufferGeometry,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  type Group,
  Group as ThreeGroup,
  type Material,
  Mesh,
  PlaneGeometry,
  SphereGeometry,
} from 'three'
import { COURT } from '@data/scenery'
import { disposeTree } from './dispose'
import { flameGeometry } from './fire'
import type { ResolvedTier } from './manifest'
import { authoredMaterial as make } from './materials'
import { mergeByMaterial } from './merge'
import { bannerTexture, carpetTexture, flameTexture, friezeTexture, marbleTexture } from './procedural-textures'

const P = COURT.palette
const Y = COURT.floorY

type CourtMaterials = ReturnType<typeof courtMaterials>

export interface Court {
  group: Group
  /** Flame tips: where the high tier hangs a warm point light. */
  torches: readonly [number, number, number][]
  dispose(): void
}

/** Floor and carpet lie a few mm over palace.glb's floor; polygon offset wins the depth test. */
function lift(m: Material, units: number): Material {
  m.polygonOffset = true
  m.polygonOffsetFactor = -1
  m.polygonOffsetUnits = units
  return m
}

function courtMaterials(tier: ResolvedTier) {
  const { floor, carpet } = COURT
  const floorTex = marbleTexture(P)
  floorTex.repeat.set((floor.maxX - floor.minX) / floor.tileM, (floor.maxZ - floor.minZ) / floor.tileM)
  const carpetTex = carpetTexture(P)
  carpetTex.repeat.set(1, (carpet.toZ - carpet.fromZ) / carpet.repeatM)
  return {
    floor: lift(make(tier, { map: floorTex, roughness: 0.5 }), -4),
    carpet: lift(make(tier, { map: carpetTex, roughness: 0.95 }), -8),
    marble: make(tier, { color: P.marble, roughness: 0.3 }),
    gold: make(tier, { color: P.gold, metalness: 1, roughness: 0.3 }),
    bronze: make(tier, { color: P.bronze, metalness: 0.6, roughness: 0.65 }),
    crimson: make(tier, { color: P.crimson, roughness: 0.8 }),
    banner: make(tier, { map: bannerTexture(P), roughness: 0.9, side: DoubleSide }),
    frieze: make(tier, { map: friezeTexture(P), roughness: 0.7, side: DoubleSide }),
    // Unlit look: black albedo, all colour from the emissive ramp. Kept under ~2 so ACES leaves it orange.
    flame: make(tier, { color: '#000000', emissive: '#ffffff', emissiveMap: flameTexture(P.flameCore, P.flame), emissiveIntensity: COURT.torch.flameEmissive, roughness: 1 }),
  }
}

function put(g: Group, geo: BufferGeometry, mat: Material, x: number, y: number, z: number, rz = 0): Mesh {
  const m = new Mesh(geo, mat)
  m.position.set(x, y, z)
  m.rotation.z = rz
  g.add(m)
  return m
}

function floorAndCarpet(g: Group, m: CourtMaterials) {
  const { floor, carpet } = COURT
  const w = floor.maxX - floor.minX
  const d = floor.maxZ - floor.minZ
  put(g, new PlaneGeometry(w, d).rotateX(-Math.PI / 2), m.floor, (floor.minX + floor.maxX) / 2, Y + 0.004, (floor.minZ + floor.maxZ) / 2)
  const len = carpet.toZ - carpet.fromZ
  put(g, new PlaneGeometry(carpet.width, len).rotateX(-Math.PI / 2), m.carpet, 0, Y + 0.012, (carpet.fromZ + carpet.toZ) / 2)
}

/** Marble steps with a gold nosing on each front edge. Returns the top of the last step. */
function dais(g: Group, m: CourtMaterials): number {
  let top = Y
  for (const [w, d, rise] of COURT.dais.steps) {
    put(g, new BoxGeometry(w, rise, d), m.marble, 0, top + rise / 2, COURT.dais.z)
    top += rise
    put(g, new BoxGeometry(w + 0.02, 0.035, 0.05), m.gold, 0, top - 0.015, COURT.dais.z + d / 2)
  }
  return top
}

/** Gold throne, crimson cushions, and the Surya disc of the Ikshvaku line behind it. */
function throne(g: Group, m: CourtMaterials, base: number) {
  const { z, seatW, seatD, seatH, backH, discY, discR } = COURT.throne
  const backZ = z - seatD / 2 - 0.06
  put(g, new BoxGeometry(seatW, seatH, seatD), m.gold, 0, base + seatH / 2, z)
  put(g, new BoxGeometry(seatW - 0.12, 0.09, seatD - 0.1), m.crimson, 0, base + seatH + 0.045, z + 0.02)
  put(g, new BoxGeometry(seatW + 0.14, backH, 0.12), m.gold, 0, base + backH / 2, backZ)
  put(g, new BoxGeometry(seatW - 0.26, backH - 0.62, 0.04), m.crimson, 0, base + seatH + (backH - seatH) / 2, backZ + 0.08)
  for (const side of [-1, 1]) {
    put(g, new BoxGeometry(0.12, 0.26, seatD), m.gold, side * (seatW / 2 + 0.06), base + seatH + 0.13, z)
    put(g, new SphereGeometry(0.09, 12, 8), m.gold, side * (seatW / 2 + 0.07), base + backH + 0.08, backZ)
  }
  put(g, new CircleGeometry(discR, 40), m.gold, 0, discY, backZ - 0.1)
  for (let i = 0; i < 16; i += 1) {
    const a = (i / 16) * Math.PI * 2
    const r = discR + (i % 2 ? 0.22 : 0.34)
    put(g, new BoxGeometry(0.07, i % 2 ? 0.34 : 0.58, 0.03), m.gold, Math.cos(a) * r, discY + Math.sin(a) * r, backZ - 0.11, a - Math.PI / 2)
  }
}

/** Gold-bordered crimson hanging on the back wall: gold throne against deep red. */
function backdrop(g: Group, m: CourtMaterials) {
  const { z, width, height, bottomY, border } = COURT.backdrop
  const cy = bottomY + height / 2
  put(g, new PlaneGeometry(width, height), m.crimson, 0, cy, z)
  for (const side of [-1, 1]) {
    put(g, new BoxGeometry(border, height + border, 0.04), m.gold, side * (width / 2), cy, z + 0.02)
    put(g, new BoxGeometry(width + border, border, 0.04), m.gold, 0, cy + side * (height / 2), z + 0.02)
  }
}

function braziers(g: Group, m: CourtMaterials): [number, number, number][] {
  const tips: [number, number, number][] = []
  const { flame } = COURT.torch
  for (const [x, z] of COURT.braziers) {
    put(g, new CylinderGeometry(0.24, 0.3, 0.07, 16), m.bronze, x, Y + 0.035, z)
    put(g, new CylinderGeometry(0.045, 0.07, 0.86, 10), m.bronze, x, Y + 0.5, z)
    put(g, new SphereGeometry(0.32, 16, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 0.55, 1), m.gold, x, Y + 1.1, z)
    put(g, flameGeometry(flame.radius, flame.height), m.flame, x, Y + 1.1, z)
    // Half a metre over the bowl: close enough to pool warm light on the floor, far enough that the
    // polished gold (25 cm drove it to ~50x) does not bloom.
    tips.push([x, Y + 1.65, z])
  }
  return tips
}

/** A vertical ribbon along COURT.frieze.path; u runs in metres of arc length so every lotus stays square. */
function frieze(g: Group, m: CourtMaterials) {
  const { path, y, repeatM } = COURT.frieze
  const pos: number[] = []
  const uv: number[] = []
  const index: number[] = []
  let s = 0
  path.forEach(([x, z], i) => {
    if (i > 0) s += Math.hypot(x - path[i - 1][0], z - path[i - 1][1])
    pos.push(x, y[0], z, x, y[1], z)
    uv.push(s / repeatM, 0, s / repeatM, 1)
    if (i > 0) index.push(2 * i - 2, 2 * i, 2 * i - 1, 2 * i - 1, 2 * i, 2 * i + 1)
  })
  const geo = new ThreeBufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  geo.setIndex(index)
  geo.computeVertexNormals()
  put(g, geo, m.frieze, 0, 0, 0)
}

function bannersAndBands(g: Group, m: CourtMaterials) {
  for (const [x, z] of COURT.banners) {
    put(g, new PlaneGeometry(0.95, 2.8), m.banner, x, 3.6, z + 0.22)
    put(g, new CylinderGeometry(0.025, 0.025, 1.15, 8), m.gold, x, 5.02, z + 0.22, Math.PI / 2)
  }
  const { xs, zs, radius, ys } = COURT.columnBands
  for (const x of xs) for (const z of zs) for (const y of ys) put(g, new CylinderGeometry(radius, radius, 0.1, 16), m.gold, x, y, z)
}

export function buildCourt(tier: ResolvedTier): Court {
  const m = courtMaterials(tier)
  const raw = new ThreeGroup()
  floorAndCarpet(raw, m)
  throne(raw, m, dais(raw, m))
  backdrop(raw, m)
  const torches = braziers(raw, m)
  bannersAndBands(raw, m)
  frieze(raw, m)
  const group = mergeByMaterial(raw)
  group.name = 'court-dressing'
  group.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh) return
    mesh.receiveShadow = true
    // Floor and carpet only receive; everything standing casts (high tier's shadow map only). The frieze
    // is dressing on palace.glb, which casts nothing, so it must not either.
    mesh.castShadow = mesh.material !== m.floor && mesh.material !== m.carpet && mesh.material !== m.frieze
  })
  return { group, torches, dispose: () => disposeTree(group) }
}
