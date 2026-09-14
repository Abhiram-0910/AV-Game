// Transient simulation state shared by systems, entities, and the overlay. Not persisted.
// Reactive bits (prompt, dialogue, loading) live in a small vanilla store; hot per-tick
// state (player transform, arrows) is plain mutable data read by useFrame.
import { createStore } from 'zustand/vanilla'
import type { Object3D } from 'three'
import { BALANCE } from '@data/balance'
import type { DialogueKey } from '@data/dialogue'
import type { EnemyKind, NpcId } from '@data/levels'
import { SCENERY } from '@data/scenery'
import type { AimRay, ArrowState } from './archery/ballistics'
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
  /** 'pickup' when standing over a spent-arrow pile, an NpcId while in talk range, else null. */
  prompt: NpcId | 'pickup' | null
  /** Speech currently on screen from a talk interaction. */
  dialogue: DialogueKey | null
  /** Asset promises resolved vs. expected for the current scene. */
  loaded: number
  expected: number
  /** The one enemy the HUD shows a health bar for (set by its Enemy entity while alive). */
  boss: BossHealth | null
  /** User-toggled pause (Escape during play), not part of the level phase machine — it stops
   * the fixed tick without touching win/fail/quiz flow. */
  paused: boolean
  /** Whether the bow draw is currently active. */
  isDrawing: boolean
  /** Whether a valid target is under the landing vector. */
  hasTarget: boolean
  /** Current draw strength fraction 0..1. */
  drawStrength: number
  /** Transient hit feedback ('enemy' | 'target' | null) for visual confirmation. */
  hitFeedback: 'enemy' | 'target' | null
  /** Whether the Astra is unlocked and ready for summoning (Level 4 after 4 targets, or Level 5). */
  astraReady: boolean
  /** A castable astra charge is being held (the mouse aims it; the HUD says so). */
  astraCharging: boolean
  /** While charging Manavastra with Maricha alive: whether he stands in the cone. Null otherwise. */
  astraMaricha: 'in' | 'out' | null
  /** The active reach waypoint on screen (entities/WaypointMarker projects it): a spot, or an edge point with the
   * arrow angle when it is off camera. Null when no reach objective is active. */
  waypoint: WaypointScreen | null
  setPrompt(p: NpcId | 'pickup' | null): void
  openDialogue(key: DialogueKey | null): void
  expect(n: number): void
  markLoaded(): void
  setBoss(b: BossHealth | null): void
  setPaused(p: boolean): void
  setAimState(isDrawing: boolean, hasTarget: boolean, drawStrength: number): void
  triggerHitFeedback(kind: 'enemy' | 'target'): void
  setAstraReady(ready: boolean): void
  setAstraAim(charging: boolean, maricha: 'in' | 'out' | null): void
  setWaypoint(w: WaypointScreen | null): void
}

export interface WaypointScreen {
  onScreen: boolean
  /** Pixels from the top-left of the viewport. */
  x: number
  y: number
  /** Radians, screen space (y down): the way the edge arrow points. */
  angle: number
}

export const worldStore = createStore<WorldUi>()((set) => ({
  prompt: null,
  dialogue: null,
  loaded: 0,
  expected: 0,
  boss: null,
  paused: false,
  isDrawing: false,
  hasTarget: false,
  drawStrength: 0,
  hitFeedback: null,
  astraReady: false,
  astraCharging: false,
  astraMaricha: null,
  waypoint: null,
  setPrompt: (prompt) => set((s) => (s.prompt === prompt ? s : { prompt })),
  openDialogue: (dialogue) => set({ dialogue }),
  expect: (expected) => set({ expected, loaded: 0 }),
  markLoaded: () => set((s) => ({ loaded: s.loaded + 1 })),
  setBoss: (boss) => set({ boss }),
  setPaused: (paused) => set({ paused }),
  setAimState: (isDrawing, hasTarget, drawStrength) =>
    set((s) => {
      if (s.isDrawing === isDrawing && s.hasTarget === hasTarget && Math.abs(s.drawStrength - drawStrength) < 0.005) {
        return s
      }
      return { isDrawing, hasTarget, drawStrength }
    }),
  triggerHitFeedback: (hitFeedback) => {
    set({ hitFeedback })
    setTimeout(() => {
      set((s) => (s.hitFeedback === hitFeedback ? { hitFeedback: null } : s))
    }, BALANCE.ui.HIT_FEEDBACK_MS)
  },
  setAstraReady: (astraReady) => set({ astraReady }),
  setAstraAim: (astraCharging, astraMaricha) =>
    set((s) => (s.astraCharging === astraCharging && s.astraMaricha === astraMaricha ? s : { astraCharging, astraMaricha })),
  // Written every frame; a store update (and the edge arrow's style write) only when it moved a pixel or changed state.
  setWaypoint: (waypoint) =>
    set((s) => {
      const a = s.waypoint
      if (a === waypoint) return s
      if (a && waypoint && a.onScreen === waypoint.onScreen && Math.abs(a.x - waypoint.x) < 1 && Math.abs(a.y - waypoint.y) < 1) return s
      return { waypoint }
    }),
}))

export interface WorldSim {
  player: LocomotionState
  draw: DrawState
  /** Blend weight of the aim pose, 0..1. */
  aimBlend: number
  aimDir: [number, number, number]
  /** Camera ray through the cursor, written by FollowCamera every frame; the bow aims where it meets the ground. */
  aimRay: AimRay
  /** Mouse-look turn (radians) FollowCamera has gathered since the last tick; the next locomotion tick consumes it. */
  lookYaw: number
  /** Mouse-look camera tilt, radians (systems/camera/mouse-look.ts). */
  cameraPitch: number
  arrows: ArrowState[]
  /** Spent-arrow landing spots a player can walk up to and press E to recover (Level 5's long
   * fight is the only level whose arrow economy needs this; see stepInteraction). */
  arrowPickups: { x: number; z: number }[]
  /** Tick until which Rama plays the one-shot sword slash instead of the locomotion clip. */
  swordSlashUntilTick: number
  /** Hold-to-charge state for the astra cast, same shape as the bow's draw. */
  astraCharge: DrawState
  /** Whether the on-screen Astra button is being held down. */
  astraButtonHeld: boolean
  astraReady: boolean
  /** Agneyastra's strike point while a castable charge is held (systems/astra/step.ts); `target` when it lands on one. */
  astraAim: { point: [number, number, number]; target: boolean } | null
  /** Enemies inside Manavastra's cone whenever it is selected and castable. */
  astraCone: EnemyRuntime[]
  npcs: NpcPoint[]
  /** The NPC whose talk is open, set when E opens it; hero and NPC turn to face each other until it closes. */
  talkWith: NpcPoint | null
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
  aimRay: { origin: [0, 0, 0], dir: [0, 0, -1] },
  lookYaw: 0,
  cameraPitch: 0,
  arrows: [],
  arrowPickups: [],
  swordSlashUntilTick: 0,
  astraCharge: NO_DRAW,
  astraButtonHeld: false,
  astraReady: false,
  astraAim: null,
  astraCone: [],
  npcs: [],
  talkWith: null,
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
  world.lookYaw = 0
  world.cameraPitch = 0
  world.arrows = []
  world.arrowPickups = []
  world.swordSlashUntilTick = 0
  world.astraCharge = NO_DRAW
  world.astraButtonHeld = false
  world.astraReady = false
  world.astraAim = null
  world.astraCone = []
  world.talkWith = null
  world.alpha = 0
  world.tick = 0
  worldStore.setState({ prompt: null, dialogue: null, paused: false, isDrawing: false, hasTarget: false, drawStrength: 0, astraReady: false, astraCharging: false, astraMaricha: null })
}
