// All five levels. Zero imports: dialogue keys are plain strings validated by
// tests/unit/content.test.ts. Positions are metres, +Y up, yaw in radians.

export type Vec3 = readonly [number, number, number]
export type LevelId = 'l1' | 'l2' | 'l3' | 'l4' | 'l5'
export type EnemyKind = 'rakshasa' | 'tataka' | 'subahu' | 'maricha'
export type NpcId = 'rama' | 'lakshmana' | 'vishwamitra' | 'dasharatha' | 'vasishtha'

export type Objective =
  | { kind: 'talk'; npc: NpcId; dialogueKey: string }
  | { kind: 'reach'; waypoint: string }
  | { kind: 'hitTargets'; count: number }
  | { kind: 'chargeAstra'; count: number }
  | { kind: 'defeat'; enemy: EnemyKind; count: number }
  | { kind: 'survive'; ticks: number }

export type FailCondition = 'none' | 'healthZero' | 'yajnaZero' | 'arrowsOut' | 'timeOut'

/**
 * Archery targets. Each kind asks for a different shot so a range is never a shooting gallery:
 * static — stands still at mid range;  lateral — slides side to side (amplitude m, period ticks);
 * longRange — far enough that the arrow drops noticeably;  occluded — small and half hidden
 * behind cover;  astraOnly — plain arrows bounce off, only a charged astra brings it down.
 */
export type TargetKind = 'static' | 'lateral' | 'longRange' | 'occluded' | 'astraOnly'

export type TargetDef =
  | { kind: 'static'; pos: Vec3 }
  | { kind: 'lateral'; pos: Vec3; amplitude: number; periodTicks: number }
  | { kind: 'longRange'; pos: Vec3 }
  | { kind: 'occluded'; pos: Vec3; scale: number; coverPos: Vec3 }
  | { kind: 'astraOnly'; pos: Vec3; scale: number }

export interface Wave {
  /** Tick (from play start) at which this wave begins spawning. */
  startTick: number
  kind: EnemyKind
  count: number
  /** Ticks between individual spawns — stagger, never burst. */
  spawnIntervalTicks: number
  /** Enemies of this wave alive at once; spawner waits for a slot. */
  maxAlive: number
}

export interface LevelDef {
  id: LevelId
  titleKey: string
  introKey: string
  outroKey: string
  /** Names of persistent SkinnedMesh characters (counts toward the 12 budget). */
  persistentSkinned: readonly NpcId[]
  playerSpawn: { pos: Vec3; yaw: number }
  /** Whether Rama carries and can draw the bow in this level. */
  bow: boolean
  waypoints: Readonly<Record<string, Vec3>>
  /** Archery targets, empty where there is nothing to shoot at. */
  targets: readonly TargetDef[]
  objectives: readonly Objective[]
  fail: readonly FailCondition[]
  /** Static (non-wave) enemies present from play start. */
  enemies: readonly { kind: EnemyKind; pos: Vec3 }[]
  waves: readonly Wave[]
  /** Quiz gate shown after winning; null on the last level. */
  quizGate: string | null
  codexCard: string
  /** Designer estimate of ideal play time in seconds; kids run 1.5–2x. */
  targetSeconds: number
}

export const LEVELS: readonly LevelDef[] = [
  {
    id: 'l1',
    titleKey: 'l1.title',
    introKey: 'l1.intro',
    outroKey: 'l1.outro',
    // Lakshmana has no line in the court; the brothers leave together at the Sarayu (L2).
    // Four bodies keep the court under the 120k frame budget beside the palace and props.
    persistentSkinned: ['rama', 'vishwamitra', 'dasharatha', 'vasishtha'],
    playerSpawn: { pos: [0, 0, 14], yaw: Math.PI },
    bow: false,
    waypoints: { throne: [0, 0, 2], vishwamitra: [3, 0, 4], vasishtha: [-3, 0, 4] },
    targets: [],
    objectives: [
      { kind: 'reach', waypoint: 'throne' },
      { kind: 'talk', npc: 'vishwamitra', dialogueKey: 'l1.vishwamitra.request' },
      { kind: 'talk', npc: 'dasharatha', dialogueKey: 'l1.dasharatha.hesitates' },
      { kind: 'talk', npc: 'vasishtha', dialogueKey: 'l1.vasishtha.counsel' },
      { kind: 'talk', npc: 'dasharatha', dialogueKey: 'l1.dasharatha.consents' },
    ],
    fail: ['none'],
    enemies: [],
    waves: [],
    quizGate: 'gate1',
    codexCard: 'vishwamitra',
    targetSeconds: 80,
  },
  {
    id: 'l2',
    titleKey: 'l2.title',
    introKey: 'l2.intro',
    outroKey: 'l2.outro',
    persistentSkinned: ['rama', 'lakshmana', 'vishwamitra'],
    playerSpawn: { pos: [0, 0, 0], yaw: 0 },
    bow: true,
    waypoints: { riverbank: [0, 0, -18], range: [12, 0, -30] },
    targets: [
      { kind: 'static', pos: [8, 0, -42] },
      { kind: 'static', pos: [12, 0, -44] },
      { kind: 'static', pos: [16, 0, -42] },
    ],
    objectives: [
      { kind: 'reach', waypoint: 'riverbank' },
      { kind: 'talk', npc: 'vishwamitra', dialogueKey: 'l2.vishwamitra.mantras' },
      { kind: 'reach', waypoint: 'range' },
      { kind: 'talk', npc: 'vishwamitra', dialogueKey: 'l2.vishwamitra.bow' },
      { kind: 'hitTargets', count: 3 },
    ],
    fail: ['none'],
    enemies: [],
    waves: [],
    quizGate: 'gate2',
    codexCard: 'yajna',
    targetSeconds: 80,
  },
  {
    id: 'l3',
    titleKey: 'l3.title',
    introKey: 'l3.intro',
    outroKey: 'l3.outro',
    persistentSkinned: ['rama', 'lakshmana', 'vishwamitra'],
    playerSpawn: { pos: [0, 0, 20], yaw: Math.PI },
    bow: true,
    waypoints: { forestEdge: [0, 0, 6], clearing: [0, 0, -10] },
    targets: [],
    objectives: [
      { kind: 'reach', waypoint: 'forestEdge' },
      { kind: 'talk', npc: 'vishwamitra', dialogueKey: 'l3.vishwamitra.duty' },
      { kind: 'reach', waypoint: 'clearing' },
      { kind: 'defeat', enemy: 'tataka', count: 1 },
    ],
    fail: ['healthZero'],
    enemies: [{ kind: 'tataka', pos: [0, 0, -22] }],
    waves: [],
    quizGate: 'gate3',
    codexCard: 'tataka',
    targetSeconds: 90,
  },
  {
    id: 'l4',
    titleKey: 'l4.title',
    introKey: 'l4.intro',
    outroKey: 'l4.outro',
    persistentSkinned: ['rama', 'lakshmana', 'vishwamitra'],
    playerSpawn: { pos: [0, 0, 0], yaw: 0 },
    bow: true,
    waypoints: { firingLine: [0, 0, -4] },
    // Five different shots, one each: the trial is the variety, not the count.
    targets: [
      { kind: 'static', pos: [-4, 0, -20] },
      { kind: 'lateral', pos: [4, 0, -22], amplitude: 4, periodTicks: 240 },
      { kind: 'longRange', pos: [0, 0, -48] },
      { kind: 'occluded', pos: [-9, 0, -28], scale: 0.6, coverPos: [-9, 0, -25] },
      { kind: 'astraOnly', pos: [10, 0, -34], scale: 2.5 },
    ],
    objectives: [
      { kind: 'talk', npc: 'vishwamitra', dialogueKey: 'l4.vishwamitra.astras' },
      { kind: 'reach', waypoint: 'firingLine' },
      { kind: 'hitTargets', count: 5 },
      { kind: 'chargeAstra', count: 1 },
    ],
    fail: ['arrowsOut', 'timeOut'],
    enemies: [],
    waves: [],
    quizGate: 'gate4',
    codexCard: 'astra',
    targetSeconds: 80,
  },
  {
    id: 'l5',
    titleKey: 'l5.title',
    introKey: 'l5.intro',
    outroKey: 'l5.outro',
    // Priests around the altar are static meshes, not SkinnedMesh — they do not count.
    persistentSkinned: ['rama', 'lakshmana', 'vishwamitra'],
    playerSpawn: { pos: [0, 0, 6], yaw: Math.PI },
    bow: true,
    waypoints: { altar: [0, 0, 0], north: [0, 0, -30], east: [30, 0, 0], west: [-30, 0, 0] },
    targets: [],
    objectives: [
      { kind: 'survive', ticks: 5400 },
      { kind: 'defeat', enemy: 'subahu', count: 1 },
      { kind: 'defeat', enemy: 'maricha', count: 1 },
    ],
    fail: ['healthZero', 'yajnaZero'],
    enemies: [],
    // 3 persistent + maxAlive must stay ≤ 12. Waves overlap only at their tails, and the
    // spawner treats maxAlive as a global cap across concurrent waves (see content test).
    waves: [
      // maxAlive 3 (was 4): a player's first concurrent-enemy fight, straight from spawn —
      // pass 3 phase G playtesting found 4-at-once here gave no room to learn the mechanic.
      // spawnIntervalTicks widened on the first two waves (120→150, 90→120) for the same
      // reason: a bow-only kill takes two arrows per rakshasa, and the original cadence
      // outpaced how fast a well-aimed player can drop one and reload for the next.
      { startTick: 300, kind: 'rakshasa', count: 4, spawnIntervalTicks: 150, maxAlive: 3 },
      { startTick: 1500, kind: 'rakshasa', count: 6, spawnIntervalTicks: 120, maxAlive: 5 },
      { startTick: 3100, kind: 'rakshasa', count: 6, spawnIntervalTicks: 120, maxAlive: 4 },
      { startTick: 4600, kind: 'rakshasa', count: 3, spawnIntervalTicks: 130, maxAlive: 3 },
      { startTick: 4600, kind: 'subahu', count: 1, spawnIntervalTicks: 1, maxAlive: 1 },
      { startTick: 4680, kind: 'maricha', count: 1, spawnIntervalTicks: 1, maxAlive: 1 },
    ],
    quizGate: null,
    codexCard: 'maricha-subahu',
    targetSeconds: 110,
  },
]

export const LEVEL_ORDER: readonly LevelId[] = ['l1', 'l2', 'l3', 'l4', 'l5']
