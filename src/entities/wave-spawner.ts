// Wave spawning for Level 5: decides what should exist each fixed tick using the pure
// scheduler built (and tested) in pass 1, systems/spawner/wave-scheduler.ts, wired up for the
// first time here. A hook, not a component — it owns the active-spawn list and tick handler;
// the scene renders `active` as <Enemy> instances and passes `onTick` to <SimulationDriver>,
// which calls it once per fixed tick (never once per render frame — see updateMovingTargets's
// comment in systems/archery/step.ts for why that distinction matters under SwiftShader).
// The fixed loop can run several ticks per rendered frame (BALANCE.loop.MAX_SUBSTEPS), so onTick
// can fire more than once before React re-renders — every read of `active` inside it goes
// through setActive's updater so each call sees the previous call's result, not a stale render.
import { useCallback, useRef, useState } from 'react'
import type { EnemyKind, Vec3, Wave } from '@data/levels'
import { liveSkinned } from '@systems/spawner/skinned-budget'
import { committedSkinned, dueSpawns, freshWaveProgress, recordSpawn, type WaveProgress } from '@systems/spawner/wave-scheduler'
import { world } from '@systems/world'

export interface WaveSpawn {
  id: string
  kind: EnemyKind
  wave: number
  pos: Vec3
}

/** Cycles through the level's outer waypoints so an assault doesn't funnel from one direction. */
function spawnPos(spots: readonly Vec3[], index: number): Vec3 {
  return spots[index % spots.length]
}

/** `persistent`: the level's always-present cast, which holds skinned slots before any wave spawns. */
export function useWaveSpawner(waves: readonly Wave[], spots: readonly Vec3[], persistent: number) {
  const [active, setActive] = useState<WaveSpawn[]>([])
  const progressRef = useRef<WaveProgress[]>(freshWaveProgress(waves))
  const nextIdRef = useRef(0)

  const onTick = useCallback(
    (tick: number) => {
      setActive((prev) => {
        // Prune spawns whose runtime finished dissolving — frees the wave's own maxAlive slot
        // immediately, and (once React unmounts the <Enemy>) the global skinned-budget slot too.
        const kept = prev.filter((a) => {
          const rt = world.enemies.find((e) => e.spawnId === a.id)
          return !rt || rt.state !== 'dead' || tick < rt.stateUntil
        })
        const aliveByWave = waves.map((_, i) => kept.filter((a) => a.wave === i).length)
        const requests = dueSpawns(waves, progressRef.current, tick, aliveByWave, committedSkinned(liveSkinned(), persistent, kept.length))
        if (requests.length === 0) return kept.length === prev.length ? prev : kept
        let progress = progressRef.current
        const spawned = requests.map((r) => {
          progress = recordSpawn(progress, r.wave, tick)
          nextIdRef.current += 1
          return { id: `w${r.wave}-${nextIdRef.current}`, kind: r.kind, wave: r.wave, pos: spawnPos(spots, nextIdRef.current) }
        })
        progressRef.current = progress
        return [...kept, ...spawned]
      })
    },
    [waves, spots, persistent],
  )

  return { active, onTick }
}
