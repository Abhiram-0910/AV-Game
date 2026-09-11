// Tier asset directory configuration and runtime path resolution.
import { ASSET_FILES, type AssetId } from '@data/scenery'
import { assetTier, assetUrl, setAssetTier, type ResolvedTier } from './manifest'

export { assetTier, assetUrl, setAssetTier, type ResolvedTier }

/** Returns the root public asset directory for the specified quality tier. */
export function getTierDirectory(tier: ResolvedTier): string {
  return `/assets/${tier}`
}

/** Resolves a specific asset ID to its relative URL for a given quality tier. */
export function getTierAssetUrl(id: AssetId, tier: ResolvedTier): string {
  return `${getTierDirectory(tier)}/${ASSET_FILES[id]}`
}
