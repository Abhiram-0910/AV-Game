// A flat walkable floor for levels with no modeled ground prop. Registers as ground so the
// locomotion raycast finds it. High tier: a tiled, dappled canvas texture with a normal map from the same dapple, so
// the ground takes the low sun instead of reading as a printed sheet; low: flat Lambert (a toon ramp drops the whole
// floor into its shadow step under a low sun).
import { useEffect, useMemo, useRef } from 'react'
import type { Mesh } from 'three'
import type { LevelLook } from '@data/scenery'
import { assetTier } from '@render/manifest'
import { dappleTexture } from '@render/procedural-textures'
import { normalFromHeight } from '@render/surface-maps'
import { world } from '@systems/world'

/** Metres per repeat of the dapple tile. */
const TILE_M = 6
/** Sobel strength baked into the ground's normal map: tufts and hollows a few centimetres deep over a 6 m tile. */
const NORMAL_STRENGTH = 1.2

export function GroundPlane({ center, size, ground }: { center: readonly [number, number]; size: readonly [number, number]; ground: LevelLook['ground'] }) {
  const ref = useRef<Mesh>(null)
  useEffect(() => {
    const mesh = ref.current!
    world.ground.push(mesh)
    return () => {
      world.ground = world.ground.filter((g) => g !== mesh)
    }
  }, [])

  // Extend visual ground to horizon to eliminate hard void/sky borders at level edges
  const width = Math.max(size[0] * 3, 280)
  const depth = Math.max(size[1] * 3, 280)
  const high = assetTier() === 'high'
  const maps = useMemo(() => {
    if (!high) return null
    const map = dappleTexture(ground.base, ground.dapple)
    const normal = normalFromHeight(map.image as HTMLCanvasElement, NORMAL_STRENGTH)
    for (const t of [map, normal]) t.repeat.set(width / TILE_M, depth / TILE_M)
    return { map, normal }
  }, [high, ground, width, depth])
  useEffect(
    () => () => {
      maps?.map.dispose()
      maps?.normal.dispose()
    },
    [maps],
  )

  return (
    <mesh ref={ref} position={[center[0], 0, center[1]]} rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[width, depth]} />
      {maps ? <meshStandardMaterial map={maps.map} normalMap={maps.normal} roughness={0.95} /> : <meshLambertMaterial color={ground.base} />}
    </mesh>
  )
}
