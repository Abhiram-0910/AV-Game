// Validates runtime tier asset URL resolution and tier switching.
import { afterEach, describe, expect, it } from 'vitest'
import { assetTier, assetUrl, getTierAssetUrl, getTierDirectory, setAssetTier } from '@render/tier-config'

describe('tier asset configuration', () => {
  afterEach(() => {
    setAssetTier('high')
  })

  it('defaults to high tier and returns high asset URLs', () => {
    setAssetTier('high')
    expect(assetTier()).toBe('high')
    expect(assetUrl('bow')).toBe('/assets/high/props/bow.glb')
    expect(assetUrl('male')).toBe('/assets/high/characters/male.glb')
  })

  it('switches to low tier and returns low asset URLs', () => {
    setAssetTier('low')
    expect(assetTier()).toBe('low')
    expect(assetUrl('bow')).toBe('/assets/low/props/bow.glb')
    expect(assetUrl('male')).toBe('/assets/low/characters/male.glb')
    expect(assetUrl('palace')).toBe('/assets/low/env/palace.glb')
  })

  it('getTierDirectory returns correct directory prefix', () => {
    expect(getTierDirectory('high')).toBe('/assets/high')
    expect(getTierDirectory('low')).toBe('/assets/low')
  })

  it('getTierAssetUrl resolves explicit tier URLs without changing active tier', () => {
    setAssetTier('high')
    expect(getTierAssetUrl('tree', 'low')).toBe('/assets/low/props/tree.glb')
    expect(getTierAssetUrl('tree', 'high')).toBe('/assets/high/props/tree.glb')
    expect(assetTier()).toBe('high')
  })
})
