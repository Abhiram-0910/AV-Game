// A standing or seated NPC. Registers as an obstacle and a talk target, animates its idle,
// and switches to a talking clip while its own speech is on screen. Built once per (npc,
// tier) — a placement whose pos/yaw changes later (Vishwamitra walking L2's riverbank to
// its range) repositions the same instance instead of rebuilding it.
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { useStore } from 'zustand'
import type { Group } from 'three'
import { DIALOGUE } from '@data/dialogue'
import type { NpcPlacement } from '@data/scenery'
import { world, worldStore } from '@systems/world'
import type { NpcPoint } from '@systems/interaction/interact'
import { BlobShadow } from '@render/blob-shadow'
import { buildCharacter, type BuiltCharacter } from '@render/character-factory'
import type { ResolvedTier } from '@render/manifest'

const SEATED = new Set(['SIT_IDLE', 'SIT_TALK'])

/** Low tier: the ~5k body, swapped for the full mesh while this NPC speaks. The previous
 * instance stays on screen until its replacement is built, so the swap never blinks. */
function useNpc(npc: NpcPlacement['npc'], tier: ResolvedTier, detail: 'high' | 'low'): BuiltCharacter | null {
  const [built, setBuilt] = useState<BuiltCharacter | null>(null)
  const firstBuild = useRef(true)
  useEffect(() => {
    let live = true
    buildCharacter(npc, { tier, props: false, detail }).then((b) => {
      if (!live) return b.dispose()
      setBuilt(b)
      if (firstBuild.current) worldStore.getState().markLoaded()
      firstBuild.current = false
    })
    return () => {
      live = false
    }
  }, [npc, tier, detail])
  // Runs after the replacement has committed (or on unmount), so a disposed body is never drawn.
  useEffect(() => () => built?.dispose(), [built])
  return built
}

export function NpcCharacter({ placement, tier }: { placement: NpcPlacement; tier: ResolvedTier }) {
  const speakingNow = useStore(worldStore, (s) => s.dialogue !== null && DIALOGUE[s.dialogue].speaker === placement.npc)
  const built = useNpc(placement.npc, tier, tier === 'low' && !speakingNow ? 'low' : 'high')
  const pointRef = useRef<NpcPoint | null>(null)
  const body = useRef<Group>(null)

  useEffect(() => {
    const seated = SEATED.has(placement.idle)
    const point: NpcPoint = { id: placement.npc, x: placement.pos[0], z: placement.pos[2], yaw: placement.yaw, homeYaw: placement.yaw, seated }
    pointRef.current = point
    world.npcs.push(point)
    return () => {
      pointRef.current = null
      world.npcs = world.npcs.filter((n) => n !== point)
    }
  }, [placement.npc, placement.pos, placement.yaw, placement.idle])

  useFrame((_, delta) => {
    const point = pointRef.current
    if (point) {
      point.x = placement.pos[0]
      point.z = placement.pos[2]
      point.homeYaw = placement.yaw
      // SimulationDriver turns point.yaw on the fixed tick (toward Rama while they talk).
      if (body.current) body.current.rotation.y = point.yaw
    }
    if (!built) return
    const key = worldStore.getState().dialogue
    const speaking = key !== null && DIALOGUE[key].speaker === placement.npc
    const seated = SEATED.has(placement.idle)
    built.controller.play(speaking ? (seated ? 'SIT_TALK' : 'TALK') : placement.idle)
    built.controller.update(delta)
  })
  return (
    <group ref={body} position={[placement.pos[0], placement.pos[1], placement.pos[2]]} rotation-y={placement.yaw}>
      {built && <primitive object={built.root} position={[0, 0, 0]} />}
      <BlobShadow />
    </group>
  )
}
