// Ayodhya's court from primitives and canvas textures: patterned marble floor, crimson carpet,
// two-step dais, gold throne under a Surya disc, braziers, banners, gold column bands. Built as
// plain meshes, then merged by material — about eight draw calls for the whole hall.
import {
  type BufferGeometry,
  BoxGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  type Group,
  Group as ThreeGroup,
  type Material,
  Mesh,
  MeshStandardMaterial,
  type MeshStandardMaterialParameters,
  PlaneGeometry,
  SphereGeometry,
} from 'three'
import { COURT } from '@data/scenery'
import { disposeTree } from './dispose'
import type { ResolvedTier } from './manifest'
import { tierMaterial } from './materials'
import { mergeByMaterial } from './merge'
import { bannerTexture, carpetTexture, marbleTexture } from './procedural-textures'

const P = COURT.palette
const Y = COURT.floorY

type CourtMaterials = ReturnType<typeof courtMaterials>

export interface Court {
  group: Group
  /** Flame tips: where the high tier hangs a warm point light. */
  torches: readonly [number, number, number][]
  dispose(): void
}

/** Author as MeshStandard, then let the tier path decide: Standard on high, toon on low. */
function make(tier: ResolvedTier, params: MeshStandardMaterialParameters): Material {
  const src = new MeshStandardMaterial(params)
  const out = tierMaterial(src, tier)
  src.dispose()
  return out
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
  const flame = (color: string) => make(tier, { color, emissive: color, emissiveIntensity: COURT.torch.flameEmissive, roughness: 1 })
  return {
    floor: lift(make(tier, { map: floorTex, roughness: 0.5 }), -4),
    carpet: lift(make(tier, { map: carpetTex, roughness: 0.95 }), -8),
    marble: make(tier, { color: P.marble, roughness: 0.3 }),
    gold: make(tier, { color: P.gold, metalness: 1, roughness: 0.3 }),
    bronze: make(tier, { color: P.bronze, metalness: 0.6, roughness: 0.65 }),
    crimson: make(tier, { color: P.crimson, roughness: 0.8 }),
    banner: make(tier, { map: bannerTexture(P), roughness: 0.9, side: DoubleSide }),
    flame: flame(P.flame),
    flameCore: flame(P.flameCore),
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
  for (const [x, z] of COURT.braziers) {
    put(g, new CylinderGeometry(0.24, 0.3, 0.07, 16), m.bronze, x, Y + 0.035, z)
    put(g, new CylinderGeometry(0.045, 0.07, 0.86, 10), m.bronze, x, Y + 0.5, z)
    put(g, new SphereGeometry(0.32, 16, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 0.55, 1), m.gold, x, Y + 1.1, z)
    put(g, new ConeGeometry(0.2, 0.6, 8), m.flame, x, Y + 1.36, z)
    put(g, new ConeGeometry(0.11, 0.38, 8), m.flameCore, x, Y + 1.27, z)
    // Well above the bowl: a light 25 cm over polished gold drives it to ~50x and blooms the floor.
    tips.push([x, Y + 2.1, z])
  }
  return tips
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
  const group = mergeByMaterial(raw)
  group.name = 'court-dressing'
  group.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh) return
    mesh.receiveShadow = true
    // Floor and carpet only receive; everything standing casts (high tier's shadow map only).
    mesh.castShadow = mesh.material !== m.floor && mesh.material !== m.carpet
  })
  return { group, torches, dispose: () => disposeTree(group) }
}
