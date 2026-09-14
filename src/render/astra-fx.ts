// The astra's staged sequence as three.js objects, built once per level mount and disposed with it. entities/AstraVfx.tsx
// drives them every frame through render/astra-fx-update.ts. Particles are InstancedMeshes, one draw call per kind; the
// low tier gets fewer of each, no bolt branches and no point light (ASTRA_LOOK.COUNTS).
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PointLight,
  RingGeometry,
  type Texture,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { BALANCE } from '@data/balance'
import { ASTRA_LOOK as FX } from '@data/scenery'
import { cloudTexture, softDotTexture } from './astra-textures'
import type { ResolvedTier } from './manifest'
import { seeded } from './procedural-textures'

export type AstraKind = 'agneyastra' | 'manavastra'

/** The astra's HDR colour (above 1, so bloom catches it on high). */
export function astraColor(kind: AstraKind, target = new Color()): Color {
  const [r, g, b] = kind === 'agneyastra' ? FX.AGNEYA_COLOR : FX.MANAVA_COLOR
  return target.setRGB(r, g, b)
}

interface Mats {
  cloud: MeshBasicMaterial
  spark: MeshBasicMaterial
  dust: MeshBasicMaterial
  gale: MeshBasicMaterial
  glow: MeshBasicMaterial
  bolt: MeshBasicMaterial
  shock: MeshBasicMaterial
}

export interface AstraFx {
  group: Group
  mats: Mats
  clouds: InstancedMesh
  sparks: InstancedMesh
  dust: InstancedMesh
  gale: InstancedMesh
  glow: Mesh
  bolt: Mesh
  shock: Mesh
  arc: Mesh
  light: PointLight | null
  branches: number
  dispose(): void
}

function glowMaterial(map: Texture | null = null): MeshBasicMaterial {
  return new MeshBasicMaterial({ map, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false, side: DoubleSide, forceSinglePass: true })
}

function createMats(): Mats {
  const dot = softDotTexture()
  return {
    // Not tone-mapped: the storm lowers exposure, which darkened the bank into L5's night sky until it vanished.
    cloud: new MeshBasicMaterial({ map: cloudTexture(), color: FX.CLOUD_COLOR, transparent: true, depthWrite: false, fog: false, toneMapped: false, opacity: 0 }),
    spark: glowMaterial(dot),
    dust: new MeshBasicMaterial({ map: dot, color: '#a88a66', transparent: true, depthWrite: false, opacity: 0 }),
    gale: glowMaterial(dot),
    glow: glowMaterial(dot),
    bolt: glowMaterial(),
    shock: glowMaterial(),
  }
}

function hidden<T extends Mesh>(m: T): T {
  m.visible = false
  m.frustumCulled = false // moved every frame: the base geometry's bounds say nothing about where they are
  return m
}

export function createAstraFx(tier: ResolvedTier): AstraFx {
  const n = FX.COUNTS[tier]
  const mats = createMats()
  const half = (BALANCE.astra.manavastra.CONE_ANGLE_DEG * Math.PI) / 360
  const fx: AstraFx = {
    group: new Group(),
    mats,
    clouds: hidden(new InstancedMesh(new PlaneGeometry(1, 1), mats.cloud, n.clouds)),
    sparks: hidden(new InstancedMesh(new PlaneGeometry(0.08, 0.08), mats.spark, n.sparks)),
    dust: hidden(new InstancedMesh(new PlaneGeometry(1, 1), mats.dust, n.dust)),
    gale: hidden(new InstancedMesh(new PlaneGeometry(1.8, 0.16), mats.gale, n.gale)),
    glow: hidden(new Mesh(new PlaneGeometry(1, 1), mats.glow)),
    bolt: hidden(new Mesh(new BufferGeometry(), mats.bolt)),
    shock: hidden(new Mesh(new RingGeometry(0.86, 1, 96).rotateX(-Math.PI / 2), mats.shock)),
    // Manavastra's shock front: the cone's arc. RingGeometry's theta −π/2 lies along +Z once flat, so rotation.y = yaw aims it.
    arc: hidden(new Mesh(new RingGeometry(0.8, 1, 48, 1, -Math.PI / 2 - half, 2 * half).rotateX(-Math.PI / 2), mats.shock)),
    light: tier === 'high' ? new PointLight('#ffffff', 0, FX.LIGHT.DISTANCE, 2) : null,
    branches: n.branches,
    dispose: () => {},
  }
  const meshes = [fx.clouds, fx.sparks, fx.dust, fx.gale, fx.glow, fx.bolt, fx.shock, fx.arc]
  fx.group.name = 'astra-vfx'
  fx.group.add(...meshes)
  if (fx.light) fx.group.add(fx.light)
  fx.dispose = () => {
    for (const m of meshes) m.geometry.dispose()
    for (const m of [fx.clouds, fx.sparks, fx.dust, fx.gale]) m.dispose()
    for (const mat of Object.values(mats)) {
      mat.map?.dispose()
      mat.dispose()
    }
    fx.light?.dispose()
  }
  return fx
}

const offset = new Vector3()

function jagged(from: Vector3, to: Vector3, segments: number, jitter: number, rand: () => number): Vector3[] {
  const pts: Vector3[] = []
  for (let i = 0; i <= segments; i += 1) {
    const u = i / segments
    const j = jitter * Math.sin(Math.PI * u)
    pts.push(new Vector3().lerpVectors(from, to, u).add(offset.set((rand() - 0.5) * 2 * j, 0, (rand() - 0.5) * 2 * j)))
  }
  return pts
}

/** Two crossed ribbons along the polyline, so the bolt reads from any side without turning to the camera. */
function ribbon(pts: Vector3[], width: number): BufferGeometry {
  const v: number[] = []
  const quad = (a: Vector3, b: Vector3, ox: number, oz: number) =>
    v.push(a.x - ox, a.y, a.z - oz, a.x + ox, a.y, a.z + oz, b.x + ox, b.y, b.z + oz, a.x - ox, a.y, a.z - oz, b.x + ox, b.y, b.z + oz, b.x - ox, b.y, b.z - oz)
  for (let i = 0; i < pts.length - 1; i += 1) {
    quad(pts[i], pts[i + 1], width, 0)
    quad(pts[i], pts[i + 1], 0, width)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(v, 3))
  return g
}

/** A fresh jagged bolt for this strike (one small geometry per cast), with forks on high. */
export function rebuildBolt(fx: AstraFx, from: Vector3, to: Vector3, width: number, seed: number): void {
  const rand = seeded(seed)
  const main = jagged(from, to, 18, FX.BOLT_JITTER, rand)
  const pieces = [ribbon(main, width)]
  for (let b = 0; b < fx.branches; b += 1) {
    const start = main[4 + Math.floor(rand() * 10)]
    const end = new Vector3(start.x + (rand() - 0.5) * 8, start.y - 3 - rand() * 5, start.z + (rand() - 0.5) * 8)
    pieces.push(ribbon(jagged(start, end, 6, 0.8, rand), width * 0.5))
  }
  fx.bolt.geometry.dispose()
  fx.bolt.geometry = pieces.length > 1 ? mergeGeometries(pieces) : pieces[0]
  if (pieces.length > 1) for (const p of pieces) p.dispose()
}
