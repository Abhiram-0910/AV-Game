// Lambert by default; Standard only on the high tier. Keeps the base colour map, drops the rest.
import { Color, type Material, MeshLambertMaterial, MeshStandardMaterial, type Texture } from 'three'
import { BALANCE } from '@data/balance'
import type { ResolvedTier } from './manifest'

interface SourceMaterial extends Material {
  map?: Texture | null
  color?: Color
  normalMap?: Texture | null
  roughnessMap?: Texture | null
  emissive?: Color
}

export interface TierMaterialOptions {
  /** Hex tint multiplied into the base colour. */
  tint?: string
  skinning?: boolean
}

export function tierMaterial(source: Material, tier: ResolvedTier, opts: TierMaterialOptions = {}): Material {
  const src = source as SourceMaterial
  const color = (src.color ?? new Color('#ffffff')).clone()
  if (opts.tint) color.multiply(new Color(opts.tint))
  const shared = { map: src.map ?? null, color, name: src.name, side: src.side }
  if (tier === 'high') {
    return new MeshStandardMaterial({ ...shared, normalMap: src.normalMap ?? null, roughness: BALANCE.render.STANDARD_ROUGHNESS, metalness: 0 })
  }
  return new MeshLambertMaterial(shared)
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
