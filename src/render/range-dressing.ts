// Level 4's hermitage and range from primitives and canvas textures: a whitewashed firing line on trodden
// earth with a saffron pennant on a bamboo pole at each end, stacked straw bales behind every target, Vishwamitra's
// mud-walled kuti and its fire pit. Merged by material like the court. Built as part of the Level 4 wilds
// (render/wilds-dressing.ts).
import {
  type BufferGeometry,
  BufferGeometry as ThreeBufferGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  Float32BufferAttribute,
  type Group,
  Group as ThreeGroup,
  type Material,
  Mesh,
  MeshStandardMaterial,
  type MeshStandardMaterialParameters,
  PlaneGeometry,
  type Texture,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { LEVELS } from '@data/levels'
import { RANGE } from '@data/scenery'
import { flameGeometry } from './fire'
import { mergeByMaterial } from './merge'
import { dappleTexture, flameTexture, seeded } from './procedural-textures'
import { fibreTexture, pennantTexture } from './wild-textures'

const P = RANGE.palette

type RangeMaterials = ReturnType<typeof rangeMaterials>

const std = (p: MeshStandardMaterialParameters) => new MeshStandardMaterial({ roughness: 0.95, ...p })
/** Lies on the GroundPlane: polygon offset wins the depth test; `units` stacks one decal over another. */
const onGround = (p: MeshStandardMaterialParameters, units: number) => std({ ...p, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: units })

function rangeMaterials(textures: Texture[]) {
  const own = <T extends Texture>(t: T): T => {
    textures.push(t)
    return t
  }
  const thatch = own(fibreTexture(P.thatch, P.strawDark, P.strawLight, true, [0.3, 0.62, 0.9]))
  thatch.repeat.set(5, 1)
  const mud = own(dappleTexture(P.mud, [P.mudLight, P.mudDark]))
  mud.repeat.set(5, 1)
  return {
    // RoundedBox UVs run 0–1 on every face: each bale gets its own fibres and two twine bands.
    straw: std({ map: own(fibreTexture(P.straw, P.strawDark, P.strawLight, false, [0.28, 0.72])) }),
    thatch: std({ map: thatch, side: DoubleSide }),
    mud: std({ map: mud }),
    earth: onGround({ map: own(dappleTexture(P.earth, [P.mudLight, P.mudDark])) }, -4),
    wood: std({ color: P.wood, roughness: 0.85 }),
    bamboo: std({ color: P.bamboo, roughness: 0.6 }),
    chalk: std({ color: P.chalk }),
    stone: std({ color: P.stone }),
    doorway: std({ color: P.doorway, roughness: 1 }),
    pennant: std({ map: own(pennantTexture(P.saffron, P.gold)), roughness: 0.85, side: DoubleSide }),
    ember: onGround({ color: P.ember, emissive: '#ff3a0a', emissiveIntensity: 0.8 }, -8),
    // Unlit look, as the court braziers: black albedo, all colour from the emissive ramp.
    flame: std({ color: '#000000', emissive: '#ffffff', emissiveMap: own(flameTexture(P.flameCore, P.flame)), emissiveIntensity: RANGE.firePit.flameEmissive, roughness: 1 }),
  }
}

function put(g: Group, geo: BufferGeometry, mat: Material, x: number, y: number, z: number, ry = 0): void {
  const m = new Mesh(geo, mat)
  m.position.set(x, y, z)
  m.rotation.y = ry
  g.add(m)
}

/** A triangular pennant flying out along +x from its hoist at the origin, sagging and rippling toward the tip. */
function pennantGeometry(): BufferGeometry {
  const { length, hoist, droop, ripple, segments } = RANGE.pennant
  const pos: number[] = []
  const uv: number[] = []
  const index: number[] = []
  for (let k = 0; k <= segments; k += 1) {
    const t = k / segments
    const half = (hoist / 2) * (1 - t)
    const y = -droop * t * t
    const z = ripple * Math.sin(t * Math.PI * 1.5)
    pos.push(t * length, y + half, z, t * length, y - half, z)
    uv.push(t, 1, t, 0)
    if (k > 0) index.push(2 * k - 2, 2 * k - 1, 2 * k, 2 * k - 1, 2 * k + 1, 2 * k)
  }
  const geo = new ThreeBufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  geo.setIndex(index)
  geo.computeVertexNormals()
  return geo
}

/** Bamboo pole with node rings, the pennant at its top flying away from the lanes (`side` ±1). */
function pennantPole(g: Group, m: RangeMaterials, x: number, z: number, side: number): void {
  const { pole, nodeEvery, hoist } = RANGE.pennant
  put(g, new CylinderGeometry(0.028, 0.036, pole, 8), m.bamboo, x, pole / 2, z)
  for (let y = nodeEvery; y < pole; y += nodeEvery) put(g, new CylinderGeometry(0.038, 0.038, 0.025, 8), m.bamboo, x, y, z)
  put(g, pennantGeometry(), m.pennant, x, pole - hoist / 2 - 0.05, z, side > 0 ? 0 : Math.PI)
}

function firingLine(g: Group, m: RangeMaterials) {
  const { z, halfWidth, stoneEvery, depth } = RANGE.firingLine
  put(g, new PlaneGeometry(halfWidth * 2 + 2, depth).rotateX(-Math.PI / 2), m.earth, 0, 0.01, z)
  for (let x = -halfWidth; x <= halfWidth + 1e-6; x += stoneEvery) put(g, new DodecahedronGeometry(0.11).scale(1.4, 0.6, 1), m.chalk, x, 0.04, z, x * 3.1)
  for (const side of [-1, 1]) pennantPole(g, m, side * (halfWidth + 0.6), z, side)
}

/** Two courses of straw bales behind each target, each bale nudged and turned a little, the upper course staggered
 * by half a bale; bare earth under them. The lateral target's stack spans its whole slide. */
function backstops(g: Group, m: RangeMaterials) {
  const { w, behind } = RANGE.backstop
  const { l, h, d, radius, jitter, yaw } = RANGE.bale
  const rand = seeded(61)
  const nudge = (s: number) => (rand() - 0.5) * 2 * jitter * s
  for (const t of LEVELS.find((lv) => lv.id === 'l4')!.targets) {
    const s = 'scale' in t ? t.scale : 1
    const width = t.kind === 'lateral' ? t.amplitude * 2 + w : w * s
    const [x, , tz] = t.pos
    const z = tz - behind * s
    const n = Math.max(2, Math.ceil(width / (l * s)))
    for (let course = 0; course < 2; course += 1) {
      const count = n - course
      for (let i = 0; i < count; i += 1) {
        const bx = x + (i - (count - 1) / 2) * l * s
        const bale = new RoundedBoxGeometry(l * s * 0.97, h * s, d * s, 2, radius * s)
        put(g, bale, m.straw, bx + nudge(s), (h / 2 + course * h * 0.96) * s, z + nudge(s), (rand() - 0.5) * 2 * yaw)
      }
    }
    put(g, new PlaneGeometry(width + 1.2 * s, (behind + d + 1) * s).rotateX(-Math.PI / 2), m.earth, x, 0.01, tz - (behind * s) / 2)
  }
}

function hut(g: Group, m: RangeMaterials) {
  const { x, z, r, wallH, roofH, overhang } = RANGE.hut
  const base = 0.22
  put(g, new CylinderGeometry(r + 0.35, r + 0.45, base, 18), m.mud, x, base / 2, z)
  put(g, new CylinderGeometry(r, r * 1.04, wallH, 18, 1, true), m.mud, x, base + wallH / 2, z)
  put(g, new ConeGeometry(r + overhang, roofH, 18, 1, true), m.thatch, x, base + wallH + roofH / 2 - 0.2, z)
  put(g, new ConeGeometry(0.1, 0.45, 6), m.wood, x, base + wallH + roofH - 0.05, z)
  // The doorway faces the range (−Z), where the player spawns looking back at it.
  put(g, new PlaneGeometry(0.95, 1.7), m.doorway, x, base + 0.85, z - r * 1.02 - 0.02, Math.PI)
}

/** Stones in a ring, crossed logs, an ember bed and flames. Returns where the fire's light hangs. */
function firePit(g: Group, m: RangeMaterials): readonly [number, number, number] {
  const { x, z, r, stones, flames, light } = RANGE.firePit
  put(g, new CircleGeometry(r + 0.6, 20).rotateX(-Math.PI / 2), m.earth, x, 0.01, z)
  put(g, new CircleGeometry(r * 0.8, 16).rotateX(-Math.PI / 2), m.ember, x, 0.02, z)
  for (let i = 0; i < stones; i += 1) {
    const a = (i / stones) * Math.PI * 2
    put(g, new DodecahedronGeometry(0.15).scale(1.1, 0.7, 1), m.stone, x + Math.cos(a) * r, 0.07, z + Math.sin(a) * r, -a)
  }
  for (let i = 0; i < 3; i += 1) put(g, new CylinderGeometry(0.05, 0.05, r * 1.4, 6).rotateZ(Math.PI / 2), m.wood, x, 0.07, z, (i / 3) * Math.PI)
  for (const [fx, fz, fr, fh] of flames) put(g, flameGeometry(fr, fh), m.flame, x + fx, 0.06, z + fz)
  return [x, light.y, z]
}

export function buildRange(): { group: Group; fire: readonly [number, number, number]; textures: Texture[] } {
  const textures: Texture[] = []
  const m = rangeMaterials(textures)
  const raw = new ThreeGroup()
  firingLine(raw, m)
  backstops(raw, m)
  hut(raw, m)
  const fire = firePit(raw, m)
  const group = mergeByMaterial(raw)
  group.name = 'range-dressing'
  group.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh) return
    mesh.receiveShadow = true
    mesh.castShadow = mesh.material !== m.earth && mesh.material !== m.ember && mesh.material !== m.flame
  })
  return { group, fire, textures }
}
