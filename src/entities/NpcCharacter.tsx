// A standing or seated NPC. Registers as an obstacle and a talk target, animates its idle,
// and switches to a talking clip while its own speech is on screen.
import { useFrame } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { DIALOGUE } from '@data/dialogue'
import type { NpcPlacement } from '@data/scenery'
import { world, worldStore } from '@systems/world'
import { BlobShadow } from '@render/blob-shadow'
import { buildCharacter, type BuiltCharacter } from '@render/character-factory'
import type { ResolvedTier } from '@render/manifest'

const SEATED = new Set(['SIT_IDLE', 'SIT_TALK'])

function useNpc(placement: NpcPlacement, tier: ResolvedTier): BuiltCharacter | null {
  const [built, setBuilt] = useState<BuiltCharacter | null>(null)
  useEffect(() => {
    let live = true
    let instance: BuiltCharacter | null = null
    const point = { id: placement.npc, x: placement.pos[0], z: placement.pos[2] }
    world.npcs.push(point)
    buildCharacter(placement.npc, { tier, props: false }).then((b) => {
      if (!live) return b.dispose()
      instance = b
      b.root.position.set(placement.pos[0], placement.pos[1], placement.pos[2])
      b.root.rotation.y = placement.yaw
      b.controller.play(placement.idle)
      setBuilt(b)
      worldStore.getState().markLoaded()
    })
    return () => {
      live = false
      world.npcs = world.npcs.filter((n) => n !== point)
      instance?.dispose()
    }
  }, [placement, tier])
  return built
}

export function NpcCharacter({ placement, tier }: { placement: NpcPlacement; tier: ResolvedTier }) {
  const built = useNpc(placement, tier)
  useFrame((_, delta) => {
    if (!built) return
    const key = worldStore.getState().dialogue
    const speaking = key !== null && DIALOGUE[key].speaker === placement.npc
    const seated = SEATED.has(placement.idle)
    built.controller.play(speaking ? (seated ? 'SIT_TALK' : 'TALK') : placement.idle)
    built.controller.update(delta)
  })
  return (
    <group position={[placement.pos[0], placement.pos[1], placement.pos[2]]}>
      {built && <primitive object={built.root} position={[0, 0, 0]} />}
      <BlobShadow />
    </group>
  )
}
