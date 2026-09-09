// Built asset ids and per-level static layout. Zero imports. Positions are metres, +Y up,
// yaw in radians. Asset ids must exist in public/assets/high/manifest.json, which
// tools/build-assets.mjs emits (tests/unit/content.test.ts cross-checks when it is present).

export type AssetId =
  | 'male'
  | 'female'
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

/** File under public/assets/<tier>/ for each id. */
export const ASSET_FILES: Readonly<Record<AssetId, string>> = {
  male: 'characters/male.glb',
  female: 'characters/female.glb',
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
  light: { sky: string; ground: string; sun: Vec3; sunIntensity: number; ambientIntensity: number }
  background: string
}

export const SCENERY: Readonly<Partial<Record<'l1' | 'l2' | 'l3' | 'l4' | 'l5', LevelScenery>>> = {
  l1: {
    statics: [
      // Sketchfab palace ships in centimetres and off-centre (x −475..329, z −212..319 before
      // scaling); at 0.04 the hall is ~32 × 21 m and this offset puts it around the court.
      { asset: 'palace', pos: [2.9, 0.1, 4.4], yaw: 0, scale: 0.04, ground: true, tint: '#d8c2a0' },
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
    light: { sky: '#ffe9c4', ground: '#3b2a1a', sun: [4, 10, 6], sunIntensity: 2.2, ambientIntensity: 0.9 },
    background: '#1a120b',
  },
}
