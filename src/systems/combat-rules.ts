// Combat rules bridge for systems layer: re-exports core rules and implements checkMeleeHit.
import { BALANCE } from '@data/balance'
import { gameStore } from '@core/game-state'
import type { EnemyRuntime } from './ai/enemy-ai'
import { playAudio } from './audio'
import { world, worldStore } from './world'

export * from '@core/combat-rules'

const HALF_CONE_COS = Math.cos((BALANCE.melee.CONE_ANGLE_DEG * Math.PI) / 360)

/**
 * Executes a melee sword slash check in a 120-degree frontal cone up to 2.2m.
 * Deals damage, applies knockback and stagger, and triggers audio/visual feedback.
 */
export function checkMeleeHit(
  player: { x: number; z: number; yaw: number },
  enemies: EnemyRuntime[],
  tick: number,
): boolean {
  playAudio('sword_slash')
  const fx = Math.sin(player.yaw)
  const fz = Math.cos(player.yaw)
  let hitAny = false

  for (const e of enemies) {
    if (e.state === 'dead' || tick < e.invulnUntil) continue
    const dx = e.x - player.x
    const dz = e.z - player.z
    const dist = Math.hypot(dx, dz)
    if (dist > BALANCE.melee.RANGE || dist < 1e-4) continue

    const nx = dx / dist
    const nz = dz / dist
    const dot = fx * nx + fz * nz
    if (dot < HALF_CONE_COS) continue

    hitAny = true
    worldStore.getState().triggerHitFeedback('enemy')
    e.health = Math.max(0, e.health - BALANCE.melee.DAMAGE)
    e.invulnUntil = tick + BALANCE.combat.INVULN_TICKS
    e.x += nx * BALANCE.melee.KNOCKBACK_DISTANCE
    e.z += nz * BALANCE.melee.KNOCKBACK_DISTANCE

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

  return hitAny
}
