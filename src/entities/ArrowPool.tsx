// MAX_ARROWS arrow meshes reused for every shot. Hidden when not in flight.
import { useFrame } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { Group, type Object3D } from 'three'
import { BALANCE } from '@data/balance'
import { world } from '@systems/world'
import { disposeTree } from '@render/dispose'
import { loadGltf } from '@render/loaders'
import type { ResolvedTier } from '@render/manifest'
import { applyTierMaterials } from '@render/materials'

export function ArrowPool({ tier }: { tier: ResolvedTier }) {
  const [pool, setPool] = useState<Group | null>(null)
  useEffect(() => {
    let live = true
    let group: Group | null = null
    loadGltf('arrow').then((gltf) => {
      if (!live) return
      group = new Group()
      for (let i = 0; i < BALANCE.player.MAX_ARROWS; i += 1) {
        const arrow = gltf.scene.clone()
        applyTierMaterials(arrow, tier)
        arrow.visible = false
        group.add(arrow)
      }
      setPool(group)
    })
    return () => {
      live = false
      if (group) disposeTree(group, { textures: false })
    }
  }, [tier])

  useFrame(() => {
    if (!pool) return
    pool.children.forEach((mesh: Object3D, i) => {
      const a = world.arrows[i]
      mesh.visible = a !== undefined
      if (!a) return
      mesh.position.set(a.x, a.y, a.z)
      mesh.rotation.y = Math.atan2(a.vx, a.vz)
      mesh.rotation.x = Math.atan2(-a.vy, Math.hypot(a.vx, a.vz))
      mesh.rotation.z = 0
    })
  })
  return pool ? <primitive object={pool} /> : null
}
