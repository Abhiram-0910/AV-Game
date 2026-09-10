// A standing or seated NPC. Registers as an obstacle and a talk target, animates its idle,
// and switches to a talking clip while its own speech is on screen. Built once per (npc,
// tier) — a placement whose pos/yaw changes later (Vishwamitra walking L2's riverbank to
// its range) repositions the same instance instead of rebuilding it.
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { DIALOGUE } from '@data/dialogue'
import type { NpcPlacement } from '@data/scenery'
import { world, worldStore } from '@systems/world'
import type { NpcPoint } from '@systems/interaction/interact'
import { BlobShadow } from '@render/blob-shadow'
import { buildCharacter, type BuiltCharacter } from '@render/character-factory'
import type { ResolvedTier } from '@render/manifest'

const SEATED = new Set(['SIT_IDLE', 'SIT_TALK'])

function useNpc(npc: NpcPlacement['npc'], tier: ResolvedTier): BuiltCharacter | null {
  const [built, setBuilt] = useState<BuiltCharacter | null>(null)
  useEffect(() => {
    let live = true
    let instance: BuiltCharacter | null = null
    buildCharacter(npc, { tier, props: false }).then((b) => {
      if (!live) return b.dispose()
      instance = b
      setBuilt(b)
      worldStore.getState().markLoaded()
    })
    return () => {
      live = false
      instance?.dispose()
    }
  }, [npc, tier])
  return built
}

export function NpcCharacter({ placement, tier }: { placement: NpcPlacement; tier: ResolvedTier }) {
  const built = useNpc(placement.npc, tier)
  const pointRef = useRef<NpcPoint | null>(null)

  useEffect(() => {
    const point = { id: placement.npc, x: placement.pos[0], z: placement.pos[2] }
    pointRef.current = point
    world.npcs.push(point)
    return () => {
      pointRef.current = null
      world.npcs = world.npcs.filter((n) => n !== point)
    }
  }, [placement.npc, placement.pos])

  useFrame((_, delta) => {
    if (pointRef.current) {
      pointRef.current.x = placement.pos[0]
      pointRef.current.z = placement.pos[2]
    }
    if (!built) return
    const key = worldStore.getState().dialogue
    const speaking = key !== null && DIALOGUE[key].speaker === placement.npc
    const seated = SEATED.has(placement.idle)
    built.controller.play(speaking ? (seated ? 'SIT_TALK' : 'TALK') : placement.idle)
    built.controller.update(delta)
  })
  return (
    <group position={[placement.pos[0], placement.pos[1], placement.pos[2]]} rotation-y={placement.yaw}>
      {built && <primitive object={built.root} position={[0, 0, 0]} />}
      <BlobShadow />
    </group>
  )
}
