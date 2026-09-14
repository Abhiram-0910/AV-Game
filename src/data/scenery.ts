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
  /** tree.glb without its leaves: the bark primitive is trunk and branches, a dead tree. */
  bare?: boolean
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

/** A keep-clear capsule on the ground: segment (x0, z0)–(x1, z1) grown by radius r. */
type Capsule = readonly [x0: number, z0: number, x1: number, z1: number, r: number]
type Span = readonly [number, number]

/** Levels 2–4 outdoors, high tier only (render/wilds-dressing.ts, entities/WildsDressing.tsx). tree.glb and
 * rock.glb scatter as InstancedMesh, one draw call per mesh however many trees. A leafy forest tree is
 * tree.glb's leaf cards on a flared, 10-sided bark-textured trunk (~2.1k tris; the full model's branches are 4.3k more); a
 * bare tree is its bark primitive alone. Shrubs are crossed cards of the same leaf texture, so undergrowth
 * matches the canopy. Seeded rejection sampling inside `area`; nothing may sit in a `clear` capsule,
 * which keep every walk, the follow camera 5.5 m behind it, and every line of fire open (dressing never
 * collides). Colours are per-instance multipliers. */
export interface Wilds {
  seed: number
  area: { minX: number; maxX: number; minZ: number; maxZ: number }
  clear: readonly Capsule[]
  /** `tints` multiply the leaves, or a bare tree's bark; `lean` is the most a trunk tilts off plumb (radians). */
  trees: { count: number; scale: Span; bare: boolean; minGap: number; tints: readonly string[]; lean: number }
  /** Trees within the play bounds grown by this many metres cast shadows; farther ones only receive. */
  shadowReach: number
  rocks: { count: number; scale: Span; colors: readonly string[] }
  shrubs: { count: number; scale: Span; colors: readonly string[] }
  grass: { count: number; height: Span; colors: readonly string[] }
  /** The Sarayu: a scrolling water plane west of the walk, a sand bank on its near edge lined with reeds. */
  water?: { minX: number; maxX: number; minZ: number; maxZ: number; color: string; bank: string; bankWidth: number; reeds: number; flow: number }
  /** Horizontal mist sheets at these heights over `size` metres round the play area, drifting. */
  mist?: { color: string; opacity: number; heights: readonly number[]; size: number; drift: number }
  /** When Tataka falls the curse lifts over `seconds`: mist burns off, fog and sky warm, a gold sun comes up. */
  curseLift?: { seconds: number; fog: string; sky: { zenith: string; horizon: string }; exposure: number; sun: { color: string; intensity: number; dir: Vec3 } }
}

export const WILDS: Readonly<Partial<Record<'l2' | 'l3' | 'l4', Wilds>>> = {
  l2: {
    seed: 2,
    // Spawn at the origin faces +Z into the wood the brothers came through; the walk runs −Z to the range.
    area: { minX: -70, maxX: 44, minZ: -88, maxZ: 34 },
    clear: [
      [0, 4, 0, -18, 5], // spawn → riverbank
      [0, -18, 0, -18, 7.5], // the mantras, and the camera swinging round as Rama turns
      [0, -18, 10.5, -30, 5.5], // riverbank → range
      [10.5, -30, 10.5, -30, 7.5],
      [10.5, -30, 12, -46, 7.5], // line of fire to the three targets (x 8–16, z −42…−44)
    ],
    trees: { count: 200, scale: [0.85, 1.5], bare: false, minGap: 2.6, tints: ['#ffffff', '#dfeec0', '#c3d69a', '#e9f2d0'], lean: 0.05 },
    shadowReach: 40,
    rocks: { count: 80, scale: [1.2, 3.6], colors: ['#ffffff', '#d8d4c4', '#b9b5a4'] },
    shrubs: { count: 520, scale: [0.6, 1.4], colors: ['#ffffff', '#d0e0a8', '#b8cc88', '#e0ecc0'] },
    grass: { count: 3600, height: [0.35, 0.75], colors: ['#b4cc78', '#a0bc66', '#c4d888', '#94b25e'] },
    water: { minX: -46, maxX: -14.5, minZ: -140, maxZ: 70, color: '#6aa6a2', bank: '#a89468', bankWidth: 3, reeds: 160, flow: 0.035 },
  },
  l3: {
    seed: 3,
    area: { minX: -42, maxX: 42, minZ: -64, maxZ: 54 },
    clear: [
      [0, 27, 0, -26, 6], // spawn (0, 20) facing −Z down to the clearing
      [0, -16, 0, -16, 11], // Tataka's clearing: open ground to fight in
    ],
    trees: { count: 70, scale: [0.8, 1.35], bare: true, minGap: 3.2, tints: ['#a4a4a4', '#8a8a8a', '#bab6ae'], lean: 0.14 },
    shadowReach: 40,
    rocks: { count: 90, scale: [1.2, 4], colors: ['#9a9a94', '#7c7c78', '#b0aea6'] },
    shrubs: { count: 320, scale: [0.5, 1.2], colors: ['#8a7a5a', '#6e6250', '#9a8a68'] },
    grass: { count: 2000, height: [0.3, 0.7], colors: ['#77705a', '#646050', '#8a8266', '#5a5a4a'] },
    // 0.45 over [0.12, 0.35, 0.65] veiled Rama to the hips and cut bands into every trunk (2026-09-14): kept below the knee.
    mist: { color: '#9aa6a0', opacity: 0.35, heights: [0.06, 0.2, 0.38], size: 110, drift: 0.012 },
    curseLift: { seconds: 5, fog: '#b3a582', sky: { zenith: '#6f93b8', horizon: '#cdbb92' }, exposure: 1.05, sun: { color: '#ffc67a', intensity: 2.2, dir: [6, 8, 4] } },
  },
  l4: {
    seed: 4,
    area: { minX: -48, maxX: 48, minZ: -90, maxZ: 40 },
    clear: [
      [0, 8, 0, -56, 17.5], // the whole range (bounds x ±14, z −54…6): an ashram clearing
      [6.5, 11, 6.5, 11, 4.2], // the hut
      [-3.5, 8.5, -3.5, 8.5, 2.5], // the fire pit
    ],
    trees: { count: 130, scale: [0.9, 1.55], bare: false, minGap: 3, tints: ['#ffffff', '#e4f0c4', '#cbdca0'], lean: 0.04 },
    shadowReach: 40,
    rocks: { count: 45, scale: [1.2, 3], colors: ['#ffffff', '#dedad0'] },
    shrubs: { count: 260, scale: [0.6, 1.3], colors: ['#ffffff', '#d8e6b0', '#c0d496'] },
    grass: { count: 2200, height: [0.3, 0.65], colors: ['#86a84c', '#739a44', '#98b45a'] },
  },
}

/** Level 4's built pieces (render/range-dressing.ts): Vishwamitra's hermitage past the spawn edge (bounds maxZ
 * 6, so nobody walks into it), a whitewashed firing line, and a straw-bale backstop behind every target so
 * none of them stands alone on the grass. Target positions come from levels.ts at build time. */
export const RANGE = {
  palette: {
    straw: '#c9a24e',
    strawDark: '#8a6a2c',
    strawLight: '#e6cc86',
    wood: '#6b4a2c',
    mud: '#a57a52',
    mudDark: '#8a6040',
    mudLight: '#b88c60',
    thatch: '#a8844a',
    doorway: '#1d130c',
    chalk: '#ece4d0',
    stone: '#8a857a',
    earth: '#85674a',
    saffron: '#ff8c1a',
    ember: '#2a0a04',
    flame: '#ff6a1a',
    flameCore: '#ffd07a',
  },
  /** Whitewashed stones across z from −halfWidth to +halfWidth, a saffron-flagged post at each end, on a
   * trodden earth strip `depth` deep. */
  firingLine: { z: -4.9, halfWidth: 5, stoneEvery: 0.6, depth: 2.4 },
  /** Bale behind each target, sized at target scale 1 (width, height, depth) and set `behind` metres farther
   * down range; a lateral target's bale spans its whole slide. */
  backstop: { w: 1.5, h: 0.95, d: 0.6, behind: 0.75 },
  /** Round mud-walled kuti with a conical thatch roof and a doorway facing the range. */
  hut: { x: 6.5, z: 11, r: 2.3, wallH: 2.1, roofH: 2.7, overhang: 0.6 },
  /** Stone-ringed fire pit: ring radius, stone count, flames (x, z, radius, height), and a flickering light. */
  firePit: {
    x: -3.5,
    z: 8.5,
    r: 0.62,
    stones: 11,
    flames: [[0, 0, 0.17, 0.62], [0.13, 0.08, 0.1, 0.38], [-0.12, 0.07, 0.11, 0.34], [0.02, -0.13, 0.09, 0.3]] as readonly (readonly [number, number, number, number])[],
    flameEmissive: 1.6,
    light: { color: '#ff9a48', intensity: 9, distance: 10, y: 0.9, flickerHz: 8, flickerAmount: 0.2 },
  },
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
export const SHADOW = { MAP_SIZE: 4096, BIAS: -0.0004, NORMAL_BIAS: 0.04, RADIUS: 3, NEAR: 0.5 } as const

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
    // Bare on both tiers (2026-09-13): leaves in Tataka's cursed wood contradicted the level, and dropping them
    // only removes triangles from low.
    statics: [
      { asset: 'tree', pos: [-4, 0, 2], yaw: 0.2, scale: 1.05, ground: false, bare: true },
      { asset: 'tree', pos: [5, 0, 0], yaw: 1.4, scale: 0.95, ground: false, bare: true },
      { asset: 'tree', pos: [-7, 0, -8], yaw: 2.1, scale: 1.1, ground: false, bare: true },
      { asset: 'tree', pos: [8, 0, -10], yaw: 0.7, scale: 1, ground: false, bare: true },
      { asset: 'tree', pos: [-8, 0, -20], yaw: 1.9, scale: 1.0, ground: false, bare: true },
      { asset: 'tree', pos: [8, 0, -22], yaw: 0.5, scale: 1.05, ground: false, bare: true },
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
