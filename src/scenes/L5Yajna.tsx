// Protect the Yajna: rakshasa waves approach from north/east/west (levels.ts's l5.waves) and
// go for the altar, not the player — "stand between them and the fire" (l5.intro). Subahu and
// Maricha ride in on the tail of the last wave; Maricha is only ever flung, never killed (the
// Manava astra in systems/astra/step.ts). Wave rendering + the global 12-SkinnedMesh budget are
// entities/wave-spawner.ts, reused as-is; this scene just supplies spawn points and layout.
import { useEffect, useState } from 'react'
import { BALANCE } from '@data/balance'
import { gameStore } from '@core/game-state'
import { levelDef } from '@core/progression'
import { SCENERY } from '@data/scenery'
import { ArrowPool } from '@entities/ArrowPool'
import { TrajectoryArc } from '@entities/TrajectoryArc'
import { Enemy } from '@entities/Enemy'
import { FollowCamera } from '@entities/FollowCamera'
import { GroundPlane } from '@entities/GroundPlane'
import { NpcCharacter } from '@entities/NpcCharacter'
import { Player } from '@entities/Player'
import { SimulationDriver } from '@entities/SimulationDriver'
import { StaticProp } from '@entities/StaticProp'
import { AstraVfx } from '@entities/AstraVfx'
import { YajnaDressing } from '@entities/YajnaDressing'
import { useWaveSpawner } from '@entities/wave-spawner'
import { Atmosphere } from '@render/Atmosphere'
import { evictAssets } from '@render/loaders'
import type { ResolvedTier } from '@render/manifest'
import { resetWorld, world, worldStore } from '@systems/world'

const scenery = SCENERY.l5!
const def = levelDef('l5')
const spots = [def.waypoints.north, def.waypoints.east, def.waypoints.west]

const SUPPLY_STATIONS = [
  { x: -5, z: 4 },
  { x: 5, z: 4 },
  { x: -5, z: -4 },
  { x: 5, z: -4 },
] as const

function replenishSupply(tick: number) {
  if (tick < 2800 || tick % BALANCE.yajna.SUPPLY_RESPAWN_TICKS !== 0) return
  if (world.arrowPickups.length >= 4) return
  for (const pt of SUPPLY_STATIONS) {
    const exists = world.arrowPickups.some((p) => Math.hypot(p.x - pt.x, p.z - pt.z) < 2.5)
    if (!exists) {
      world.arrowPickups.push({ x: pt.x, z: pt.z })
      break
    }
  }
}

function ArrowPickupsVisual() {
  const [pickups, setPickups] = useState(world.arrowPickups)
  useEffect(() => {
    const id = setInterval(() => setPickups([...world.arrowPickups]), 200)
    return () => clearInterval(id)
  }, [])

  if (pickups.length === 0) return null
  return (
    <group name="arrow-pickups">
      {pickups.map((p, i) => (
        <group key={`${p.x.toFixed(1)}-${p.z.toFixed(1)}-${i}`} position={[p.x, 0.05, p.z]}>
          <mesh rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.25, 0.5, 16]} />
            <meshBasicMaterial color="#ffd784" transparent opacity={0.65} />
          </mesh>
          <mesh position={[0, 0.1, 0]} rotation-z={Math.PI / 4}>
            <cylinderGeometry args={[0.02, 0.02, 0.7, 6]} />
            <meshBasicMaterial color="#e6b450" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function useLevelLifecycle() {
  useEffect(() => {
    resetWorld(def.playerSpawn.pos, def.playerSpawn.yaw)
    worldStore.getState().setAstraReady(true)
    world.astraReady = true
    if (gameStore.getState().unlockedAstras.length === 0) {
      gameStore.getState().unlockAstra('agneyastra')
      gameStore.getState().unlockAstra('manavastra')
    }
    worldStore.getState().expect(scenery.statics.length + scenery.npcs.length + 1)
    const unsubscribe = worldStore.subscribe((s) => {
      if (s.expected > 0 && s.loaded >= s.expected) gameStore.getState().dispatch('LOADED')
    })
    return () => {
      unsubscribe()
      worldStore.getState().setAstraReady(false)
      world.astraReady = false
      evictAssets(scenery.statics.map((p) => p.asset))
    }
  }, [])
}

export function L5Yajna({ tier, bow }: { tier: ResolvedTier; bow: boolean }) {
  useLevelLifecycle()
  const { active, onTick } = useWaveSpawner(def.waves, spots, def.persistentSkinned.length)
  const handleTick = (tick: number) => {
    onTick(tick)
    replenishSupply(tick)
    gameStore.getState().progress({ kind: 'survive', ticks: 1 })
  }
  const { bounds } = scenery
  return (
    <group name="l5-yajna">
      <Atmosphere scenery={scenery} tier={tier} />
      <GroundPlane
        center={[(bounds.minX + bounds.maxX) / 2, (bounds.minZ + bounds.maxZ) / 2]}
        size={[bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ]}
        ground={scenery.look.ground}
      />
      <YajnaDressing tier={tier} />
      <ArrowPickupsVisual />
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
      {bow && (
        <>
          <ArrowPool tier={tier} />
          <TrajectoryArc />
        </>
      )}
      <FollowCamera />
      <AstraVfx />
      <SimulationDriver bow={bow} onTick={handleTick} />
    </group>
  )
}
