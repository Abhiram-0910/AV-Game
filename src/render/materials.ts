// Toon/cel-shading by default on low tier; Standard on the high tier, keeping the source's
// authored PBR (roughness, metalness, their maps, emissive) so gold reads as metal.
import {
  Color,
  DataTexture,
  type Material,
  MeshStandardMaterial,
  MeshToonMaterial,
  NearestFilter,
  RedFormat,
  type Texture,
} from 'three'
import { BALANCE } from '@data/balance'
import type { ResolvedTier } from './manifest'

interface SourceMaterial extends Material {
  map?: Texture | null
  color?: Color
  normalMap?: Texture | null
  roughness?: number
  metalness?: number
  roughnessMap?: Texture | null
  metalnessMap?: Texture | null
  emissive?: Color
  emissiveMap?: Texture | null
  emissiveIntensity?: number
}

export interface TierMaterialOptions {
  /** Hex tint multiplied into the base colour. */
  tint?: string
  skinning?: boolean
  /** Replaces the source PBR factors on the high tier (untextured Sketchfab stone ships metalness 0.28). */
  pbr?: { roughness: number; metalness: number }
}

let toonRamp: DataTexture | null = null

export function getToonRamp(): DataTexture {
  if (!toonRamp) {
    // 2-tone stepped cel-shading: shadow (115/255 = 0.45) and highlight (255/255 = 1.0)
    const data = new Uint8Array([115, 255])
    toonRamp = new DataTexture(data, 2, 1, RedFormat)
    toonRamp.minFilter = NearestFilter
    toonRamp.magFilter = NearestFilter
    toonRamp.generateMipmaps = false
    toonRamp.needsUpdate = true
  }
  return toonRamp
}

/** FBX-converted props (the Quaternius packs) carry placeholder factors — metalness 0.4 on bark
 * and leaves. Only real glTF PBR is trusted; the converter marks the rest in its extras. */
function authoredPbr(src: SourceMaterial): boolean {
  const fromFbx = (src.userData as { fromFBX?: { isTruePBR?: boolean } }).fromFBX
  return fromFbx?.isTruePBR !== false && typeof src.roughness === 'number'
}

function standard(src: SourceMaterial, shared: object, opts: TierMaterialOptions): MeshStandardMaterial {
  const trusted = authoredPbr(src)
  return new MeshStandardMaterial({
    ...shared,
    normalMap: src.normalMap ?? null,
    roughness: opts.pbr?.roughness ?? (trusted ? src.roughness : BALANCE.render.STANDARD_ROUGHNESS),
    metalness: opts.pbr?.metalness ?? (trusted ? src.metalness : 0),
    roughnessMap: trusted ? (src.roughnessMap ?? null) : null,
    metalnessMap: trusted ? (src.metalnessMap ?? null) : null,
  })
}

export function tierMaterial(source: Material, tier: ResolvedTier, opts: TierMaterialOptions = {}): Material {
  const src = source as SourceMaterial
  const color = (src.color ?? new Color('#ffffff')).clone()
  if (opts.tint) color.multiply(new Color(opts.tint))
  const shared = {
    map: src.map ?? null,
    color,
    name: src.name,
    side: src.side,
    emissive: src.emissive?.clone() ?? new Color(0),
    emissiveMap: src.emissiveMap ?? null,
    emissiveIntensity: src.emissiveIntensity ?? 1,
  }
  if (tier === 'high') return standard(src, shared, opts)
  return new MeshToonMaterial({ ...shared, gradientMap: getToonRamp() })
}

/** Replace every material under root with its tier equivalent, disposing the originals. */
export function applyTierMaterials(root: { traverse(cb: (o: unknown) => void): void }, tier: ResolvedTier, opts: TierMaterialOptions = {}): void {
  root.traverse((node) => {
    const mesh = node as { isMesh?: boolean; material?: Material | Material[] }
    if (!mesh.isMesh || !mesh.material) return
    if (Array.isArray(mesh.material)) {
      const next = mesh.material.map((m) => tierMaterial(m, tier, opts))
      mesh.material.forEach((m) => m.dispose())
      mesh.material = next
    } else {
      const next = tierMaterial(mesh.material, tier, opts)
      mesh.material.dispose()
      mesh.material = next
    }
  })
}
