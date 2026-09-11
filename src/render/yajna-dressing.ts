// Level 5's sacred enclosure from primitives and canvas textures: plastered kolam ground, a stepped
// brick altar with its ember bed, a post-and-cord boundary with a torana gate on three sides, a yupa post
// and kalasha pots. Merged by material like the court; the fire itself is entities/YajnaDressing.tsx.
import {
  type BufferGeometry,
  BoxGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  type Group,
  Group as ThreeGroup,
  LatheGeometry,
  type Material,
  Mesh,
  PlaneGeometry,
  SphereGeometry,
  Vector2,
} from 'three'
import { YAJNA } from '@data/scenery'
import { disposeTree } from './dispose'
import type { ResolvedTier } from './manifest'
import { authoredMaterial as make } from './materials'
import { mergeByMaterial } from './merge'
import { brickTexture, kolamTexture } from './procedural-textures'

const P = YAJNA.palette
const E = YAJNA.enclosure

type YajnaMaterials = ReturnType<typeof yajnaMaterials>

function yajnaMaterials(tier: ResolvedTier) {
  const ground = make(tier, { map: kolamTexture(P.plaster, P.chalk), roughness: 0.95 })
  // A few mm over the GroundPlane: polygon offset wins the depth test at grazing angles.
  ground.polygonOffset = true
  ground.polygonOffsetFactor = -1
  ground.polygonOffsetUnits = -4
  const bricks = brickTexture(P.brick, P.mortar)
  bricks.repeat.set(3, 0.5)
  return {
    ground,
    brick: make(tier, { map: bricks, roughness: 0.9 }),
    ember: make(tier, { color: P.ember, emissive: '#ff3a0a', emissiveIntensity: 0.7, roughness: 1 }),
    wood: make(tier, { color: P.wood, roughness: 0.85 }),
    cord: make(tier, { color: P.cord, roughness: 0.9 }),
    saffron: make(tier, { color: P.saffron, roughness: 0.9, side: DoubleSide }),
    clay: make(tier, { color: P.terracotta, roughness: 0.8 }),
    leaf: make(tier, { color: P.leaf, roughness: 0.8 }),
  }
}

function put(g: Group, geo: BufferGeometry, mat: Material, x: number, y: number, z: number, ry = 0): Mesh {
  const m = new Mesh(geo, mat)
  m.position.set(x, y, z)
  m.rotation.y = ry
  g.add(m)
  return m
}

/** Stepped brick altar; the glowing ember bed sits on the top step. Returns the bed's height. */
function altar(g: Group, m: YajnaMaterials): number {
  let top = 0
  for (const [w, rise] of YAJNA.altarSteps) {
    put(g, new BoxGeometry(w, rise, w), m.brick, 0, top + rise / 2, 0)
    top += rise
  }
  const bed = YAJNA.altarSteps[YAJNA.altarSteps.length - 1][0] - 0.3
  put(g, new BoxGeometry(bed, 0.04, bed), m.ember, 0, top + 0.02, 0)
  return top + 0.04
}

/** One side of the boundary: posts every `postEvery`, cords between them, a gap mid-side. Side k turns
 * the north run (z = -half) by k quarter turns round the altar. */
function boundarySide(g: Group, m: YajnaMaterials, k: number) {
  const ry = (k * Math.PI) / 2
  const at = (t: number): [number, number] => [Math.cos(ry) * t - Math.sin(ry) * -E.half, Math.sin(ry) * t + Math.cos(ry) * -E.half]
  const ts: number[] = []
  for (let t = -E.half; t < E.half - 0.01; t += E.postEvery) if (Math.abs(t) > E.gateHalf + 0.2) ts.push(t)
  for (const t of ts) {
    const [x, z] = at(t)
    put(g, new CylinderGeometry(E.postR * 0.8, E.postR, E.postH, 8), m.wood, x, E.postH / 2, z)
    put(g, new CircleGeometry(0.2, 3), m.saffron, x + Math.cos(ry) * 0.12, E.postH - 0.12, z + Math.sin(ry) * 0.12, -ry)
  }
  ts.push(E.half)
  for (let i = 0; i < ts.length - 1; i += 1) {
    if (ts[i] < 0 && ts[i + 1] > 0) continue // the gate
    const [x0, z0] = at(ts[i])
    const [x1, z1] = at(ts[i + 1])
    const cord = new CylinderGeometry(0.018, 0.018, ts[i + 1] - ts[i], 5).rotateZ(Math.PI / 2)
    put(g, cord, m.cord, (x0 + x1) / 2, E.cordY, (z0 + z1) / 2, -ry)
  }
  // South (k 2) is the player's side: a torana there stands between the follow camera and Rama.
  if (k !== 2) gate(g, m, at(0), ry)
}

/** Torana: two tall posts, a double lintel, a row of mango leaves hanging from the lower one. */
function gate(g: Group, m: YajnaMaterials, [x, z]: [number, number], ry: number) {
  const across = (d: number): [number, number] => [x + Math.cos(ry) * d, z + Math.sin(ry) * d]
  for (const side of [-1, 1]) {
    const [px, pz] = across(side * E.gateHalf)
    put(g, new CylinderGeometry(0.09, 0.11, E.gateH, 8), m.wood, px, E.gateH / 2, pz)
  }
  const span = E.gateHalf * 2 + 0.6
  put(g, new BoxGeometry(span, 0.16, 0.2), m.wood, x, E.gateH - 0.05, z, -ry)
  put(g, new BoxGeometry(span - 0.3, 0.1, 0.14), m.saffron, x, E.gateH - 0.45, z, -ry)
  for (let d = -E.gateHalf + 0.2; d <= E.gateHalf - 0.2; d += 0.26) {
    const [lx, lz] = across(d)
    put(g, new ConeGeometry(0.05, 0.22, 4).rotateX(Math.PI), m.leaf, lx, E.gateH - 0.62, lz, -ry)
  }
}

function yupa(g: Group, m: YajnaMaterials) {
  const { x, z, h } = YAJNA.yupa
  put(g, new CylinderGeometry(0.12, 0.16, h, 8), m.wood, x, h / 2, z)
  put(g, new CylinderGeometry(0.2, 0.2, 0.12, 12), m.saffron, x, h - 0.7, z)
  put(g, new ConeGeometry(0.16, 0.35, 8), m.wood, x, h + 0.17, z)
}

/** Kalasha: a round-bellied pot, a coconut in its mouth, five leaves fanned under it. */
function pots(g: Group, m: YajnaMaterials, base: number) {
  const profile = [[0, 0], [0.16, 0.02], [0.24, 0.16], [0.2, 0.32], [0.1, 0.4], [0.13, 0.46]].map(([r, y]) => new Vector2(r, y))
  for (const [x, z] of YAJNA.pots) {
    put(g, new LatheGeometry(profile, 12), m.clay, x, base, z)
    put(g, new SphereGeometry(0.11, 10, 8), m.wood, x, base + 0.54, z)
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2
      put(g, new ConeGeometry(0.035, 0.26, 4).rotateZ(-1.1), m.leaf, x + Math.cos(a) * 0.12, base + 0.5, z + Math.sin(a) * 0.12, -a)
    }
  }
}

export interface Yajna {
  group: Group
  /** Height of the ember bed: where the flames stand. */
  bedY: number
  dispose(): void
}

export function buildYajna(tier: ResolvedTier): Yajna {
  const m = yajnaMaterials(tier)
  const raw = new ThreeGroup()
  put(raw, new PlaneGeometry(YAJNA.groundSize, YAJNA.groundSize).rotateX(-Math.PI / 2), m.ground, 0, 0.006, 0)
  const bedY = altar(raw, m)
  for (let k = 0; k < 4; k += 1) boundarySide(raw, m, k)
  yupa(raw, m)
  pots(raw, m, 0)
  const group = mergeByMaterial(raw)
  group.name = 'yajna-dressing'
  group.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh) return
    mesh.receiveShadow = true
    mesh.castShadow = mesh.material !== m.ground
  })
  return { group, bedY, dispose: () => disposeTree(group) }
}
