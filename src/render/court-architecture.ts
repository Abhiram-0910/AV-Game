// Sandstone columns with bracket capitals and multifoil arch screens, standing where palace.glb's collapsed columns
// were cut (render/palace-surface.ts). Both tiers: the cut leaves holes without them. Added to the court's raw group
// and merged by material with the rest of the dressing (render/court-dressing.ts).
import {
  BoxGeometry,
  type BufferGeometry,
  BufferGeometry as ThreeBufferGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  type Group,
  LatheGeometry,
  type Material,
  Mesh,
  Shape,
  Vector2,
} from 'three'
import { COURT } from '@data/scenery'
import type { ResolvedTier } from './manifest'
import { authoredMaterial as make } from './materials'
import { multifoil } from './multifoil'
import { mottle, sandstoneTextures, stencilField } from './palace-textures'
import { canvasTexture, seeded } from './procedural-textures'

const P = COURT.palette
const C = COURT.column
const A = COURT.arches

type Pts = readonly (readonly [number, number])[]

function architectureMaterials(tier: ResolvedTier) {
  const high = tier === 'high'
  const stone = sandstoneTextures()
  if (!high) stone.normal.dispose()
  const rand = seeded(91)
  // One metre of spandrel stencil per repeat: ExtrudeGeometry's UVs are shape coordinates in metres.
  const spandrel = canvasTexture(512, (ctx, s) => {
    ctx.fillStyle = P.coral
    ctx.fillRect(0, 0, s, s)
    mottle(ctx, rand, s, s)
    ctx.fillStyle = ctx.strokeStyle = P.stencil
    // Finer and softer than the walls: the screens come within a metre of the camera.
    ctx.globalAlpha = 0.7
    stencilField(ctx, rand, 0, 0, s, s, 32)
    ctx.globalAlpha = 1
  })
  return {
    stone: make(tier, { map: stone.map, normalMap: high ? stone.normal : null, roughness: 0.7 }),
    spandrel: make(tier, { map: spandrel, roughness: 0.85, side: DoubleSide }),
    bead: make(tier, { color: P.stencil, roughness: 0.6, side: DoubleSide }),
  }
}

const lathe = (profile: Pts, segments: number) => new LatheGeometry(profile.map(([r, y]) => new Vector2(r, y)), segments)

/** A scroll bracket under the abacus, reaching out along +x; top edge at y 0. */
function bracket(): BufferGeometry {
  const [from, reach, drop] = C.bracket
  const s = new Shape()
  s.moveTo(from, 0)
  s.lineTo(reach, 0)
  s.lineTo(reach, -0.05)
  s.quadraticCurveTo(from + 0.08, -0.06, from + 0.08, -drop * 0.5)
  s.quadraticCurveTo(from + 0.08, -drop * 0.85, from, -drop)
  s.lineTo(from, 0)
  return new ExtrudeGeometry(s, { depth: 0.09, bevelEnabled: false, curveSegments: 4 }).translate(0, 0, -0.045)
}

function column(g: Group, stone: Material, x: number, z: number, segments: number): void {
  const add = (geo: BufferGeometry, y = 0) => {
    const mesh = new Mesh(geo, stone)
    mesh.position.set(x, y, z)
    g.add(mesh)
  }
  const [pw, ph] = C.plinth
  add(new BoxGeometry(pw, ph, pw), COURT.floorY + ph / 2)
  add(lathe(C.base, segments))
  const [rBottom, rTop, y0, y1] = C.shaft
  add(new CylinderGeometry(rTop, rBottom, y1 - y0, segments, 1, true), (y0 + y1) / 2)
  for (const y of C.bands) add(new CylinderGeometry(rBottom + 0.025, rBottom + 0.025, 0.06, segments), y)
  add(lathe(C.capital, segments))
  const [aw, ah, ay] = C.abacus
  add(new BoxGeometry(aw, ah, aw), ay + ah / 2)
  const b = bracket()
  for (let q = 0; q < 4; q += 1) add(b.clone().rotateY((q * Math.PI) / 2), ay)
  b.dispose()
}

/** A flat ribbon on the screen's face along the arch edge, `A.bead` wide into the wall. */
function bead(curve: Pts, z: number): BufferGeometry {
  const n = curve.length
  const off = curve.map(([x, y], i) => {
    const [x0, y0] = curve[Math.max(0, i - 1)]
    const [x1, y1] = curve[Math.min(n - 1, i + 1)]
    const l = Math.hypot(x1 - x0, y1 - y0) || 1
    // Left of the left-to-right tangent: out of the opening, into the wall.
    return [x - ((y1 - y0) / l) * A.bead, y + ((x1 - x0) / l) * A.bead] as const
  })
  const pos: number[] = []
  for (let i = 0; i + 1 < n; i += 1) {
    const [p0, p1, q0, q1] = [curve[i], curve[i + 1], off[i], off[i + 1]]
    pos.push(p0[0], p0[1], z, p1[0], p1[1], z, q1[0], q1[1], z, p0[0], p0[1], z, q1[0], q1[1], z, q0[0], q0[1], z)
  }
  const geo = new ThreeBufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2))
  geo.computeVertexNormals()
  return geo
}

/** Wall from the springing up into the soffit between two column centres, cut by a multifoil arch. */
function archScreen(g: Group, m: ReturnType<typeof architectureMaterials>, a: readonly [number, number], b: readonly [number, number]): void {
  const span = Math.hypot(b[0] - a[0], b[1] - a[1])
  const height = A.top - A.spring
  const curve = multifoil(span / 2 - A.inset, A.rise, A.lobes, 5)
  const s = new Shape()
  s.moveTo(-span / 2, 0)
  for (const [x, y] of curve) s.lineTo(x, y)
  s.lineTo(span / 2, 0)
  s.lineTo(span / 2, height)
  s.lineTo(-span / 2, height)
  s.closePath()
  const place = (geo: BufferGeometry, mat: Material) => {
    const mesh = new Mesh(geo, mat)
    mesh.position.set((a[0] + b[0]) / 2, A.spring, (a[1] + b[1]) / 2)
    mesh.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0])
    g.add(mesh)
  }
  place(new ExtrudeGeometry(s, { depth: A.depth, bevelEnabled: false }).translate(0, 0, -A.depth / 2), m.spandrel)
  for (const side of [-1, 1]) place(bead(curve, side * (A.depth / 2 + 0.006)), m.bead)
}

export function courtArchitecture(g: Group, tier: ResolvedTier): void {
  const m = architectureMaterials(tier)
  const segments = tier === 'high' ? C.segments.high : C.segments.low
  for (const [x, z] of COURT.columns) column(g, m.stone, x, z, segments)
  for (const [i, j] of A.spans) archScreen(g, m, COURT.columns[i], COURT.columns[j])
}
