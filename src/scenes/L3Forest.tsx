// Tataka's forest. Vishwamitra makes the case for Rama's duty at the forest edge (the
// hesitation beat from the text); Tataka appears once the player reaches the clearing and the
// enemy AI (systems/ai/enemy-ai.ts) takes over from there — existing archery is the weapon.
import { useEffect, useRef } from 'react'
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
import { evictAssets } from '@render/loaders'
import type { ResolvedTier } from '@render/manifest'
import { resetWorld, worldStore } from '@systems/world'
import { useGame } from '@ui/use-game'

const scenery = SCENERY.l3!
const def = levelDef('l3')
const DUTY_DONE_AT = def.objectives.findIndex((o) => o.kind === 'talk' && o.dialogueKey === 'l3.vishwamitra.duty')
const CLEARING_DONE_AT = def.objectives.findIndex((o) => o.kind === 'reach' && o.waypoint === 'clearing')

function useLevelLifecycle() {
  useEffect(() => {
    resetWorld(def.playerSpawn.pos, def.playerSpawn.yaw)
    worldStore.getState().expect(scenery.statics.length + scenery.npcs.length + def.enemies.length + 1)
    const unsubscribe = worldStore.subscribe((s) => {
      if (s.expected > 0 && s.loaded >= s.expected) gameStore.getState().dispatch('LOADED')
    })
    return () => {
      unsubscribe()
      evictAssets(scenery.statics.map((p) => p.asset))
    }
  }, [])
}

/** One-shot narrative beat: opens `key` the first time `done` turns true. Not gated by any
 * objective, so dismissing it is a harmless no-op for progress() — see ui/Flow.tsx. */
function useNarrativeBeat(done: boolean, key: string) {
  const firedRef = useRef(false)
  useEffect(() => {
    if (done && !firedRef.current) {
      firedRef.current = true
      worldStore.getState().openDialogue(key as never)
    }
  }, [done, key])
}

export function L3Forest({ tier, bow }: { tier: ResolvedTier; bow: boolean }) {
  useLevelLifecycle()
  const dutyDone = useGame((s) => s.level === 'l3' && s.objectives[DUTY_DONE_AT]?.done === true)
  const clearingDone = useGame((s) => s.level === 'l3' && s.objectives[CLEARING_DONE_AT]?.done === true)
  useNarrativeBeat(dutyDone, 'l3.rama.resolve')
  useNarrativeBeat(clearingDone, 'l3.tataka.appears')
  const { light, bounds } = scenery
  return (
    <group name="l3-forest">
      <color attach="background" args={[scenery.background]} />
      <hemisphereLight args={[light.sky, light.ground, light.ambientIntensity]} />
      <directionalLight position={light.sun} intensity={light.sunIntensity} />
      <GroundPlane
        center={[(bounds.minX + bounds.maxX) / 2, (bounds.minZ + bounds.maxZ) / 2]}
        size={[bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ]}
        color="#243018"
      />
      {scenery.statics.map((p, i) => (
        <StaticProp key={`${p.asset}-${i}`} placement={p} tier={tier} />
      ))}
      {scenery.npcs.map((n) => (
        <NpcCharacter key={n.npc} placement={n} tier={tier} />
      ))}
      {def.enemies.map((e, i) => (
        // The boss bar only shows once she's actually revealed — not from the moment the
        // scene loads her, well before the player has walked far enough to see her.
        <Enemy key={i} kind={e.kind} pos={e.pos} tier={tier} boss={def.enemies.length === 1 && clearingDone} />
      ))}
      <Player tier={tier} bow={bow} />
      {bow && <ArrowPool tier={tier} />}
      <FollowCamera />
      <SimulationDriver bow={bow} />
    </group>
  )
}
