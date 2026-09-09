import { describe, expect, it } from 'vitest'
import { BALANCE } from '@data/balance'
import { isHitValid, resolveHit, type Combatant } from '@core/combat-rules'

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
})
