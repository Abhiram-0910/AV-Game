// The five-arrow trial: Vishwamitra explains the astras at spawn, then the firing line and
// five distinct targets (levels.ts) — static, lateral, longRange, occluded, astraOnly. Target
// behaviours live in entities/Target.tsx; the astra charge-and-hitscan lives in
// systems/astra/step.ts. Existing procedural aim and archery otherwise, unchanged.
import { useEffect } from 'react'
import { gameStore } from '@core/game-state'
import { levelDef } from '@core/progression'
import { SCENERY } from '@data/scenery'
import { ArrowPool } from '@entities/ArrowPool'
import { FollowCamera } from '@entities/FollowCamera'
import { GroundPlane } from '@entities/GroundPlane'
import { NpcCharacter } from '@entities/NpcCharacter'
import { Player } from '@entities/Player'
import { SimulationDriver } from '@entities/SimulationDriver'
import { StaticProp } from '@entities/StaticProp'
import { Target } from '@entities/Target'
import { evictAssets } from '@render/loaders'
import type { ResolvedTier } from '@render/manifest'
import { resetWorld, worldStore } from '@systems/world'

const scenery = SCENERY.l4!
const def = levelDef('l4')

function useLevelLifecycle() {
  useEffect(() => {
    resetWorld(def.playerSpawn.pos, def.playerSpawn.yaw)
    worldStore.getState().expect(scenery.statics.length + scenery.npcs.length + def.targets.length + 1)
    const unsubscribe = worldStore.subscribe((s) => {
      if (s.expected > 0 && s.loaded >= s.expected) gameStore.getState().dispatch('LOADED')
    })
    return () => {
      unsubscribe()
      evictAssets(scenery.statics.map((p) => p.asset))
    }
  }, [])
}

export function L4Range({ tier, bow }: { tier: ResolvedTier; bow: boolean }) {
  useLevelLifecycle()
  const { light, bounds } = scenery
  return (
    <group name="l4-range">
      <color attach="background" args={[scenery.background]} />
      <hemisphereLight args={[light.sky, light.ground, light.ambientIntensity]} />
      <directionalLight position={light.sun} intensity={light.sunIntensity} />
      <GroundPlane
        center={[(bounds.minX + bounds.maxX) / 2, (bounds.minZ + bounds.maxZ) / 2]}
        size={[bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ]}
        color="#4a6b34"
      />
      {scenery.statics.map((p, i) => (
        <StaticProp key={`${p.asset}-${i}`} placement={p} tier={tier} />
      ))}
      {scenery.npcs.map((n) => (
        <NpcCharacter key={n.npc} placement={n} tier={tier} />
      ))}
      {def.targets.map((t, i) => (
        <Target key={i} def={t} tier={tier} />
      ))}
      <Player tier={tier} bow={bow} />
      {bow && <ArrowPool tier={tier} />}
      <FollowCamera />
      <SimulationDriver bow={bow} />
    </group>
  )
}
