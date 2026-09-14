// A placed environment GLB: tier materials, merged by material, registered as ground if walkable.
import { useEffect, useState } from 'react'
import type { Group, Material, Mesh, Object3D } from 'three'
import type { Placement } from '@data/scenery'
import { world, worldStore } from '@systems/world'
import { disposeTree } from '@render/dispose'
import { loadGltf } from '@render/loaders'
import type { ResolvedTier } from '@render/manifest'
import { applyTierMaterials } from '@render/materials'
import { mergeByMaterial } from '@render/merge'
import { dressPalace } from '@render/palace-surface'

/** tree.glb's leaf cards come off; the bark primitive left is trunk and branches. */
function stripLeaves(root: Object3D): void {
  const leaves: Object3D[] = []
  root.traverse((o) => {
    if ((o as Mesh).isMesh && ((o as Mesh).material as Material).name.startsWith('Leaves')) leaves.push(o)
  })
  leaves.forEach((o) => o.removeFromParent())
}

export function StaticProp({ placement, tier }: { placement: Placement; tier: ResolvedTier }) {
  const [group, setGroup] = useState<Group | null>(null)
  useEffect(() => {
    let live = true
    let built: Group | null = null
    let surface: { dispose(): void } | null = null
    loadGltf(placement.asset).then((gltf) => {
      if (!live) return
      const scene = gltf.scene.clone()
      if (placement.bare) stripLeaves(scene)
      scene.position.set(placement.pos[0], placement.pos[1], placement.pos[2])
      scene.rotation.y = placement.yaw
      scene.scale.setScalar(placement.scale)
      applyTierMaterials(scene, tier, { tint: placement.tint, pbr: placement.pbr })
      built = mergeByMaterial(scene)
      if (placement.surface === 'palace') surface = dressPalace(built, tier)
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
        surface?.dispose()
      }
    }
  }, [placement, tier])
  return group ? <primitive object={group} /> : null
}
