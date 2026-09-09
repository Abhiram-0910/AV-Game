// Resolves asset ids to URLs for the active quality tier.
import { ASSET_FILES, type AssetId } from '@data/scenery'
import type { QualityTier } from '@core/save'

export type ResolvedTier = Exclude<QualityTier, 'auto'>

let activeTier: ResolvedTier = 'high'

export function setAssetTier(tier: ResolvedTier): void {
  activeTier = tier
}

export function assetTier(): ResolvedTier {
  return activeTier
}

export function assetUrl(id: AssetId): string {
  // ponytail: assets/low is unbuilt (pass 3); both tiers read the high directory until then.
  const dir = activeTier === 'low' ? 'high' : activeTier
  return `/assets/${dir}/${ASSET_FILES[id]}`
}
