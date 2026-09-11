// The Sarayu riverbank and Vishwamitra's archery range. Lakshmana joins as a silent
// companion; Vishwamitra gives the mantras at the riverbank, then walks to the range for
// the bow lesson — a position change on the same built character, not a re-placement
// (see NpcCharacter.tsx). Bow tutorial: three static targets, existing procedural aim.
import { useEffect } from 'react'
import { gameStore } from '@core/game-state'
import { levelDef } from '@core/progression'
import type { Vec3 } from '@data/levels'
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
import { resetWorld, worldStore } from '@systems/world'
import { useGame } from '@ui/use-game'

const scenery = SCENERY.l2!
const def = levelDef('l2')
const MANTRAS_DONE_AT = def.objectives.findIndex((o) => o.kind === 'talk' && o.dialogueKey === 'l2.vishwamitra.mantras')
// Offset from the range waypoint so he stays within TALK_RADIUS once the player arrives.
const VISHWAMITRA_AT_RANGE: Vec3 = [def.waypoints.range[0] - 1.5, 0, def.waypoints.range[2]]

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

export function L2Forest({ tier, bow }: { tier: ResolvedTier; bow: boolean }) {
  useLevelLifecycle()
  const mantrasDone = useGame((s) => s.level === 'l2' && s.objectives[MANTRAS_DONE_AT]?.done === true)
  const { bounds } = scenery
  return (
    <group name="l2-forest">
      <Atmosphere scenery={scenery} tier={tier} />
      <GroundPlane
        center={[(bounds.minX + bounds.maxX) / 2, (bounds.minZ + bounds.maxZ) / 2]}
        size={[bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ]}
        ground={scenery.look.ground}
      />
      {scenery.statics.map((p, i) => (
        <StaticProp key={`${p.asset}-${i}`} placement={p} tier={tier} />
      ))}
      {scenery.npcs.map((n) => (
        <NpcCharacter key={n.npc} placement={n.npc === 'vishwamitra' && mantrasDone ? { ...n, pos: VISHWAMITRA_AT_RANGE } : n} tier={tier} />
      ))}
      {def.targets.map((t, i) => (
        <Target key={i} def={t} tier={tier} onHit={() => gameStore.getState().progress({ kind: 'hitTargets' })} />
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
