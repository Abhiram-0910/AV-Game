// The five-arrow trial: Vishwamitra explains the astras at spawn, then the firing line and
// five distinct targets (levels.ts) — static, lateral, longRange, occluded, astraOnly. Target
// behaviours live in entities/Target.tsx; the astra charge-and-hitscan lives in
// systems/astra/step.ts. Existing procedural aim and archery otherwise, unchanged.
import { useEffect, useRef } from 'react'
import { useStore } from 'zustand'
import { gameStore } from '@core/game-state'
import { levelDef } from '@core/progression'
import { SCENERY } from '@data/scenery'
import { ArrowPool } from '@entities/ArrowPool'
import { TrajectoryArc } from '@entities/TrajectoryArc'
import { FollowCamera } from '@entities/FollowCamera'
import { GroundPlane } from '@entities/GroundPlane'
import { NpcCharacter } from '@entities/NpcCharacter'
import { Player } from '@entities/Player'
import { SimulationDriver } from '@entities/SimulationDriver'
import { StaticProp } from '@entities/StaticProp'
import { Target } from '@entities/Target'
import { Atmosphere } from '@render/Atmosphere'
import { evictAssets } from '@render/loaders'
import type { ResolvedTier } from '@render/manifest'
import { resetWorld, world, worldStore } from '@systems/world'

const scenery = SCENERY.l4!
const def = levelDef('l4')
const TARGETS_OBJ_INDEX = def.objectives.findIndex((o) => o.kind === 'hitTargets')

function useAstraLesson() {
  const hitCount = useStore(gameStore, (s) => (s.level === 'l4' ? s.objectives[TARGETS_OBJ_INDEX]?.progress ?? 0 : 0))
  const firedRef = useRef(false)

  useEffect(() => {
    if (hitCount >= 4 && !firedRef.current) {
      firedRef.current = true
      worldStore.getState().setAstraReady(true)
      world.astraReady = true
      if (gameStore.getState().astraCharges <= 0) {
        gameStore.getState().addAstraCharge()
      }
      const isE2e = typeof window !== 'undefined' && window.location.search.includes('debug')
      if (!isE2e) {
        worldStore.getState().openDialogue('l4.vishwamitra.astras')
      }
    }
  }, [hitCount])
}

function useLevelLifecycle() {
  useEffect(() => {
    resetWorld(def.playerSpawn.pos, def.playerSpawn.yaw)
    worldStore.getState().expect(scenery.statics.length + scenery.npcs.length + def.targets.length + 1)
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

export function L4Range({ tier, bow }: { tier: ResolvedTier; bow: boolean }) {
  useLevelLifecycle()
  useAstraLesson()
  const { light, bounds } = scenery
  return (
    <group name="l4-range">
      <Atmosphere scenery={scenery} tier={tier} />
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
