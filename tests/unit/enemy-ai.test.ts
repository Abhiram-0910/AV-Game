import { describe, expect, it } from 'vitest'
import { BALANCE } from '@data/balance'
import { applyArrowHit, spawnEnemy, stepEnemy } from '@systems/ai/enemy-ai'

describe('enemy AI', () => {
  it('stays idle until the player enters aggro range, then chases', () => {
    const e = spawnEnemy('tataka', [0, 0, 0])
    stepEnemy(e, { x: 0, z: -(BALANCE.combat.AGGRO_RADIUS + 1) }, 0, 1 / 60)
    expect(e.state).toBe('idle')
    stepEnemy(e, { x: 0, z: -(BALANCE.combat.AGGRO_RADIUS - 1) }, 1, 1 / 60)
    expect(e.state).toBe('chase')
  })

  it('chases toward the player and switches to attack once in reach', () => {
    const e = spawnEnemy('tataka', [0, 0, 0])
    e.state = 'chase'
    const before = e.z
    stepEnemy(e, { x: 0, z: -10 }, 0, 1 / 60)
    expect(e.z).toBeLessThan(before) // moved toward the player (more negative z)
    e.z = -(BALANCE.enemies.tataka.REACH - 0.1)
    stepEnemy(e, { x: 0, z: 0 }, 0, 1 / 60)
    expect(e.state).toBe('attack')
  })

  it('attack lands once the windup elapses, only if still in reach', () => {
    const e = spawnEnemy('tataka', [0, 0, -1])
    e.state = 'attack'
    e.stateUntil = 5
    for (let t = 0; t < 5; t += 1) stepEnemy(e, { x: 0, z: 0 }, t, 1 / 60)
    expect(e.didAttack).toBe(false)
    stepEnemy(e, { x: 0, z: 0 }, 5, 1 / 60)
    expect(e.didAttack).toBe(true)
    expect(e.state).toBe('chase')
  })

  it('will not attack again until ATTACK_COOLDOWN elapses, even standing in reach', () => {
    const e = spawnEnemy('tataka', [0, 0, -1])
    e.state = 'attack'
    e.stateUntil = 5
    stepEnemy(e, { x: 0, z: 0 }, 5, 1 / 60) // lands, state -> chase, cooldown set
    expect(e.didAttack).toBe(true)
    expect(e.state).toBe('chase')
    stepEnemy(e, { x: 0, z: 0 }, 6, 1 / 60) // still in reach, but on cooldown
    expect(e.state).toBe('chase')
    stepEnemy(e, { x: 0, z: 0 }, e.attackCooldownUntil, 1 / 60) // cooldown elapsed
    expect(e.state).toBe('attack')
  })

  it('with an objective (Level 5), paths toward it, not the far-off player', () => {
    const e = spawnEnemy('rakshasa', [0, 0, 10])
    e.state = 'chase'
    const before = e.z
    stepEnemy(e, { x: 30, z: 30 }, 0, 1 / 60, { x: 0, z: 0 })
    expect(e.z).toBeLessThan(before) // moved toward the objective, not the distant player
  })

  it('attacks the player instead of the objective when the player blocks in reach ("stand between them and the fire")', () => {
    const reach = BALANCE.enemies.rakshasa.REACH
    const e = spawnEnemy('rakshasa', [0, 0, -(reach - 0.1)])
    e.state = 'attack'
    e.stateUntil = 0
    stepEnemy(e, { x: 0, z: 0 }, 0, 1 / 60, { x: 0, z: -20 }) // player in reach, objective far past them
    expect(e.didAttack).toBe(true)
    expect(e.attackedObjective).toBe(false)
  })

  it('attacks the objective once in its reach and the player is elsewhere', () => {
    const reach = BALANCE.enemies.rakshasa.REACH
    const e = spawnEnemy('rakshasa', [0, 0, -(reach - 0.1)])
    e.state = 'attack'
    e.stateUntil = 0
    stepEnemy(e, { x: 30, z: 30 }, 0, 1 / 60, { x: 0, z: 0 }) // objective in reach, player far away
    expect(e.attackedObjective).toBe(true)
    expect(e.didAttack).toBe(false)
  })

  it('turns on a player standing between it and the objective, inside ENGAGE_RADIUS, and walks at him', () => {
    const e = spawnEnemy('rakshasa', [0, 0, -10])
    e.state = 'chase'
    const player = { x: 1.5, z: -10 + BALANCE.yajna.ENGAGE_RADIUS - 1.5 }
    stepEnemy(e, player, 0, 1 / 60, { x: 0, z: 0 })
    expect(e.x).toBeGreaterThan(0) // stepped sideways toward the player, not straight down the line to the fire
    e.x = player.x
    e.z = player.z - (BALANCE.enemies.rakshasa.REACH - 0.1)
    stepEnemy(e, player, 1, 1 / 60, { x: 0, z: 0 })
    e.stateUntil = 1
    stepEnemy(e, player, 1, 1 / 60, { x: 0, z: 0 })
    expect(e.didAttack).toBe(true)
    expect(e.attackedObjective).toBe(false)
  })

  it('ignores a player who is farther from it than the objective, even inside ENGAGE_RADIUS', () => {
    const e = spawnEnemy('rakshasa', [0, 0, -2])
    e.state = 'chase'
    stepEnemy(e, { x: 0, z: 1 }, 0, 1 / 60, { x: 0, z: 0 }) // player 3 m away, behind the fire (2 m away)
    expect(e.x).toBe(0)
    expect(e.z).toBeGreaterThan(-2)
    expect(e.z).toBeLessThan(-1.9) // one tick toward the fire
  })

  it('keeps pathing to the objective when the player is ahead of it but outside ENGAGE_RADIUS', () => {
    const e = spawnEnemy('rakshasa', [0, 0, -20])
    e.state = 'chase'
    stepEnemy(e, { x: 3, z: -20 + BALANCE.yajna.ENGAGE_RADIUS + 1 }, 0, 1 / 60, { x: 0, z: 0 })
    expect(e.x).toBe(0) // straight down the line to the fire
  })

  it('a non-lethal arrow staggers; a lethal one kills and stops movement', () => {
    const e = spawnEnemy('tataka', [0, 0, -1])
    e.state = 'chase'
    applyArrowHit(e, 10, 1)
    expect(e.state).toBe('stagger')
    expect(e.health).toBe(BALANCE.enemies.tataka.HEALTH - BALANCE.arrow.DAMAGE)
    e.health = BALANCE.arrow.DAMAGE
    e.invulnUntil = 0
    applyArrowHit(e, 20, 1)
    expect(e.state).toBe('dead')
    expect(e.health).toBe(0)
    const pos = { x: e.x, z: e.z }
    stepEnemy(e, { x: 100, z: 100 }, 21, 1 / 60)
    expect({ x: e.x, z: e.z }).toEqual(pos)
  })
})
