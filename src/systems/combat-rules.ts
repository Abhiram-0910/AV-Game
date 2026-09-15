// Combat rules bridge for systems layer: re-exports core rules and implements checkMeleeHit.
import { BALANCE } from '@data/balance'
import { gameStore } from '@core/game-state'
import type { EnemyRuntime } from './ai/enemy-ai'
import { playAudio } from './audio'
import { type StrikeDummy, world, worldStore } from './world'

export * from '@core/combat-rules'

const HALF_CONE_COS = Math.cos((BALANCE.melee.CONE_ANGLE_DEG * Math.PI) / 360)

type Facing = { x: number; z: number; yaw: number }

/** Within melee.RANGE and inside the frontal cone. A point under Rama's feet has no direction and is not in reach. */
export function inSwordReach(player: Facing, x: number, z: number): boolean {
  const dx = x - player.x
  const dz = z - player.z
  const dist = Math.hypot(dx, dz)
  if (dist > BALANCE.melee.RANGE || dist < 1e-4) return false
  return (Math.sin(player.yaw) * dx + Math.cos(player.yaw) * dz) / dist >= HALF_CONE_COS
}

/** Maricha is flung by the Manava astra, never killed (AGENTS.md content rules): the sword passes him, as arrows do. */
const strikable = (e: EnemyRuntime) => e.state !== 'dead' && e.kind !== 'maricha'

/** Something a slash would land on right now: drives the HUD's "Press F" prompt. */
export function swordTargetInReach(player: Facing): boolean {
  return world.enemies.some((e) => strikable(e) && inSwordReach(player, e.x, e.z)) || world.dummies.some((d) => inSwordReach(player, d.x, d.z))
}

function strikeEnemy(e: EnemyRuntime, player: Facing, tick: number): void {
  const dist = Math.hypot(e.x - player.x, e.z - player.z)
  worldStore.getState().triggerHitFeedback('enemy')
  e.health = Math.max(0, e.health - BALANCE.melee.DAMAGE)
  e.invulnUntil = tick + BALANCE.combat.INVULN_TICKS
  e.x += ((e.x - player.x) / dist) * BALANCE.melee.KNOCKBACK_DISTANCE
  e.z += ((e.z - player.z) / dist) * BALANCE.melee.KNOCKBACK_DISTANCE

  if (e.health === 0) {
    e.state = 'dead'
    e.stateUntil = tick + BALANCE.spawn.DESPAWN_TICKS
    playAudio(e.kind === 'tataka' ? 'boss_groan' : 'enemy_death')
    if (e.root) world.hittable = world.hittable.filter((o) => o !== e.root)
    gameStore.getState().progress({ kind: 'defeat', enemy: e.kind })
  } else {
    e.state = 'stagger'
    e.stateUntil = tick + BALANCE.combat.STAGGER_TICKS
    playAudio('enemy_hit')
  }
}

/**
 * One sword slash: every enemy (except Maricha) and straw man within melee.RANGE and the frontal cone is struck. An enemy
 * takes damage, knockback and stagger; a straw man counts toward the 'strike' objective.
 */
export function checkMeleeHit(player: Facing, enemies: EnemyRuntime[], tick: number, dummies: StrikeDummy[] = world.dummies): boolean {
  playAudio('sword_slash')
  let hitAny = false
  for (const d of dummies) {
    if (!inSwordReach(player, d.x, d.z)) continue
    hitAny = true
    d.struckTick = tick
    playAudio('arrow_hit_target')
    worldStore.getState().triggerHitFeedback('target')
    gameStore.getState().progress({ kind: 'strike' })
  }
  for (const e of enemies) {
    if (!strikable(e) || tick < e.invulnUntil || !inSwordReach(player, e.x, e.z)) continue
    hitAny = true
    strikeEnemy(e, player, tick)
  }
  return hitAny
}
