// MAX_ARROWS arrow meshes reused for every shot. Hidden when not in flight.
import { useFrame } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { Group } from 'three'
import { BALANCE } from '@data/balance'
import { world } from '@systems/world'
import { orientArrow, wrapArrowModel } from '@render/arrow-model'
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
        const model = gltf.scene.clone()
        applyTierMaterials(model, tier)
        const arrow = wrapArrowModel(model)
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
    pool.children.forEach((arrow, i) => {
      const a = world.arrows[i]
      arrow.visible = a !== undefined
      if (!a) return
      arrow.position.set(a.x, a.y, a.z)
      orientArrow(arrow, a.vx, a.vy, a.vz)
    })
  })
  return pool ? <primitive object={pool} /> : null
}
