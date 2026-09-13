// Level 4's hermitage and range from primitives and canvas textures: a whitewashed firing line on trodden
// earth, a straw-bale backstop behind every target, Vishwamitra's mud-walled kuti and its fire pit. Merged by
// material like the court. Built as part of the Level 4 wilds (render/wilds-dressing.ts).
import {
  type BufferGeometry,
  BoxGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  type Group,
  Group as ThreeGroup,
  type Material,
  Mesh,
  MeshStandardMaterial,
  type MeshStandardMaterialParameters,
  PlaneGeometry,
  type Texture,
} from 'three'
import { LEVELS } from '@data/levels'
import { RANGE } from '@data/scenery'
import { flameGeometry } from './fire'
import { mergeByMaterial } from './merge'
import { dappleTexture, flameTexture } from './procedural-textures'
import { fibreTexture } from './wild-textures'

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
    straw: std({ map: own(fibreTexture(P.straw, P.strawDark, P.strawLight, false, [0.28, 0.72])) }),
    thatch: std({ map: thatch, side: DoubleSide }),
    mud: std({ map: mud }),
    earth: onGround({ map: own(dappleTexture(P.earth, [P.mudLight, P.mudDark])) }, -4),
    wood: std({ color: P.wood, roughness: 0.85 }),
    chalk: std({ color: P.chalk }),
    stone: std({ color: P.stone }),
    doorway: std({ color: P.doorway, roughness: 1 }),
    saffron: std({ color: P.saffron, side: DoubleSide }),
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

function firingLine(g: Group, m: RangeMaterials) {
  const { z, halfWidth, stoneEvery, depth } = RANGE.firingLine
  put(g, new PlaneGeometry(halfWidth * 2 + 2, depth).rotateX(-Math.PI / 2), m.earth, 0, 0.01, z)
  for (let x = -halfWidth; x <= halfWidth + 1e-6; x += stoneEvery) put(g, new DodecahedronGeometry(0.11).scale(1.4, 0.6, 1), m.chalk, x, 0.04, z, x * 3.1)
  for (const side of [-1, 1]) {
    const x = side * (halfWidth + 0.6)
    put(g, new CylinderGeometry(0.045, 0.06, 1.9, 7), m.wood, x, 0.95, z)
    put(g, new PlaneGeometry(0.55, 0.34), m.saffron, x - side * 0.3, 1.66, z)
  }
}

/** A bale behind each target, two stakes pinning it, bare earth under both. The lateral target's bale spans
 * its slide, with a plank rail along the ground it runs on. */
function backstops(g: Group, m: RangeMaterials) {
  const { w, h, d, behind } = RANGE.backstop
  for (const t of LEVELS.find((l) => l.id === 'l4')!.targets) {
    const s = 'scale' in t ? t.scale : 1
    const width = t.kind === 'lateral' ? t.amplitude * 2 + w : w * s
    const [x, , tz] = t.pos
    const z = tz - behind * s
    put(g, new BoxGeometry(width, h * s, d * s), m.straw, x, (h * s) / 2, z)
    for (const side of [-1, 1]) put(g, new CylinderGeometry(0.04 * s, 0.05 * s, (h + 0.35) * s, 6), m.wood, x + side * (width / 2 + 0.07), ((h + 0.35) * s) / 2, z + (d * s) / 2)
    put(g, new PlaneGeometry(width + 1.2 * s, (behind + d + 1) * s).rotateX(-Math.PI / 2), m.earth, x, 0.01, tz - (behind * s) / 2)
    if (t.kind === 'lateral') put(g, new BoxGeometry(width, 0.05, 0.22), m.wood, x, 0.025, tz)
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
