// Numbers the PerfProbe writes each frame and the PerfOverlay reads. Module singleton.
export interface PerfStats {
  triangles: number
  calls: number
  skinned: number
  peakSkinned: number
  renderer: string
  software: boolean
}

export const perfStats: PerfStats = { triangles: 0, calls: 0, skinned: 0, peakSkinned: 0, renderer: '', software: false }
