// The tier decision carries its reason: the overlay and Settings show it, so a misfiring
// heuristic is visible and overridable instead of silently serving low to a real GPU.
import { describe, expect, it } from 'vitest'
import type { WebGLRenderer } from 'three'
import { deserializeSave } from '@core/save'
import { resolveTier } from '@render/quality-tier'

const renderer = (name: string) => ({ getContext: () => ({ getExtension: () => null, getParameter: () => name, RENDERER: 0 }) }) as unknown as WebGLRenderer

function save(qualityTier: 'auto' | 'low' | 'high', benchmarkTier: 'low' | 'high' | null = null, benchmarkRenderer?: string) {
  return { ...deserializeSave(null), settings: { qualityTier, volume: 1, subtitles: true }, benchmarkTier, ...(benchmarkRenderer ? { benchmarkRenderer } : {}) }
}

describe('resolveTier', () => {
  it('a Settings choice beats detection, even on a software renderer', async () => {
    expect(await resolveTier(save('high'), renderer('SwiftShader'))).toMatchObject({ tier: 'high', reason: 'override' })
  })

  it('a persisted benchmark is reused on the renderer it was measured on, and says so', async () => {
    expect(await resolveTier(save('auto', 'low', 'NVIDIA'), renderer('NVIDIA'))).toMatchObject({ tier: 'low', reason: 'saved', benchmarked: null })
  })

  it('re-detects when the renderer changed or was never recorded (an Optimus browser moved off the iGPU)', async () => {
    const onIntel = save('auto', 'low', 'Intel(R) UHD Graphics')
    expect(await resolveTier(onIntel, renderer('ANGLE (SwiftShader)'))).toMatchObject({ tier: 'low', reason: 'software', benchmarked: 'low' })
    expect(await resolveTier(save('auto', 'low'), renderer('Intel(R) UHD Graphics 620'))).toMatchObject({ reason: 'weakGpu', benchmarked: 'low' })
  })

  it('names the heuristic that picked low', async () => {
    expect(await resolveTier(save('auto'), renderer('ANGLE (SwiftShader)'))).toMatchObject({ tier: 'low', reason: 'software' })
    expect(await resolveTier(save('auto'), renderer('Intel(R) UHD Graphics 620'))).toMatchObject({ tier: 'low', reason: 'weakGpu' })
  })
})
