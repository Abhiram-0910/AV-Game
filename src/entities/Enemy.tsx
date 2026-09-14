// A hostile character driven by the enemy AI's fixed-tick FSM (systems/ai/enemy-ai.ts).
// Registers into world.enemies (AI + combat runtime) and world.hittable (arrows can hit it).
// Generic across every EnemyKind sharing the male/female base mesh + shared clip library —
// see character-factory.ts; no per-creature component needed.
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { type Group, type Material } from 'three'
import { BALANCE } from '@data/balance'
import type { EnemyKind, Vec3 } from '@data/levels'
import { ASTRA_LOOK } from '@data/scenery'
import { playAudio } from '@systems/audio'
import { spawnEnemy, type EnemyRuntime } from '@systems/ai/enemy-ai'
import { world, worldStore } from '@systems/world'
import { BlobShadow } from '@render/blob-shadow'
import { buildCharacter, type BuiltCharacter } from '@render/character-factory'
import type { ResolvedTier } from '@render/manifest'

const CLIP_FOR_STATE = { idle: 'IDLE', chase: 'WALK', attack: 'THROW', stagger: 'HIT', dead: 'DEATH' } as const
const FLING = ASTRA_LOOK.FLING

/** Maricha flung by Manavastra (the text: flung, not killed): carried up and away, tumbling, then gone. Render only. */
function flingAway(g: Group, dir: { x: number; z: number }, seconds: number): void {
  const u = Math.min(1, seconds / FLING.SEC)
  g.position.x += dir.x * FLING.DIST * u * u
  g.position.z += dir.z * FLING.DIST * u * u
  g.position.y += FLING.HEIGHT * u
  g.rotation.x = -u * FLING.TUMBLE
  g.visible = u < 1
}

function setOpacity(mesh: { material: Material | Material[] }, opacity: number): void {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  for (const m of materials) {
    m.transparent = true
    m.opacity = opacity
  }
}

/** Dissolves a dead enemy's mesh over DESPAWN_TICKS; otherwise keeps the boss bar in sync,
 * and triggers enemy hit, groan, and death sounds. */
function updateBossAndDissolve(
  runtime: EnemyRuntime,
  built: BuiltCharacter,
  kind: EnemyKind,
  boss: boolean,
  lastHealth: { current: number | null },
  playedDeath: { current: boolean },
): void {
  if (runtime.state === 'dead') {
    if (!playedDeath.current) {
      playedDeath.current = true
      playAudio('enemy_death')
    }
    if (boss && lastHealth.current !== null) {
      lastHealth.current = null
      worldStore.getState().setBoss(null)
    }
    const t = Math.min(1, (world.tick - (runtime.stateUntil - BALANCE.spawn.DESPAWN_TICKS)) / BALANCE.spawn.DESPAWN_TICKS)
    setOpacity(built.skinned, 1 - t)
    return
  }

  if (lastHealth.current !== null && runtime.health < lastHealth.current) {
    playAudio(boss ? 'boss_groan' : 'enemy_hit')
  }
  lastHealth.current = runtime.health

  const currentBoss = worldStore.getState().boss
  if (boss) {
    if (!currentBoss || currentBoss.health !== runtime.health || currentBoss.kind !== kind) {
      worldStore.getState().setBoss({ kind, health: runtime.health, max: BALANCE.enemies[kind].HEALTH })
    }
  } else if (currentBoss?.kind === kind) {
    worldStore.getState().setBoss(null)
  }
}

/** Mount-time setup: registers the AI runtime and hittable root, and their teardown. Pulled
 * out of the component body only to stay under the 50-line function cap; behaviour unchanged. */
function mountEnemy(
  kind: EnemyKind,
  pos: Vec3,
  tier: ResolvedTier,
  detail: 'high' | 'low',
  spawnId: string | null,
  setBuilt: (b: BuiltCharacter) => void,
): () => void {
  let live = true
  let instance: BuiltCharacter | null = null
  const runtime = spawnEnemy(kind, pos, spawnId)
  world.enemies.push(runtime)
  buildCharacter(kind, { tier, props: true, detail }).then((b) => {
    if (!live) return b.dispose()
    instance = b
    runtime.root = b.root
    world.hittable.push(b.root)
    setBuilt(b)
    worldStore.getState().markLoaded()
  })
  return () => {
    live = false
    world.enemies = world.enemies.filter((e) => e !== runtime)
    if (instance) world.hittable = world.hittable.filter((o) => o !== instance!.root)
    // Matched by kind, not the `boss` prop's value at mount — `boss` can flip true after a
    // scripted reveal (see L3Forest.tsx) without this effect re-running, so that closure
    // would otherwise be stale.
    if (worldStore.getState().boss?.kind === kind) worldStore.getState().setBoss(null)
    instance?.dispose()
  }
}

export function Enemy({
  kind,
  pos,
  tier,
  boss = false,
  detail = 'high',
  spawnId = null,
}: {
  kind: EnemyKind
  pos: Vec3
  tier: ResolvedTier
  boss?: boolean
  /** Level 5's wave rakshasas use 'low' (Phase B's decimated body) to stay inside the global
   * 12-SkinnedMesh budget across several concurrent enemies; named single-spawn bosses stay
   * 'high'. */
  detail?: 'high' | 'low'
  /** Correlates this instance back to a wave-scheduler spawn request (see WaveSpawner.tsx);
   * unmatched (null) for every level that just places enemies statically from LevelDef.enemies. */
  spawnId?: string | null
}) {
  const [built, setBuilt] = useState<BuiltCharacter | null>(null)
  const wrapper = useRef<Group>(null)
  const lastHealthRef = useRef<number | null>(null)
  const playedDeathRef = useRef(false)
  const flungFor = useRef(0)

  useEffect(
    // `boss` deliberately excluded: toggling it must not tear down and rebuild the character
    // mid-fight (see useFrame below for the reactive read).
    () => mountEnemy(kind, pos, tier, detail, spawnId, setBuilt),
    [kind, pos, tier, detail, spawnId],
  )

  useFrame((_, delta) => {
    if (!built || !wrapper.current) return
    const runtime = world.enemies.find((e) => e.root === built.root)
    if (!runtime) return
    wrapper.current.position.set(runtime.x, 0, runtime.z)
    wrapper.current.rotation.y = runtime.yaw
    if (runtime.flung) flingAway(wrapper.current, runtime.flung, (flungFor.current += delta))
    built.controller.play(CLIP_FOR_STATE[runtime.state], { loop: runtime.state === 'idle' || runtime.state === 'chase' })
    built.controller.update(delta)
    updateBossAndDissolve(runtime, built, kind, boss, lastHealthRef, playedDeathRef)
  })

  return (
    <group ref={wrapper} name={kind}>
      {built && <primitive object={built.root} />}
      <BlobShadow />
    </group>
  )
}
