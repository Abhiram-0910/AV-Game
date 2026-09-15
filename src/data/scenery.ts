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
  /** 'palace': cut the collapsed columns and chairs and repaint the shell by zone (render/palace-surface.ts). */
  surface?: 'palace'
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
  /** High tier: ground-truth ambient occlusion (render/PostProcessing.tsx). Interiors only: its normal pass ignores
   * alphaTest, so outdoor leaf cards would occlude as solid quads. */
  ao?: boolean
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
    // Rajput court interiors: coral plaster fields, terracotta dados, white stencil, sandstone, lapis.
    coral: '#d27a5e',
    terracotta: '#a4492f',
    stencil: '#f4e9d8',
    sandstone: '#d8c4ae',
    lapis: '#2a4a86',
    checkRed: '#a24a2c',
    joint: '#b0664c',
  },
  /** palace.glb's 24 free-standing columns (x, z), measured from the glb at its placement (SESSION-LOG 2026-09-14,
   * docs/screenshots/palace-measure-*.png): two rows of ten and two at each side. The model is asymmetric: the side
   * columns stand at x −10.9 and 10.35, confirmed on the shaft, base and capital bands separately. */
  columns: [
    [-10.5, 2.3], [-8.1, 2.3], [-5.8, 2.3], [-3.45, 2.3], [-1.1, 2.3], [1.2, 2.3], [3.55, 2.3], [5.9, 2.3], [8.2, 2.3], [10.6, 2.3],
    [-10.5, 10.9], [-8.1, 10.9], [-5.8, 10.9], [-3.45, 10.9], [-1.1, 10.9], [1.2, 10.9], [3.55, 10.9], [5.9, 10.9], [8.2, 10.9], [10.6, 10.9],
    [-10.9, 4.8], [-10.9, 8.2], [10.35, 5.1], [10.35, 8.4],
  ] as readonly XZ[],
  /** Cut from the shell round each column (the collapsed lotus base, shaft and capital; the beam at 3.54 stays), and
   * the two rows of collapsed chairs. A triangle goes only when all three vertices are inside one box, which spares
   * the right-side platform's faces and the beam soffit; floor triangles always stay. */
  columnCut: { halfX: 0.45, halfZ: 0.5, y: [0.08, 3.56] },
  chairCuts: [
    { min: [-7.75, 0.08, 3.0], max: [3.5, 0.92, 4.2] },
    { min: [-7.75, 0.08, 9.3], max: [3.5, 0.92, 10.5] },
  ],
  /** The right platform's ornament: three rippled rug discs, two crumpled chairs and a centre spire (up to y 1.73), measured
   * 2026-09-14 (docs/screenshots/palace-measure-platform.png). The boxes start 1.5 cm above the deck top (y 0.42, one
   * whole rectangle) so the deck, its sides and the four steps (y 0.15–0.35) stay, and the ground probe keeps its deck. */
  platformCuts: [
    { min: [5.95, 0.435, 2.95], max: [10.05, 1.5, 5.45] },
    { min: [5.95, 0.435, 5.45], max: [10.05, 1.8, 7.95] },
    { min: [5.95, 0.435, 7.95], max: [10.05, 1.5, 10.45] },
    // The discs' rims (64 triangles, y 0.42–0.51) read as torn outlines after the boxes above. The deck under each disc
    // is its own fan of flat y 0.42 triangles in the same footprint, so these boxes spare flat faces below 0.425
    // (docs/screenshots/palace-measure-platform-rims.png): all 64 rims go, no deck, step or other triangle.
    { min: [5.96, 0.415, 3.02], max: [8.21, 0.48, 5.16], keepFlatBelow: 0.425 },
    { min: [7.64, 0.415, 5.3], max: [9.86, 0.53, 8.28], keepFlatBelow: 0.425 },
    { min: [5.96, 0.415, 8.23], max: [8.14, 0.48, 10.47], keepFlatBelow: 0.425 },
  ],
  /** Shell repaint: one wall tile is wallTileM wide and floor-to-soffit tall; coffers and stone tile at tileM. The
   * gilded box is the ceiling over the throne bay, behind the back row. */
  surface: {
    floorGuardY: 0.12,
    wallFloorY: 0.1,
    wallTileM: 2.4,
    wallTileH: 3.44,
    tileM: 2.35,
    gilded: { min: [-3.5, 3.0, -2.2], max: [3.6, 4.6, 2.3] },
  },
  floorY: 0.1,
  /** The whole interior (inner walls at x −14.7 / 13.6, z −1.8 / 14.96): white marble in 1.2 m tiles. */
  floor: { minX: -14.6, maxX: 13.5, minZ: -1.75, maxZ: 14.96, tileM: 2.4 },
  /** Checkerboard marble in the central bay between the column rows (z 2.3 / 10.9), 0.6 m squares, framed by a
   * gold rule, a crimson band and a gold rule (`border`: widths from the field outward). */
  checker: { minX: -4.8, maxX: 4.8, minZ: 3.0, maxZ: 10.2, squareM: 0.6, border: [0.04, 0.2, 0.04] },
  carpet: { width: 1.5, fromZ: 1.4, toZ: 14.9, repeatM: 1.5 },
  /** Two marble steps (width, depth, rise) under the throne, centred at z. */
  dais: { z: 0.2, steps: [[4.2, 3.0, 0.16], [2.8, 2.0, 0.16]] as const },
  /** Crimson hanging on the back wall (z -1.8) behind the throne, gold-bordered: width, height, bottom y. */
  backdrop: { z: -1.72, width: 5.6, height: 5.2, bottomY: 0.5, border: 0.14 },
  throne: { z: 0.2, seatW: 1.1, seatD: 0.7, seatH: 0.46, backH: 1.7, discY: 2.55, discR: 0.8 },
  /** Braziers: bronze stand, gold bowl, emissive flame; a warm point light each on high only. */
  braziers: [[-1.95, 5.6], [1.95, 5.6], [-1.95, 9.2], [1.95, 9.2], [-2.7, 1.0], [2.7, 1.0]] as readonly XZ[],
  /** High tier: brass diyas hung from the apex of these back-row arches (indices into arches.spans; the central arch
   * framing the throne stays clear). Chain from hangY to the bowl at bowlY; wick flames [radius, height]. */
  lamps: { spans: [0, 1, 2, 3, 5, 6, 7, 8], hangY: 3.34, bowlY: 2.8, wicks: 5, flame: [0.028, 0.09] },
  /** High tier: coloured-glass multifoil windows on the back wall (z −1.72, as the backdrop), centred on the arch
   * openings between columns 5.9 and 8.2 so the throne view sees them through the back row; palace.glb has no upper
   * openings that frame (its back wall has two doorways, one behind a banner, and slots below eye height). Sill,
   * springing, half-width and rise in metres. An additive pool of their colours on the floor was tried and deleted:
   * at 0.35 opacity it did not show on lit marble even from beside the window.
   * Pane layout (render/court-ornaments.ts): a `band` of border panes, a half `rosette` on the transom, petals split by
   * a `ring`, and a lozenge lattice (width, height) below the springing. An 8 × 8 RGB grid read as pixel art. */
  glass: { xs: [-7.05, 7.05], z: -1.71, sill: 1.5, spring: 2.35, half: 0.42, rise: 0.48, lobes: 7, emissive: 1.5, band: 0.06, rosette: 0.09, ring: 0.24, lozenge: [0.16, 0.24] },
  /** High tier: marigold torans swagged across the entrance-facing side of the back row's arches (indices into
   * arches.spans), springing to springing, drooping `droop` m, a strand of `strand` flowers at each end. The front row
   * had them too and was deleted: at 2 m they hung across the spawn camera's view and through Rama's head. */
  torans: { spans: [0, 1, 2, 3, 4, 5, 6, 7, 8], radius: 0.04, droop: 0.32, strand: 6, colours: ['#f28a14', '#f7b21c', '#e8621a', '#f7c52e'] },
  /** Lights the floor round each stand, not the hall: short range, and a flame whose emissive stays under
   * ACES' white point (6 blew the old cones out to white). */
  torch: { color: '#ff9a48', intensity: 1.8, distance: 3.8, decay: 2, flameEmissive: 1.8, flickerHz: 7, flickerAmount: 0.18, flame: { radius: 0.13, height: 0.42 } },
  /** Banners on column faces toward the entrance: x, z of the column, hung from y 2.2 to 5. */
  banners: [[-3.45, 2.3], [3.55, 2.3], [-5.8, 2.3], [5.9, 2.3], [-3.45, 10.9], [3.55, 10.9]] as readonly XZ[],
  /** Painted frieze over palace.glb's architrave: the apse-shaped beam above the back columns, whose bare
   * face (y 3.54–4.18) lit head-on by the key was the flat beige band across the top of every court frame.
   * Points are the raycast face (x, z) pushed ~4 cm toward the hall; `repeatM` is one lotus per tile. */
  frieze: {
    y: [3.56, 4.16],
    repeatM: 0.6,
    path: [[-9.55, 3.75], [-8.05, 2.97], [-6.5, 2.79], [-5, 2.78], [-3.5, 2.77], [-2, 2.74], [-0.5, 2.71], [1, 2.73], [2.5, 2.76], [4, 2.78], [5.5, 2.79], [7.05, 2.9], [8.55, 3.3], [9.7, 4.6]] as readonly XZ[],
  },
  /** Procedural sandstone column (render/court-architecture.ts), heights absolute (floor at 0.1): plinth [width,
   * height]; base and capital lathe profiles [radius, y]; shaft [bottom radius, top radius, y0, y1]; band heights;
   * abacus [width, height, bottom y]; scroll brackets under it [from, reach, drop]. The capital tops out at the arch
   * springing, 2.3 m: palace.glb's own capitals at 3.1 left only 0.44 m for an arch under the 3.54 soffit. */
  column: {
    plinth: [0.6, 0.3],
    base: [[0.001, 0.4], [0.26, 0.4], [0.26, 0.46], [0.21, 0.52], [0.23, 0.58], [0.17, 0.66], [0.17, 0.68]],
    shaft: [0.17, 0.145, 0.68, 1.98],
    bands: [0.78, 1.36],
    capital: [[0.145, 1.98], [0.2, 2.02], [0.235, 2.09], [0.2, 2.15], [0.27, 2.2], [0.27, 2.24], [0.001, 2.24]],
    abacus: [0.52, 0.07, 2.24],
    bracket: [0.14, 0.44, 0.3],
    segments: { high: 16, low: 8 },
  },
  /** Multifoil arch screens between neighbouring columns (indices into `columns`): wall from the springing into the
   * soffit (3.54, 2 cm overlap), the arch starting `inset` from each column centre. `bead`: cream edging width. */
  arches: {
    spring: 2.3,
    top: 3.56,
    rise: 0.95,
    lobes: 9,
    depth: 0.32,
    inset: 0.24,
    bead: 0.05,
    spans: [
      [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9],
      [10, 11], [11, 12], [12, 13], [13, 14], [14, 15], [15, 16], [16, 17], [17, 18], [18, 19],
      [0, 20], [20, 21], [21, 10], [9, 22], [22, 23], [23, 19],
    ],
  },
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

/** Levels 2–4 outdoors on both tiers (render/wilds-dressing.ts, entities/WildsDressing.tsx). tree.glb and
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
  /** A ring of hills that follows the camera beyond the forest (render/hill-ring.ts): foot radius and ridge heights in
   * metres, base colour, and how far it is mixed toward the sky's horizon colour at the foot and at the crest. */
  hills?: { radius: number; height: Span; color: string; haze: Span; segments: number }
  curseLift?: { seconds: number; fog: string; sky: { zenith: string; horizon: string }; exposure: number; sun: { color: string; intensity: number; dir: Vec3 } }
  /** The low tier (school lab PCs, Intel UHD): these counts scattered inside the play bounds grown by `reach` metres, not
   * the whole area; no shadows, toon materials, no fire light or curse-lift sun, mist only where `mist`. Leafy tree 2,040
   * tris, bare tree 4,345, rock 632, shrub 8, grass tuft 6, against 120k / 80 calls. Measured: SESSION-LOG 2026-09-14. */
  low: { reach: number; trees: number; rocks: number; shrubs: number; grass: number; reeds: number; mist: boolean }
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
    hills: { radius: 84, height: [9, 18], color: '#4f6e4c', haze: [0.45, 0.62], segments: 72 },
    low: { reach: 25, trees: 18, rocks: 10, shrubs: 160, grass: 1000, reeds: 60, mist: false },
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
    low: { reach: 20, trees: 3, rocks: 12, shrubs: 120, grass: 700, reeds: 0, mist: true },
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
    hills: { radius: 84, height: [9, 18], color: '#4f6e4c', haze: [0.45, 0.62], segments: 72 },
    low: { reach: 25, trees: 18, rocks: 10, shrubs: 140, grass: 1000, reeds: 0, mist: false },
  },
}

/** Rama's and Lakshmana's quiver (render/quiver.ts), authored in metres along +Y from its base: length, base and mouth
 * radius, sides; gold bands at these fractions of the length; fletched shafts showing above the mouth. Colours are the
 * DESIGN.md tokens: --crimson leather, --gold bands, --ink ivory fletching. */
export const QUIVER = {
  length: 0.58,
  radius: [0.05, 0.068] as const,
  sides: 14,
  bands: [0.05, 0.52, 0.95] as const,
  bandHeight: 0.028,
  bandLift: 0.006,
  shafts: 5,
  shaftRadius: 0.0065,
  shaftShow: 0.19,
  fletch: [0.03, 0.09] as const,
  leather: '#7c1526',
  gold: '#e6b450',
  fletching: '#f6eedc',
} as const

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
    gold: '#e2b040',
    bamboo: '#b8a062',
    ember: '#2a0a04',
    flame: '#ff6a1a',
    flameCore: '#ffd07a',
  },
  /** Whitewashed stones across z from −halfWidth to +halfWidth, a pennant on a bamboo pole at each end, on a
   * trodden earth strip `depth` deep. */
  firingLine: { z: -4.9, halfWidth: 5, stoneEvery: 0.6, depth: 2.4 },
  /** Stack behind each target, `w` wide at target scale 1 and set `behind` metres farther down range; a lateral
   * target's stack spans its whole slide. */
  backstop: { w: 1.5, behind: 0.75 },
  /** One straw bale at target scale 1 (length, height, depth, edge radius), nudged up to `jitter` m and turned up to
   * `yaw` rad so a stack does not read as one panel. */
  bale: { l: 0.9, h: 0.42, d: 0.5, radius: 0.06, jitter: 0.04, yaw: 0.07 },
  /** Firing-line pennant: pole height, node spacing; the triangle's length, hoist height, sag at the tip, ripple
   * amplitude and segments along it. */
  pennant: { pole: 2.2, nodeEvery: 0.45, length: 0.78, hoist: 0.42, droop: 0.12, ripple: 0.05, segments: 8 },
  /** The sword lesson's straw man (entities/StrikeDummy.tsx) rocks when struck: first lean (radians), decay (seconds),
   * and wobble rate (radians per second). */
  dummy: { lean: 0.3, decay: 0.4, rate: 13 },
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
  /** GTAO (LevelLook.ao): world-space radius in metres, the blend into the scene, samples, and the fraction of the
   * composer's resolution it renders at. */
  AO: { RADIUS: 1.6, DISTANCE_EXPONENT: 1, THICKNESS: 1, SCALE: 1.4, SAMPLES: 16, BLEND: 1, RESOLUTION: 0.5 },
  /** The astra's storm on the same chain (entities/AstraVfx.tsx writes PostProcessing's postStorm): the grade cools, the
   * vignette closes in, and the strike's flash lifts bloom. */
  STORM: { GRADE_MUL: [0.8, 0.88, 1.08], VIGNETTE_ADD: 0.55, BLOOM_FLASH: 0.7 },
} as const

/** The astra's staged sequence (entities/AstraVfx.tsx, render/astra-*.ts, systems/astra/sequence.ts): the sky darkens
 * and clouds gather while it charges, the strike lands on release, a shockwave and dust ring spread, then the sky clears.
 * Seconds are render time: on L4 the cast wins the level in its own tick and the fixed loop stops, but the sky must
 * still clear. Colours in arrays are linear HDR multipliers, above 1 so bloom catches them on high. */
export const ASTRA_LOOK = {
  GATHER_SEC: 1.0,
  HOLD_SEC: 0.9,
  CLEAR_SEC: 1.8,
  CANCEL_SEC: 0.5,
  BOLT_SEC: 0.7,
  FLASH_SEC: 0.25,
  SHOCK_SEC: 1.0,
  DUST_SEC: 2.2,
  GALE_SEC: 1.1,
  SHAKE_SEC: 0.6,
  SHAKE_M: 0.22,
  /** Full storm: exposure multiplier; the flash adds this much exposure at its peak. At 1.4 (with bloom flash 1.6 and a
   * 600 light) the strike's first frame was a white screen on the 4050 that hid the bolt (gpu-astra1-l5-*-3-strike-0). */
  STORM_EXPOSURE: 0.42,
  FLASH_EXPOSURE: 0.5,
  STORM_FOG: '#2a2e36',
  STORM_ZENITH: '#15181f',
  STORM_HORIZON: '#454a55',
  /** Lighter than L5's night sky and darker than L4's day sky, so the bank reads against both. */
  CLOUD_COLOR: '#7a7f8e',
  /** Cloud bank: ring around the strike centre (m), height above it (m), billboard size (m); they gather in from this
   * many times the radius. The follow camera sees ~0–15° above the horizon: 9–17 m up at 10–46 m (the first try) sat
   * above the frame on L5 (astra-l5-agneya-1-gather-high.png), so the bank is low and far. */
  CLOUD_RADIUS: [30, 70],
  // 6–12 m still sat at the frame's top edge on the 4050 (gpu-astra2-*-2-charged): 3–8 m puts the bank in the horizon band.
  CLOUD_HEIGHT: [3, 8],
  CLOUD_SIZE: [22, 38],
  CLOUD_GATHER_FROM: 1.8,
  BOLT_HEIGHT: 24,
  BOLT_WIDTH: 0.55,
  BOLT_JITTER: 1.6,
  AGNEYA_COLOR: [5, 2.6, 0.9],
  MANAVA_COLOR: [1.8, 3, 3.8],
  SHOCK_RADIUS: 10,
  /** Manavastra's gale races the cone this far past CONE_RANGE, swirling this many turns. */
  GALE_OVERSHOOT: 1.35,
  GALE_TURNS: 0.35,
  /** High tier only: the point light at the bow while charging, and its flash at the strike. */
  LIGHT: { CHARGE: 40, FLASH: 250, DISTANCE: 40 },
  COUNTS: {
    high: { clouds: 28, sparks: 28, dust: 64, gale: 110, branches: 3 },
    low: { clouds: 8, sparks: 10, dust: 20, gale: 36, branches: 0 },
  },
  /** Aim indicators, readable before release. */
  FAN_COLOR: '#bfefff',
  FAN_HIT_COLOR: '#7ee787',
  FAN_IDLE_OPACITY: 0.14,
  FAN_CHARGE_OPACITY: 0.32,
  RETICLE_COLOR: '#ffb347',
  RETICLE_TARGET_COLOR: '#7ee787',
  /** Maricha flung by Manavastra: carried up and away over the death dissolve (BALANCE.spawn.DESPAWN_TICKS). */
  FLING: { SEC: 1, DIST: 40, HEIGHT: 16, TUMBLE: 4.5 },
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
      { asset: 'palace', pos: [2.9, 0.1, 4.4], yaw: 0, scale: 0.04, ground: true, castShadow: false, surface: 'palace' },
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
      exposure: 0.76,
      // Late sun through the entrance behind the player: long shadows reach toward the throne.
      key: { color: '#ffc792', intensity: 2.3, dir: [3, 5, 10] },
      // Coral walls and marble: a cool blue sky fill turned the white squares lilac; bounce light off the coral instead.
      fill: { sky: '#a0908c', ground: '#6a3424', intensity: 0.75 },
      rim: { color: '#9cc2ff', intensity: 1.8, dir: [-4, 6, -10] },
      // An interior: nothing bright to reflect, just enough for gold to read as metal.
      envIntensity: 0.18,
      ground: { base: '#5a4636', dapple: ['#6a5442', '#4a382a'] },
      sky: { zenith: '#2a1a12', horizon: '#7a5a40' },
      fog: { near: 6, far: 70 },
      ao: true,
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
