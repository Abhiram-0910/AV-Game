// An archery target: loads once, registers as hittable, hides itself once struck (step.ts
// removes it from world.hittable so the same target can't be counted twice). 'astraOnly'
// targets are tagged so a plain arrow bounces off (see systems/archery/step.ts) — only a
// fired astra brings them down. 'lateral' targets are tagged with their oscillation and moved
// by step.ts itself, once per fixed tick, right before that tick's hit-test — not here in a
// render-frame useFrame, which only runs once per RENDERED frame. Under SwiftShader's low
// frame rate the fixed loop can process several ticks per frame (BALANCE.loop.MAX_SUBSTEPS),
// so a render-frame-driven position would still be stale for the hit-test on those ticks.
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
      // Scale is baked pre-merge (fixed for the target's lifetime); position stays on the
      // outer group, set post-merge, so 'lateral' can still move it every frame.
      if ('scale' in def) scene.scale.setScalar(def.scale)
      applyTierMaterials(scene, tier)
      built = mergeByMaterial(scene)
      built.name = 'target'
      built.position.set(def.pos[0], def.pos[1], def.pos[2])
      if (def.kind === 'astraOnly') built.userData.requiresAstra = true
      if (def.kind === 'lateral') built.userData.lateral = { baseX: def.pos[0], amplitude: def.amplitude, periodTicks: def.periodTicks }
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
    if (!ref.current) return
    ref.current.visible = world.hittable.includes(ref.current)
  })
  return group ? <primitive object={group} /> : null
}
