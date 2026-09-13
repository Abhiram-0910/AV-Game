// Pure wave scheduling for Level 5. Decides what should spawn this tick, honouring each
// wave's own maxAlive AND the global skinned budget minus the persistent cast.
import { BALANCE } from '@data/balance'
import type { EnemyKind, Wave } from '@data/levels'

export interface WaveProgress {
  spawned: number
  lastSpawnTick: number
}

export interface SpawnRequest {
  wave: number
  kind: EnemyKind
}

export function freshWaveProgress(waves: readonly Wave[]): WaveProgress[] {
  return waves.map(() => ({ spawned: 0, lastSpawnTick: -Infinity }))
}

/**
 * Returns at most one spawn per wave per tick. `aliveByWave` is the live count per wave,
 * `skinnedLive` the global live SkinnedMesh count (persistent cast included).
 */
export function dueSpawns(
  waves: readonly Wave[],
  progress: readonly WaveProgress[],
  tick: number,
  aliveByWave: readonly number[],
  skinnedLive: number,
): SpawnRequest[] {
  const out: SpawnRequest[] = []
  let budget = BALANCE.spawn.MAX_SKINNED - skinnedLive
  waves.forEach((w, i) => {
    const p = progress[i]
    if (budget <= 0 || tick < w.startTick || p.spawned >= w.count) return
    if (aliveByWave[i] >= w.maxAlive || tick - p.lastSpawnTick < w.spawnIntervalTicks) return
    out.push({ wave: i, kind: w.kind })
    budget -= 1
  })
  return out
}

export function recordSpawn(progress: readonly WaveProgress[], wave: number, tick: number): WaveProgress[] {
  return progress.map((p, i) => (i === wave ? { spawned: p.spawned + 1, lastSpawnTick: tick } : p))
}

/** Skinned slots already spoken for: the live count, or the persistent cast plus every requested spawn, whichever
 * is higher. A spawn only takes its slot once its GLB has loaded and the factory has built it, so budgeting from
 * the live count alone kept spawning into promised slots (L5 reached 16 / 12 on 2026-09-13). */
export function committedSkinned(live: number, persistent: number, active: number): number {
  return Math.max(live, persistent + active)
}
