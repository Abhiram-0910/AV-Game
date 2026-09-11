// The tier decision carries its reason: the overlay and Settings show it, so a misfiring
// heuristic is visible and overridable instead of silently serving low to a real GPU.
import { describe, expect, it } from 'vitest'
import type { WebGLRenderer } from 'three'
import { deserializeSave } from '@core/save'
import { resolveTier } from '@render/quality-tier'

const renderer = (name: string) => ({ getContext: () => ({ getExtension: () => null, getParameter: () => name, RENDERER: 0 }) }) as unknown as WebGLRenderer

function save(qualityTier: 'auto' | 'low' | 'high', benchmarkTier: 'low' | 'high' | null = null) {
  return { ...deserializeSave(null), settings: { qualityTier, volume: 1, subtitles: true }, benchmarkTier }
}

describe('resolveTier', () => {
  it('a Settings choice beats detection, even on a software renderer', async () => {
    expect(await resolveTier(save('high'), renderer('SwiftShader'))).toMatchObject({ tier: 'high', reason: 'override' })
  })

  it('a persisted benchmark is reused and says so', async () => {
    expect(await resolveTier(save('auto', 'low'), renderer('NVIDIA'))).toMatchObject({ tier: 'low', reason: 'saved', benchmarked: null })
  })

  it('names the heuristic that picked low', async () => {
    expect(await resolveTier(save('auto'), renderer('ANGLE (SwiftShader)'))).toMatchObject({ tier: 'low', reason: 'software' })
    expect(await resolveTier(save('auto'), renderer('Intel(R) UHD Graphics 620'))).toMatchObject({ tier: 'low', reason: 'weakGpu' })
  })
})
