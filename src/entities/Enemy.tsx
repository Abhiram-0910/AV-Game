// A hostile character driven by the enemy AI's fixed-tick FSM (systems/ai/enemy-ai.ts).
// Registers into world.enemies (AI + combat runtime) and world.hittable (arrows can hit it).
// Generic across every EnemyKind sharing the male/female base mesh + shared clip library —
// see character-factory.ts; no per-creature component needed.
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { type Group, type Material } from 'three'
import { BALANCE } from '@data/balance'
import type { EnemyKind, Vec3 } from '@data/levels'
import { spawnEnemy, type EnemyRuntime } from '@systems/ai/enemy-ai'
import { world, worldStore } from '@systems/world'
import { BlobShadow } from '@render/blob-shadow'
import { buildCharacter, type BuiltCharacter } from '@render/character-factory'
import type { ResolvedTier } from '@render/manifest'

const CLIP_FOR_STATE = { idle: 'IDLE', chase: 'WALK', attack: 'THROW', stagger: 'HIT', dead: 'DEATH' } as const

function setOpacity(mesh: { material: Material | Material[] }, opacity: number): void {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  for (const m of materials) {
    m.transparent = true
    m.opacity = opacity
  }
}

/** Dissolves a dead enemy's mesh over DESPAWN_TICKS; otherwise keeps the boss bar in sync,
 * only pushing to the store when health actually changed (it's read every frame). */
function updateBossAndDissolve(runtime: EnemyRuntime, built: BuiltCharacter, kind: EnemyKind, boss: boolean, lastHealth: { current: number | null }): void {
  if (runtime.state === 'dead') {
    if (boss && lastHealth.current !== null) {
      lastHealth.current = null
      worldStore.getState().setBoss(null)
    }
    const t = Math.min(1, (world.tick - (runtime.stateUntil - BALANCE.spawn.DESPAWN_TICKS)) / BALANCE.spawn.DESPAWN_TICKS)
    setOpacity(built.skinned, 1 - t)
  } else if (boss && runtime.health !== lastHealth.current) {
    lastHealth.current = runtime.health
    worldStore.getState().setBoss({ kind, health: runtime.health, max: BALANCE.enemies[kind].HEALTH })
  }
}

export function Enemy({ kind, pos, tier, boss = false }: { kind: EnemyKind; pos: Vec3; tier: ResolvedTier; boss?: boolean }) {
  const [built, setBuilt] = useState<BuiltCharacter | null>(null)
  const wrapper = useRef<Group>(null)
  const lastHealthRef = useRef<number | null>(null)

  useEffect(() => {
    let live = true
    let instance: BuiltCharacter | null = null
    const runtime = spawnEnemy(kind, pos)
    world.enemies.push(runtime)
    buildCharacter(kind, { tier, props: true }).then((b) => {
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
    // `boss` deliberately excluded: toggling it must not tear down and rebuild the character
    // mid-fight (see useFrame below for the reactive read).
  }, [kind, pos, tier])

  useFrame((_, delta) => {
    if (!built || !wrapper.current) return
    const runtime = world.enemies.find((e) => e.root === built.root)
    if (!runtime) return
    wrapper.current.position.set(runtime.x, 0, runtime.z)
    wrapper.current.rotation.y = runtime.yaw
    built.controller.play(CLIP_FOR_STATE[runtime.state], { loop: runtime.state === 'idle' || runtime.state === 'chase' })
    built.controller.update(delta)
    updateBossAndDissolve(runtime, built, kind, boss, lastHealthRef)
  })

  return (
    <group ref={wrapper} name={kind}>
      {built && <primitive object={built.root} />}
      <BlobShadow />
    </group>
  )
}
