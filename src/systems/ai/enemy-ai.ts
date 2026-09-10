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
  root: Object3D | null
}

export function spawnEnemy(kind: EnemyKind, pos: readonly [number, number, number]): EnemyRuntime {
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

/** One fixed tick of movement and state. Mutates `e` in place; sets `e.didAttack` on the tick a hit lands. */
export function stepEnemy(e: EnemyRuntime, player: { x: number; z: number }, tick: number, dt: number): void {
  e.didAttack = false
  if (e.state === 'dead') return
  const stats = BALANCE.enemies[e.kind]
  const dx = player.x - e.x
  const dz = player.z - e.z
  const distance = Math.hypot(dx, dz)
  const facing = Math.atan2(dx, dz)

  if (e.state === 'stagger') {
    if (tick >= e.stateUntil) e.state = 'chase'
    return
  }
  if (e.state === 'idle') {
    if (distance <= BALANCE.combat.AGGRO_RADIUS) e.state = 'chase'
    return
  }
  if (e.state === 'attack') {
    e.yaw = facing
    if (tick >= e.stateUntil) {
      e.didAttack = distance <= stats.REACH
      e.attackCooldownUntil = tick + stats.ATTACK_COOLDOWN
      e.state = 'chase'
    }
    return
  }
  // chase
  e.yaw += angleDelta(e.yaw, facing) * Math.min(1, dt * 8)
  if (distance <= stats.REACH) {
    if (tick >= e.attackCooldownUntil) {
      e.state = 'attack'
      e.stateUntil = tick + BALANCE.combat.ATTACK_WINDUP_TICKS
    }
    // else: in reach but on cooldown — hold ground, keep facing (set above).
  } else {
    const step = stats.SPEED * dt
    e.x += (dx / distance) * step
    e.z += (dz / distance) * step
  }
}
