// Enemy FSM on the fixed tick: idle → chase → attack → stagger/dead. Movement and combat
// math are pure; `root` is carried only so archery's hit-test can match a raycast hit back to
// this runtime by object identity (see systems/archery/step.ts).
import type { Object3D } from 'three'
import { BALANCE } from '@data/balance'
import type { EnemyKind } from '@data/levels'
import { type Combatant, resolveHit } from '@core/combat-rules'
import { angleDelta } from '@systems/locomotion/kinematic'

export type EnemyState = 'idle' | 'chase' | 'attack' | 'stagger' | 'dead'

export interface EnemyRuntime extends Combatant {
  kind: EnemyKind
  x: number
  z: number
  yaw: number
  state: EnemyState
  /** Tick until which the current state holds (attack windup, stagger, death dissolve). */
  stateUntil: number
  /** Tick before which a landed or missed attack cannot be followed by another. */
  attackCooldownUntil: number
  /** Set true for exactly the tick an attack connects; the driver reads and clears it. */
  didAttack: boolean
  /** Set true for exactly the tick a landed attack hit the objective (Level 5's altar) instead
   * of the player — "rakshasas go for the altar, not for you" (AGENTS.md). */
  attackedObjective: boolean
  /** Correlates this runtime back to a wave-scheduler spawn request (Level 5); unused elsewhere. */
  spawnId: string | null
  root: Object3D | null
  /** Set by Manavastra on Maricha: the way he is flung, for the render-side arc only (entities/Enemy.tsx). */
  flung?: { x: number; z: number }
}

export function spawnEnemy(kind: EnemyKind, pos: readonly [number, number, number], spawnId: string | null = null): EnemyRuntime {
  return {
    kind,
    health: BALANCE.enemies[kind].HEALTH,
    invulnUntil: 0,
    x: pos[0],
    z: pos[2],
    yaw: 0,
    state: 'idle',
    stateUntil: 0,
    attackCooldownUntil: 0,
    didAttack: false,
    attackedObjective: false,
    spawnId,
    root: null,
  }
}

/** Apply an arrow hit; transitions to stagger (survived) or dead (defeated). Mutates in place. */
export function applyArrowHit(e: EnemyRuntime, tick: number, distance: number): void {
  if (e.state === 'dead') return
  const result = resolveHit(e, 'arrow', 'player', tick, distance)
  e.health = result.target.health
  e.invulnUntil = result.target.invulnUntil
  if (result.outcome === 'defeated') {
    e.state = 'dead'
    e.stateUntil = tick + BALANCE.spawn.DESPAWN_TICKS
  } else if (result.outcome === 'hit') {
    e.state = 'stagger'
    e.stateUntil = tick + BALANCE.combat.STAGGER_TICKS
  }
}

/**
 * One fixed tick of movement and state. Mutates `e` in place; sets `e.didAttack` /
 * `e.attackedObjective` on the tick a hit lands. Without `objective` this is Phase D's
 * player-only chase (Tataka). With one (Level 5's altar), the enemy paths toward the
 * objective by default, but attacks the player instead whenever the player is the one
 * actually in reach — "stand between them and the fire".
 */
export function stepEnemy(e: EnemyRuntime, player: { x: number; z: number }, tick: number, dt: number, objective?: { x: number; z: number }): void {
  e.didAttack = false
  e.attackedObjective = false
  if (e.state === 'dead') return
  const stats = BALANCE.enemies[e.kind]
  const dxPlayer = player.x - e.x
  const dzPlayer = player.z - e.z
  const distPlayer = Math.hypot(dxPlayer, dzPlayer)
  const goal = objective ?? player
  const dxGoal = goal.x - e.x
  const dzGoal = goal.z - e.z
  const distGoal = Math.hypot(dxGoal, dzGoal)
  const targetIsPlayer = !objective || distPlayer <= stats.REACH
  const dist = targetIsPlayer ? distPlayer : distGoal
  const facing = Math.atan2(targetIsPlayer ? dxPlayer : dxGoal, targetIsPlayer ? dzPlayer : dzGoal)

  if (e.state === 'stagger') {
    if (tick >= e.stateUntil) e.state = 'chase'
    return
  }
  if (e.state === 'idle') {
    if (objective || distPlayer <= BALANCE.combat.AGGRO_RADIUS) e.state = 'chase'
    return
  }
  if (e.state === 'attack') {
    e.yaw = facing
    if (tick >= e.stateUntil) {
      const inReach = dist <= stats.REACH
      e.didAttack = inReach && targetIsPlayer
      e.attackedObjective = inReach && !targetIsPlayer
      e.attackCooldownUntil = tick + stats.ATTACK_COOLDOWN
      e.state = 'chase'
    }
    return
  }
  // chase
  e.yaw += angleDelta(e.yaw, facing) * Math.min(1, dt * 8)
  if (dist <= stats.REACH) {
    if (tick >= e.attackCooldownUntil) {
      e.state = 'attack'
      e.stateUntil = tick + BALANCE.combat.ATTACK_WINDUP_TICKS
    }
    // else: in reach but on cooldown — hold ground, keep facing (set above).
  } else {
    const step = stats.SPEED * dt
    e.x += (dxGoal / distGoal) * step
    e.z += (dzGoal / distGoal) * step
  }
}
