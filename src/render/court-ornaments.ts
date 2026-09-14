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
const JEWELS = { ruby: '#d0213a', sapphire: '#2f5bd6', emerald: '#1f9a5a', amber: '#f2a51a' }

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

/** Leaded jewel glass, 8 × 8 cells a metre (ShapeGeometry UVs are metres, offset so the pattern centres on the
 * window): ruby border, amber and emerald rings, a sapphire diamond at the centre. */
function glassTexture(): CanvasTexture {
  const texture = canvasTexture(256, (ctx, s) => {
    const cell = s / 8
    ctx.fillStyle = '#1a120c'
    ctx.fillRect(0, 0, s, s)
    for (let i = 0; i < 8; i += 1)
      for (let j = 0; j < 8; j += 1) {
        const [di, dj] = [Math.abs(i - 3.5), Math.abs(j - 3.5)]
        ctx.fillStyle = Math.max(di, dj) > 3 ? JEWELS.ruby : di + dj <= 2 ? JEWELS.sapphire : di + dj <= 4 ? JEWELS.emerald : JEWELS.amber
        ctx.fillRect(i * cell + 3, j * cell + 3, cell - 6, cell - 6)
      }
  })
  texture.offset.set(0.5, 0.5)
  return texture
}

/** Window outline in local metres, y from the springing: sill up the jambs, over the multifoil head. */
function outline(scale: number): Vector2[] {
  const sill = G.sill - G.spring
  return [[-G.half, sill], ...multifoil(G.half, G.rise, G.lobes, 5), [G.half, sill]].map(([x, y]) => new Vector2(x * scale, sill + (y - sill) * scale))
}

/** Emissive jewel glass in a gold frame on the back wall. */
export function colouredGlass(g: Group, gold: Material, tier: ResolvedTier): void {
  const glass = make(tier, { color: '#000000', emissive: '#ffffff', emissiveMap: glassTexture(), emissiveIntensity: G.emissive, roughness: 1, side: DoubleSide })
  glass.userData.noShadow = true
  for (const x of G.xs) {
    add(g, new ShapeGeometry(new Shape(outline(1))), glass, x, G.spring, G.z)
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
