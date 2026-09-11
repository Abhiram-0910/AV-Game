import { describe, expect, it } from 'vitest'
import { BALANCE } from '@data/balance'
import { damageFor, isHitValid, resolveHit, type Combatant } from '@core/combat-rules'
import { checkMeleeHit } from '@systems/combat-rules'
import { spawnEnemy } from '@systems/ai/enemy-ai'

const rakshasa = (): Combatant => ({ kind: 'rakshasa', health: BALANCE.enemies.rakshasa.HEALTH, invulnUntil: 0 })

describe('combat rules', () => {
  it('an arrow does ARROW damage and opens an invulnerability window', () => {
    const r = resolveHit(rakshasa(), 'arrow', 'player', 100, 10)
    expect(r.outcome).toBe('hit')
    expect(r.target.health).toBe(BALANCE.enemies.rakshasa.HEALTH - BALANCE.arrow.DAMAGE)
    expect(r.target.invulnUntil).toBe(100 + BALANCE.combat.INVULN_TICKS)
  })

  it('ignores a second hit inside the invulnerability window', () => {
    const tataka: Combatant = { kind: 'tataka', health: BALANCE.enemies.tataka.HEALTH, invulnUntil: 0 }
    const first = resolveHit(tataka, 'arrow', 'player', 100, 10)
    const second = resolveHit(first.target, 'arrow', 'player', 101, 10)
    expect(second.outcome).toBe('ignored')
    expect(second.target).toBe(first.target)
    expect(resolveHit(first.target, 'arrow', 'player', first.target.invulnUntil, 10).outcome).toBe('hit')
  })

  it('rejects hits on dead targets and out-of-range hits', () => {
    expect(isHitValid({ ...rakshasa(), health: 0 }, 0, 1)).toBe(false)
    expect(isHitValid(rakshasa(), 0, BALANCE.combat.MAX_HIT_RANGE + 1)).toBe(false)
    expect(isHitValid(rakshasa(), 0, -1)).toBe(false)
  })

  it('a headshot defeats a rakshasa and health never goes negative', () => {
    const r = resolveHit(rakshasa(), 'headshot', 'player', 0, 5)
    expect(r.outcome).toBe('defeated')
    expect(r.target.health).toBe(0)
  })

  it('the Manavastra flings Maricha and never kills', () => {
    const maricha: Combatant = { kind: 'maricha', health: 1, invulnUntil: 0 }
    const r = resolveHit(maricha, 'astra:manava', 'player', 0, 5)
    expect(r.outcome).toBe('flung')
    expect(r.target.health).toBe(1)
    expect(r.damage).toBe(0)
  })

  it('enemy melee uses that enemy kind’s damage and the player’s longer window', () => {
    const player: Combatant = { kind: 'player', health: 100, invulnUntil: 0 }
    const r = resolveHit(player, 'melee', 'tataka', 10, 1)
    expect(r.damage).toBe(BALANCE.enemies.tataka.DAMAGE)
    expect(r.target.invulnUntil).toBe(10 + BALANCE.player.INVULN_TICKS)
  })

  it('player melee uses BALANCE.melee.DAMAGE', () => {
    expect(damageFor('melee', 'player')).toBe(BALANCE.melee.DAMAGE)
  })

  it('checkMeleeHit damages and knocks back enemy in 120 deg frontal cone within 2.2m', () => {
    const player = { x: 0, z: 0, yaw: 0 } // Facing +z (sin(0)=0, cos(0)=1)
    const inCone = spawnEnemy('rakshasa', [0, 0, 1.8])
    const outCone = spawnEnemy('rakshasa', [0, 0, -1.8]) // behind player
    const outRange = spawnEnemy('rakshasa', [0, 0, 3.5]) // too far

    const hit = checkMeleeHit(player, [inCone, outCone, outRange], 10)
    expect(hit).toBe(true)
    expect(inCone.health).toBe(Math.max(0, BALANCE.enemies.rakshasa.HEALTH - BALANCE.melee.DAMAGE))
    expect(inCone.z).toBeCloseTo(1.8 + BALANCE.melee.KNOCKBACK_DISTANCE)
    expect(inCone.state).toBe(inCone.health === 0 ? 'dead' : 'stagger')

    // Out of cone / range unaffected
    expect(outCone.health).toBe(BALANCE.enemies.rakshasa.HEALTH)
    expect(outCone.z).toBe(-1.8)
    expect(outRange.health).toBe(BALANCE.enemies.rakshasa.HEALTH)
  })
})
