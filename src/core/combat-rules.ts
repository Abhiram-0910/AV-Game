// Damage resolution, hit validity, invulnerability windows. Pure functions.
import { BALANCE } from '@data/balance'
import type { EnemyKind } from '@data/levels'

export type CombatantKind = EnemyKind | 'player'

export interface Combatant {
  kind: CombatantKind
  health: number
  /** Tick until which this combatant ignores hits. */
  invulnUntil: number
}

export type HitKind = 'arrow' | 'headshot' | 'melee' | 'boulder' | 'astra:agneya' | 'astra:vayavya' | 'astra:manava'

export type HitOutcome = 'ignored' | 'hit' | 'defeated' | 'flung'

export interface HitResult {
  target: Combatant
  outcome: HitOutcome
  damage: number
}

export function damageFor(hit: HitKind, attacker: CombatantKind): number {
  switch (hit) {
    case 'arrow':
      return BALANCE.arrow.DAMAGE
    case 'headshot':
      return BALANCE.arrow.HEADSHOT_DAMAGE
    case 'boulder':
      return BALANCE.combat.BOULDER_DAMAGE
    case 'astra:agneya':
    case 'astra:vayavya':
      return BALANCE.astra.DAMAGE
    case 'astra:manava':
      return 0
    case 'melee':
      return attacker === 'player' ? BALANCE.melee.DAMAGE : BALANCE.enemies[attacker].DAMAGE
  }
}

export function invulnTicksFor(kind: CombatantKind): number {
  return kind === 'player' ? BALANCE.player.INVULN_TICKS : BALANCE.combat.INVULN_TICKS
}

export function isAlive(c: Combatant): boolean {
  return c.health > 0
}

export function isHitValid(target: Combatant, tick: number, distance: number): boolean {
  if (!isAlive(target)) return false
  if (tick < target.invulnUntil) return false
  return distance >= 0 && distance <= BALANCE.combat.MAX_HIT_RANGE
}

export function resolveHit(
  target: Combatant,
  hit: HitKind,
  attacker: CombatantKind,
  tick: number,
  distance: number,
): HitResult {
  if (!isHitValid(target, tick, distance)) return { target, outcome: 'ignored', damage: 0 }
  // Manavastra throws, it never kills. This is the Maricha rule from the text.
  if (hit === 'astra:manava') {
    return { target: { ...target, invulnUntil: tick + invulnTicksFor(target.kind) }, outcome: 'flung', damage: 0 }
  }
  const damage = damageFor(hit, attacker)
  const health = Math.max(0, target.health - damage)
  const next = { ...target, health, invulnUntil: tick + invulnTicksFor(target.kind) }
  return { target: next, outcome: health === 0 ? 'defeated' : 'hit', damage }
}
