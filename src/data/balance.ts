// Every tunable number in the game. Zero imports. Change only with a reason in SESSION-LOG.md.
// Times are in ticks unless the name says otherwise (60 ticks = 1 second, see loop.HZ).

export const BALANCE = {
  loop: {
    HZ: 60,
    /** Spiral-of-death guard: never simulate more than this many ticks per frame. */
    MAX_SUBSTEPS: 5,
    /** Absorbs float drift in the accumulator so 30fps and 144fps tick identically. */
    ACCUMULATOR_EPS: 1e-6,
  },

  player: {
    MAX_HEALTH: 100,
    WALK_SPEED: 2.0,
    JOG_SPEED: 4.0,
    /** Keyboard turn rate. 6.0 was a full spin in a second — uncontrollable on a lab keyboard. */
    TURN_SPEED_RAD: 3.0,
    /** 20 → 40 (2026-09-14): L5 now starts with 30 (levels.ts startArrows), and a pickup must never shrink the quiver. */
    MAX_ARROWS: 40,
    START_ARROWS: 12,
    // Raised 5→8 (pass 3 phase G): Level 5 is the only level where a player ever actually
    // empties the quiver and has to recover spent arrows mid-fight (see
    // systems/interaction/interact.ts's nearestPickupIndex) — at 5, a pickup trip barely
    // outpaced the wave spawner; 8 makes the trip worth the time it costs under fire.
    ARROW_PICKUP: 8,
    /** Ticks the player cannot be hit again after taking damage. */
    INVULN_TICKS: 45,
    /** Health regained per tick while out of combat. */
    REGEN_PER_TICK: 0.05,
    REGEN_DELAY_TICKS: 240,
  },

  arrow: {
    DAMAGE: 15,
    HEADSHOT_DAMAGE: 30,
    SPEED: 42,
    GRAVITY: 9.8,
    LIFETIME_TICKS: 180,
    /** Ticks from click to release at full draw. */
    DRAW_TICKS: 28,
    /** Minimum draw fraction that still fires. */
    MIN_DRAW: 0.2,
  },

  astra: {
    MAX_CHARGES: 3,
    START_CHARGES: 1,
    CHARGE_TICKS: 90,
    COOLDOWN_TICKS: 180,
    DAMAGE: 60,
    agneyastra: {
      DAMAGE: 120,
      RADIUS: 5.0,
    },
    manavastra: {
      DAMAGE: 40,
      CONE_RANGE: 8.0,
      CONE_ANGLE_DEG: 120,
      KNOCKBACK_DISTANCE: 7.0,
      STUN_TICKS: 90,
    },
  },

  enemies: {
    // Tuned for margin: player hit-invuln caps incoming damage; health allows realistic kill rates.
    // YAJNA_DAMAGE 3 → 2, subahu 7 → 5, maricha 6 → 4 (2026-09-14): a human lost the fire every run before Subahu came.
    rakshasa: { HEALTH: 30, SPEED: 2.8, DAMAGE: 6, ATTACK_COOLDOWN: 90, REACH: 1.6, YAJNA_DAMAGE: 2 },
    // Tuned for L3 tutorial margin: 180 cooldown (~3s) and 10 damage give room to aim arrows.
    tataka: { HEALTH: 150, SPEED: 2.4, DAMAGE: 10, ATTACK_COOLDOWN: 180, REACH: 2.4, YAJNA_DAMAGE: 0 },
    // ATTACK_COOLDOWN 90 → 150 (2026-09-14, SESSION-LOG "L5: interception"): with interception and regen, two runs lost
    // with Subahu at 15 / 120, one slash short; he dealt 72–94 of Rama's last health, a hit every 108 ticks while each
    // slash knocked him out of reach. 150 leaves ~5 hits in that fight instead of 7, still quicker than Tataka's 180.
    subahu: { HEALTH: 120, SPEED: 3.0, DAMAGE: 12, ATTACK_COOLDOWN: 150, YAJNA_DAMAGE: 5, REACH: 2.0 },
    maricha: { HEALTH: 90, SPEED: 3.4, DAMAGE: 10, ATTACK_COOLDOWN: 90, YAJNA_DAMAGE: 4, REACH: 2.0 },
  },

  combat: {
    /** Ticks any target stays invulnerable after a valid hit (prevents multi-hit per arrow). */
    INVULN_TICKS: 6,
    /** Beyond this distance a hit report is rejected as invalid. */
    MAX_HIT_RANGE: 60,
    /** Boulder thrown by Tataka. */
    BOULDER_DAMAGE: 15,
    /** Distance at which an idle enemy notices the player and starts chasing. */
    AGGRO_RADIUS: 16,
    /** Ticks an enemy telegraphs an attack before it lands, once in reach. */
    ATTACK_WINDUP_TICKS: 18,
    /** Ticks an enemy is knocked out of its current action by a landed hit. */
    STAGGER_TICKS: 20,
  },

  spawn: {
    /** Hard budget from the performance model: concurrent SkinnedMesh instances. */
    MAX_SKINNED: 12,
    /** Defeated enemies dissolve over this many ticks before their slot frees. */
    DESPAWN_TICKS: 60,
  },

  yajna: {
    /** Sacred fire health (pass 3 phase G: 150; 2026-09-14: 200, a human lost it before Subahu ever came). */
    MAX_INTEGRITY: 200,
    /** Ticks the fire ignores further hits after one lands (prevents multi-hit stacking). */
    HIT_INVULN_TICKS: 75,
    /** A rakshasa turns from the fire onto Rama when he is nearer to it than the fire is and within this many metres
     * of it (systems/ai/enemy-ai.ts). Replaces the unused DEFENSE_RADIUS 4.0; see SESSION-LOG 2026-09-14 (L5). */
    ENGAGE_RADIUS: 4.0,
    /** Ticks between automatic arrow supply bundle replenishment during heavy waves. */
    SUPPLY_RESPAWN_TICKS: 450,
  },

  targets: {
    L4_TIME_LIMIT_TICKS: 3600,
  },

  archery: {
    /** Procedural aim (pass 2): bones whose rotation is blended toward the aim vector. */
    AIM_BONES: ['upperarm_l', 'lowerarm_l', 'upperarm_r', 'lowerarm_r', 'spine_03'],
    AIM_WEIGHTS: {
      upperarm_l: 0.9,
      lowerarm_l: 0.8,
      upperarm_r: 0.9,
      lowerarm_r: 0.85,
      spine_03: 0.2,
    },
    /** Seconds to blend into and out of the aim pose. */
    AIM_BLEND_IN_SEC: 0.15,
    AIM_BLEND_OUT_SEC: 0.25,
    /** Clamp on pitch so the arms never fold through the torso. */
    MAX_PITCH_RAD: 1.1,
    /** Ticks from click to full draw strength (mirrors arrow.DRAW_TICKS). */
    DRAW_TICKS: 28,
    /** Minimum draw fraction required to fire. */
    MIN_DRAW: 0.2,
    /** Maximum steps to sample for trajectory preview raycast. */
    TRAJECTORY_MAX_STEPS: 90,
    /** Preview arc: a dot every this many metres, this radius at the bow, shrinking to END_SCALE and dimming to
     * END_BRIGHTNESS (additive, so it fades) at the landing point. MAX covers the longest arc (90 steps at full draw, 63 m). */
    ARC_DOT_SPACING: 0.7,
    ARC_DOT_RADIUS: 0.06,
    ARC_DOT_END_SCALE: 0.35,
    ARC_DOT_END_BRIGHTNESS: 0.25,
    ARC_DOT_MAX: 96,
    /** Draw gauge width in px on the HUD overlay. */
    GAUGE_WIDTH: 64,
    /** Radius in metres for proximity magnetism/assist toward targets/enemies. 0.85 → 0.45 in the combat PR
     * (no stated reason) left a child on a trackpad (~20 px hand error) hitting the 16 m L4 target 55 % of
     * the time; 0.75 gives 78 %, and with the arc locked green before release (~10 px click jitter) 99 %.
     * Measured with the real ballistics and hit tester, 400 shots a cell (SESSION-LOG 2026-09-13). */
    AIM_ASSIST_RADIUS: 0.75,
    /** Fraction to bias the preview's landing marker toward the target centre on assist lock (0..1). Visual
     * only — the hit itself is decided by the radius. 0.3 makes the marker visibly snap onto the target. */
    AIM_ASSIST_BIAS: 0.3,
  },

  archeryAim: {
    /** Where the drawing hand sits relative to the head bone at full draw, metres (right, up, back). */
    CHEEK_OFFSET: [0.08, -0.05, 0.1],
    /** Cursor aim (ballistics.ts aimFromRay). Measured 2026-09-13 against L2 12.6 m and L4 16.5 / 25.6 / 44 m at 1280×720,
     * table in SESSION-LOG. Metres along the camera ray before the aim point stops following the ground: 15 is the one value
     * in 8–30 where the cursor on the target locks L2, L4 static and L4 occluded, and L4 long needs +14 px (one target height). */
    AIM_MAX_DIST: 15,
    /** Aim point closer than this ahead of the muzzle keeps the camera heading: the screen's bottom edge meets the ground behind Rama. */
    AIM_MIN_DIST: 1,
    /** Steepest launch, radians. Down 0.25: a rakshasa at 1.6, 2.5 and 4 m still locks from the whole lower screen and a
     * bottom-edge release lands 5.4 m ahead. Up 0.15: real shots use at most 6.7° (L4 long) and 0.15 lands 60 m, past every
     * level's bounds; without it the top edge launched at 22.5°. */
    AIM_MAX_DOWN: 0.25,
    AIM_MAX_UP: 0.15,
    /** Arrow leaves from this height above the feet, this far ahead. */
    MUZZLE_HEIGHT: 1.35,
    MUZZLE_FORWARD: 0.5,
    /** Bow grip: local offset, euler (radians), and uniform scale under hand_l. */
    BOW_GRIP_POS: [0, 0, 0],
    BOW_GRIP_ROT: [Math.PI / 2, 0, 0],
    BOW_GRIP_SCALE: 0.65,
    /** Quiver on the back (render/quiver.ts, authored in metres, so scale 1): local offset and euler under spine_03.
     * Measured 2026-09-14 from Rama's back profile in the idle pose: base 0.30 m under spine_03, the axis clearing the back
     * by 2.5 cm at every height, mouth over his left shoulder, away from the sword arm. Clearance through walk, jog, draw
     * and slash (the sword is put away during a draw, entities/Player.tsx): SESSION-LOG 2026-09-14. */
    QUIVER_POS: [-0.135, -0.349, -0.186],
    QUIVER_ROT: [-0.297, 0.056, -0.37],
    QUIVER_SCALE: 1,
    /** Exponential smoothing factor for mouse aiming direction (0..1). */
    SMOOTH_FACTOR: 0.35,
  },

  melee: {
    SWORD_GRIP_POS: [0, 0, 0],
    SWORD_GRIP_ROT: [Math.PI / 2, 0, 0],
    SWORD_GRIP_SCALE: 0.4,
    SLASH_TICKS: 36,
    DAMAGE: 35,
    /** 2.2 m / 120° → 2.5 m / 180° (2026-09-14): a human never landed a slash. The cone is now the front half, so a
     * trackpad's heading error cannot miss a foe on screen; 2.5 still leaves a knocked-back rakshasa (REACH 1.6 + 1.5 =
     * 3.1 m) and Subahu (3.5 m) out of reach until they step back in. */
    RANGE: 2.5,
    CONE_ANGLE_DEG: 180,
    KNOCKBACK_DISTANCE: 1.5,
  },

  garments: {
    /** Procedural dhoti: waist radius, hem flare multiplier, and side count (metres, tris scale with this). */
    DHOTI_WAIST_RADIUS: 0.19,
    DHOTI_HEM_FLARE: 1.25,
    DHOTI_RADIAL_SEGMENTS: 16,
    /** Angavastram sash: width, thickness (metres), and spine centerline surface offset. */
    SASH_WIDTH: 0.12,
    SASH_THICKNESS: 0.03,
    SASH_SURFACE_OFFSET: 0.16,
    /** Extra push when the sash lies over a fitted upper garment, or the cloth swallows it. */
    SASH_OVER_UPPER: 0.035,
    /** Choli (torso wrap) waist radius and radial segments. */
    CHOLI_RADIUS: 0.24,
    CHOLI_RADIAL_SEGMENTS: 16,
    /** Fitted upper garment (render/garment-fit.ts): starts this far under the pelvis bone (tucked into the
     * dhoti), stops this far under the clavicle, rings × sectors, and its clearance off the skin (metres). */
    UPPER_TUCK: 0.04,
    UPPER_NECKLINE: 0.03,
    UPPER_RINGS: 7,
    UPPER_SECTORS: 20,
    UPPER_GAP: 0.014,
    /** Crown band from this far under the skull top to this far under it; clearance covers the hair. */
    CROWN_BAND: [0.1, 0.05] as const,
    CROWN_GAP: 0.03,
    CROWN_POINT_RADIUS: 0.02,
    KIRITA_HEIGHT: 0.13,
    /** Shoulder collar: inner radius round the neck, outer half-widths (x across the shoulders, z chest to
     * back), skin clearance, how far above the neck bone the skin still counts, and the drop search radius. */
    COLLAR_INNER: 0.075,
    COLLAR_OUTER: [0.17, 0.13] as const,
    COLLAR_GAP: 0.012,
    COLLAR_NECK_CLEAR: 0.03,
    COLLAR_REACH: 0.035,
    REGALIA_GOLD: '#d9a23a',
    REGALIA_PBR: { metalness: 0.85, roughness: 0.35 },
  },

  interaction: {
    /** Metres from a waypoint that counts as reaching it. */
    REACH_RADIUS: 2.0,
    /** Metres from an NPC within which the talk prompt appears. */
    TALK_RADIUS: 2.6,
    /** Metres from a spent-arrow pile within which the pickup prompt appears. */
    PICKUP_RADIUS: 2.2,
    /** Oldest pile is dropped once spent-arrow piles reach this count. */
    MAX_ARROW_PICKUPS: 10,
  },

  waypoint: {
    /** Ground ring: its outer edge is interaction.REACH_RADIUS, so the ring shows exactly where arrival counts. */
    RING_WIDTH: 0.35,
    RING_LIFT: 0.04,
    RING_OPACITY: 0.9,
    /** Additive beam, fading out toward its top. */
    BEAM_RADIUS: 0.35,
    BEAM_HEIGHT: 16,
    BEAM_OPACITY: 0.6,
    PULSE_HZ: 1.2,
    /** Fraction the ring shrinks at the bottom of each pulse. */
    PULSE: 0.12,
    /** The screen-edge arrow aims at this height above the spot, inset this many px from the edge. */
    INDICATOR_HEIGHT: 1.5,
    EDGE_MARGIN_PX: 40,
  },

  locomotion: {
    /** Yaw added so the model's authored forward matches +Z at yaw 0. */
    MODEL_YAW_OFFSET: 0,
    /** Walking backwards is slower than walking forwards. */
    BACK_SPEED_FACTOR: 0.6,
    CAPSULE_RADIUS: 0.35,
    /** NPCs push the player out to this centre-to-centre distance. */
    NPC_RADIUS: 0.5,
    /** Metres per second² toward the target speed. */
    ACCEL: 14,
    /** Highest step the ground raycast will snap onto. */
    GROUND_SNAP_MAX: 0.6,
    /** The ground ray starts this far above the last height and reaches this far below it. */
    GROUND_RAY_ABOVE: 4,
    GROUND_RAY_DEPTH: 8,
    /** Speed above which the walk clip becomes the jog clip. */
    JOG_THRESHOLD: 3.0,
    /** Speed below which the character is treated as standing. */
    IDLE_THRESHOLD: 0.15,
  },

  camera: {
    /** Behind and above the player, looking at the look-target height. */
    DISTANCE: 5.5,
    HEIGHT: 2.6,
    LOOK_HEIGHT: 1.3,
    /** Per-second exponential follow rate. */
    FOLLOW_RATE: 8,
    /** Level-open establishing move: starts this many times farther out and higher, eases in over the seconds. */
    ESTABLISH_SCALE: 2.6,
    ESTABLISH_SECONDS: 3.5,
    FOV: 45,
    NEAR: 0.1,
    FAR: 120,
  },

  /** Pointer-lock free look (systems/camera/mouse-look.ts). 2026-09-14, new: Abhi asked for mouse look. */
  mouseLook: {
    /** Radians of turn per CSS px of movement at sensitivity 1: a 1280 px sweep turns ~183° with a mouse. A trackpad
     * reports about half the counts for the same finger travel, so it starts at double. */
    RAD_PER_PX_MOUSE: 0.0025,
    RAD_PER_PX_TRACKPAD: 0.005,
    /** Settings slider range for either sensitivity multiplier. */
    SENS_MIN: 0.25,
    SENS_MAX: 3,
    /** Camera tilt limits from the follow pose (radians, both magnitudes): down to see the ground ahead, up to see the
     * sky and the astra's clouds. Up is capped where the camera still clears the ground by ~0.6 m. */
    PITCH_DOWN_MAX: 0.2,
    PITCH_UP_MAX: 0.35,
    /** Virtual cursor height (NDC) on the first draw under lock: the camera ray there reaches AIM_MAX_DIST at muzzle
     * height, so the launch is flat at whatever Rama faces. Derived from the camera pose (5.5 back, 2.6 up, looking at
     * 1.3, FOV 45) and checked in the build (SESSION-LOG 2026-09-14). */
    AIM_CURSOR_START_Y: 0.36,
  },

  render: {
    /** Pixel ratio cap on the low tier; high tier lifts it to the device ratio. */
    PIXEL_RATIO_LOW: 1,
    PIXEL_RATIO_HIGH_MAX: 2,
    /** One-time benchmark: untimed warm-up frames (shader compile), timed frames, full-screen translucent Standard layers
     * of overdraw at the high pixel ratio, and the mean delivered-frame interval above which the machine gets "low". */
    BENCH_WARMUP: 10,
    BENCH_FRAMES: 60,
    BENCH_LAYERS: 12,
    BENCH_LOW_MS: 25,
    BENCH_TRIANGLES: 300_000,
    /** Torus-knot stress mesh (radius, tube, radial segments) and the throwaway camera. */
    BENCH_KNOT: { RADIUS: 1, TUBE: 0.3, RADIAL: 125, SPIN_RAD_PER_FRAME: 0.02 },
    BENCH_CAMERA: { FOV: 50, NEAR: 0.1, FAR: 50, DISTANCE: 4 },
    /** MeshStandardMaterial roughness on the high tier. */
    STANDARD_ROUGHNESS: 0.85,
    /** Blob shadow disc (radius, opacity, floor lift, gradient softness). */
    BLOB_RADIUS: 0.55,
    BLOB_OPACITY: 0.45,
    BLOB_LIFT: 0.02,
    BLOB_SOFTNESS: 0.6,
    /** High tier post-processing (bloom and vignette). */
    BLOOM_STRENGTH: 0.35,
    BLOOM_RADIUS: 0.4,
    BLOOM_THRESHOLD: 0.85,
    VIGNETTE_OFFSET: 1.05,
    VIGNETTE_DARKNESS: 1.1,
  },

  animation: {
    /** Default crossfade between clips, seconds. */
    CROSSFADE_SEC: 0.2,
  },

  ui: {
    DIALOGUE_CHARS_PER_SEC: 40,
    /** Duration in ms to display hit-marker and flash on crosshair. */
    HIT_FEEDBACK_MS: 160,
    /** 2026-09-14, new: L4 is won in the astra's cast tick, and the result panel covered the strike. It now waits this
     * long after a cast (the strike, the shockwave and most of the clearing, ASTRA_LOOK). */
    RESULT_AFTER_ASTRA_MS: 2600,
    /** Perf overlay refresh, Hz. */
    OVERLAY_HZ: 4,
  },

  audio: {
    FOOTSTEP_WALK_INTERVAL_SEC: 0.42,
    FOOTSTEP_RUN_INTERVAL_SEC: 0.28,
  },
} as const
