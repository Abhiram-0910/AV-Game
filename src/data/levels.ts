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
  waypoints: Readonly<Record<string, Vec3>>
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
    persistentSkinned: ['rama', 'lakshmana', 'vishwamitra', 'dasharatha', 'vasishtha'],
    playerSpawn: { pos: [0, 0, 14], yaw: Math.PI },
    waypoints: { throne: [0, 0, 2], vishwamitra: [3, 0, 4], vasishtha: [-3, 0, 4] },
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
    waypoints: { riverbank: [0, 0, -18], range: [12, 0, -30] },
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
    waypoints: { forestEdge: [0, 0, 6], clearing: [0, 0, -10] },
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
    waypoints: { firingLine: [0, 0, -4] },
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
    waypoints: { altar: [0, 0, 0], north: [0, 0, -30], east: [30, 0, 0], west: [-30, 0, 0] },
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
      { startTick: 300, kind: 'rakshasa', count: 4, spawnIntervalTicks: 120, maxAlive: 4 },
      { startTick: 1500, kind: 'rakshasa', count: 6, spawnIntervalTicks: 90, maxAlive: 6 },
      { startTick: 3000, kind: 'rakshasa', count: 8, spawnIntervalTicks: 75, maxAlive: 6 },
      { startTick: 4500, kind: 'rakshasa', count: 4, spawnIntervalTicks: 90, maxAlive: 4 },
      { startTick: 4500, kind: 'subahu', count: 1, spawnIntervalTicks: 1, maxAlive: 1 },
      { startTick: 4560, kind: 'maricha', count: 1, spawnIntervalTicks: 1, maxAlive: 1 },
    ],
    quizGate: null,
    codexCard: 'maricha-subahu',
    targetSeconds: 110,
  },
]

export const LEVEL_ORDER: readonly LevelId[] = ['l1', 'l2', 'l3', 'l4', 'l5']
