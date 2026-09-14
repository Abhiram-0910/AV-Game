// Numbers the PerfProbe writes each frame and the PerfOverlay reads. Module singleton.
export interface PerfStats {
  triangles: number
  calls: number
  skinned: number
  peakSkinned: number
  renderer: string
  software: boolean
  /** Active quality tier and the UI key saying why (tier.reason.*). */
  tier: string
  tierReason: string
  /** One-time benchmark mean frame cost (ms) when it ran this boot, else 0. */
  benchMs: number
}

export const perfStats: PerfStats = { triangles: 0, calls: 0, skinned: 0, peakSkinned: 0, renderer: '', software: false, tier: '', tierReason: '', benchMs: 0 }
