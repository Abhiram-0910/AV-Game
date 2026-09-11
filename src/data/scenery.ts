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
  background: string
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
}

/** High-tier shadow map for the key light. The frustum is fitted to each level's bounds. */
export const SHADOW = { MAP_SIZE: 2048, BIAS: -0.0004, NORMAL_BIAS: 0.04, RADIUS: 3, NEAR: 0.5 } as const

export const SCENERY: Readonly<Partial<Record<'l1' | 'l2' | 'l3' | 'l4' | 'l5', LevelScenery>>> = {
  l1: {
    statics: [
      // Sketchfab palace ships in centimetres and off-centre (x −475..329, z −212..319 before
      // scaling); at 0.04 the hall is ~32 × 21 m and this offset puts it around the court.
      { asset: 'palace', pos: [2.9, 0.1, 4.4], yaw: 0, scale: 0.04, ground: true, tint: '#d8c2a0', castShadow: false },
      { asset: 'royalRoom', pos: [0, 0, 0], yaw: 0, scale: 1, ground: false },
    ],
    // Yaw 0 faces +Z (toward the entering player). The counsellors stand either side of the
    // throne and turn inward; Rama stops before the throne and speaks with each in turn.
    npcs: [
      { npc: 'dasharatha', pos: [0, 0, 0.6], yaw: 0, idle: 'SIT_TALK' },
      { npc: 'vishwamitra', pos: [2.4, 0, 3.6], yaw: -Math.PI / 4, idle: 'ARMS_FOLDED' },
      { npc: 'vasishtha', pos: [-2.4, 0, 3.6], yaw: Math.PI / 4, idle: 'IDLE' },
    ],
    bounds: { minX: -7, maxX: 7, minZ: -1, maxZ: 15 },
    // Measured by raycasting palace.glb at this placement: inner walls at x -14.7 / 13.6, z -1.8 / 14.96.
    cameraBounds: { minX: -14.2, maxX: 13.1, minZ: -1.3, maxZ: 14.6 },
    background: '#1a120b',
    look: {
      exposure: 0.8,
      // Late sun through the entrance behind the player: long shadows reach toward the throne.
      key: { color: '#ffc792', intensity: 2.3, dir: [3, 5, 10] },
      fill: { sky: '#7c89a8', ground: '#5c2a1c', intensity: 0.75 },
      rim: { color: '#9cc2ff', intensity: 1.8, dir: [-4, 6, -10] },
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
    background: '#7fb3d9',
    look: {
      exposure: 0.85,
      key: { color: '#ffd596', intensity: 2.6, dir: [8, 6, 6] },
      fill: { sky: '#a6cdf5', ground: '#4d5a2c', intensity: 0.7 },
      rim: { color: '#fff0cc', intensity: 1.2, dir: [-6, 5, -8] },
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
    background: '#141a16',
    look: {
      exposure: 1.15,
      // "No birds sang": a cold, weak key and a colder rim; nothing warm in the frame.
      key: { color: '#aebfd0', intensity: 2.0, dir: [-6, 6, -4] },
      fill: { sky: '#6a7c8c', ground: '#1d2418', intensity: 1.0 },
      rim: { color: '#7c9cc6', intensity: 1.5, dir: [5, 4, 8] },
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
    background: '#7fb3d9',
    look: {
      exposure: 0.8,
      key: { color: '#fff3dd', intensity: 3.0, dir: [6, 12, 5] },
      fill: { sky: '#aed2ff', ground: '#56663a', intensity: 0.8 },
      rim: { color: '#ffffff', intensity: 0.9, dir: [-5, 6, -6] },
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
    background: '#2a1a12',
    look: {
      exposure: 0.95,
      // Dusk: the sun almost on the horizon, deep blue sky fill, the altar fire does the rest.
      key: { color: '#ff8646', intensity: 1.8, dir: [-10, 3, 6] },
      fill: { sky: '#3a4c80', ground: '#3a2012', intensity: 0.85 },
      rim: { color: '#6d8cff', intensity: 1.5, dir: [8, 5, -8] },
    },
  },
}
