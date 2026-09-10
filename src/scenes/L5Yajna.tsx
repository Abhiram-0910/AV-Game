// Protect the Yajna: rakshasa waves approach from north/east/west (levels.ts's l5.waves) and
// go for the altar, not the player — "stand between them and the fire" (l5.intro). Subahu and
// Maricha ride in on the tail of the last wave; Maricha is only ever flung, never killed (the
// Manava astra in systems/astra/step.ts). Wave rendering + the global 12-SkinnedMesh budget are
// entities/wave-spawner.ts, reused as-is; this scene just supplies spawn points and layout.
import { useEffect } from 'react'
import { gameStore } from '@core/game-state'
import { levelDef } from '@core/progression'
import { SCENERY } from '@data/scenery'
import { ArrowPool } from '@entities/ArrowPool'
import { Enemy } from '@entities/Enemy'
import { FollowCamera } from '@entities/FollowCamera'
import { GroundPlane } from '@entities/GroundPlane'
import { NpcCharacter } from '@entities/NpcCharacter'
import { Player } from '@entities/Player'
import { SimulationDriver } from '@entities/SimulationDriver'
import { StaticProp } from '@entities/StaticProp'
import { useWaveSpawner } from '@entities/wave-spawner'
import { evictAssets } from '@render/loaders'
import type { ResolvedTier } from '@render/manifest'
import { resetWorld, worldStore } from '@systems/world'

const scenery = SCENERY.l5!
const def = levelDef('l5')
const spots = [def.waypoints.north, def.waypoints.east, def.waypoints.west]

function useLevelLifecycle() {
  useEffect(() => {
    resetWorld(def.playerSpawn.pos, def.playerSpawn.yaw)
    worldStore.getState().expect(scenery.statics.length + scenery.npcs.length + 1)
    const unsubscribe = worldStore.subscribe((s) => {
      if (s.expected > 0 && s.loaded >= s.expected) gameStore.getState().dispatch('LOADED')
    })
    return () => {
      unsubscribe()
      evictAssets(scenery.statics.map((p) => p.asset))
    }
  }, [])
}

export function L5Yajna({ tier, bow }: { tier: ResolvedTier; bow: boolean }) {
  useLevelLifecycle()
  const { active, onTick } = useWaveSpawner(def.waves, spots)
  const handleTick = (tick: number) => {
    onTick(tick)
    gameStore.getState().progress({ kind: 'survive', ticks: 1 })
  }
  const { light, bounds } = scenery
  return (
    <group name="l5-yajna">
      <color attach="background" args={[scenery.background]} />
      <hemisphereLight args={[light.sky, light.ground, light.ambientIntensity]} />
      <directionalLight position={light.sun} intensity={light.sunIntensity} />
      <GroundPlane
        center={[(bounds.minX + bounds.maxX) / 2, (bounds.minZ + bounds.maxZ) / 2]}
        size={[bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ]}
        color="#4a3624"
      />
      {scenery.statics.map((p, i) => (
        <StaticProp key={`${p.asset}-${i}`} placement={p} tier={tier} />
      ))}
      {scenery.npcs.map((n) => (
        <NpcCharacter key={n.npc} placement={n} tier={tier} />
      ))}
      {active.map((a) => (
        <Enemy key={a.id} kind={a.kind} pos={a.pos} tier={tier} detail="low" spawnId={a.id} />
      ))}
      <Player tier={tier} bow={bow} />
      {bow && <ArrowPool tier={tier} />}
      <FollowCamera />
      <SimulationDriver bow={bow} onTick={handleTick} />
    </group>
  )
}
