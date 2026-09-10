// An archery target: loads once, registers as hittable, hides itself once struck (step.ts
// removes it from world.hittable so the same target can't be counted twice).
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import type { Group } from 'three'
import type { TargetDef } from '@data/levels'
import { world, worldStore } from '@systems/world'
import { disposeTree } from '@render/dispose'
import { loadGltf } from '@render/loaders'
import type { ResolvedTier } from '@render/manifest'
import { applyTierMaterials } from '@render/materials'
import { mergeByMaterial } from '@render/merge'

export function Target({ def, tier }: { def: TargetDef; tier: ResolvedTier }) {
  const [group, setGroup] = useState<Group | null>(null)
  const ref = useRef<Group | null>(null)
  useEffect(() => {
    let live = true
    let built: Group | null = null
    loadGltf('target').then((gltf) => {
      if (!live) return
      const scene = gltf.scene.clone()
      scene.position.set(def.pos[0], def.pos[1], def.pos[2])
      applyTierMaterials(scene, tier)
      built = mergeByMaterial(scene)
      built.name = 'target'
      world.hittable.push(built)
      ref.current = built
      setGroup(built)
      worldStore.getState().markLoaded()
    })
    return () => {
      live = false
      ref.current = null
      if (built) {
        world.hittable = world.hittable.filter((o) => o !== built)
        disposeTree(built, { textures: false })
      }
    }
  }, [def, tier])
  useFrame(() => {
    if (ref.current) ref.current.visible = world.hittable.includes(ref.current)
  })
  return group ? <primitive object={group} /> : null
}
