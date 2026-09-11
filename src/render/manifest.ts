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
  return `/assets/${activeTier}/${ASSET_FILES[id]}`
}
