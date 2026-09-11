// Ayodhya court. Palace + royal room props, Dasharatha enthroned, Vishwamitra and Vasishtha
// standing, Rama walking in. Dispatches LOADED when every asset promise has resolved and
// evicts the environment prototypes on unmount so their textures leave the GPU.
import { useEffect } from 'react'
import { gameStore } from '@core/game-state'
import { levelDef } from '@core/progression'
import { SCENERY } from '@data/scenery'
import { ArrowPool } from '@entities/ArrowPool'
import { CourtDressing } from '@entities/CourtDressing'
import { TrajectoryArc } from '@entities/TrajectoryArc'
import { FollowCamera } from '@entities/FollowCamera'
import { NpcCharacter } from '@entities/NpcCharacter'
import { Player } from '@entities/Player'
import { SimulationDriver } from '@entities/SimulationDriver'
import { StaticProp } from '@entities/StaticProp'
import { Atmosphere } from '@render/Atmosphere'
import { evictAssets } from '@render/loaders'
import type { ResolvedTier } from '@render/manifest'
import { resetWorld, worldStore } from '@systems/world'

const scenery = SCENERY.l1!
const def = levelDef('l1')

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

export function L1Court({ tier, bow }: { tier: ResolvedTier; bow: boolean }) {
  useLevelLifecycle()
  return (
    <group name="l1-court">
      <Atmosphere scenery={scenery} tier={tier} />
      <CourtDressing tier={tier} />
      <color attach="background" args={[scenery.background]} />
      {scenery.statics.map((p) => (
        <StaticProp key={p.asset} placement={p} tier={tier} />
      ))}
      {scenery.npcs.map((n) => (
        <NpcCharacter key={n.npc} placement={n} tier={tier} />
      ))}
      <Player tier={tier} bow={bow} />
      {bow && (
        <>
          <ArrowPool tier={tier} />
          <TrajectoryArc />
        </>
      )}
      <FollowCamera />
      <SimulationDriver bow={bow} />
    </group>
  )
}
