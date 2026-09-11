// Built asset ids and per-level static layout. Zero imports. Positions are metres, +Y up,
// yaw in radians. Asset ids must exist in public/assets/high/manifest.json, which
// tools/build-assets.mjs emits (tests/unit/content.test.ts cross-checks when it is present).

export type AssetId =
  | 'male'
  | 'female'
  | 'maleLow'
  | 'femaleLow'
  | 'hairLong'
  | 'hairBeard'
  | 'hairSimpleParted'
  | 'hairBuns'
  | 'hairBuzzed'
  | 'ual1'
  | 'ual2'
  | 'palace'
  | 'royalRoom'
  | 'target'
  | 'bow'
  | 'arrow'
  | 'sword'
  | 'tree'
  | 'rock'

/** File under public/assets/<tier>/ for each id. */
export const ASSET_FILES: Readonly<Record<AssetId, string>> = {
  male: 'characters/male.glb',
  female: 'characters/female.glb',
  /** ~5k-tri LOD for Level 5's 12-concurrent budget (pass 3 Phase B); same skeleton, no weight artefacts. */
  maleLow: 'characters/male-low.glb',
  femaleLow: 'characters/female-low.glb',
  hairLong: 'hair/long.glb',
  hairBeard: 'hair/beard.glb',
  hairSimpleParted: 'hair/simple-parted.glb',
  hairBuns: 'hair/buns.glb',
  hairBuzzed: 'hair/buzzed.glb',
  ual1: 'anims/ual1.glb',
  ual2: 'anims/ual2.glb',
  palace: 'env/palace.glb',
  royalRoom: 'env/royal-room.glb',
  target: 'props/target.glb',
  bow: 'props/bow.glb',
  arrow: 'props/arrow.glb',
  sword: 'props/sword.glb',
  tree: 'props/tree.glb',
  rock: 'props/rock.glb',
}

/** The 65-joint skeleton every humanoid shares; the loader refuses anything else. */
export const SKELETON = {
  JOINT_COUNT: 65,
  HEAD_BONE: 'Head',
  LEFT_HAND: 'hand_l',
  RIGHT_HAND: 'hand_r',
  SPINE_TOP: 'spine_03',
  NECK: 'neck_01',
  PELVIS: 'pelvis',
  THIGH_L: 'thigh_l',
  THIGH_R: 'thigh_r',
  CLAVICLE_L: 'clavicle_l',
} as const

type Vec3 = readonly [number, number, number]

export interface Placement {
  asset: AssetId
  pos: Vec3
  yaw: number
  scale: number
  /** Walkable: the player's ground raycast hits it. */
  ground: boolean
  /** Multiplied into every material's base colour; untextured Sketchfab models ship pure white. */
  tint?: string
  /** High-tier shadow casting; default true. The enclosing palace only receives, or its roof would shade the hall. */
  castShadow?: boolean
  /** High-tier PBR factors replacing the source's (the untextured palace ships metalness 0.28 on stone). */
  pbr?: { roughness: number; metalness: number }
}

export interface NpcPlacement {
  npc: 'lakshmana' | 'vishwamitra' | 'dasharatha' | 'vasishtha'
  pos: Vec3
  yaw: number
  /** Semantic clip key from clips.ts played while idle. */
  idle: 'IDLE' | 'ARMS_FOLDED' | 'SIT_IDLE' | 'SIT_TALK' | 'TALK'
}

export interface LevelScenery {
  statics: readonly Placement[]
  npcs: readonly NpcPlacement[]
  /** Kinematic bounds: the player is clamped inside this rectangle. */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
  look: LevelLook
  /** Enclosed levels: the follow camera never leaves this box, so no wall comes between it and the player. */
  cameraBounds?: { minX: number; maxX: number; minZ: number; maxZ: number }
}

/** Per-level art direction: tone mapping, lights, sky, fog, palette. Visual only — no gameplay reads it. */
export interface LevelLook {
  /** renderer.toneMappingExposure under ACES Filmic. */
  exposure: number
  /** Warm low-angle directional; `dir` points from the playable area toward the light. The one shadow caster on high. */
  key: { color: string; intensity: number; dir: Vec3 }
  /** Hemisphere fill: cool sky above, ground bounce below. */
  fill: { sky: string; ground: string; intensity: number }
  /** Back light separating characters from the background. High tier only. */
  rim: { color: string; intensity: number; dir: Vec3 }
  /** scene.environmentIntensity of the high tier's reflection map: metal is dark with nothing to reflect. */
  envIntensity: number
  /** Ground albedo; on high, two dapple colours are painted into a tiled canvas texture over it. */
  ground: { base: string; dapple: readonly [string, string] }
  /** Equirect sky gradient (render/procedural-textures.ts skyTexture). The horizon is also the fog colour. */
  sky: { zenith: string; horizon: string }
  /** Linear fog in metres. `far` stays under BALANCE.camera.FAR (120) so the ground's clipped edge is fully fogged. */
  fog: { near: number; far: number }
}

type XZ = readonly [number, number]

/** Ayodhya's hall, built from primitives and canvas textures (entities/CourtDressing.tsx). Floor at
 * y 0.1 (palace.glb raycast). Column shafts in the front row stand at x ±1.17, ±3.5, ±5.85 (z 10.75),
 * the back row at z ~2; the carpet fits the ~2 m aisle between the inner pair. */
export const COURT = {
  palette: {
    crimson: '#8e1a22',
    crimsonDeep: '#560d14',
    gold: '#d9a23a',
    marble: '#efe7da',
    vein: '#a8998a',
    inlay: '#2b1a14',
    bronze: '#8a5a2c',
    flame: '#ff7a1a',
    flameCore: '#ffd07a',
  },
  floorY: 0.1,
  floor: { minX: -7.4, maxX: 7.4, minZ: -1.7, maxZ: 14.9, tileM: 2.4 },
  carpet: { width: 1.5, fromZ: 1.4, toZ: 14.9, repeatM: 1.5 },
  /** Two marble steps (width, depth, rise) under the throne, centred at z. */
  dais: { z: 0.2, steps: [[4.2, 3.0, 0.16], [2.8, 2.0, 0.16]] as const },
  /** Crimson hanging on the back wall (z -1.8) behind the throne, gold-bordered: width, height, bottom y. */
  backdrop: { z: -1.72, width: 5.6, height: 5.2, bottomY: 0.5, border: 0.14 },
  throne: { z: 0.2, seatW: 1.1, seatD: 0.7, seatH: 0.46, backH: 1.7, discY: 2.55, discR: 0.8 },
  /** Braziers: bronze stand, gold bowl, emissive flame; a warm point light each on high only. */
  braziers: [[-1.95, 5.6], [1.95, 5.6], [-1.95, 9.2], [1.95, 9.2], [-2.7, 1.0], [2.7, 1.0]] as readonly XZ[],
  /** Lights the floor round each stand, not the hall: short range, and a flame whose emissive stays under
   * ACES' white point (6 blew the old cones out to white). */
  torch: { color: '#ff9a48', intensity: 1.8, distance: 3.8, decay: 2, flameEmissive: 1.8, flickerHz: 7, flickerAmount: 0.18, flame: { radius: 0.13, height: 0.42 } },
  /** Banners on column faces toward the entrance: x, z of the column, hung from y 2.2 to 5. */
  banners: [[-3.5, 2.0], [3.5, 2.0], [-5.85, 2.0], [5.85, 2.0], [-3.5, 10.75], [3.5, 10.75]] as readonly XZ[],
  /** Painted frieze over palace.glb's architrave: the apse-shaped beam above the back columns, whose bare
   * face (y 3.54–4.18) lit head-on by the key was the flat beige band across the top of every court frame.
   * Points are the raycast face (x, z) pushed ~4 cm toward the hall; `repeatM` is one lotus per tile. */
  frieze: {
    y: [3.56, 4.16],
    repeatM: 0.6,
    path: [[-9.55, 3.75], [-8.05, 2.97], [-6.5, 2.79], [-5, 2.78], [-3.5, 2.77], [-2, 2.74], [-0.5, 2.71], [1, 2.73], [2.5, 2.76], [4, 2.78], [5.5, 2.79], [7.05, 2.9], [8.55, 3.3], [9.7, 4.6]] as readonly XZ[],
  },
  /** Gold bands round the inner column shafts (radius, heights). */
  columnBands: { xs: [-3.5, -1.17, 1.17, 3.5], zs: [2.0, 10.75], radius: 0.2, ys: [1.1, 3.0] },
} as const

/** Level 5's sacred enclosure round the altar at the origin (render/yajna-dressing.ts, entities/YajnaDressing.tsx):
 * plastered ground with a chalk kolam, a post-and-cord boundary with a torana gate on the N/E/W sides (the
 * waves come in from there at 30 m; the south stays open for the camera), a yupa post, kalasha pots, and
 * the altar fire as the dusk's warm light. */
export const YAJNA = {
  palette: {
    plaster: '#9c7250',
    chalk: '#f4ead6',
    wood: '#5e3c22',
    cord: '#c23a1c',
    saffron: '#ff8c1a',
    brick: '#9c4c2e',
    mortar: '#6a3420',
    terracotta: '#a4532e',
    leaf: '#4f7a2a',
    ember: '#2a0a04',
    flame: '#ff4e0a',
    flameCore: '#ffc45a',
  },
  groundSize: 18,
  enclosure: { half: 9, postEvery: 3, postH: 1.5, postR: 0.07, cordY: 1.2, gateH: 3.4, gateHalf: 1.3 },
  /** Sacrificial post, off the player's line to the altar. */
  yupa: { x: 3.4, z: -3, h: 4.2 },
  /** Kalasha pots at the altar's corners. */
  pots: [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]] as readonly XZ[],
  /** Stepped brick altar (width, rise), bottom up; the ember bed sits on the last step. */
  altarSteps: [[2.9, 0.18], [2.35, 0.18], [1.8, 0.18]] as readonly (readonly [number, number])[],
  /** Flames on the ember bed: x, z, radius, height at full integrity. */
  flames: [[0, 0, 0.36, 1.1], [0.38, 0.2, 0.2, 0.62], [-0.34, 0.26, 0.22, 0.7], [0.2, -0.36, 0.2, 0.58], [-0.3, -0.28, 0.18, 0.5]] as readonly (readonly [number, number, number, number])[],
  /** Physical point light (candela, decay 2): ~1.5 lux on a rakshasa 3 m out, the dusk key is 2. */
  light: { color: '#ff8a3a', hit: '#ff2a10', intensity: 14, hitIntensity: 24, distance: 18, y: 1.3, flickerHz: 9, flickerAmount: 0.22 },
  flameEmissive: 1.45,
  /** High tier: sparks rising off the fire (count, rise speed m/s, fade-out height). */
  embers: { count: 90, rise: [0.7, 1.7] as const, top: 4.5, size: 0.07 },
} as const

/** High-tier post-processing. Bloom threshold is linear HDR luminance: only emissives above 1 glow.
 * Vignette darkness 1 mixes corners toward black; above 1 it goes negative. */
export const POST = {
  BLOOM_STRENGTH: 0.4,
  BLOOM_RADIUS: 0.45,
  BLOOM_THRESHOLD: 1.4,
  VIGNETTE_OFFSET: 0.95,
  VIGNETTE_DARKNESS: 1.0,
  /** Warm grade on display colours (three's ColorCorrectionShader: mul · (c + add)^pow): a touch of gold in the
   * highlights, cooler blue pulled down, and a slight pow for contrast in the mids. */
  GRADE_MUL: [1.04, 1.0, 0.93],
  GRADE_POW: [1.06, 1.06, 1.1],
} as const

/** Low tier has no reflection map; a neutral ambient of envIntensity × this stands in for its irradiance. */
export const LOW_AMBIENT_FROM_ENV = 3

/** High-tier shadow map for the key light. The frustum is fitted to each level's bounds. */
export const SHADOW = { MAP_SIZE: 2048, BIAS: -0.0004, NORMAL_BIAS: 0.04, RADIUS: 3, NEAR: 0.5 } as const

export const SCENERY: Readonly<Partial<Record<'l1' | 'l2' | 'l3' | 'l4' | 'l5', LevelScenery>>> = {
  l1: {
    statics: [
      // Sketchfab palace ships in centimetres and off-centre (x −475..329, z −212..319 before
      // scaling); at 0.04 the hall is ~32 × 21 m and this offset puts it around the court.
      { asset: 'palace', pos: [2.9, 0.1, 4.4], yaw: 0, scale: 0.04, ground: true, tint: '#e2cdae', castShadow: false, pbr: { roughness: 0.72, metalness: 0 } },
      // royalRoom removed (visual pass, 2026-09-11): at scale 1 it planted a 7 m sword on the
      // throne (nodes Object_7-9), a lamp sunk through the floor at x 3.5, and an oversized dais at
      // x -7. The throne and its dais are built from primitives instead: COURT below, CourtDressing.tsx.
    ],
    // Yaw 0 faces +Z (toward the entering player). The counsellors stand either side of the
    // throne and turn inward; Rama stops before the throne and speaks with each in turn.
    npcs: [
      // Seated on the COURT throne: y is the dais top, so the seat meets the clip's pelvis.
      { npc: 'dasharatha', pos: [0, 0.42, 0.55], yaw: 0, idle: 'SIT_TALK' },
      { npc: 'vishwamitra', pos: [2.4, 0, 3.6], yaw: -Math.PI / 4, idle: 'ARMS_FOLDED' },
      { npc: 'vasishtha', pos: [-2.4, 0, 3.6], yaw: Math.PI / 4, idle: 'IDLE' },
    ],
    bounds: { minX: -7, maxX: 7, minZ: -1, maxZ: 15 },
    // Measured by raycasting palace.glb at this placement: inner walls at x -14.7 / 13.6, z -1.8 / 14.96.
    cameraBounds: { minX: -14.2, maxX: 13.1, minZ: -1.3, maxZ: 14.6 },
    look: {
      exposure: 0.72,
      // Late sun through the entrance behind the player: long shadows reach toward the throne.
      key: { color: '#ffc792', intensity: 2.3, dir: [3, 5, 10] },
      fill: { sky: '#7c89a8', ground: '#5c2a1c', intensity: 0.75 },
      rim: { color: '#9cc2ff', intensity: 1.8, dir: [-4, 6, -10] },
      // An interior: nothing bright to reflect, just enough for gold to read as metal.
      envIntensity: 0.18,
      ground: { base: '#5a4636', dapple: ['#6a5442', '#4a382a'] },
      sky: { zenith: '#2a1a12', horizon: '#7a5a40' },
      fog: { near: 6, far: 70 },
    },
  },
  l2: {
    // Trees and rocks scatter the banks either side of the walk from the camp to the range;
    // 6 trees and 3 rocks each stay under the ~8-instance InstancedMesh threshold in AGENTS.md.
    statics: [
      { asset: 'tree', pos: [-5, 0, -6], yaw: 0.3, scale: 1, ground: false },
      { asset: 'tree', pos: [-6, 0, -20], yaw: 1.1, scale: 1.1, ground: false },
      { asset: 'tree', pos: [-4, 0, -34], yaw: 2.0, scale: 0.95, ground: false },
      { asset: 'tree', pos: [20, 0, -8], yaw: 0.6, scale: 1.05, ground: false },
      { asset: 'tree', pos: [21, 0, -24], yaw: 2.6, scale: 1, ground: false },
      { asset: 'tree', pos: [19, 0, -38], yaw: 1.6, scale: 0.9, ground: false },
      { asset: 'rock', pos: [3, 0, -14], yaw: 0.4, scale: 1.6, ground: false },
      { asset: 'rock', pos: [15, 0, -36], yaw: 1.8, scale: 1.8, ground: false },
      { asset: 'rock', pos: [-2, 0, -40], yaw: 0.9, scale: 1.4, ground: false },
    ],
    // Vishwamitra starts by the riverbank; Level 2's scene walks him to the range once the
    // mantras conversation ends (see L2Forest.tsx) — a position change, not a re-placement.
    npcs: [
      { npc: 'lakshmana', pos: [-1.5, 0, -18], yaw: Math.PI / 6, idle: 'IDLE' },
      { npc: 'vishwamitra', pos: [1.5, 0, -18], yaw: -Math.PI / 6, idle: 'ARMS_FOLDED' },
    ],
    bounds: { minX: -12, maxX: 22, minZ: -52, maxZ: 6 },
    look: {
      exposure: 0.85,
      key: { color: '#ffd596', intensity: 2.6, dir: [8, 6, 6] },
      fill: { sky: '#a6cdf5', ground: '#4d5a2c', intensity: 0.7 },
      rim: { color: '#fff0cc', intensity: 1.2, dir: [-6, 5, -8] },
      envIntensity: 0.35,
      // Dappled green under a morning sun.
      ground: { base: '#5f7d35', dapple: ['#7f9a44', '#48632a'] },
      sky: { zenith: '#2e6fc0', horizon: '#cfe2ee' },
      fog: { near: 30, far: 115 },
    },
  },
  l3: {
    // Dense, dark forest — "no birds sang" (l3.intro). Denser tree cover than L2's riverbank,
    // thinning near the clearing at z -10 so Tataka's fight has open ground.
    statics: [
      { asset: 'tree', pos: [-4, 0, 2], yaw: 0.2, scale: 1.05, ground: false },
      { asset: 'tree', pos: [5, 0, 0], yaw: 1.4, scale: 0.95, ground: false },
      { asset: 'tree', pos: [-7, 0, -8], yaw: 2.1, scale: 1.1, ground: false },
      { asset: 'tree', pos: [8, 0, -10], yaw: 0.7, scale: 1, ground: false },
      { asset: 'tree', pos: [-8, 0, -20], yaw: 1.9, scale: 1.0, ground: false },
      { asset: 'tree', pos: [8, 0, -22], yaw: 0.5, scale: 1.05, ground: false },
      { asset: 'rock', pos: [3, 0, -16], yaw: 0.3, scale: 1.5, ground: false },
      { asset: 'rock', pos: [-3, 0, -26], yaw: 1.6, scale: 1.7, ground: false },
    ],
    npcs: [
      { npc: 'lakshmana', pos: [-1.5, 0, 5], yaw: Math.PI / 6, idle: 'IDLE' },
      { npc: 'vishwamitra', pos: [1.5, 0, 5], yaw: -Math.PI / 6, idle: 'ARMS_FOLDED' },
    ],
    bounds: { minX: -12, maxX: 12, minZ: -32, maxZ: 22 },
    look: {
      exposure: 1.15,
      // "No birds sang": a cold, weak key and a colder rim; nothing warm in the frame.
      key: { color: '#aebfd0', intensity: 2.0, dir: [-6, 6, -4] },
      fill: { sky: '#6a7c8c', ground: '#1d2418', intensity: 1.0 },
      rim: { color: '#7c9cc6', intensity: 1.5, dir: [5, 4, 8] },
      envIntensity: 0.3,
      // Desaturated and cold, but readable: grey-green, not the old near-black #243018.
      ground: { base: '#46523f', dapple: ['#58624f', '#343f30'] },
      sky: { zenith: '#243038', horizon: '#56625c' },
      fog: { near: 8, far: 60 },
    },
  },
  l4: {
    // The trial range: open field, targets from the firing line out to -48. Trees/rocks are
    // scattered off to the sides, well clear of every target's line of fire.
    statics: [
      { asset: 'tree', pos: [-13, 0, -10], yaw: 0.4, scale: 1, ground: false },
      { asset: 'tree', pos: [13, 0, -14], yaw: 1.2, scale: 1.05, ground: false },
      { asset: 'tree', pos: [-12, 0, -40], yaw: 2.0, scale: 0.95, ground: false },
      { asset: 'rock', pos: [7, 0, -6], yaw: 0.6, scale: 1.4, ground: false },
      // Cover for the 'occluded' target (levels.ts L4 target[3].coverPos) — sits between the
      // firing line and that target so it's genuinely half-hidden from the approach.
      { asset: 'rock', pos: [-9, 0, -25], yaw: 0.2, scale: 2.2, ground: false },
    ],
    npcs: [
      { npc: 'lakshmana', pos: [-1.5, 0, 1.5], yaw: -Math.PI / 6, idle: 'IDLE' },
      { npc: 'vishwamitra', pos: [1.5, 0, 1.5], yaw: Math.PI / 6, idle: 'ARMS_FOLDED' },
    ],
    bounds: { minX: -14, maxX: 14, minZ: -54, maxZ: 6 },
    look: {
      exposure: 0.8,
      key: { color: '#fff3dd', intensity: 3.0, dir: [6, 12, 5] },
      fill: { sky: '#aed2ff', ground: '#56663a', intensity: 0.8 },
      rim: { color: '#ffffff', intensity: 0.9, dir: [-5, 6, -6] },
      envIntensity: 0.4,
      ground: { base: '#6c913d', dapple: ['#88a84c', '#557631'] },
      sky: { zenith: '#2f74c4', horizon: '#d6e4ec' },
      fog: { near: 35, far: 115 },
    },
  },
  l5: {
    // Rockfall-strewn clearing around the altar (waypoints.altar, levels.ts); rakshasa waves
    // approach from the north/east/west waypoints, kept clear of rocks so the paths stay open.
    statics: [
      { asset: 'rock', pos: [2, 0, -3], yaw: 0.4, scale: 1.3, ground: false },
      { asset: 'rock', pos: [-3, 0, 2], yaw: 1.8, scale: 1.1, ground: false },
      { asset: 'tree', pos: [-18, 0, -14], yaw: 0.5, scale: 1, ground: false },
      { asset: 'tree', pos: [18, 0, -14], yaw: 2.4, scale: 1.05, ground: false },
      { asset: 'tree', pos: [-18, 0, 12], yaw: 1.3, scale: 0.95, ground: false },
      { asset: 'tree', pos: [18, 0, 12], yaw: 2.0, scale: 1, ground: false },
    ],
    npcs: [
      { npc: 'lakshmana', pos: [-1.5, 0, -1.5], yaw: Math.PI / 4, idle: 'IDLE' },
      { npc: 'vishwamitra', pos: [1.5, 0, -1.5], yaw: -Math.PI / 4, idle: 'ARMS_FOLDED' },
    ],
    bounds: { minX: -32, maxX: 32, minZ: -32, maxZ: 10 },
    look: {
      exposure: 0.95,
      // Dusk: the sun almost on the horizon, deep blue sky fill, the altar fire does the rest.
      key: { color: '#ff9658', intensity: 2.0, dir: [-10, 4.5, 6] },
      fill: { sky: '#3a4c80', ground: '#3a2012', intensity: 0.85 },
      rim: { color: '#6d8cff', intensity: 1.5, dir: [8, 5, -8] },
      envIntensity: 0.3,
      // Dusty earth that still reads at dusk (the old #4a3624 went black).
      ground: { base: '#6e4d36', dapple: ['#80603f', '#553a28'] },
      sky: { zenith: '#101a44', horizon: '#56507c' },
      fog: { near: 16, far: 85 },
    },
  },
}
