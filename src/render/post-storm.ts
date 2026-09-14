// Written by entities/AstraVfx each frame and read by render/PostProcessing: storm 0..1 cools the grade and closes the
// vignette; flash 0..1 lifts bloom. A plain module so PostProcessing.tsx exports only its component.
export const postStorm = { storm: 0, flash: 0 }
