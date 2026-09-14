// High-tier ornament for the court, each piece judged on screen alone (SESSION-LOG 2026-09-14): brass oil lamps hanging
// in the back row's arches, coloured-glass windows on the back wall, and marigold torans across the back row.
import {
  type BufferGeometry,
  type CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  IcosahedronGeometry,
  type InstancedMesh,
  type Group,
  LatheGeometry,
  type Material,
  Mesh,
  Path,
  Shape,
  ShapeGeometry,
  Vector2,
} from 'three'
import { COURT } from '@data/scenery'
import { flameGeometry } from './fire'
import type { ResolvedTier } from './manifest'
import { authoredMaterial as make } from './materials'
import { multifoil } from './multifoil'
import { type InstanceTransform, makeInstanced } from './instancing'
import { canvasTexture, seeded } from './procedural-textures'

export interface OrnamentMaterials {
  brass: Material
  gold: Material
  flame: Material
}

const L = COURT.lamps
const G = COURT.glass
const BOWL = [[0.001, -0.06], [0.03, -0.05], [0.12, 0.0], [0.16, 0.06], [0.17, 0.09], [0.15, 0.1]].map(([r, y]) => new Vector2(r, y))
// Jewel tones pulled off pure RGB; `clear` is the warm clear glass most Rajput windows are mostly made of.
const JEWELS = { ruby: '#b52a3c', amber: '#e39a2c', emerald: '#2f8f5c', sapphire: '#3558ad', violet: '#71408f', clear: '#e9c88e' }
const LEAD = '#4a3524'
const LEAD_LIT = '#9a7a50'

function add(g: Group, geo: BufferGeometry, mat: Material, x: number, y: number, z: number): void {
  const mesh = new Mesh(geo, mat)
  mesh.position.set(x, y, z)
  g.add(mesh)
}

/** A five-wick diya on a chain, hung from the apex of each listed arch. */
export function hangingLamps(g: Group, m: OrnamentMaterials): void {
  for (const s of L.spans) {
    const [i, j] = COURT.arches.spans[s]
    const [ax, az] = COURT.columns[i]
    const [bx, bz] = COURT.columns[j]
    const [x, z] = [(ax + bx) / 2, (az + bz) / 2]
    const chain = L.hangY - L.bowlY
    add(g, new CylinderGeometry(0.008, 0.008, chain, 4), m.gold, x, L.bowlY + chain / 2, z)
    add(g, new LatheGeometry(BOWL, 16), m.gold, x, L.bowlY, z)
    add(g, new CylinderGeometry(0.0, 0.03, 0.12, 8).rotateX(Math.PI), m.gold, x, L.bowlY - 0.12, z)
    for (let k = 0; k < L.wicks; k += 1) {
      const a = (k / L.wicks) * Math.PI * 2
      add(g, flameGeometry(L.flame[0], L.flame[1]), m.flame, x + Math.cos(a) * 0.12, L.bowlY + 0.08, z + Math.sin(a) * 0.12)
    }
  }
}

type XY = [number, number]
type Ctx = CanvasRenderingContext2D
interface Box2 {
  minX: number
  maxX: number
  minY: number
  maxY: number
}
/** One pane of leaded glass in window metres (y from the springing), and the part of the window that clips it. */
interface Pane {
  poly: XY[]
  colour: string
  region: 'band' | 'head' | 'field'
  lead: number
  centre: XY
  radius: number
}
interface GlassLayout {
  outer: XY[]
  inner: XY[]
  b: Box2
  panes: Pane[]
}

/** Window outline in local metres, y from the springing: sill up the jambs (four points each, so the border band
 * splits into panes), over the multifoil head. `scale` grows it about the sill's centre (the gold frame). */
function outline(scale: number): Vector2[] {
  const sill = G.sill - G.spring
  const jamb = (x: number) => [0, 1, 2, 3].map((k): XY => [x, sill * (1 - k / 4)])
  const points: XY[] = [...jamb(-G.half), ...multifoil(G.half, G.rise, G.lobes, 6), ...jamb(G.half).reverse()]
  return points.map(([x, y]) => new Vector2(x * scale, sill + (y - sill) * scale))
}

function bounds(points: readonly Vector2[]): Box2 {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
}

/** Glass is poured, not printed: no two panes of one colour match. */
function tone(hex: string, rand: () => number): string {
  return `#${new Color(hex).offsetHSL((rand() - 0.5) * 0.03, (rand() - 0.5) * 0.2, (rand() - 0.5) * 0.12).getHexString()}`
}

const pane = (poly: XY[], colour: string, region: Pane['region'], rand: () => number): Pane => ({ poly, colour: tone(colour, rand), region, lead: 0.011 + rand() * 0.008, centre: [0, 0], radius: 0 })

/** The border band between the outline and the outline pulled in by `band`: a pane per lobe and per jamb step. */
function bandPanes(outer: readonly Vector2[], inner: readonly XY[], rand: () => number): Pane[] {
  const last = outer.length - 1
  const corners = outer.map((_, k) => k).filter((k) => k <= 4 || k >= last - 4 || (k - 4) % 6 === 0)
  const xy = (p: Vector2): XY => [p.x, p.y]
  const panes = corners.slice(1).map((k, i) => {
    const j = corners[i]
    return pane([...outer.slice(j, k + 1).map(xy), ...inner.slice(j, k + 1).reverse()], i % 2 ? JEWELS.amber : JEWELS.ruby, 'band', rand)
  })
  panes.push(pane([xy(outer[last]), xy(outer[0]), inner[0], inner[last]], JEWELS.ruby, 'band', rand))
  return panes
}

/** Over the springing: a half rosette on the transom and a petal per lobe, split by a wandering ring. */
function headPanes(rand: () => number): Pane[] {
  const n = G.lobes
  const cuts = Array.from({ length: n + 1 }, (_, k) => Math.PI * (1 - k / n) + (k % n ? (rand() - 0.5) * 0.1 : 0))
  const rings = cuts.map(() => G.ring + (rand() - 0.5) * 0.04)
  const at = (a: number, r: number): XY => [Math.cos(a) * r, Math.sin(a) * r]
  const panes = [pane(Array.from({ length: 13 }, (_, k) => at(Math.PI * (1 - k / 12), G.rosette)), JEWELS.sapphire, 'head', rand)]
  for (let k = 0; k < n; k += 1) {
    const [a0, a1] = [cuts[k], cuts[k + 1]]
    panes.push(pane([at(a0, G.rosette), at(a1, G.rosette), at(a1, rings[k + 1]), at(a0, rings[k])], k % 2 ? JEWELS.amber : JEWELS.clear, 'head', rand))
    panes.push(pane([at(a0, rings[k]), at(a1, rings[k + 1]), at(a1, 1.5), at(a0, 1.5)], k % 2 ? JEWELS.emerald : JEWELS.violet, 'head', rand))
  }
  return panes
}

/** Under the springing: a lozenge lattice whose shared vertices are nudged, so the cames wander like hand-cut lead. */
function fieldPanes(b: Box2, rand: () => number): Pane[] {
  const [dx, dy] = G.lozenge
  const nudged = new Map<string, XY>()
  const v = (i: number, j: number): XY => {
    const key = `${i},${j}`
    if (!nudged.has(key)) nudged.set(key, [(i * dx) / 2 + (rand() - 0.5) * dx * 0.2, (j * dy) / 2 + (rand() - 0.5) * dy * 0.14])
    return nudged.get(key)!
  }
  const panes: Pane[] = []
  const [i0, i1, j0] = [Math.floor(b.minX / (dx / 2)) - 1, Math.ceil(b.maxX / (dx / 2)) + 1, Math.floor(b.minY / (dy / 2)) - 1]
  for (let j = 1; j >= j0; j -= 1)
    for (let i = i0; i <= i1; i += 1) {
      if ((i + j) % 2) continue
      const pick = rand()
      const colour = pick < 0.14 ? JEWELS.ruby : pick < 0.2 ? JEWELS.emerald : (i + j) % 4 === 0 ? JEWELS.amber : JEWELS.clear
      panes.push(pane([v(i - 1, j), v(i, j - 1), v(i + 1, j), v(i, j + 1)], colour, 'field', rand))
    }
  return panes
}

function glassLayout(): GlassLayout {
  const rand = seeded(211)
  const points = outline(1)
  const b = bounds(points)
  const [kx, ky] = [(b.maxX - G.band) / b.maxX, (b.maxY - b.minY - 2 * G.band) / (b.maxY - b.minY)]
  const inner = points.map((p): XY => [p.x * kx, b.minY + G.band + (p.y - b.minY) * ky])
  const panes = [...bandPanes(points, inner, rand), ...headPanes(rand), ...fieldPanes(b, rand)]
  for (const p of panes) {
    const clamped = p.poly.map(([x, y]): XY => [Math.min(b.maxX, Math.max(b.minX, x)), Math.min(b.maxY, Math.max(b.minY, y))])
    p.centre = [clamped.reduce((s, q) => s + q[0], 0) / clamped.length, clamped.reduce((s, q) => s + q[1], 0) / clamped.length]
    p.radius = Math.max(...clamped.map(([x, y]) => Math.hypot(x - p.centre[0], y - p.centre[1])))
  }
  return { outer: points.map((p): XY => [p.x, p.y]), inner, b, panes }
}

function trace(ctx: Ctx, poly: readonly XY[]): void {
  ctx.beginPath()
  poly.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
}

function clipTo(ctx: Ctx, win: GlassLayout, region: Pane['region']): void {
  trace(ctx, region === 'band' ? win.outer : win.inner)
  ctx.clip()
  if (region === 'band') return
  const { minX, maxX, minY, maxY } = win.b
  ctx.beginPath()
  if (region === 'head') ctx.rect(minX, 0, maxX - minX, maxY)
  else ctx.rect(minX, minY, maxX - minX, -minY)
  ctx.clip()
}

/** One draw for both maps, in window metres. `glow` (emissive): each pane lighter at its heart, the whole window
 * brighter in the middle as daylight behind it, lead black. Otherwise (albedo): bronze lead with a lit core, dark
 * panes, so the cames take the room's light. */
function paintGlass(ctx: Ctx, w: number, h: number, win: GlassLayout, glow: boolean): void {
  const { minX, maxX, minY, maxY } = win.b
  const [sx, sy] = [w / (maxX - minX), h / (maxY - minY)]
  ctx.setTransform(sx, 0, 0, -sy, -minX * sx, maxY * sy)
  ctx.fillStyle = glow ? '#000000' : LEAD
  ctx.fillRect(minX, minY, maxX - minX, maxY - minY)
  ctx.lineJoin = 'round'
  for (const p of win.panes) {
    ctx.save()
    clipTo(ctx, win, p.region)
    trace(ctx, p.poly)
    ctx.fillStyle = glow ? p.colour : '#140d08'
    ctx.fill()
    if (glow) {
      const g = ctx.createRadialGradient(p.centre[0], p.centre[1], 0, p.centre[0], p.centre[1], p.radius)
      g.addColorStop(0, 'rgba(255,246,225,0.3)')
      g.addColorStop(1, 'rgba(0,0,0,0.32)')
      ctx.fillStyle = g
      ctx.fill()
    }
    ctx.lineWidth = p.lead
    ctx.strokeStyle = glow ? '#000000' : LEAD
    ctx.stroke()
    if (!glow) Object.assign(ctx, { lineWidth: p.lead * 0.3, strokeStyle: LEAD_LIT }).stroke()
    ctx.restore()
  }
  if (glow) daylight(ctx, win)
}

/** Transom came across the springing, then the whole window dimmed toward its edges. */
function daylight(ctx: Ctx, win: GlassLayout): void {
  const { minX, maxX, minY, maxY } = win.b
  ctx.save()
  trace(ctx, win.inner)
  ctx.clip()
  ctx.fillStyle = '#000000'
  ctx.fillRect(minX, -0.009, maxX - minX, 0.018)
  ctx.restore()
  const cy = (minY + maxY) / 2
  const g = ctx.createRadialGradient(0, cy, 0, 0, cy, (maxY - minY) * 0.62)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(1, '#6e6e6e')
  ctx.globalCompositeOperation = 'multiply'
  ctx.fillStyle = g
  ctx.fillRect(minX, minY, maxX - minX, maxY - minY)
  ctx.globalCompositeOperation = 'source-over'
}

function glassTextures(win: GlassLayout): { map: CanvasTexture; emissive: CanvasTexture } {
  const w = 256
  const h = Math.round((w * (win.b.maxY - win.b.minY)) / (win.b.maxX - win.b.minX))
  return { map: canvasTexture(w, (ctx) => paintGlass(ctx, w, h, win, false), h), emissive: canvasTexture(w, (ctx) => paintGlass(ctx, w, h, win, true), h) }
}

/** ShapeGeometry's UVs are shape metres; stretch them over the window's box so the texture follows the outline. */
function fitUvs(geometry: ShapeGeometry, b: Box2): ShapeGeometry {
  const uv = geometry.getAttribute('uv')
  for (let i = 0; i < uv.count; i += 1) uv.setXY(i, (uv.getX(i) - b.minX) / (b.maxX - b.minX), (uv.getY(i) - b.minY) / (b.maxY - b.minY))
  return geometry
}

/** Leaded jewel glass in a gold frame on the back wall: panes following the multifoil head, bronze cames that take
 * the light, and an emissive glow brightest at the window's heart. */
export function colouredGlass(g: Group, gold: Material, tier: ResolvedTier): void {
  const win = glassLayout()
  const { map, emissive } = glassTextures(win)
  const glass = make(tier, { color: '#ffffff', map, emissive: '#ffffff', emissiveMap: emissive, emissiveIntensity: G.emissive, roughness: 0.4, side: DoubleSide })
  glass.userData.noShadow = true
  for (const x of G.xs) {
    add(g, fitUvs(new ShapeGeometry(new Shape(outline(1))), win.b), glass, x, G.spring, G.z)
    const frame = new Shape(outline(1.18))
    frame.holes.push(new Path(outline(1)))
    add(g, new ShapeGeometry(frame), gold, x, G.spring, G.z + 0.01)
  }
}

const T = COURT.torans

/** Marigold swags across each listed arch, springing to springing, and a hanging strand at each end. */
export function torans(tier: ResolvedTier): InstancedMesh {
  const rand = seeded(111)
  const colours = T.colours.map((c) => new Color(c))
  const transforms: InstanceTransform[] = []
  const flower = (x: number, y: number, z: number) =>
    transforms.push({ pos: [x, y, z], yaw: rand() * Math.PI * 2, scale: T.radius * (0.85 + rand() * 0.3), color: colours[Math.floor(rand() * colours.length)] })
  const A = COURT.arches
  for (const s of T.spans) {
    const [a, b] = A.spans[s].map((i) => COURT.columns[i])
    const span = Math.hypot(b[0] - a[0], b[1] - a[1])
    const [ux, uz] = [(b[0] - a[0]) / span, (b[1] - a[1]) / span]
    const face = A.depth / 2 + 0.05
    const [cx, cz] = [(a[0] + b[0]) / 2 - uz * face, (a[1] + b[1]) / 2 + ux * face]
    const half = span / 2 - A.inset
    const n = Math.round((half * 2) / (T.radius * 1.7))
    for (let k = 0; k <= n; k += 1) {
      const t = (k / n) * 2 - 1
      flower(cx + ux * t * half, A.spring - T.droop * (1 - t * t), cz + uz * t * half)
    }
    for (const side of [-1, 1]) for (let k = 1; k <= T.strand; k += 1) flower(cx + ux * side * half, A.spring - k * T.radius * 1.7, cz + uz * side * half)
  }
  const material = make(tier, { color: '#ffffff', roughness: 0.9 })
  material.userData.noShadow = true
  const mesh = makeInstanced(new IcosahedronGeometry(1, 1), material, transforms)
  mesh.name = 'torans'
  return mesh
}
