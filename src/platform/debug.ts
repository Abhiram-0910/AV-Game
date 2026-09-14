// Debug switches. The overlay is on in dev and behind ?debug in a production build, because
// the e2e run drives `vite preview` and reads its numbers. ?debug=bow arms the bow in any
// level so the procedural draw can be judged on screen.
const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search)
const debugParam = params.get('debug')

export const DEBUG = {
  overlay: import.meta.env.DEV || debugParam !== null,
  bow: debugParam === 'bow',
  /** Pass 3 Phase B: male/female × high/low LOD comparison scene, see scenes/LodDebug.tsx. */
  lod: debugParam === 'lod',
  /** ?density=K multiplies the L2–L4 wilds' tree, shrub, grass and rock counts, and every tree casts a shadow when
   * K > 1: the knob tools/bench-gpu.mjs sweeps to find the high tier's real ceiling. */
  density: Number(params.get('density') ?? 1) || 1,
} as const
