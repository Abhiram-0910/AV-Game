// Transient simulation state shared by systems, entities, and the overlay. Not persisted.
// Reactive bits (prompt, dialogue, loading) live in a small vanilla store; hot per-tick
// state (player transform, arrows) is plain mutable data read by useFrame.
import { createStore } from 'zustand/vanilla'
import type { Object3D } from 'three'
import type { DialogueKey } from '@data/dialogue'
import type { EnemyKind, NpcId } from '@data/levels'
import { SCENERY } from '@data/scenery'
import type { ArrowState } from './archery/ballistics'
import { NO_DRAW, type DrawState } from './archery/draw'
import type { EnemyRuntime } from './ai/enemy-ai'
import { type LocomotionState, spawnState } from './locomotion/kinematic'
import type { NpcPoint } from './interaction/interact'

export interface BossHealth {
  kind: EnemyKind
  health: number
  max: number
}

export interface WorldUi {
  prompt: NpcId | null
  /** Speech currently on screen from a talk interaction. */
  dialogue: DialogueKey | null
  /** Asset promises resolved vs. expected for the current scene. */
  loaded: number
  expected: number
  /** The one enemy the HUD shows a health bar for (set by its Enemy entity while alive). */
  boss: BossHealth | null
  setPrompt(p: NpcId | null): void
  openDialogue(key: DialogueKey | null): void
  expect(n: number): void
  markLoaded(): void
  setBoss(b: BossHealth | null): void
}

export const worldStore = createStore<WorldUi>()((set) => ({
  prompt: null,
  dialogue: null,
  loaded: 0,
  expected: 0,
  boss: null,
  setPrompt: (prompt) => set((s) => (s.prompt === prompt ? s : { prompt })),
  openDialogue: (dialogue) => set({ dialogue }),
  expect: (expected) => set({ expected, loaded: 0 }),
  markLoaded: () => set((s) => ({ loaded: s.loaded + 1 })),
  setBoss: (boss) => set({ boss }),
}))

export interface WorldSim {
  player: LocomotionState
  draw: DrawState
  /** Blend weight of the aim pose, 0..1. */
  aimBlend: number
  aimDir: [number, number, number]
  arrows: ArrowState[]
  /** Tick until which Rama plays the one-shot sword slash instead of the locomotion clip. */
  swordSlashUntilTick: number
  /** Hold-to-charge state for the astra cast, same shape as the bow's draw. */
  astraCharge: DrawState
  npcs: NpcPoint[]
  ground: Object3D[]
  hittable: Object3D[]
  /** Enemy AI + combat runtime state, one entry per live Enemy entity. */
  enemies: EnemyRuntime[]
  /** Render interpolation factor written by the driver each frame. */
  alpha: number
  tick: number
  bounds: typeof BOUNDS
}

const BOUNDS = Object.fromEntries(Object.entries(SCENERY).map(([id, s]) => [id, s.bounds])) as Record<
  keyof typeof SCENERY,
  { minX: number; maxX: number; minZ: number; maxZ: number }
>

export const world: WorldSim = {
  player: spawnState([0, 0, 0], 0),
  draw: NO_DRAW,
  aimBlend: 0,
  aimDir: [0, 0, -1],
  arrows: [],
  swordSlashUntilTick: 0,
  astraCharge: NO_DRAW,
  npcs: [],
  ground: [],
  hittable: [],
  enemies: [],
  alpha: 0,
  tick: 0,
  bounds: BOUNDS,
}

/**
 * Called from the scene's mount effect, which React runs AFTER the children's effects — so
 * this must not touch npcs/ground/hittable/enemies: entities register there on mount and
 * remove themselves on unmount, and clearing here would wipe registrations that already
 * happened.
 */
export function resetWorld(pos: readonly [number, number, number], yaw: number): void {
  world.player = spawnState(pos, yaw)
  world.draw = NO_DRAW
  world.aimBlend = 0
  world.arrows = []
  world.swordSlashUntilTick = 0
  world.astraCharge = NO_DRAW
  world.alpha = 0
  world.tick = 0
  worldStore.setState({ prompt: null, dialogue: null })
}
