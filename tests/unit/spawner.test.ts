import { afterEach, describe, expect, it, vi } from 'vitest'
import { BALANCE } from '@data/balance'
import { LEVELS } from '@data/levels'
import { acquireSkinnedSlot, liveSkinned, peakSkinned, releaseSkinnedSlot, resetSkinnedBudget } from '@systems/spawner/skinned-budget'
import { committedSkinned, dueSpawns, freshWaveProgress, recordSpawn } from '@systems/spawner/wave-scheduler'

afterEach(() => {
  resetSkinnedBudget()
  vi.restoreAllMocks()
})

describe('skinned budget', () => {
  it('counts live and peak, and console.errors above MAX_SKINNED', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const keys = Array.from({ length: BALANCE.spawn.MAX_SKINNED }, (_, i) => acquireSkinnedSlot(`c${i}`))
    expect(liveSkinned()).toBe(BALANCE.spawn.MAX_SKINNED)
    expect(error).not.toHaveBeenCalled()
    const extra = acquireSkinnedSlot('one-too-many')
    expect(error).toHaveBeenCalledTimes(1)
    expect(error.mock.calls[0][0]).toMatch(/skinned budget exceeded: 13 > 12/)
    releaseSkinnedSlot(extra)
    keys.forEach(releaseSkinnedSlot)
    expect(liveSkinned()).toBe(0)
    expect(peakSkinned()).toBe(BALANCE.spawn.MAX_SKINNED + 1)
  })
})

describe('wave scheduler', () => {
  const waves = LEVELS[4].waves
  const persistent = LEVELS[4].persistentSkinned.length

  it('spawns nothing before a wave starts and staggers by interval', () => {
    let progress = freshWaveProgress(waves)
    expect(dueSpawns(waves, progress, 0, waves.map(() => 0), persistent)).toEqual([])
    const first = dueSpawns(waves, progress, 300, waves.map(() => 0), persistent)
    expect(first).toEqual([{ wave: 0, kind: 'rakshasa' }])
    progress = recordSpawn(progress, 0, 300)
    expect(dueSpawns(waves, progress, 301, [1, 0, 0, 0, 0, 0], persistent + 1)).toEqual([])
    expect(dueSpawns(waves, progress, 300 + waves[0].spawnIntervalTicks, [1, 0, 0, 0, 0, 0], persistent + 1)).toHaveLength(1)
  })

  it('never exceeds the global budget even when several waves are due', () => {
    const progress = freshWaveProgress(waves)
    const live = BALANCE.spawn.MAX_SKINNED - 1
    const due = dueSpawns(waves, progress, 4560, waves.map(() => 0), live)
    expect(due).toHaveLength(1)
    expect(dueSpawns(waves, progress, 4560, waves.map(() => 0), BALANCE.spawn.MAX_SKINNED)).toEqual([])
  })

  it('respects each wave count and maxAlive', () => {
    let progress = freshWaveProgress(waves)
    for (let i = 0; i < waves[0].count; i += 1) progress = recordSpawn(progress, 0, 300 + i * 200)
    expect(dueSpawns(waves, progress, 2000, [0, 0, 0, 0, 0, 0], persistent).some((d) => d.wave === 0)).toBe(false)
    const fresh = freshWaveProgress(waves)
    expect(dueSpawns(waves, fresh, 1500, [0, waves[1].maxAlive, 0, 0, 0, 0], persistent).some((d) => d.wave === 1)).toBe(false)
  })
})

describe('committed skinned slots', () => {
  it('counts spawns still loading against the budget, not just built characters', () => {
    expect(committedSkinned(3, 3, 9)).toBe(12) // nine requested, none built yet
    expect(committedSkinned(12, 3, 4)).toBe(12) // dissolving enemies still hold their slots
  })
})
