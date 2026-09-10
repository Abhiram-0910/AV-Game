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
    SPRINT_SPEED: 6.5,
    /** Keyboard turn rate. 6.0 was a full spin in a second — uncontrollable on a lab keyboard. */
    TURN_SPEED_RAD: 3.0,
    MAX_ARROWS: 20,
    START_ARROWS: 12,
    ARROW_PICKUP: 5,
    /** Ticks the player cannot be hit again after taking damage. */
    INVULN_TICKS: 45,
    /** Health regained per tick while out of combat. */
    REGEN_PER_TICK: 0.05,
    REGEN_DELAY_TICKS: 240,
  },

  arrow: {
    DAMAGE: 15,
    HEADSHOT_DAMAGE: 30,
    SPEED: 40,
    GRAVITY: 9.8,
    LIFETIME_TICKS: 180,
    /** Ticks from click to release at full draw. */
    DRAW_TICKS: 30,
    /** Minimum draw fraction that still fires. */
    MIN_DRAW: 0.25,
    HIT_RADIUS: 0.45,
    HEAD_RADIUS: 0.18,
  },

  astra: {
    MAX_CHARGES: 3,
    START_CHARGES: 1,
    CHARGE_TICKS: 90,
    COOLDOWN_TICKS: 180,
    DAMAGE: 60,
    /** Manavastra (used on Maricha) flings instead of damaging. */
    FLING_DISTANCE: 100,
    /** Vayavyastra scatters every enemy within this radius. */
    SCATTER_RADIUS: 12,
  },

  enemies: {
    rakshasa: { HEALTH: 30, SPEED: 3.0, DAMAGE: 10, ATTACK_COOLDOWN: 60, REACH: 1.6, YAJNA_DAMAGE: 5 },
    tataka: { HEALTH: 150, SPEED: 2.4, DAMAGE: 15, ATTACK_COOLDOWN: 90, REACH: 2.4, YAJNA_DAMAGE: 0 },
    subahu: { HEALTH: 120, SPEED: 3.2, DAMAGE: 15, ATTACK_COOLDOWN: 75, YAJNA_DAMAGE: 10, REACH: 2.0 },
    maricha: { HEALTH: 90, SPEED: 3.6, DAMAGE: 12, ATTACK_COOLDOWN: 75, YAJNA_DAMAGE: 10, REACH: 2.0 },
  },

  combat: {
    /** Ticks any target stays invulnerable after a valid hit (prevents multi-hit per arrow). */
    INVULN_TICKS: 6,
    /** Beyond this distance a hit report is rejected as invalid. */
    MAX_HIT_RANGE: 60,
    /** Boulder thrown by Tataka. */
    BOULDER_DAMAGE: 15,
    BOULDER_SPEED: 14,
  },

  spawn: {
    /** Hard budget from the performance model: concurrent SkinnedMesh instances. */
    MAX_SKINNED: 12,
    DEFAULT_INTERVAL_TICKS: 90,
    /** Defeated enemies dissolve over this many ticks before their slot frees. */
    DESPAWN_TICKS: 60,
  },

  yajna: {
    MAX_INTEGRITY: 100,
    /** Level 5 total guard duration (the six days and nights, compressed). */
    GUARD_TICKS: 5400,
  },

  targets: {
    /** Level 2 tutorial and Level 4 challenge. */
    L2_COUNT: 3,
    L4_COUNT: 5,
    L4_TIME_LIMIT_TICKS: 3600,
    L4_ARROW_BUDGET: 10,
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
  },

  archeryAim: {
    /** Where the drawing hand sits relative to the head bone at full draw, metres (right, up, back). */
    CHEEK_OFFSET: [0.08, -0.05, 0.1],
    /** Mouse offset from screen centre (−1..1) maps to this much yaw / pitch while drawing. */
    MOUSE_YAW_RAD: 0.6,
    MOUSE_PITCH_RAD: 0.5,
    /** Arrow leaves from this height above the feet, this far ahead. */
    MUZZLE_HEIGHT: 1.35,
    MUZZLE_FORWARD: 0.5,
    /** Bow grip: local offset and euler (radians) under hand_l. */
    BOW_GRIP_POS: [0, 0, 0],
    BOW_GRIP_ROT: [Math.PI / 2, 0, 0],
    /** Quiver on the back: local offset and euler under spine_03. */
    QUIVER_POS: [-0.15, 0.1, -0.12],
    QUIVER_ROT: [0.3, 0, 0.5],
  },

  melee: {
    /** Sword grip: local offset and euler (radians) under hand_r. Same 90° convention as
     * the bow grip — the source model is authored blade-up, +Y, like the bow's own rig pose. */
    SWORD_GRIP_POS: [0, 0, 0],
    SWORD_GRIP_ROT: [Math.PI / 2, 0, 0],
    /** Ticks the one-shot slash clip plays for before locomotion resumes control of the pose. */
    SLASH_TICKS: 36,
  },

  garments: {
    /** Procedural dhoti: waist radius, hem flare multiplier, and side count (metres, tris scale with this). */
    DHOTI_WAIST_RADIUS: 0.19,
    DHOTI_HEM_FLARE: 1.25,
    DHOTI_RADIAL_SEGMENTS: 16,
    /** Angavastram sash: width and thickness in metres, and how far off the spine's
     * centerline it's pushed so it drapes on the chest surface instead of inside the torso. */
    SASH_WIDTH: 0.12,
    SASH_THICKNESS: 0.03,
    SASH_SURFACE_OFFSET: 0.16,
  },

  interaction: {
    /** Metres from a waypoint that counts as reaching it. */
    REACH_RADIUS: 2.0,
    /** Metres from an NPC within which the talk prompt appears. */
    TALK_RADIUS: 2.6,
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
    FOV: 50,
    NEAR: 0.1,
    FAR: 120,
  },

  render: {
    /** Pixel ratio cap on the low tier; high tier lifts it to the device ratio. */
    PIXEL_RATIO_LOW: 1,
    PIXEL_RATIO_HIGH_MAX: 2,
    /** One-time benchmark: frames measured and the mean frame time that means "low". */
    BENCH_FRAMES: 60,
    BENCH_LOW_MS: 20,
    BENCH_TRIANGLES: 100_000,
    /** Torus-knot stress mesh (radius, tube, radial segments) and the throwaway camera. */
    BENCH_KNOT: { RADIUS: 1, TUBE: 0.3, RADIAL: 125, SPIN_RAD_PER_FRAME: 0.02 },
    BENCH_CAMERA: { FOV: 50, NEAR: 0.1, FAR: 50, DISTANCE: 4 },
    /** MeshStandardMaterial roughness on the high tier. */
    STANDARD_ROUGHNESS: 0.85,
    /** Blob shadow disc radius in metres, its opacity, height above the floor, and gradient softness (0..1). */
    BLOB_RADIUS: 0.55,
    BLOB_OPACITY: 0.45,
    BLOB_LIFT: 0.02,
    BLOB_SOFTNESS: 0.6,
  },

  animation: {
    /** Default crossfade between clips, seconds. */
    CROSSFADE_SEC: 0.2,
  },

  ui: {
    DIALOGUE_CHARS_PER_SEC: 40,
    HIT_FLASH_TICKS: 8,
    /** Milliseconds a win/unlock card stays before Continue is offered. */
    RESULT_MIN_MS: 600,
    /** Perf overlay refresh, Hz. */
    OVERLAY_HZ: 4,
  },
} as const
