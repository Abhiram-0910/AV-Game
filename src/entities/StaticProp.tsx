// A placed environment GLB: tier materials, merged by material, registered as ground if walkable.
import { useEffect, useState } from 'react'
import type { Group } from 'three'
import type { Placement } from '@data/scenery'
import { world, worldStore } from '@systems/world'
import { disposeTree } from '@render/dispose'
import { loadGltf } from '@render/loaders'
import type { ResolvedTier } from '@render/manifest'
import { applyTierMaterials } from '@render/materials'
import { mergeByMaterial } from '@render/merge'

export function StaticProp({ placement, tier }: { placement: Placement; tier: ResolvedTier }) {
  const [group, setGroup] = useState<Group | null>(null)
  useEffect(() => {
    let live = true
    let built: Group | null = null
    loadGltf(placement.asset).then((gltf) => {
      if (!live) return
      const scene = gltf.scene.clone()
      scene.position.set(placement.pos[0], placement.pos[1], placement.pos[2])
      scene.rotation.y = placement.yaw
      scene.scale.setScalar(placement.scale)
      applyTierMaterials(scene, tier, { tint: placement.tint, pbr: placement.pbr })
      built = mergeByMaterial(scene)
      built.name = placement.asset
      built.traverse((o) => {
        o.castShadow = placement.castShadow ?? true
        o.receiveShadow = true
      })
      if (placement.ground) world.ground.push(built)
      setGroup(built)
      worldStore.getState().markLoaded()
    })
    return () => {
      live = false
      if (built) {
        world.ground = world.ground.filter((g) => g !== built)
        // Textures belong to the cached prototype; the scene evicts those on unmount.
        disposeTree(built, { textures: false })
      }
    }
  }, [placement, tier])
  return group ? <primitive object={group} /> : null
}
